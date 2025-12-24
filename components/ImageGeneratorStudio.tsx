
import React, { useState, useEffect } from 'react';
import { GenerationOptions, PromptTemplate, DynamicPromptList, Agent } from '../types.ts';
import { generateImageSDXL } from '../services/huggingFaceService';
import { MagicIcon, DiceIcon, ChevronDownIcon, ImageIcon, ScriptIcon, ListIcon } from './icons.tsx';
import { WarningIcon } from './icons/WarningIcon';
import { AssetActions } from './AssetActions';
import { LoadingSpinner } from './icons.tsx';

interface ImageGeneratorStudioProps {
    hfToken: string;
    promptTemplates: PromptTemplate[];
    dynamicPromptLists: DynamicPromptList[];
    agents: Agent[];
    onAddAssetToGrid: (asset: { type: 'image' | 'video'; base64?: string; url?: string; mimeType?: string; metadata?: any }) => void;
    onAddToStoryboard: (base64: string) => void;
    onAddToInspiration: (base64: string) => void;
}

const FormField: React.FC<{ label: string; children: React.ReactNode, className?: string, disabled?: boolean }> = ({ label, children, className = '', disabled=false }) => (
    <div className={`flex flex-col gap-2 ${className} ${disabled ? 'opacity-50' : ''}`}>
        <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider" dangerouslySetInnerHTML={{ __html: label }} />
        {children}
    </div>
);

const AccordionSection: React.FC<{ title: string; sectionId: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode }> = ({ title, isOpen, onToggle, children }) => (
    <div className="border border-neutral-700 rounded-lg overflow-hidden bg-neutral-800/30">
        <button type="button" className="w-full p-3 flex justify-between items-center bg-neutral-800/50 text-left font-bold text-neutral-200 hover:bg-neutral-700/50 transition-colors" onClick={onToggle}>
            <span>{title}</span>
            <ChevronDownIcon className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
            <div className="p-4 space-y-4 animate-fade-in">
                {children}
            </div>
        )}
    </div>
);

