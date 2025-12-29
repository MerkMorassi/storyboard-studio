
import React, { useState, useEffect, useCallback } from 'react';
import { PromptTemplate, DynamicPromptList, Agent } from '../types.ts';
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

const SHOT_TYPES = [
    'None',
    'Eye level',
    'Low angle',
    'Over the shoulder',
    'Overhead',
    "Bird's eye view"
];

const IMAGE_STYLES = [
    'None',
    'Cinematic',
    'Vintage',
    'Storyboard',
    'Low Key',
    'Indie',
    'Y2K',
    'Pop',
    'Grunge',
    'Dreamy',
    'Hand Drawn',
    '2D Novel',
    'Boost',
    'Scribble',
    'Film Noir',
    'Anime',
    '3D Cartoon',
    'Colored'
];

const WEATHER_TYPES = ['None', 'Sunny', 'Cloudy', 'Overcast', 'Rainy', 'Stormy', 'Foggy', 'Snowy', 'Hazy', 'Clear'];
const LIGHTING_TYPES = ['None', 'Natural', 'Cinematic', 'Low Key', 'High Key', 'Golden Hour', 'Blue Hour', 'Neon', 'Studio', 'Hard', 'Soft', 'Volumetric', 'Rembrandt', 'Split'];

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
    const [weather, setWeather] = useState('None');
    const [lighting, setLighting] = useState('None');
    
    // Characters
    const [numCharacters, setNumCharacters] = useState(1);
    const [characterIds, setCharacterIds] = useState<string[]>(['', '', '']); // Up to 3 characters

    const [cameraAngle, setCameraAngle] = useState('Medium');
    const [shotType, setShotType] = useState('None');
    const [visualStyle, setVisualStyle] = useState('None');
    
    // Core Gen State
    const [prompt, setPrompt] = useState(''); // This is the main "Action & Style" field which now contains everything
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
    
    // Legacy / Extra Settings
    const [useUpscaler, setUseUpscaler] = useState(false);
    const [upscaleBy, setUpscaleBy] = useState(1.5);
    const [addQualityTags, setAddQualityTags] = useState(true);
    const [modelVersion, setModelVersion] = useState('v15');
    
    // Output State
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [wakingError, setWakingError] = useState<string | null>(null);
    const [generatedImage, setGeneratedImage] = useState<{ base64: string; mimeType: string } | null>(null);
    const [metadata, setMetadata] = useState<any>(null);
    const [openSections, setOpenSections] = useState<Set<string>>(new Set(['scene', 'prompt', 'settings']));
    const [progress, setProgress] = useState('');

    // --- PROMPT INJECTION LOGIC ---

    const updatePrompt = useCallback((
        type: 'slugline' | 'lighting' | 'cast' | 'style' | 'camera' | 'shot', 
        val: string
    ) => {
        setPrompt(currentPrompt => {
            let newPrompt = currentPrompt;
            
            // Helper to replace or append
            const replaceOrAppend = (regex: RegExp, prefix: string, suffix: string = '') => {
                const newValue = val ? `${prefix}${val}${suffix}` : '';
                if (regex.test(newPrompt)) {
                    return newPrompt.replace(regex, newValue);
                } else if (val) {
                    // Append if not found
                    return newPrompt + (newPrompt ? ' ' : '') + newValue;
                }
                return newPrompt;
            };

            switch (type) {
                case 'slugline':
                    // Regex for INT./EXT. LOCATION - TIME [ - WEATHER]
                    const slugRegex = /^(INT\.|EXT\.)\s+.*?(?:\.|\n|$)/;
                    if (val) {
                        if (slugRegex.test(newPrompt)) {
                            newPrompt = newPrompt.replace(slugRegex, val + '. ');
                        } else {
                            newPrompt = val + '. ' + newPrompt;
                        }
                    }
                    break;
                case 'lighting':
                    newPrompt = replaceOrAppend(/Lighting:\s+.*?(?:\.|\n|$)/, 'Lighting: ', '.');
                    break;
                case 'cast':
                    newPrompt = replaceOrAppend(/Cast:\s+.*?(?:\.|\n|$)/, 'Cast: ', '.');
                    break;
                case 'style':
                    newPrompt = replaceOrAppend(/Style:\s+.*?(?:\.|\n|$)/, 'Style: ', '.');
                    break;
                case 'camera':
                    newPrompt = replaceOrAppend(/Framing:\s+.*?(?:\.|\n|$)/, 'Framing: ', '.');
                    break;
                case 'shot':
                    newPrompt = replaceOrAppend(/Shot Type:\s+.*?(?:\.|\n|$)/, 'Shot Type: ', '.');
                    break;
            }
            
            // Clean up double spaces or weird punctuation
            return newPrompt.replace(/\s+/g, ' ').replace(/\s+\./g, '.').replace(/^\s+/, '');
        });
    }, []);

    // Handlers for individual dropdowns
    const handleSluglineUpdate = (newType: string, newLoc: string, newTime: string, newWeather: string) => {
        const wStr = newWeather !== 'None' ? ` - ${newWeather.toUpperCase()}` : '';
        const slug = `${newType}. ${newLoc.toUpperCase() || 'LOCATION'} - ${newTime}${wStr}`;
        updatePrompt('slugline', slug);
    };

    const handleSceneTypeChange = (val: 'INT' | 'EXT') => {
        setSceneType(val);
        handleSluglineUpdate(val, location, timeOfDay, weather);
    };
    const handleLocationChange = (val: string) => {
        setLocation(val);
        handleSluglineUpdate(sceneType, val, timeOfDay, weather);
    };
    const handleTimeChange = (val: 'DAY' | 'NIGHT' | 'SUNSET' | 'DAWN') => {
        setTimeOfDay(val);
        handleSluglineUpdate(sceneType, location, val, weather);
    };
    const handleWeatherChange = (val: string) => {
        setWeather(val);
        handleSluglineUpdate(sceneType, location, timeOfDay, val);
    };

    const handleLightingChange = (val: string) => {
        setLighting(val);
        updatePrompt('lighting', val !== 'None' ? val : '');
    };

    const handleCastChange = (newNum: number, newIds: string[]) => {
        const activeIds = newIds.slice(0, newNum);
        const selectedAgents = activeIds.map(id => agents.find(a => a.id === id)).filter(Boolean);
        const names = selectedAgents.map(a => a?.name.toUpperCase()).join(' and ');
        updatePrompt('cast', names);
    };

    const handleNumCharactersChange = (val: number) => {
        setNumCharacters(val);
        handleCastChange(val, characterIds);
    };

    const handleCharacterSelection = (index: number, id: string) => {
        const newIds = [...characterIds];
        newIds[index] = id;
        setCharacterIds(newIds);
        handleCastChange(numCharacters, newIds);
    };

    const handleStyleChange = (val: string) => {
        setVisualStyle(val);
        updatePrompt('style', val !== 'None' ? val : '');
    };

    const handleFramingChange = (val: string) => {
        setCameraAngle(val);
        updatePrompt('camera', val !== 'Medium' ? val : ''); // Assuming Medium is default/invisible
    };

    const handleShotTypeChange = (val: string) => {
        setShotType(val);
        updatePrompt('shot', val !== 'None' ? val : '');
    };

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

    const handleInsertPositiveFromTemplate = (templateId: string) => {
        const template = promptTemplates.find(t => t.id === templateId);
        if (template) {
            const cleanContent = template.positivePrompt.replace('{{ANALYSIS_TEXT}}', '').trim();
            if (cleanContent) {
                setPrompt(p => p ? `${p}, ${cleanContent}` : cleanContent);
            }
        }
    };

    const handleInsertDynamic = (listName: string) => {
        setPrompt(p => `${p} [${listName}]`);
    };

    const handleInsertNegativeFromTemplate = (templateId: string) => {
        const template = promptTemplates.find(t => t.id === templateId);
        if (template && template.negativePrompt) {
            setNegativePrompt(n => n ? `${n}, ${template.negativePrompt}` : template.negativePrompt);
        }
    };

    const handleInsertDynamicNegative = (listName: string) => {
        setNegativePrompt(n => n ? `${n} [${listName}]` : `[${listName}]`);
    };

    const handleGenerate = async () => {
        if (!hfToken) {
            console.warn("No HF Token provided. Generation might fail if the space is private or throttled.");
        }

        setIsLoading(true);
        setError(null);
        setWakingError(null);
        setGeneratedImage(null);
        setMetadata(null);
        setProgress('Connecting to MythOS Cinematic Engine...');

        try {
            let lastAsset = null;
            const seedToUse = randomizeSeed ? Math.floor(Math.random() * 2147483647) : (parseInt(seed) || 0);

            for (let i = 0; i < numImages; i++) {
                setProgress(numImages > 1 ? `Developing shot ${i+1}/${numImages}...` : 'Developing shot...');
                
                const currentSeed = seedToUse + i;
                
                // Use 'prompt' directly as it now contains all the info
                const blob = await generateImageSDXL({
                    prompt: prompt, 
                    negative_prompt: negativePrompt || "sensitive, nsfw, explicit, bad quality, worst quality, worst detail, sketch, censor",
                    seed: currentSeed,
                    width: width,
                    height: height,
                    guidance_scale: guidanceScale,
                    num_inference_steps: steps,
                }, hfToken);

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
                
                const meta = {
                    engine: 'MythOS Cinematic',
                    prompt: prompt,
                    seed: currentSeed,
                    width,
                    height,
                    steps,
                    guidance: guidanceScale,
                    model: modelVersion,
                    shotType,
                    visualStyle,
                    lighting,
                    weather
                };
                setMetadata(meta);

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
            const msg = e instanceof Error ? e.message : "Image generation failed.";
            if (msg.includes("Hardware Sleeping")) {
                setWakingError(msg);
                setError(null);
            } else {
                setError(msg);
                setWakingError(null);
            }
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
                                <select value={sceneType} onChange={(e) => handleSceneTypeChange(e.target.value as any)} className="w-full bg-neutral-900 border border-neutral-600 rounded p-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none">
                                    <option value="INT">INT.</option>
                                    <option value="EXT">EXT.</option>
                                </select>
                            </FormField>
                            <FormField label="Time">
                                <select value={timeOfDay} onChange={(e) => handleTimeChange(e.target.value as any)} className="w-full bg-neutral-900 border border-neutral-600 rounded p-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none">
                                    <option value="DAY">DAY</option>
                                    <option value="NIGHT">NIGHT</option>
                                    <option value="SUNSET">SUNSET</option>
                                    <option value="DAWN">DAWN</option>
                                </select>
                            </FormField>
                        </div>
                        
                        <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-6">
                                <FormField label="Location">
                                    <input 
                                        type="text" 
                                        list="saved-locations"
                                        value={location} 
                                        onChange={(e) => handleLocationChange(e.target.value)} 
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
                            </div>
                            <div className="col-span-3">
                                <FormField label="Weather">
                                    <select value={weather} onChange={(e) => handleWeatherChange(e.target.value)} className="w-full bg-neutral-900 border border-neutral-600 rounded p-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none">
                                        {WEATHER_TYPES.map(w => <option key={w} value={w}>{w}</option>)}
                                    </select>
                                </FormField>
                            </div>
                            <div className="col-span-3">
                                <FormField label="Lighting">
                                    <select value={lighting} onChange={(e) => handleLightingChange(e.target.value)} className="w-full bg-neutral-900 border border-neutral-600 rounded p-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none">
                                        {LIGHTING_TYPES.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </FormField>
                            </div>
                        </div>

                        <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-3">
                                <FormField label="Cast Size">
                                    <select value={numCharacters} onChange={(e) => handleNumCharactersChange(parseInt(e.target.value))} className="w-full bg-neutral-900 border border-neutral-600 rounded p-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none">
                                        <option value={0}>None</option>
                                        <option value={1}>1</option>
                                        <option value={2}>2</option>
                                        <option value={3}>3</option>
                                    </select>
                                </FormField>
                            </div>
                            <div className="col-span-9">
                                <div className="grid grid-cols-3 gap-1">
                                    {Array.from({ length: numCharacters }).map((_, idx) => (
                                        <div key={idx} className="col-span-1">
                                            <FormField label={`Cast ${idx + 1}`}>
                                                <select 
                                                    value={characterIds[idx] || ''} 
                                                    onChange={(e) => handleCharacterSelection(idx, e.target.value)} 
                                                    className="w-full bg-neutral-900 border border-neutral-600 rounded p-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                                >
                                                    <option value="">- Select -</option>
                                                    {agents.map(agent => (
                                                        <option key={agent.id} value={agent.id}>{agent.name}</option>
                                                    ))}
                                                </select>
                                            </FormField>
                                        </div>
                                    ))}
                                    {numCharacters === 0 && (
                                        <div className="col-span-3 flex items-center justify-center h-full text-neutral-600 text-xs italic border border-neutral-800 rounded bg-neutral-900/50 mt-5 py-2">
                                            No characters in scene
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <FormField label="Visual Style">
                            <select value={visualStyle} onChange={(e) => handleStyleChange(e.target.value)} className="w-full bg-neutral-900 border border-neutral-600 rounded p-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none">
                                {IMAGE_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </FormField>
                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="Framing">
                                <select value={cameraAngle} onChange={(e) => handleFramingChange(e.target.value)} className="w-full bg-neutral-900 border border-neutral-600 rounded p-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none">
                                    {['Extreme Close Up', 'Close Up', 'Medium', 'Wide', 'Extreme Wide'].map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                            </FormField>
                            <FormField label="Shot Type">
                                <select value={shotType} onChange={(e) => handleShotTypeChange(e.target.value)} className="w-full bg-neutral-900 border border-neutral-600 rounded p-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none">
                                    {SHOT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </FormField>
                        </div>
                    </AccordionSection>

                    <AccordionSection title="2. ACTION & STYLE" sectionId="prompt" isOpen={openSections.has('prompt')} onToggle={() => toggleSection('prompt')}>
                        <FormField label="Action / Description">
                            <textarea 
                                value={prompt} 
                                onChange={(e) => setPrompt(e.target.value)} 
                                placeholder="What is happening? Describe the action, emotion, and interactions..." 
                                className="w-full h-32 bg-neutral-900 border border-neutral-600 rounded p-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none resize-y" 
                            />
                        </FormField>
                        <div className="flex gap-2">
                            <select onChange={(e) => handleInsertPositiveFromTemplate(e.target.value)} value="" className="flex-1 bg-neutral-900 border border-neutral-600 rounded p-1.5 text-xs text-neutral-300 outline-none">
                                <option value="" disabled>+ Add Positive from Template...</option>
                                {promptTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            <select onChange={(e) => handleInsertDynamic(e.target.value)} value="" className="flex-1 bg-neutral-900 border border-neutral-600 rounded p-1.5 text-xs text-neutral-300 outline-none">
                                <option value="" disabled>+ Insert Dynamic List...</option>
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
                        <div className="flex gap-2 mb-4">
                            <select onChange={(e) => handleInsertNegativeFromTemplate(e.target.value)} value="" className="flex-1 bg-neutral-900 border border-neutral-600 rounded p-1.5 text-xs text-neutral-300 outline-none">
                                <option value="" disabled>+ Add Negative from Template...</option>
                                {promptTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            <select onChange={(e) => handleInsertDynamicNegative(e.target.value)} value="" className="flex-1 bg-neutral-900 border border-neutral-600 rounded p-1.5 text-xs text-neutral-300 outline-none">
                                <option value="" disabled>+ Insert Negative List...</option>
                                {dynamicPromptLists.map(l => <option key={l.id} value={l.name}>[{l.name}]</option>)}
                            </select>
                        </div>
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
                            <FormField label="Variations">
                                <select 
                                    value={numImages} 
                                    onChange={e => setNumImages(parseInt(e.target.value))} 
                                    className="w-full bg-neutral-900 border border-neutral-600 rounded p-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                >
                                    {[1, 2, 3, 4, 6, 12].map(n => (
                                        <option key={n} value={n}>{n} {n === 1 ? 'Image' : 'Images'}</option>
                                    ))}
                                </select>
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
                            {prompt.replace(`${sceneType}. ${location.toUpperCase() || 'LOCATION'} - ${timeOfDay}`, '').trim()}
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
                     {wakingError && (
                        <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg text-yellow-200 text-sm flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <WarningIcon className="w-5 h-5 text-yellow-500" />
                                <span className="font-bold uppercase tracking-wider">GPU Core is Sleeping</span>
                            </div>
                            <p className="font-mono text-[11px] leading-tight text-yellow-300">
                                The dedicated hardware has entered sleep mode to conserve resources.
                            </p>
                            <ol className="text-xs list-decimal list-inside space-y-1 pl-1">
                                <li><a href="https://merkmorassi-mythos-engine.hf.space" target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-white">Click here to wake the GPU</a>.</li>
                                <li>Wait about 60 seconds for it to initialize.</li>
                                <li>Then, try your generation again.</li>
                            </ol>
                        </div>
                    )}
                    {error && !wakingError && <p className="text-sm text-red-400 bg-red-900/20 p-3 rounded border border-red-500/30">{error}</p>}
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
