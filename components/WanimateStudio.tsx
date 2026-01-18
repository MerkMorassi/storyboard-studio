
import React, { useState, useRef } from 'react';
import { WanimateState } from '../types';
import { LoadingSpinner, ClapperboardIcon, CameraLensIcon, RefreshCwIcon } from './icons';
import { AssetActions } from './AssetActions';
import { getGradioClient } from '../services/gradioService';
import { extractFramesFromVideo } from '../utils/video';

interface WanimateStudioProps {
    state: WanimateState;
    onStateUpdate: (newState: WanimateState) => void;
    onAddAssetToGrid: (asset: { type: 'image' | 'video'; base64?: string; url?: string; mimeType?: string }, targetProjectId?: string) => void;
    onAddToStoryboard: (base64: string) => void;
    hfToken?: string;
    projects: { id: string; name: string }[];
    activeProjectId?: string;
}

const base64ToBlob = async (base64: string, mimeType: string): Promise<Blob> => {
    const res = await fetch(`data:${mimeType};base64,${base64}`);
    return await res.blob();
};

const ImageInput: React.FC<{
    image: { base64: string, mimeType: string } | null;
    onUpload: (file: File) => void;
    onClear: () => void;
    title: string;
}> = ({ image, onUpload, onClear, title }) => {
    const ref = useRef<HTMLInputElement>(null);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if(e.target.files?.[0]) onUpload(e.target.files[0]);
    };
    return (
        <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">{title}</label>
            <div onClick={() => ref.current?.click()} className="aspect-video bg-neutral-900/50 border-2 border-dashed border-neutral-700 rounded-lg flex items-center justify-center cursor-pointer hover:bg-neutral-800 transition-all relative group overflow-hidden">
                {image ? (
                    <>
                        <img src={`data:${image.mimeType};base64,${image.base64}`} className="w-full h-full object-contain" alt={title} />
                        <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="absolute top-1 right-1 bg-black/60 p-1 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">&times;</button>
                    </>
                ) : (
                    <div className="text-neutral-500 text-center"><span className="text-xl">+</span><p className="text-[10px] uppercase font-bold">Upload</p></div>
                )}
                <input type="file" ref={ref} onChange={handleChange} className="hidden" accept="image/*" />
            </div>
        </div>
    );
}

