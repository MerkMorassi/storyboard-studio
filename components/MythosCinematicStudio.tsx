
import React, { useState, useMemo } from 'react';
import { generateImageSDXL } from '../services/huggingFaceService';
import { CameraLensIcon, MagicIcon, ImageIcon, LibraryIcon } from './icons.tsx';
import { LoadingSpinner } from './icons.tsx';
import { AssetActions } from './AssetActions';
import { PromptTemplate } from '../types.ts';

interface MythosCinematicStudioProps {
    hfToken: string;
    promptTemplates: PromptTemplate[];
    onAddAssetToGrid: (asset: { type: 'image' | 'video'; base64?: string; url?: string; mimeType?: string; metadata?: any }) => void;
    onAddToStoryboard: (base64: string) => void;
    onAddToInspiration: (base64: string) => void;
}

const RATIOS = [
    { label: '2.39:1 (Cinema)', w: 1536, h: 640 }, // Adjusted for standard SDXL wide
    { label: '16:9 (Wide)', w: 1024, h: 576 },
    { label: '1:1 (Square)', w: 1024, h: 1024 },
    { label: '9:16 (Vertical)', w: 576, h: 1024 },
    { label: '3:2 (Classic)', w: 1024, h: 683 }
];

// --- Cinematic Tiers Definition ---
const CINEMATIC_TIERS = {
    framing: [
        { label: 'Extreme Long Shot (ELS)', value: '(extreme long shot:1.4), (establishing shot:1.2), wide view' },
        { label: 'Long Shot (LS)', value: '(long shot:1.3), full body visible, environmental context' },
        { label: 'Full Shot (FS)', value: '(full shot:1.3), head to toe visible' },
        { label: 'Medium Shot (MS)', value: '(medium shot:1.2), waist up framing' },
        { label: 'Cowboy Shot (CS)', value: '(cowboy shot:1.2), knees up framing' },
        { label: 'Medium Close Up (MCU)', value: '(medium close up:1.3), chest up framing, dialogue focus' },
        { label: 'Close Up (CU)', value: '(close up:1.4), face focus, emotional' },
        { label: 'Extreme Close Up (ECU)', value: '(extreme close up:1.5), macro details, eye focus, intense' }
    ],
    angle: [
        { label: 'Eye Level (Neutral)', value: '(eye level shot:1.0), neutral perspective' },
        { label: 'Low Angle (Heroic)', value: '(low angle shot:1.3), looking up, imposing, heroic' },
        { label: 'High Angle (Vulnerable)', value: '(high angle shot:1.3), looking down, vulnerable' },
        { label: 'Dutch Angle (Tension)', value: '(dutch angle:1.3), tilted frame, disorienting, dynamic' },
        { label: 'Bird\'s Eye (Overhead)', value: '(overhead shot:1.4), aerial view, top-down perspective' },
        { label: 'Worm\'s Eye (Ground)', value: '(worm\'s eye view:1.3), ground level, bug perspective' },
        { label: 'Over the Shoulder (OTS)', value: '(over the shoulder shot:1.2), conversational depth' },
        { label: 'Point of View (POV)', value: '(pov shot:1.3), first person perspective' }
    ],
    lens: [
        { label: 'Standard / Neutral', value: '' },
        { label: 'Wide Angle (14mm-24mm)', value: '(wide angle lens:1.3), (14mm:1.1), deep depth of field, expansive' },
        { label: 'Cinematic Prime (35mm-50mm)', value: '(35mm lens:1.2), natural depth of field, storytelling lens' },
        { label: 'Portrait Telephoto (85mm)', value: '(85mm lens:1.2), flattering perspective, soft background' },
        { label: 'Telephoto (100mm-200mm)', value: '(telephoto lens:1.3), (200mm:1.1), compressed background, strong bokeh' },
        { label: 'Anamorphic (Cinema)', value: '(anamorphic lens:1.4), (oval bokeh:1.2), cinematic flare, horizontal lens flare' },
        { label: 'Macro Lens', value: '(macro lens:1.4), extreme detail, shallow focus' },
        { label: 'Fisheye Lens', value: '(fisheye lens:1.3), distorted edges, ultra wide' }
    ],
    lighting: [
        { label: 'Standard / Balanced', value: 'balanced studio lighting, professional exposure' },
        { label: 'Golden Hour', value: '(golden hour:1.3), warm soft lighting, long shadows, sun flare, magic hour' },
        { label: 'Blue Hour', value: '(blue hour:1.3), cold lighting, twilight, moody' },
        { label: 'High-Key (Bright)', value: '(high-key lighting:1.3), bright, low contrast, soft shadows, optimistic' },
        { label: 'Low-Key / Noir', value: '(low-key lighting:1.4), (chiaroscuro:1.3), high contrast, deep shadows, dramatic, mystery' },
        { label: 'Volumetric (Haze)', value: '(volumetric lighting:1.3), god rays, atmospheric haze, fog, depth' },
        { label: 'Rembrandt', value: '(rembrandt lighting:1.3), triangle of light, dramatic portrait' },
        { label: 'Neon / Cyberpunk', value: '(neon lighting:1.3), cyan and magenta, rim lighting, glow' },
        { label: 'Practical / Diegetic', value: 'practical lighting, lamp light, candle light, realistic source' }
    ]
};

