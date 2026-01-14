
import React, { useState, useRef } from 'react';
import { TransitionState } from '../types.ts';
import { LoadingSpinner, TransitionIcon, ClapperboardIcon, ChevronDownIcon } from './icons.tsx';
import { AssetActions } from './AssetActions';
import { getGradioClient } from '../services/gradioService';

interface TransitionStudioProps {
    state: TransitionState;
    onStateUpdate: (newState: TransitionState) => void;
    onAddAssetToGrid: (asset: { type: 'image' | 'video'; base64?: string; url?: string; mimeType?: string }, targetProjectId?: string) => void;
    onAddToStoryboard: (base64: string) => void;
    onAddToInspiration: (base64: string) => void;
    hfToken?: string;
    projects: { id: string; name: string }[];
    activeProjectId?: string;
}

const base64ToBlob = async (base64: string, mimeType: string): Promise<Blob> => {
    const res = await fetch(`data:${mimeType};base64,${base64}`);
    return await res.blob();
};

const ImageUpload: React.FC<{
    title: string;
    image: { base64: string; mimeType: string } | null;
    onUpload: (file: File) => void;
    onRemove: () => void;
}> = ({ title, image, onUpload, onRemove }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) onUpload(e.target.files[0]);
        e.target.value = '';
    };

    return (
        <div 
            onClick={() => inputRef.current?.click()}
            className="w-full h-full bg-neutral-900 border-2 border-dashed border-neutral-700 rounded-xl flex items-center justify-center cursor-pointer hover:bg-neutral-800/50 hover:border-neutral-500 transition-all relative overflow-hidden group"
        >
            {image ? (
                <>
                    <img src={`data:${image.mimeType};base64,${image.base64}`} className="w-full h-full object-cover" />
                    <button 
                        onClick={(e) => { e.stopPropagation(); onRemove(); }}
                        className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </button>
                </>
            ) : (
                <div className="text-center text-neutral-500 group-hover:text-blue-400">
                    <span className="text-2xl font-light">+</span>
                    <p className="text-xs font-bold uppercase tracking-wider mt-1">{title}</p>
                </div>
            )}
            <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={handleChange} />
        </div>
    );
};

