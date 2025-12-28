
import React, { useState, useRef } from 'react';
import { QwenImageEditState } from '../types.ts';
import { LoadingSpinner, ImageIcon, MagicIcon, ChevronDownIcon, EditIcon } from './icons.tsx';
import { AssetActions } from './AssetActions.tsx';
import { getGradioClient } from '../services/gradioService';

interface QwenImageEditStudioProps {
    state: QwenImageEditState;
    onStateUpdate: (newState: QwenImageEditState) => void;
    onAddToStoryboard: (base64: string) => void;
    onAddToInspiration: (base64: string) => void;
    onAddAssetToGrid?: (asset: { type: 'image' | 'video'; base64?: string; url?: string; mimeType?: string }) => void;
    hfToken?: string;
}

const base64ToBlob = async (base64: string, mimeType: string): Promise<Blob> => {
    const res = await fetch(`data:${mimeType};base64,${base64}`);
    return await res.blob();
};

export const QwenImageEditStudio: React.FC<QwenImageEditStudioProps> = ({ 
    state, 
    onStateUpdate, 
    onAddToStoryboard, 
    onAddToInspiration,
    onAddAssetToGrid,
    hfToken 
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<string>('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                const mimeType = result.split(',')[0].split(':')[1].split(';')[0];
                const base64 = result.split(',')[1];
                onStateUpdate({ ...state, source: { base64, mimeType }, result: null });
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    const handleReset = () => {
        onStateUpdate({
            ...state,
            rotate: 0,
            moveForward: 0,
            verticalAngle: 0,
            wideAngle: false,
            seed: 0,
            randomizeSeed: true,
            guidanceScale: 1,
            steps: 4,
            height: 1024,
            width: 1024
        });
    };

    const handleGenerate = async () => {
        if (!state.source) {
            setError("Please upload a source image.");
            return;
        }
        
        setIsLoading(true);
        setError(null);
        setProgress('Initializing Angler...');
        
        try {
            const blob = await base64ToBlob(state.source.base64, state.source.mimeType);
            
            // Connect to linoyts/Qwen-Image-Edit-Angles space
            const client = await getGradioClient("linoyts/Qwen-Image-Edit-Angles", { hfToken });
            
            setProgress('Transforming perspective...');
            
            /* 
               Based on the /infer_and_show_video_button endpoint mapping:
               param_0: input image
               param_1: rotate (0)
               param_2: move forward (0)
               param_3: vertical (0)
               param_4: wide (false)
               param_5: seed (0)
               param_6: randomize (true)
               param_7: guidance (1)
               param_8: steps (4)
               param_9: height (1024)
               param_10: width (1024)
               param_11: input image again
            */
            const result = await client.predict("/infer_and_show_video_button", [
                blob, 
                state.rotate, 
                state.moveForward, 
                state.verticalAngle, 
                state.wideAngle, 
                state.seed, 
                state.randomizeSeed, 
                state.guidanceScale, 
                state.steps, 
                state.height, 
                state.width,
                blob // Input image repeated as param_11
            ]);

            if (result && result.data && result.data.length > 0) {
                // Returns [output_image_path, seed, processed_prompt]
                let resultUrl = '';
                const output = result.data[0];
                
                if (typeof output === 'string') {
                    resultUrl = output;
                } else if (output?.url) {
                    resultUrl = output.url;
                } else if (typeof output === 'object' && output?.image?.url) {
                    resultUrl = output.image.url;
                }

                if (resultUrl) {
                    // Fetch result to convert to base64
                    const response = await fetch(resultUrl);
                    const resultBlob = await response.blob();
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64data = reader.result as string;
                        const base64 = base64data.split(',')[1];
                        onStateUpdate({ 
                            ...state, 
                            result: { base64, mimeType: resultBlob.type } 
                        });
                        setIsLoading(false);
                    };
                    reader.readAsDataURL(resultBlob);
                } else {
                    throw new Error("Could not parse result from AI service.");
                }
            } else {
                throw new Error("API returned no data.");
            }

        } catch (err: any) {
            console.error("Angler Edit Error:", err);
            let errorMessage = "Image edit failed.";
            if (err instanceof Error) {
                errorMessage = err.message;
                if (errorMessage.includes("Space metadata")) {
                    errorMessage = "Failed to connect to AI Service. Please check your HF Token or try again later.";
                }
            }
            setError(errorMessage);
            setIsLoading(false);
        } finally {
            setProgress('');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto w-full h-full flex flex-col space-y-6 overflow-y-auto">
            <div className="flex-shrink-0">
                <h2 className="text-3xl font-bold text-neutral-200 mb-2">Angler <span className="text-sm font-normal text-neutral-500 bg-neutral-800 px-2 py-1 rounded ml-2">Qwen Edit</span></h2>
                <p className="text-neutral-400">Modify camera angles, zoom, and perspective using precise controls.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-grow">
                {/* Controls Column */}
                <div className="lg:col-span-1 flex flex-col gap-6 bg-neutral-800/50 p-6 rounded-xl border border-neutral-700 h-fit">
                    
                    {/* Primary Controls */}
                    <div className="space-y-6">
                        <div>
                            <label className="flex justify-between text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                                <span>Rotate Right-Left</span>
                                <span className="text-blue-400">{state.rotate}°</span>
                            </label>
                            <input 
                                type="range" 
                                min="-90" max="90" step="1"
                                value={state.rotate}
                                onChange={(e) => onStateUpdate({ ...state, rotate: parseInt(e.target.value) })}
                                className="w-full accent-blue-500"
                            />
                            <div className="flex justify-between text-[10px] text-neutral-600 mt-1">
                                <span>-90°</span>
                                <span>0°</span>
                                <span>90°</span>
                            </div>
                        </div>

                        <div>
                            <label className="flex justify-between text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                                <span>Move Forward → Close-Up</span>
                                <span className="text-blue-400">{state.moveForward}</span>
                            </label>
                            <input 
                                type="range" 
                                min="0" max="10" step="0.1"
                                value={state.moveForward}
                                onChange={(e) => onStateUpdate({ ...state, moveForward: parseFloat(e.target.value) })}
                                className="w-full accent-blue-500"
                            />
                            <div className="flex justify-between text-[10px] text-neutral-600 mt-1">
                                <span>0</span>
                                <span>10</span>
                            </div>
                        </div>

                        <div>
                            <label className="flex justify-between text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                                <span>Vertical Angle (Bird ↔ Worm)</span>
                                <span className="text-blue-400">{state.verticalAngle}</span>
                            </label>
                            <input 
                                type="range" 
                                min="-1" max="1" step="0.1"
                                value={state.verticalAngle}
                                onChange={(e) => onStateUpdate({ ...state, verticalAngle: parseFloat(e.target.value) })}
                                className="w-full accent-blue-500"
                            />
                            <div className="flex justify-between text-[10px] text-neutral-600 mt-1">
                                <span>-1 (Worm)</span>
                                <span>0</span>
                                <span>1 (Bird)</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between bg-neutral-900/50 p-3 rounded-lg border border-neutral-700">
                            <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider cursor-pointer select-none" htmlFor="wideAngle">Wide-Angle Lens</label>
                            <input 
                                id="wideAngle"
                                type="checkbox" 
                                checked={state.wideAngle}
                                onChange={(e) => onStateUpdate({ ...state, wideAngle: e.target.checked })}
                                className="w-5 h-5 accent-blue-500 rounded cursor-pointer"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button 
                            onClick={handleReset}
                            className="flex-1 py-2 bg-neutral-700 hover:bg-neutral-600 text-white text-xs font-bold uppercase rounded-lg transition-colors"
                        >
                            Reset
                        </button>
                    </div>

                    {/* Advanced Settings */}
                    <div className="border-t border-neutral-700 pt-4">
                        <button 
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center justify-between w-full text-left text-xs font-bold text-neutral-400 hover:text-white uppercase tracking-wider transition-colors"
                        >
                            <span>Advanced Settings</span>
                            <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {showAdvanced && (
                            <div className="mt-4 space-y-4 bg-neutral-900/50 p-4 rounded-lg animate-fade-in">
                                <div>
                                    <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Seed</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="number" 
                                            value={state.seed}
                                            onChange={(e) => onStateUpdate({ ...state, seed: parseInt(e.target.value), randomizeSeed: false })}
                                            className="w-full bg-neutral-800 border border-neutral-600 rounded p-1.5 text-xs text-white"
                                            disabled={state.randomizeSeed}
                                        />
                                        <label className="flex items-center gap-1 text-[10px] text-neutral-400 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={state.randomizeSeed} 
                                                onChange={(e) => onStateUpdate({ ...state, randomizeSeed: e.target.checked })}
                                            /> Random
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="flex justify-between text-[10px] font-bold text-neutral-500 uppercase mb-1">
                                        <span>Guidance Scale</span>
                                        <span>{state.guidanceScale}</span>
                                    </label>
                                    <input 
                                        type="range" min="1" max="10" step="0.5"
                                        value={state.guidanceScale}
                                        onChange={(e) => onStateUpdate({ ...state, guidanceScale: parseFloat(e.target.value) })}
                                        className="w-full accent-blue-500 h-1"
                                    />
                                </div>

                                <div>
                                    <label className="flex justify-between text-[10px] font-bold text-neutral-500 uppercase mb-1">
                                        <span>Inference Steps</span>
                                        <span>{state.steps}</span>
                                    </label>
                                    <input 
                                        type="range" min="1" max="40" step="1"
                                        value={state.steps}
                                        onChange={(e) => onStateUpdate({ ...state, steps: parseInt(e.target.value) })}
                                        className="w-full accent-blue-500 h-1"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Height</label>
                                        <input 
                                            type="number" min="256" max="2048" step="16"
                                            value={state.height}
                                            onChange={(e) => onStateUpdate({ ...state, height: parseInt(e.target.value) })}
                                            className="w-full bg-neutral-800 border border-neutral-600 rounded p-1.5 text-xs text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Width</label>
                                        <input 
                                            type="number" min="256" max="2048" step="16"
                                            value={state.width}
                                            onChange={(e) => onStateUpdate({ ...state, width: parseInt(e.target.value) })}
                                            className="w-full bg-neutral-800 border border-neutral-600 rounded p-1.5 text-xs text-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || !state.source}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-auto"
                    >
                        {isLoading ? (
                            <><LoadingSpinner className="w-5 h-5 text-white" /> {progress || 'Processing...'}</>
                        ) : (
                            <><EditIcon className="w-5 h-5" /> Generate View</>
                        )}
                    </button>
                    
                    {error && (
                        <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-200 text-xs font-medium">
                            {error}
                        </div>
                    )}
                </div>

                {/* Preview & Result Column */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Source Image Area */}
                    <div className="bg-neutral-800/50 p-6 border border-neutral-700 rounded-xl flex-grow flex flex-col items-center justify-center relative min-h-[300px]">
                        {state.source ? (
                            <div className="relative w-full h-full flex items-center justify-center bg-black/40 rounded-lg overflow-hidden border border-neutral-700">
                                <img 
                                    src={`data:${state.source.mimeType};base64,${state.source.base64}`} 
                                    alt="Source"
                                    className="max-w-full max-h-[400px] object-contain" 
                                />
                                <button 
                                    onClick={() => onStateUpdate({ ...state, source: null, result: null })}
                                    className="absolute top-2 right-2 p-2 bg-black/60 text-white rounded-full hover:bg-red-600 transition-colors"
                                    title="Remove Image"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                </button>
                            </div>
                        ) : (
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="text-center cursor-pointer p-8 border-2 border-dashed border-neutral-600 rounded-xl hover:border-neutral-400 hover:bg-neutral-800/50 transition-all w-full h-full flex flex-col items-center justify-center min-h-[200px]"
                            >
                                <div className="mb-4 p-4 bg-neutral-800 rounded-full">
                                    <ImageIcon className="w-12 h-12 text-neutral-500" />
                                </div>
                                <h3 className="text-xl font-bold text-neutral-400">Upload Source</h3>
                                <p className="text-sm text-neutral-500 mt-2">Image to modify</p>
                            </div>
                        )}
                        <input 
                            ref={fileInputRef} 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleUpload} 
                        />
                    </div>

                    {/* Result Area */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col relative overflow-hidden min-h-[400px]">
                        <div className="p-4 border-b border-neutral-800 bg-neutral-800/90 backdrop-blur-sm flex justify-between items-center">
                            <h3 className="font-bold text-neutral-300">Edited View</h3>
                            {state.result && (
                                <div className="text-xs text-green-400 font-bold bg-green-900/30 px-2 py-1 rounded border border-green-500/30">Success</div>
                            )}
                        </div>
                        
                        <div className="flex-grow flex items-center justify-center bg-[url('https://transparenttextures.com/patterns/cubes.png')] bg-neutral-800/30 p-4">
                            {isLoading ? (
                                <div className="flex flex-col items-center">
                                    <LoadingSpinner className="w-12 h-12 text-blue-500" />
                                    <p className="mt-4 text-neutral-400 animate-pulse font-mono text-sm">{progress}</p>
                                </div>
                            ) : state.result ? (
                                <img 
                                    src={`data:${state.result.mimeType};base64,${state.result.base64}`} 
                                    alt="Edited Result"
                                    className="max-w-full max-h-full object-contain shadow-2xl"
                                />
                            ) : (
                                <div className="text-neutral-600 flex flex-col items-center select-none">
                                    <div className="w-20 h-20 border-2 border-dashed border-neutral-700 rounded-full flex items-center justify-center mb-4">
                                        <MagicIcon className="w-10 h-10 opacity-30" />
                                    </div>
                                    <p className="text-sm font-medium opacity-50">Result will appear here</p>
                                </div>
                            )}
                        </div>

                        {state.result && !isLoading && (
                            <div className="p-4 border-t border-neutral-800 bg-neutral-800/90 backdrop-blur-sm flex justify-center">
                                <AssetActions 
                                    asset={{ type: 'image', base64: state.result.base64, mimeType: state.result.mimeType }}
                                    onSaveToGrid={onAddAssetToGrid ? () => onAddAssetToGrid({ type: 'image', base64: state.result!.base64, mimeType: state.result!.mimeType }) : undefined}
                                    onSaveToStoryboard={() => onAddToStoryboard(state.result!.base64)}
                                    onSaveToInspiration={() => onAddToInspiration(state.result!.base64)}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