export const MythosCinematicStudio: React.FC<MythosCinematicStudioProps> = ({ 
    hfToken, 
    promptTemplates,
    onAddAssetToGrid,
    onAddToStoryboard,
    onAddToInspiration
}) => {
    const [prompt, setPrompt] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('blurry, low quality, text, watermark, bad anatomy, deformed, sketch, cartoon, 3d render, illustration');
    const [width, setWidth] = useState(RATIOS[0].w); // Default to Cinema
    const [height, setHeight] = useState(RATIOS[0].h); // Default to Cinema
    const [seed, setSeed] = useState<number | undefined>(undefined);
    
    // Tier States
    const [framing, setFraming] = useState(CINEMATIC_TIERS.framing[3].value); // Default MS
    const [angle, setAngle] = useState(CINEMATIC_TIERS.angle[0].value); // Default Eye Level
    const [lens, setLens] = useState(CINEMATIC_TIERS.lens[0].value); // Default Standard
    const [lighting, setLighting] = useState(CINEMATIC_TIERS.lighting[0].value); // Default Balanced
    
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{ base64: string; mimeType: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Compute the final prompt live for preview and generation
    const finalPrompt = useMemo(() => {
        const parts = [];
        
        // Add weighted tags first to set the scene technicals
        if (framing) parts.push(framing);
        if (angle) parts.push(angle);
        if (lens) parts.push(lens);
        if (lighting) parts.push(lighting);
        
        // Add the user's content prompt
        if (prompt.trim()) parts.push(prompt.trim());
        
        // Add technical quality boosters
        parts.push("8k resolution, photorealistic, masterpiece, high fidelity, raw photo, movie still");

        return parts.join(', ');
    }, [framing, angle, lens, lighting, prompt]);

    const handleApplyTemplate = (templateId: string) => {
        const template = promptTemplates.find(t => t.id === templateId);
        if (template) {
            const cleanContent = template.positivePrompt.replace('{{ANALYSIS_TEXT}}', '').trim();
            if (cleanContent) {
                setPrompt(p => p ? `${cleanContent}, ${p}` : cleanContent);
            }
            if (template.negativePrompt) {
                setNegativePrompt(n => n ? `${template.negativePrompt}, ${n}` : template.negativePrompt);
            }
        }
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError("Please describe the subject of your shot.");
            return;
        }
        
        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const usedSeed = seed !== undefined ? seed : Math.floor(Math.random() * 2147483647);
            
            const blob = await generateImageSDXL({
                prompt: finalPrompt,
                negative_prompt: negativePrompt,
                width: width,
                height: height,
                seed: usedSeed,
                // model_name: 'v15', // Removed: Specific to old custom engine
                num_inference_steps: 35, // Recommended steps for SDXL
                guidance_scale: 6.5 // Recommended guidance for SDXL
            }, hfToken); // Removed useCustomEngine: true

            const reader = new FileReader();
            reader.onloadend = () => {
                const base64data = reader.result as string;
                const base64 = base64data.split(',')[1];
                const mimeType = blob.type;
                
                const asset = { base64, mimeType };
                setResult(asset);
                
                // Auto-save to grid
                onAddAssetToGrid({ 
                    type: 'image', 
                    ...asset, 
                    metadata: { 
                        engine: 'MythOS Cinematic', 
                        prompt: finalPrompt, 
                        seed: usedSeed, 
                        width, 
                        height,
                        framing,
                        angle,
                        lens,
                        lighting
                    } 
                });
            };
            reader.readAsDataURL(blob);

        } catch (e) {
            console.error("MythOS Engine Error:", e);
            setError(e instanceof Error ? e.message : "Generation failed");
        } finally {
            setIsLoading(false);
        }
    };

    const TierSelect: React.FC<{ 
        label: string; 
        options: { label: string, value: string }[]; 
        value: string; 
        onChange: (val: string) => void 
    }> = ({ label, options, value, onChange }) => (
        <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{label}</label>
            <select 
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-600 p-2 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
            >
                {options.map((opt, i) => <option key={i} value={opt.value}>{opt.label}</option>)}
            </select>
        </div>
    );

    return (
        <div className="p-6 max-w-7xl mx-auto w-full h-full flex flex-col space-y-6 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-neutral-200 mb-2">Engine: MythOS Cinematic <span className="text-lg font-normal text-neutral-500">v1.0 (Public SDXL)</span></h2>
                    <p className="text-neutral-400">Next-generation photography engine based on Illustrious SDXL. Designed for high-fidelity cinematic stills.</p>
                </div>
                <div className="px-3 py-1 bg-purple-900/30 border border-purple-500/30 rounded-full text-xs font-bold text-purple-300">
                    CINEMA TIER
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Controls */}
                <div className="lg:col-span-1 bg-neutral-800/50 p-6 border border-neutral-700 rounded-xl space-y-6 h-fit">
                    
                    {/* The 4 Cinematic Tiers */}
                    <div className="bg-neutral-900/50 p-4 rounded-lg border border-neutral-700 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <CameraLensIcon className="w-4 h-4 text-purple-400" />
                            <span className="text-xs font-bold text-purple-200 uppercase tracking-widest">Cinematography Tiers</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <TierSelect 
                                label="Tier 1: Shot Size" 
                                options={CINEMATIC_TIERS.framing} 
                                value={framing} 
                                onChange={setFraming} 
                            />
                            <TierSelect 
                                label="Tier 2: Angle" 
                                options={CINEMATIC_TIERS.angle} 
                                value={angle} 
                                onChange={setAngle} 
                            />
                            <TierSelect 
                                label="Tier 3: Lens" 
                                options={CINEMATIC_TIERS.lens} 
                                value={lens} 
                                onChange={setLens} 
                            />
                            <TierSelect 
                                label="Tier 4: Lighting" 
                                options={CINEMATIC_TIERS.lighting} 
                                value={lighting} 
                                onChange={setLighting} 
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">Subject & Action</label>
                            <div className="relative group">
                                <select 
                                    onChange={(e) => {
                                        handleApplyTemplate(e.target.value);
                                        e.target.value = ""; // Reset
                                    }} 
                                    defaultValue="" 
                                    className="appearance-none bg-neutral-800 border border-neutral-600 rounded px-2 py-0.5 text-[10px] text-blue-300 font-bold outline-none cursor-pointer hover:border-blue-500 pr-6"
                                >
                                    <option value="" disabled>+ Load Style</option>
                                    {promptTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                                <LibraryIcon className="w-3 h-3 text-blue-300 absolute right-2 top-1.5 pointer-events-none" />
                            </div>
                        </div>
                        <textarea 
                            value={prompt} 
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Describe the subject, action, and clothing details..." 
                            className="w-full h-32 bg-neutral-900 border border-neutral-600 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none text-neutral-200 text-sm"
                        />
                        {/* Live Preview of Final Prompt */}
                        {finalPrompt && (
                            <div className="mt-2 p-3 bg-black/40 border border-white/5 rounded text-[10px] text-neutral-500 font-mono break-words leading-tight">
                                <span className="text-purple-500 font-bold uppercase block mb-1">Engine Input Stream:</span>
                                {finalPrompt}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Negative Prompt</label>
                        <textarea 
                            value={negativePrompt} 
                            onChange={(e) => setNegativePrompt(e.target.value)}
                            className="w-full h-16 bg-neutral-900 border border-neutral-600 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none text-neutral-400 text-xs"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Aspect Ratio</label>
                        <div className="grid grid-cols-2 gap-2">
                            {RATIOS.map(r => (
                                <button 
                                    key={r.label}
                                    onClick={() => { setWidth(r.w); setHeight(r.h); }}
                                    className={`px-2 py-2 rounded text-xs font-medium border transition-colors ${
                                        width === r.w && height === r.h 
                                            ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/20' 
                                            : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white'
                                    }`}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Seed (Optional)</label>
                        <input 
                            type="number" 
                            placeholder="Random" 
                            value={seed ?? ''} 
                            onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : undefined)}
                            className="w-full bg-neutral-900 border border-neutral-600 p-2 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || !prompt.trim()}
                        className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <><LoadingSpinner className="w-5 h-5 text-white" /> Developing...</>
                        ) : (
                            <><CameraLensIcon className="w-5 h-5" /> Shoot Frame</>
                        )}
                    </button>

                    {error && (
                        <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-200 text-sm">
                            {error}
                        </div>
                    )}
                </div>

                {/* Preview */}
                <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col relative overflow-hidden min-h-[600px]">
                    <div className="flex-grow flex items-center justify-center bg-black relative p-8">
                        {isLoading ? (
                            <div className="flex flex-col items-center">
                                <LoadingSpinner className="w-12 h-12 text-purple-500" />
                                <p className="mt-4 text-neutral-400 animate-pulse font-mono text-sm">Rendering on MythOS Engine...</p>
                            </div>
                        ) : result ? (
                            <img 
                                src={`data:${result.mimeType};base64,${result.base64}`} 
                                alt="Cinematic Result" 
                                className="max-w-full max-h-[75vh] object-contain shadow-2xl rounded-sm ring-1 ring-white/10" 
                            />
                        ) : (
                            <div className="text-neutral-600 flex flex-col items-center select-none opacity-50">
                                <div className="w-24 h-24 border-2 border-dashed border-neutral-700 rounded-full flex items-center justify-center mb-4">
                                    <CameraLensIcon className="w-10 h-10" />
                                </div>
                                <p className="text-sm font-medium">Ready to Shoot</p>
                                <p className="text-xs mt-1">Configure your Cinematic Tiers on the left.</p>
                            </div>
                        )}
                    </div>

                    {result && !isLoading && (
                        <div className="p-4 border-t border-neutral-800 bg-neutral-800/90 backdrop-blur-sm flex justify-center">
                            <AssetActions 
                                asset={{ type: 'image', base64: result.base64, mimeType: result.mimeType }}
                                onSaveToGrid={() => onAddAssetToGrid({ type: 'image', base64: result.base64, mimeType: result.mimeType })}
                                onSaveToStoryboard={() => onAddToStoryboard(result.base64)}
                                onSaveToInspiration={() => onAddToInspiration(result.base64)}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};