export const WanimateStudio: React.FC<WanimateStudioProps> = ({ state, onStateUpdate, onAddAssetToGrid, onAddToStoryboard, hfToken, projects, activeProjectId }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState('');
    const videoRef = useRef<HTMLVideoElement>(null);

    const handleUpload = (type: 'start' | 'end', file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            const mimeType = result.split(',')[0].split(':')[1].split(';')[0];
            const base64 = result.split(',')[1];
            if (type === 'start') {
                onStateUpdate({ ...state, inputImage: { base64, mimeType } });
            } else {
                onStateUpdate({ ...state, lastImage: { base64, mimeType } });
            }
        };
        reader.readAsDataURL(file);
    };

    const handleGenerate = async () => {
        if (!state.inputImage) {
            setError("Input Image is required.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setProgress('Connecting to Wan 2.2...');

        try {
            const client = await getGradioClient("r3gm/wan2-2-fp8da-aoti-preview2", { hfToken });
            setProgress('Preparing payload...');
            
            const payload: any = {
                input_image: await base64ToBlob(state.inputImage.base64, state.inputImage.mimeType),
                last_image: state.lastImage ? await base64ToBlob(state.lastImage.base64, state.lastImage.mimeType) : await base64ToBlob(state.inputImage.base64, state.inputImage.mimeType),
                prompt: state.prompt,
                steps: state.steps,
                negative_prompt: state.negativePrompt,
                duration_seconds: state.durationSeconds,
                guidance_scale: state.guidanceScale,
                guidance_scale_2: state.guidanceScale2,
                seed: state.randomizeSeed ? -1 : state.seed,
                randomize_seed: state.randomizeSeed,
                quality: state.quality,
                scheduler: state.scheduler,
                flow_shift: state.flowShift,
                frame_multiplier: state.frameMultiplier,
                video_component: true,
            };

            setProgress('Generating video...');
            const result = await client.predict("/generate_video", payload);
            
            if (result.data?.[0]?.url) {
                setProgress('Downloading result...');
                onStateUpdate({ ...state, resultUrl: result.data[0].url });
            } else {
                throw new Error("API did not return a valid video URL.");
            }

        } catch (e) {
            setError(e instanceof Error ? e.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
            setProgress('');
        }
    };

    const handleExtractLastFrame = async () => {
        if (!state.resultUrl || !videoRef.current) return;
        setIsExtracting(true);
        setError(null);
        try {
            const client = await getGradioClient("r3gm/wan2-2-fp8da-aoti-preview2", { hfToken });
            
            const videoBlob = await (await fetch(state.resultUrl)).blob();

            const result = await client.predict("/extract_frame", {
                video_path: videoBlob,
                timestamp: videoRef.current.duration > 0 ? videoRef.current.duration - 0.1 : 0,
            });

            if (result.data?.[0]?.url) {
                const imageUrl = result.data[0].url;
                const imageRes = await fetch(imageUrl);
                const imageBlob = await imageRes.blob();
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64 = (reader.result as string).split(',')[1];
                    onStateUpdate({
                        ...state,
                        inputImage: { base64, mimeType: imageBlob.type },
                        lastImage: null,
                        resultUrl: null,
                    });
                };
                reader.readAsDataURL(imageBlob);
            } else {
                throw new Error("Could not extract frame from video.");
            }
        } catch(e) {
            setError(e instanceof Error ? e.message : "Failed to extract frame.");
        } finally {
            setIsExtracting(false);
        }
    };

    const Control = ({ label, value, children }: { label: string, value?: string|number, children: React.ReactNode }) => (
        <div>
            <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{label}</label>
                {value !== undefined && <span className="text-xs font-mono text-neutral-300 bg-neutral-900 px-1.5 rounded">{value}</span>}
            </div>
            {children}
        </div>
    );
    
    return (
        <div className="p-6 max-w-7xl mx-auto w-full h-full flex flex-col space-y-6 overflow-y-auto">
            <div>
                <h2 className="text-3xl font-bold text-neutral-200 mb-2">Wanimate Studio <span className="text-sm font-normal text-neutral-500 bg-surface px-2 py-1 rounded ml-2">Wan 2.2 I2V</span></h2>
                <p className="text-neutral-400">Generate continuous video sequences by chaining generations from start to end frames.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-grow">
                {/* Left Column: Controls & Inputs */}
                <div className="space-y-4 bg-surface p-6 border border-accent rounded-xl h-fit">
                    <div className="grid grid-cols-2 gap-4">
                        <ImageInput title="Start Frame" image={state.inputImage} onUpload={(f) => handleUpload('start', f)} onClear={() => onStateUpdate({...state, inputImage: null})} />
                        <ImageInput title="End Frame (Optional)" image={state.lastImage} onUpload={(f) => handleUpload('end', f)} onClear={() => onStateUpdate({...state, lastImage: null})} />
                    </div>
                    <Control label="Prompt">
                        <textarea value={state.prompt} onChange={(e) => onStateUpdate({ ...state, prompt: e.target.value })} className="w-full bg-secondary border border-accent p-2 rounded-lg text-sm" rows={3} />
                    </Control>
                    <Control label="Negative Prompt">
                        <textarea value={state.negativePrompt} onChange={(e) => onStateUpdate({ ...state, negativePrompt: e.target.value })} className="w-full bg-secondary border border-accent p-2 rounded-lg text-sm" rows={2} />
                    </Control>
                    <div className="grid grid-cols-2 gap-4">
                        <Control label="Steps" value={state.steps}><input type="range" min="1" max="25" value={state.steps} onChange={e => onStateUpdate({...state, steps: parseInt(e.target.value)})} className="w-full" /></Control>
                        <Control label="Duration (s)" value={state.durationSeconds}><input type="range" min="1" max="10" step="0.5" value={state.durationSeconds} onChange={e => onStateUpdate({...state, durationSeconds: parseFloat(e.target.value)})} className="w-full" /></Control>
                        <Control label="Guidance (High)" value={state.guidanceScale}><input type="range" min="0" max="10" step="0.5" value={state.guidanceScale} onChange={e => onStateUpdate({...state, guidanceScale: parseFloat(e.target.value)})} className="w-full" /></Control>
                        <Control label="Guidance (Low)" value={state.guidanceScale2}><input type="range" min="0" max="10" step="0.5" value={state.guidanceScale2} onChange={e => onStateUpdate({...state, guidanceScale2: parseFloat(e.target.value)})} className="w-full" /></Control>
                        <Control label="Quality" value={state.quality}><input type="range" min="1" max="10" step="1" value={state.quality} onChange={e => onStateUpdate({...state, quality: parseInt(e.target.value)})} className="w-full" /></Control>
                        <Control label="Flow Shift" value={state.flowShift}><input type="range" min="0" max="10" step="1" value={state.flowShift} onChange={e => onStateUpdate({...state, flowShift: parseInt(e.target.value)})} className="w-full" /></Control>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <Control label="Scheduler">
                            <select value={state.scheduler} onChange={e => onStateUpdate({...state, scheduler: e.target.value as WanimateState['scheduler']})} className="w-full bg-secondary border border-accent p-2 rounded-lg text-sm">
                                <option>UniPCMultistep</option><option>DPM++ 2M SDE Karras</option><option>DPM++ 2M Karras</option><option>Euler a</option>
                            </select>
                        </Control>
                        <Control label="FPS">
                             <select value={state.frameMultiplier} onChange={e => onStateUpdate({...state, frameMultiplier: e.target.value as WanimateState['frameMultiplier']})} className="w-full bg-secondary border border-accent p-2 rounded-lg text-sm">
                                <option value="16">16</option><option value="24">24</option><option value="30">30</option>
                            </select>
                        </Control>
                    </div>
                    <div>
                        <Control label="Seed">
                            <div className="flex items-center gap-2">
                                <input type="number" value={state.seed} onChange={e => onStateUpdate({...state, seed: parseInt(e.target.value), randomizeSeed: false})} className="w-full bg-secondary border border-accent p-2 rounded-lg text-sm" disabled={state.randomizeSeed} />
                                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={state.randomizeSeed} onChange={e => onStateUpdate({...state, randomizeSeed: e.target.checked})} /> Randomize</label>
                            </div>
                        </Control>
                    </div>
                </div>
                {/* Right Column: Result */}
                <div className="bg-surface border border-accent rounded-xl flex flex-col relative min-h-[500px]">
                    <div className="flex-grow flex items-center justify-center bg-black/50 p-4">
                         {isLoading ? (
                            <div className="text-center text-neutral-400">
                                <LoadingSpinner className="w-12 h-12 mx-auto mb-4" />
                                <p className="font-mono text-sm animate-pulse">{progress}</p>
                            </div>
                        ) : state.resultUrl ? (
                            <video ref={videoRef} src={state.resultUrl} controls autoPlay loop className="max-w-full max-h-full" crossOrigin="anonymous" />
                        ) : (
                            <div className="text-neutral-600 text-center">
                                <ClapperboardIcon className="w-16 h-16 mx-auto mb-2 opacity-20" />
                                <p>Result will appear here</p>
                            </div>
                        )}
                    </div>
                    <div className="p-4 border-t border-accent bg-secondary/90 flex justify-center items-center gap-4">
                        <button
                            onClick={handleGenerate}
                            disabled={isLoading}
                            className="flex-grow py-3 bg-brand hover:bg-brand-hover text-white font-bold rounded-lg transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? <LoadingSpinner className="w-5 h-5" /> : <ClapperboardIcon className="w-5 h-5" />}
                            {isLoading ? 'Generating...' : 'Generate Video'}
                        </button>
                        {state.resultUrl && !isLoading && (
                            <>
                                <button
                                    onClick={handleExtractLastFrame}
                                    disabled={isExtracting}
                                    className="px-4 py-3 bg-neutral-700 hover:bg-neutral-600 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
                                    title="Use last frame of this video as the new start frame for the next generation."
                                >
                                   {isExtracting ? <LoadingSpinner className="w-5 h-5" /> : <RefreshCwIcon className="w-5 h-5"/> }
                                </button>
                                <AssetActions 
                                    asset={{ type: 'video', url: state.resultUrl }}
                                    onSaveToGrid={(pid) => onAddAssetToGrid({ type: 'video', url: state.resultUrl! }, pid)}
                                    onSaveToStoryboard={() => extractFramesFromVideo(state.resultUrl!, 1).then(f => f[0] && onAddToStoryboard(f[0]))}
                                    projects={projects}
                                    activeProjectId={activeProjectId}
                                />
                            </>
                        )}
                    </div>
                    {error && <div className="p-2 text-xs text-center text-red-400 bg-red-900/20">{error}</div>}
                </div>
            </div>
        </div>
    )
};
