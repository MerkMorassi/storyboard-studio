
import React, { useState } from 'react';
import { generateImageSDXL } from '../services/huggingFaceService';
import { CameraLensIcon, MagicIcon, ImageIcon } from './icons.tsx';
import { LoadingSpinner } from './icons.tsx';
import { AssetActions } from './AssetActions';

interface MythosCinematicStudioProps {
    hfToken: string;
    onAddAssetToGrid: (asset: { type: 'image' | 'video'; base64?: string; url?: string; mimeType?: string; metadata?: any }) => void;
    onAddToStoryboard: (base64: string) => void;
    onAddToInspiration: (base64: string) => void;
}

const RATIOS = [
    { label: '2.39:1 (Cinema)', w: 2304, h: 960 },
    { label: '16:9 (Wide)', w: 1344, h: 768 },
    { label: '1:1 (Square)', w: 1024, h: 1024 },
    { label: '9:16 (Vertical)', w: 768, h: 1344 },
];

const SHOT_TYPES = [
    "None",
    "Extreme Close Up",
    "Close Up",
    "Medium Close Up",
    "Medium Shot",
    "Cowboy Shot",
    "Full Shot", 
    "Long Shot",
    "Extreme Long Shot",
    "Establishing Shot"
];

const CAMERA_ANGLES = [
    "None",
    "Eye Level",
    "Low Angle",
    "High Angle",
    "Bird's Eye View (Overhead)",
    "Worm's Eye View",
    "Dutch Angle",
    "Over the Shoulder",
    "Point of View (POV)"
];

export const MythosCinematicStudio: React.FC<MythosCinematicStudioProps> = ({ 
    hfToken, 
    onAddAssetToGrid,
    onAddToStoryboard,
    onAddToInspiration
}) => {
    const [prompt, setPrompt] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('blurry, low quality, text, watermark, bad anatomy, deformed, sketch, cartoon');
    const [width, setWidth] = useState(2304);
    const [height, setHeight] = useState(960);
    const [seed, setSeed] = useState<number | undefined>(undefined);
    const [shotType, setShotType] = useState(SHOT_TYPES[0]);
    const [cameraAngle, setCameraAngle] = useState(CAMERA_ANGLES[0]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{ base64: string; mimeType: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const usedSeed = seed !== undefined ? seed : Math.floor(Math.random() * 2147483647);
            
            // Construct Final Prompt
            const promptParts = [];
            if (shotType !== "None") promptParts.push(shotType);
            if (cameraAngle !== "None") promptParts.push(cameraAngle);
            promptParts.push(prompt);
            const finalPrompt = promptParts.join(', ');

            const blob = await generateImageSDXL({
                prompt: finalPrompt,
                negative_prompt: negativePrompt,
                width: width,
                height: height,
                seed: usedSeed,
                model_name: 'v15', // Specific to MythOS Engine
                num_inference_steps: 30,
                guidance_scale: 7.0
            }, hfToken, true);

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
                        shotType,
                        cameraAngle
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

    return (
        <div className="p-6 max-w-7xl mx-auto w-full h-full flex flex-col space-y-6 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-neutral-200 mb-2">Engine: MythOS Cinematic <span className="text-lg font-normal text-neutral-500">v1.0</span></h2>
                    <p className="text-neutral-400">Next-generation photography engine based on MythOS SDXL. Designed for high-fidelity cinematic stills.</p>
                </div>
                <div className="px-3 py-1 bg-blue-900/30 border border-blue-500/30 rounded-full text-xs font-bold text-blue-300">
                    BETA ACCESS
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Controls */}
                <div className="lg:col-span-1 bg-neutral-800/50 p-6 border border-neutral-700 rounded-xl space-y-6 h-fit">
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Shot Type</label>
                            <select 
                                value={shotType}
                                onChange={(e) => setShotType(e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-600 p-2 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                {SHOT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Camera Angle</label>
                            <select 
                                value={cameraAngle}
                                onChange={(e) => setCameraAngle(e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-600 p-2 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                {CAMERA_ANGLES.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Prompt</label>
                        <textarea 
                            value={prompt} 
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Describe the shot..." 
                            className="w-full h-32 bg-neutral-900 border border-neutral-600 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-neutral-200 text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Negative Prompt</label>
                        <textarea 
                            value={negativePrompt} 
                            onChange={(e) => setNegativePrompt(e.target.value)}
                            className="w-full h-16 bg-neutral-900 border border-neutral-600 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-neutral-400 text-xs"
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
                                            ? 'bg-blue-600 border-blue-500 text-white' 
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
                            className="w-full bg-neutral-900 border border-neutral-600 p-2 rounded-lg text-sm text-white focus:outline-none"
                        />
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || !prompt.trim()}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                                <LoadingSpinner className="w-12 h-12 text-blue-500" />
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
                                <p className="text-xs mt-1">Configure your shot settings on the left.</p>
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