export const TransitionStudio: React.FC<TransitionStudioProps> = ({ 
    state, 
    onStateUpdate, 
    onAddAssetToGrid, 
    onAddToStoryboard, 
    onAddToInspiration,
    hfToken,
    projects,
    activeProjectId 
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const handleUpload = (type: 'start' | 'end', file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            const mimeType = result.split(',')[0].split(':')[1].split(';')[0];
            const base64 = result.split(',')[1];
            if (type === 'start') {
                onStateUpdate({ ...state, startImage: { base64, mimeType } });
            } else {
                onStateUpdate({ ...state, endImage: { base64, mimeType } });
            }
        };
        reader.readAsDataURL(file);
    };

    const handleGenerate = async () => {
        if (!state.startImage || !state.endImage) {
            setError("Both Start and End frames are required.");
            return;
        }
        
        setIsLoading(true);
        setError(null);
        setProgress('Initializing video transition model...');
        onStateUpdate({ ...state, resultUrl: null });

        try {
            const startBlob = await base64ToBlob(state.startImage.base64, state.startImage.mimeType);
            const endBlob = await base64ToBlob(state.endImage.base64, state.endImage.mimeType);

            const client = await getGradioClient("GiorgioV/test-wan-2-2-first-last-frame", { hfToken });
            
            setProgress('Generating transition video...');
            
            const result = await client.predict("/generate_video", { 
                start_image_pil: startBlob,
                end_image_pil: endBlob,
                prompt: state.prompt || "A beautiful transition",
                negative_prompt: state.negativePrompt,
                duration_seconds: state.duration,
                steps: state.steps,
                guidance_scale: state.guidanceScale,
                guidance_scale_2: state.guidanceScale2,
                seed: state.seed,
                randomize_seed: state.randomizeSeed
            });

            if (result?.data?.[0]?.url) {
                const newSeed = result.data[1];
                onStateUpdate({ 
                    ...state, 
                    resultUrl: result.data[0].url,
                    seed: state.randomizeSeed ? newSeed : state.seed // Update seed if it was randomized
                });
            } else {
                throw new Error("Could not parse video URL from the model's response.");
            }
        } catch (err) {
            console.error("Transition generation error:", err);
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
            setProgress('');
        }
    };
    
    const extractThumbnail = (callback: (base64: string) => void) => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            callback(canvas.toDataURL('image/jpeg').split(',')[1]);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto w-full h-full flex flex-col space-y-6 overflow-y-auto">
            <div className="flex-shrink-0">
                <h2 className="text-3xl font-bold text-neutral-200 mb-2">Transition Studio</h2>
                <p className="text-neutral-400">Generate a video that smoothly transitions between a start and end frame.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow">
                <ImageUpload title="Start Frame" image={state.startImage} onUpload={(f) => handleUpload('start', f)} onRemove={() => onStateUpdate({...state, startImage: null})} />
                
                <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6 flex flex-col gap-4">
                    <textarea 
                        value={state.prompt}
                        onChange={(e) => onStateUpdate({ ...state, prompt: e.target.value })}
                        placeholder="Describe the transition..."
                        className="w-full h-24 bg-neutral-900 border border-neutral-600 rounded p-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                    />
                    
                    {/* Advanced Settings */}
                    <div className="border-t border-neutral-700 pt-4">
                        <button 
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center justify-between w-full text-left text-xs font-bold text-neutral-400 hover:text-white uppercase tracking-wider"
                        >
                            <span>Advanced Settings</span>
                            <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {showAdvanced && (
                            <div className="mt-4 space-y-3 bg-neutral-900/50 p-3 rounded-lg border border-neutral-700/50">
                                <textarea 
                                    value={state.negativePrompt}
                                    onChange={(e) => onStateUpdate({ ...state, negativePrompt: e.target.value })}
                                    placeholder="Negative prompt..."
                                    className="w-full h-20 bg-neutral-800 border border-neutral-600 rounded p-2 text-xs"
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] text-neutral-500">Duration ({state.duration}s)</label>
                                        <input type="range" min="1" max="5" step="0.1" value={state.duration} onChange={e => onStateUpdate({...state, duration: parseFloat(e.target.value)})} className="w-full" />
                                    </div>
                                     <div>
                                        <label className="text-[10px] text-neutral-500">Steps ({state.steps})</label>
                                        <input type="range" min="1" max="25" step="1" value={state.steps} onChange={e => onStateUpdate({...state, steps: parseInt(e.target.value)})} className="w-full" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-neutral-500">Guidance (High): {state.guidanceScale}</label>
                                        <input type="range" min="0" max="10" step="0.5" value={state.guidanceScale} onChange={e => onStateUpdate({...state, guidanceScale: parseFloat(e.target.value)})} className="w-full" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-neutral-500">Guidance (Low): {state.guidanceScale2}</label>
                                        <input type="range" min="0" max="10" step="0.5" value={state.guidanceScale2} onChange={e => onStateUpdate({...state, guidanceScale2: parseFloat(e.target.value)})} className="w-full" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-neutral-500">Seed</label>
                                    <div className="flex gap-2">
                                        <input type="number" value={state.seed} onChange={e => onStateUpdate({...state, seed: parseInt(e.target.value), randomizeSeed: false})} className="w-full bg-neutral-800 border border-neutral-600 rounded p-1 text-xs" disabled={state.randomizeSeed}/>
                                        <label className="flex items-center gap-1 text-[10px] text-neutral-400"><input type="checkbox" checked={state.randomizeSeed} onChange={e => onStateUpdate({...state, randomizeSeed: e.target.checked})}/> Random</label>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || !state.startImage || !state.endImage}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-auto"
                    >
                        {isLoading ? <LoadingSpinner className="w-5 h-5" /> : <TransitionIcon className="w-5 h-5" />}
                        {isLoading ? (progress || 'Generating...') : 'Generate Transition'}
                    </button>
                    {error && <p className="text-xs text-red-400 text-center">{error}</p>}
                </div>
                
                <ImageUpload title="End Frame" image={state.endImage} onUpload={(f) => handleUpload('end', f)} onRemove={() => onStateUpdate({...state, endImage: null})} />
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col relative overflow-hidden min-h-[400px]">
                <div className="p-4 border-b border-neutral-800 bg-neutral-800/50 flex justify-between items-center">
                    <h3 className="font-bold text-neutral-300">Result Video</h3>
                </div>
                <div className="flex-grow flex items-center justify-center bg-black p-4">
                    {isLoading ? (
                        <div className="text-center text-neutral-400">
                            <LoadingSpinner className="w-12 h-12 mx-auto mb-4" />
                            <p>{progress}</p>
                        </div>
                    ) : state.resultUrl ? (
                        <video ref={videoRef} src={state.resultUrl} controls autoPlay loop className="max-w-full max-h-full" crossOrigin="anonymous" />
                    ) : (
                        <div className="text-neutral-600 text-center">
                            <ClapperboardIcon className="w-16 h-16 mx-auto mb-2" />
                            <p>Result will appear here</p>
                        </div>
                    )}
                </div>
                 {state.resultUrl && !isLoading && (
                    <div className="p-4 border-t border-neutral-800 bg-neutral-800/50 flex justify-center">
                        <AssetActions 
                            asset={{ type: 'video', url: state.resultUrl }}
                            onSaveToGrid={(pid) => onAddAssetToGrid({ type: 'video', url: state.resultUrl! }, pid)}
                            onSaveToStoryboard={() => extractThumbnail(onAddToStoryboard)}
                            projects={projects}
                            activeProjectId={activeProjectId}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