export const ImageGeneratorStudio: React.FC<ImageGeneratorStudioProps> = ({ 
    hfToken, 
    promptTemplates, 
    dynamicPromptLists,
    agents,
    onAddAssetToGrid,
    onAddToStoryboard,
    onAddToInspiration
}) => {
    // Scene Builder State
    const [sceneType, setSceneType] = useState<'INT' | 'EXT'>('INT');
    const [location, setLocation] = useState('');
    const [timeOfDay, setTimeOfDay] = useState<'DAY' | 'NIGHT' | 'SUNSET' | 'DAWN'>('DAY');
    const [selectedAgentId, setSelectedAgentId] = useState('');
    const [cameraAngle, setCameraAngle] = useState('Medium Shot');
    
    // Core Gen State
    const [prompt, setPrompt] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('');
    
    // Resolution & Ratio
    const [aspectRatioLabel, setAspectRatioLabel] = useState('16:9');
    const [width, setWidth] = useState(1344);
    const [height, setHeight] = useState(768);
    
    // Advanced Params
    const [guidanceScale, setGuidanceScale] = useState(7.0);
    const [steps, setSteps] = useState(28);
    const [seed, setSeed] = useState('');
    const [randomizeSeed, setRandomizeSeed] = useState(true);
    const [numImages, setNumImages] = useState(1);
    
    // Legacy / Extra Settings (Preserved for UI, though some might not affect MythOS directly yet)
    const [useUpscaler, setUseUpscaler] = useState(false);
    const [upscaleBy, setUpscaleBy] = useState(1.5);
    const [addQualityTags, setAddQualityTags] = useState(true);
    const [modelVersion, setModelVersion] = useState('v15');
    
    // Live Script Preview State
    const [finalPrompt, setFinalPrompt] = useState('');
    
    // Output State
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedImage, setGeneratedImage] = useState<{ base64: string; mimeType: string } | null>(null);
    const [metadata, setMetadata] = useState<any>(null);
    const [openSections, setOpenSections] = useState<Set<string>>(new Set(['scene', 'prompt', 'settings']));
    const [progress, setProgress] = useState('');

    // Construct the final prompt dynamically whenever inputs change
    useEffect(() => {
        // 1. Slugline: INT. LOCATION - TIME
        const locString = location.trim().toUpperCase() || 'LOCATION';
        const slugline = `${sceneType}. ${locString} - ${timeOfDay}`;

        // 2. Character: Look up agent name
        let characterString = '';
        if (selectedAgentId) {
            const agent = agents.find(a => a.id === selectedAgentId);
            if (agent) {
                characterString = agent.name.toUpperCase();
            }
        }

        // 3. Camera & Action
        const cameraString = cameraAngle ? `Camera: ${cameraAngle}` : '';
        const actionString = prompt.trim(); // The user's specific action description

        // 4. Assemble: SLUGLINE. CHARACTER. ACTION. CAMERA.
        const parts = [slugline];
        
        if (characterString) {
            // If action doesn't start with character name, prepend it for script style
            if (!actionString.toUpperCase().startsWith(characterString)) {
                parts.push(characterString + '.'); 
            }
        }
        
        if (actionString) parts.push(actionString);
        if (cameraString) parts.push(cameraString + '.');

        // Join with spaces, ensuring punctuation
        setFinalPrompt(parts.join(' '));

    }, [sceneType, location, timeOfDay, selectedAgentId, cameraAngle, prompt, agents]);

    const handleRatioChange = (ratio: string) => {
        setAspectRatioLabel(ratio);
        switch (ratio) {
            case '1:1':
                setWidth(1024); setHeight(1024); setUseUpscaler(false);
                break;
            case '16:9':
                setWidth(1344); setHeight(768); setUseUpscaler(false);
                break;
            case '9:16':
                setWidth(768); setHeight(1344); setUseUpscaler(false);
                break;
            case '2.39:1':
                // Base 1536x640 -> MythOS handles native wide gen well, but we set dims explicitly
                setWidth(2304); setHeight(960); setUseUpscaler(true); setUpscaleBy(1.5);
                break;
        }
    };

    const toggleSection = (section: string) => {
        setOpenSections(prev => {
            const newSet = new Set(prev);
            if (newSet.has(section)) newSet.delete(section);
            else newSet.add(section);
            return newSet;
        });
    };

    const handleApplyTemplate = (templateId: string) => {
        const template = promptTemplates.find(t => t.id === templateId);
        if (template) {
            const cleanContent = template.positivePrompt.replace('{{ANALYSIS_TEXT}}', '').trim();
            if (cleanContent) {
                setPrompt(p => p ? `${p}, ${cleanContent}` : cleanContent);
            }
            if (template.negativePrompt) {
                setNegativePrompt(n => n ? `${n}, ${template.negativePrompt}` : template.negativePrompt);
            }
        }
    };

    const handleInsertDynamic = (listName: string) => {
        setPrompt(p => `${p} [${listName}]`);
    };

    const handleGenerate = async () => {
        // Warning if token missing, but allow trying public spaces if available
        if (!hfToken) {
            console.warn("No HF Token provided. Generation might fail if the space is private or throttled.");
        }

        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);
        setMetadata(null);
        setProgress('Connecting to MythOS Cinematic Engine...');

        try {
            // Loop for multiple images if requested
            let lastAsset = null;
            const seedToUse = randomizeSeed ? Math.floor(Math.random() * 2147483647) : (parseInt(seed) || 0);

            for (let i = 0; i < numImages; i++) {
                setProgress(numImages > 1 ? `Developing shot ${i+1}/${numImages}...` : 'Developing shot...');
                
                const currentSeed = seedToUse + i;
                
                // Call MythOS Engine via Service
                const blob = await generateImageSDXL({
                    prompt: finalPrompt,
                    negative_prompt: negativePrompt || "sensitive, nsfw, explicit, bad quality, worst quality, worst detail, sketch, censor",
                    seed: currentSeed,
                    width: width,
                    height: height,
                    guidance_scale: guidanceScale,
                    num_inference_steps: steps,
                    model_name: modelVersion // 'v15' default
                }, hfToken, true);

                // Convert Blob to Asset
                const asset = await new Promise<{ base64: string; mimeType: string }>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64data = reader.result as string;
                        const base64 = base64data.split(',')[1];
                        const mimeType = blob.type;
                        resolve({ base64, mimeType });
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
                
                lastAsset = asset;
                
                // Metadata construction for grid
                const meta = {
                    engine: 'MythOS Cinematic',
                    prompt: finalPrompt,
                    seed: currentSeed,
                    width,
                    height,
                    steps,
                    guidance: guidanceScale,
                    model: modelVersion
                };
                setMetadata(meta);

                // Auto-add to grid if generating multiple
                if (numImages > 1) {
                    onAddAssetToGrid({ type: 'image', ...asset, metadata: meta });
                }
            }
            
            if (lastAsset) {
                setGeneratedImage(lastAsset);
            } else {
                throw new Error("No image was returned from the generator.");
            }

        } catch (e) {
            console.error("MythOS Gen Error:", e);
            let msg = e instanceof Error ? e.message : "Image generation failed.";
            setError(msg);
        } finally {
            setIsLoading(false);
            setProgress('');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto w-full h-full flex flex-col space-y-6 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Controls Column */}
                <div className="lg:col-span-1 bg-neutral-800/50 p-6 border border-neutral-700 rounded-lg space-y-4 h-fit">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 rounded bg-purple-900/50 border border-purple-500/30 text-purple-200 text-[10px] font-bold uppercase tracking-wider">Engine: MythOS Cinematic</span>
                        <span className="px-2 py-1 rounded bg-neutral-900 border border-neutral-700 text-neutral-400 text-[10px] font-bold">{modelVersion}</span>
                    </div>

                    <AccordionSection title="1. SCENE BUILDER" sectionId="scene" isOpen={openSections.has('scene')} onToggle={() => toggleSection('scene')}>
                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="Scene Type">
                                <select value={sceneType} onChange={(e) => setSceneType(e.target.value as any)} className="w-full bg-neutral-900 border border-neutral-600 rounded p-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none">
                                    <option value="INT">INT.</option>
                                    <option value="EXT">EXT.</option>
                                </select>
                            </FormField>
                            <FormField label="Time">
                                <select value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value as any)} className="w-full bg-neutral-900 border border-neutral-600 rounded p-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none">
                                    <option value="DAY">DAY</option>
                                    <option value="NIGHT">NIGHT</option>
                                    <option value="SUNSET">SUNSET</option>
                                    <option value="DAWN">DAWN</option>
                                </select>
                            </FormField>
                        </div>
                        <FormField label="Location">
                            <input 
                                type="text" 
                                list="saved-locations"
                                value={location} 
                                onChange={(e) => setLocation(e.target.value)} 
                                placeholder="e.g. COFFEE SHOP" 
                                className="w-full bg-neutral-900 border border-neutral-600 rounded p-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none" 
                            />
                            <datalist id="saved-locations">
                                <option value="INTERROGATION ROOM" />
                                <option value="CASTLE THRONE ROOM" />
                                <option value="SPACESHIP BRIDGE" />
                                <option value="CYBERPUNK ALLEY" />
                                <option value="FOREST CLEARING" />
                            </datalist>
                        </FormField>
                        <FormField label="Character">
                            <select 
                                value={selectedAgentId} 
                                onChange={(e) => setSelectedAgentId(e.target.value)} 
                                className="w-full bg-neutral-900 border border-neutral-600 rounded p-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                            >
                                <option value="">- No Specific Character -</option>
                                {agents.map(agent => (
                                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                                ))}
                            </select>
                        </FormField>
                        <FormField label="Camera Angle">
                            <select value={cameraAngle} onChange={(e) => setCameraAngle(e.target.value)} className="w-full bg-neutral-900 border border-neutral-600 rounded p-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none">
                                {['Medium Shot', 'Close-up', 'Wide Angle', 'Establishing Shot', 'Low Angle', 'High Angle', 'Dutch Angle', 'Over the Shoulder', 'Tracking Shot', 'Dolly Zoom'].map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </FormField>
                    </AccordionSection>

                    <AccordionSection title="2. ACTION & STYLE" sectionId="prompt" isOpen={openSections.has('prompt')} onToggle={() => toggleSection('prompt')}>
                        <FormField label="Action / Description">
                            <textarea 
                                value={prompt} 
                                onChange={(e) => setPrompt(e.target.value)} 
                                placeholder="What is happening? Describe the action, emotion, and lighting details..." 
                                className="w-full h-32 bg-neutral-900 border border-neutral-600 rounded p-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none resize-y" 
                            />
                        </FormField>
                        <div className="flex gap-2">
                            <select onChange={(e) => handleApplyTemplate(e.target.value)} value="" className="flex-1 bg-neutral-900 border border-neutral-600 rounded p-1.5 text-xs text-neutral-300 outline-none">
                                <option value="" disabled>Apply Style Template...</option>
                                {promptTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            <select onChange={(e) => handleInsertDynamic(e.target.value)} value="" className="flex-1 bg-neutral-900 border border-neutral-600 rounded p-1.5 text-xs text-neutral-300 outline-none">
                                <option value="" disabled>Insert List...</option>
                                {dynamicPromptLists.map(l => <option key={l.id} value={l.name}>[{l.name}]</option>)}
                            </select>
                        </div>
                    </AccordionSection>

                    <AccordionSection title="3. SETTINGS" sectionId="settings" isOpen={openSections.has('settings')} onToggle={() => toggleSection('settings')}>
                        <FormField label="Negative Prompt">
                            <textarea 
                                value={negativePrompt} 
                                onChange={(e) => setNegativePrompt(e.target.value)} 
                                placeholder="Blurry, ugly, deformed, watermark..." 
                                className="w-full h-16 bg-neutral-900 border border-neutral-600 rounded p-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none resize-y" 
                            />
                        </FormField>
                        <FormField label="Aspect Ratio">
                            <div className="grid grid-cols-4 gap-1">
                                {['16:9', '9:16', '1:1', '2.39:1'].map(r => (
                                    <button 
                                        key={r} 
                                        onClick={() => handleRatioChange(r)}
                                        className={`px-1 py-1.5 rounded text-[10px] font-bold border transition-colors ${aspectRatioLabel === r ? 'bg-blue-600 border-blue-500 text-white' : 'bg-neutral-900 border-neutral-600 text-neutral-400 hover:text-neutral-200'}`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2 mt-2">
                                <div className="flex-1">
                                    <label className="text-[10px] text-neutral-500">W</label>
                                    <input type="number" value={width} onChange={e => setWidth(parseInt(e.target.value))} className="w-full bg-neutral-900 border border-neutral-700 rounded p-1 text-xs" />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] text-neutral-500">H</label>
                                    <input type="number" value={height} onChange={e => setHeight(parseInt(e.target.value))} className="w-full bg-neutral-900 border border-neutral-700 rounded p-1 text-xs" />
                                </div>
                            </div>
                        </FormField>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label={`Steps: ${steps}`}>
                                <input type="range" min="10" max="50" value={steps} onChange={e => setSteps(parseInt(e.target.value))} className="w-full accent-blue-500" />
                            </FormField>
                            <FormField label={`Guidance: ${guidanceScale}`}>
                                <input type="range" min="1" max="15" step="0.5" value={guidanceScale} onChange={e => setGuidanceScale(parseFloat(e.target.value))} className="w-full accent-blue-500" />
                            </FormField>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="Seed">
                                <div className="flex gap-2">
                                    <input 
                                        type="number" 
                                        value={seed} 
                                        onChange={(e) => { setSeed(e.target.value); setRandomizeSeed(false); }} 
                                        placeholder="Random"
                                        className="flex-grow bg-neutral-900 border border-neutral-600 rounded p-2 text-sm outline-none"
                                        disabled={randomizeSeed}
                                    />
                                    <div className="flex items-center gap-1">
                                        <input type="checkbox" checked={randomizeSeed} onChange={e => setRandomizeSeed(e.target.checked)} id="rndSeed" />
                                        <label htmlFor="rndSeed" className="text-xs text-neutral-400 cursor-pointer">Rnd</label>
                                    </div>
                                </div>
                            </FormField>
                            <FormField label={`Count: ${numImages}`}>
                                <div className="flex gap-2 items-center">
                                    <input 
                                        type="range" 
                                        min="1" max="4" 
                                        value={numImages} 
                                        onChange={e => setNumImages(parseInt(e.target.value))} 
                                        className="w-full accent-blue-500" 
                                    />
                                </div>
                            </FormField>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-neutral-700/50 opacity-50 pointer-events-none">
                            <div className="col-span-1">
                                <label className="flex items-center gap-2 cursor-pointer mb-1">
                                    <input type="checkbox" checked={useUpscaler} onChange={e => setUseUpscaler(e.target.checked)} className="rounded border-neutral-600 bg-neutral-900 text-blue-600" />
                                    <span className="text-xs text-neutral-300 font-medium">Upscaler (Inactive)</span>
                                </label>
                                {useUpscaler && (
                                    <div className="flex items-center gap-1">
                                        <span className="text-[10px] text-neutral-500">Scale:</span>
                                        <input type="number" step="0.1" min="1" max="2" value={upscaleBy} onChange={e => setUpscaleBy(parseFloat(e.target.value))} className="w-12 bg-neutral-900 border border-neutral-700 rounded p-0.5 text-xs text-center" />
                                    </div>
                                )}
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer h-fit">
                                <input type="checkbox" checked={addQualityTags} onChange={e => setAddQualityTags(e.target.checked)} className="rounded border-neutral-600 bg-neutral-900 text-blue-600" />
                                <span className="text-xs text-neutral-300 font-medium">Quality Tags (Inactive)</span>
                            </label>
                        </div>
                    </AccordionSection>
                    
                    {/* Live Script Preview Block */}
                    <div className="mt-4 bg-black border border-neutral-700 rounded-lg p-3 relative group">
                        <div className="absolute top-0 right-0 px-2 py-1 bg-neutral-800 text-[10px] text-neutral-400 rounded-bl-lg font-bold tracking-wider">
                            LIVE SCRIPT PREVIEW
                        </div>
                        <div className="font-mono text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap pt-4">
                            <span className="font-bold text-white">{sceneType}. {location.toUpperCase() || 'LOCATION'} - {timeOfDay}</span>
                            <br/><br/>
                            {finalPrompt.replace(`${sceneType}. ${location.toUpperCase() || 'LOCATION'} - ${timeOfDay}`, '').trim()}
                        </div>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                    >
                        {isLoading ? (
                            <><LoadingSpinner className="w-4 h-4 text-white" /> {progress || 'Generating...'}</>
                        ) : (
                            <><MagicIcon /> Generate {numImages > 1 ? `Images (${numImages})` : 'Image'}</>
                        )}
                    </button>
                    {error && <p className="text-sm text-red-400 bg-red-900/20 p-3 rounded border border-red-500/30">{error}</p>}
                </div>

                {/* Preview Column */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg flex flex-col relative overflow-hidden min-h-[500px]">
                        <div className="flex-grow flex items-center justify-center bg-black relative p-4">
                            {isLoading ? (
                                <div className="flex flex-col items-center">
                                    <LoadingSpinner />
                                    <p className="mt-4 text-neutral-400 animate-pulse font-mono text-sm">{progress}</p>
                                </div>
                            ) : generatedImage ? (
                                <img 
                                    src={`data:${generatedImage.mimeType};base64,${generatedImage.base64}`} 
                                    alt="Generated Result" 
                                    className="max-w-full max-h-[75vh] object-contain shadow-2xl rounded-lg" 
                                />
                            ) : (
                                <div className="text-neutral-600 flex flex-col items-center select-none opacity-50">
                                    <ImageIcon className="w-16 h-16 mb-4" />
                                    <p className="text-sm font-medium">Ready to Imagine</p>
                                    {aspectRatioLabel === '2.39:1' && (
                                        <p className="text-xs text-neutral-500 mt-2">Cinematic 2.39:1 selected</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Action Bar */}
                        {generatedImage && !isLoading && (
                            <div className="p-4 border-t border-neutral-800 bg-neutral-800/90 backdrop-blur-sm flex justify-center">
                                <AssetActions 
                                    asset={{ type: 'image', base64: generatedImage.base64, mimeType: generatedImage.mimeType }}
                                    onSaveToGrid={() => onAddAssetToGrid({ type: 'image', base64: generatedImage.base64, mimeType: generatedImage.mimeType, metadata: metadata })}
                                    onSaveToStoryboard={() => onAddToStoryboard(generatedImage.base64)}
                                    onSaveToInspiration={() => onAddToInspiration(generatedImage.base64)}
                                />
                            </div>
                        )}
                    </div>
                    
                    {/* Metadata Section */}
                    {metadata && (
                        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2 text-neutral-400">
                                <ListIcon className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">Generation Metadata</span>
                            </div>
                            <div className="bg-black/50 p-3 rounded-lg border border-neutral-800 overflow-x-auto">
                                <pre className="text-[10px] text-neutral-300 font-mono whitespace-pre-wrap">
                                    {JSON.stringify(metadata, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
