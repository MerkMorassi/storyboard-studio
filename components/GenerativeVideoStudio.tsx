

import React, { useState, useRef, useEffect } from 'react';
import { GenerativeVideoState } from '../types.ts';
import { LoadingSpinner, ClapperboardIcon, ChevronDownIcon, CameraLensIcon } from './icons.tsx';
import { WarningIcon } from './icons/WarningIcon';
import { AssetActions } from './AssetActions';
import { getGradioClient } from '../services/gradioService';

interface GenerativeVideoStudioProps {
    apiKey: string;
    hfToken: string; // New prop for HF token
    videoState: GenerativeVideoState;
    onStateUpdate: (newState: GenerativeVideoState) => void;
    onAddImageToGrid: (base64: string) => void;
    onAddToStoryboard: (base64: string) => void;
    onAddAssetToGrid?: (asset: { type: 'image' | 'video'; base64?: string; url?: string; mimeType?: string }) => void;
    defaultWebhookUrl?: string;
}

const base64ToBlob = async (base64: string, mimeType: string): Promise<Blob> => {
    const res = await fetch(`data:${mimeType};base64,${base64}`);
    return await res.blob();
};

const CAMERA_MOVEMENTS = [
    { label: 'None / Static', value: '' },
    { label: 'Crane', value: 'crane shot, camera moving vertically' },
    { label: 'Dolly', value: 'dolly shot, camera moving forward' },
    { label: 'Dolly Zoom', value: 'dolly zoom effect, vertigo effect' },
    { label: 'Drone', value: 'drone shot, aerial view' },
    { label: 'Handheld', value: 'handheld camera style, slightly shaky' },
    { label: 'Orbit', value: 'orbit shot, camera rotating around subject' },
    { label: 'Pan', value: 'pan camera movement' },
    { label: 'Push & Pull', value: 'push in and pull out camera movement' },
    { label: 'Slide', value: 'smooth sliding camera movement' },
    { label: 'Steadicam', value: 'steadicam shot, smooth handheld' },
    { label: 'Tilt', value: 'tilt camera movement' },
    { label: 'Tracking', value: 'tracking shot, camera following subject' },
    { label: 'Zoom', value: 'zoom camera movement' }
];

const SPEED_OPTIONS = [
    { label: 'Slow', value: 'slow, cinematic' },
    { label: 'Medium', value: 'smooth, steady' },
    { label: 'Fast', value: 'fast, dynamic' }
];

const SCHEDULER_OPTIONS = [
    { label: 'UniPCMultistep', value: 'UniPCMultistep' },
    { label: 'DDIM', value: 'DDIM' },
    { label: 'DPMSolverMultistep', value: 'DPMSolverMultistep' },
    { label: 'EulerAncestralDiscrete', value: 'EulerAncestralDiscrete' },
    { label: 'EulerDiscrete', value: 'EulerDiscrete' },
    { label: 'PNDMScheduler', value: 'PNDMScheduler' },
];

export const GenerativeVideoStudio: React.FC<GenerativeVideoStudioProps> = ({ 
    apiKey, // Kept for consistency
    hfToken,
    videoState, 
    onStateUpdate, 
    onAddImageToGrid, 
    onAddToStoryboard,
    onAddAssetToGrid
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<string>('');
    const [showAdvanced, setShowAdvanced] = useState(true); // Default open to show all options
    const [usedFallback, setUsedFallback] = useState(false); // Track if fallback was used
    const [cameraMovement, setCameraMovement] = useState<string>(''); // Local state for camera movement
    const [movementSpeed, setMovementSpeed] = useState<string>(SPEED_OPTIONS[1].value); // Default Medium
    const [fallbackWarning, setFallbackWarning] = useState<string | null>(null);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const lastImageInputRef = useRef<HTMLInputElement>(null);

    // Initial sync - ensure new defaults
    useEffect(() => {
        // Only apply if values are not already set, or are old defaults (e.g. undefined, or 0)
        onStateUpdate({
            ...videoState,
            steps: videoState.steps === undefined ? 6 : videoState.steps,
            duration: videoState.duration === undefined ? 3.5 : videoState.duration,
            guidanceScale: videoState.guidanceScale === undefined ? 5 : videoState.guidanceScale, // High noise
            guidanceScale2: videoState.guidanceScale2 === undefined ? 1 : videoState.guidanceScale2, // Low noise
            seed: videoState.seed === undefined ? 42 : videoState.seed,
            randomizeSeed: videoState.randomizeSeed === undefined ? true : videoState.randomizeSeed,
            scheduler: videoState.scheduler === undefined ? 'UniPCMultistep' : videoState.scheduler,
            fps: videoState.fps === undefined ? 16 : videoState.fps,
            // Explicitly set these to undefined if they were lingering, as they are not used by this model
            // For a more robust solution, these should be removed from types.ts
            // quality: undefined, 
            // flowShift: undefined,
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleUploadClick = (type: 'main' | 'last') => {
        if (type === 'main') imageInputRef.current?.click();
        else lastImageInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'main' | 'last') => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const result = reader.result as string;
                const mimeType = result.split(',')[0].split(':')[1].split(';')[0];
                const base64 = result.split(',')[1];
                if (type === 'main') {
                    onStateUpdate({ ...videoState, image: { base64, mimeType } });
                } else {
                    onStateUpdate({ ...videoState, lastImage: { base64, mimeType } });
                }
            };
        }
        event.target.value = '';
    };

    const handleClearImage = (type: 'main' | 'last') => {
        if (type === 'main') onStateUpdate({ ...videoState, image: null });
        else onStateUpdate({ ...videoState, lastImage: null });
    };

    const handleGenerate = async () => {
        if (!videoState.image) {
            setError("Please upload an input image.");
            return;
        }
        
        setIsLoading(true);
        setError(null);
        setUsedFallback(false);
        setFallbackWarning(null);
        setProgress('Initializing connection to Wan 2.2 model...');
        onStateUpdate({ ...videoState, resultUrl: null });

        try {
            // Prepare inputs
            const inputImageBlob = await base64ToBlob(videoState.image.base64, videoState.image.mimeType);
            
            // Default Negative Prompt (English)
            const DEFAULT_NEGATIVE_PROMPT = "blurry, low quality, static, blurry details, subtitles, bad style, artwork, painting, still image, overall gray, worst quality, low quality, JPEG compression artifacts, ugly, deformed, extra fingers, poorly drawn hands, poorly drawn faces, malformed, disfigured, malformed limbs, fused fingers, motionless image, cluttered background";

            // Combine user prompt with camera movement and speed
            const basePrompt = videoState.prompt || "make this image come alive, cinematic motion, smooth animation";
            
            // Construct movement string: e.g. "slow, cinematic pan camera movement"
            let movementString = "";
            if (cameraMovement) {
                // If specific movement selected: "slow, cinematic pan camera movement"
                movementString = `${movementSpeed} ${cameraMovement}`;
            } else {
                // If no specific movement (static camera), still apply speed to the subject/general motion
                // e.g. "slow, cinematic motion"
                movementString = `${movementSpeed} motion`;
            }

            const finalPrompt = movementString ? `${basePrompt}, ${movementString}` : basePrompt;

            // Define payload for linoyts/wan2-2-i2v-rCM
            const payload: any = { 
                input_image: inputImageBlob, 
                prompt: finalPrompt, 		
                steps: videoState.steps || 6, 		
                negative_prompt: videoState.negativePrompt || DEFAULT_NEGATIVE_PROMPT, 		
                duration_seconds: videoState.duration || 3.5, 		
                guidance_scale: videoState.guidanceScale || 5, 		
                guidance_scale_2: videoState.guidanceScale2 || 1, 
                seed: videoState.randomizeSeed ? Math.floor(Math.random() * 2147483647) : videoState.seed, 		
                randomize_seed: videoState.randomizeSeed,
                scheduler: videoState.scheduler || 'UniPCMultistep', // Add scheduler
                fps: videoState.fps || 16, // Add fps
            };

            let result: any;

            try {
                // Primary Attempt: linoyts/wan2-2-i2v-rCM
                setProgress('Generating video (Wan 2.2 I2V Lightning)...');
                const client = await getGradioClient("linoyts/wan2-2-i2v-rCM", { hfToken });
                result = await client.predict("/generate_video", payload);
            } catch (primaryError) {
                console.warn("Primary space failed, switching to fallback:", primaryError);
                
                // Fallback Attempt: zerogpu-aoti/wan2-2-fp8da-aoti-faster
                setProgress('Primary busy. Switching to Fallback Server (Wan 2.2 Faster)...');
                setUsedFallback(true);
                
                const FALLBACK_MAX_DURATION = 6;
                const fallbackPayload = { ...payload };
                if (fallbackPayload.duration_seconds > FALLBACK_MAX_DURATION) {
                    setFallbackWarning(`Fallback model maximum duration is ${FALLBACK_MAX_DURATION}s. Your video will be clamped to ${FALLBACK_MAX_DURATION}s.`);
                    fallbackPayload.duration_seconds = FALLBACK_MAX_DURATION;
                }
                
                // Fallback specific adjustments if needed for the 'zerogpu-aoti/wan2-2-fp8da-aoti-faster' pipeline
                // Based on its Gradio inputs, it also takes scheduler and flow_shift.
                fallbackPayload.scheduler = videoState.scheduler || 'UniPCMultistep'; 
                fallbackPayload.flow_shift = 3; // Hardcode a default flow_shift for fallback if not in initial payload

                const client = await getGradioClient("zerogpu-aoti/wan2-2-fp8da-aoti-faster", { hfToken });
                result = await client.predict("/generate_video", fallbackPayload);
            }

            if (result && result.data && result.data.length > 0) {
                const videoData = result.data[0];
                let finalUrl = '';
                
                if (typeof videoData === 'string') {
                    finalUrl = videoData;
                } else if (videoData?.url) {
                    finalUrl = videoData.url;
                } else if (videoData?.video?.url) {
                    finalUrl = videoData.video.url;
                }

                if (finalUrl) {
                    onStateUpdate({ ...videoState, resultUrl: finalUrl });
                } else {
                    throw new Error("Could not parse video URL from response.");
                }
            } else {
                throw new Error("API returned no data.");
            }

        } catch (err) {
            console.error("Wan generation error:", err);
            setError(err instanceof Error ? err.message : "Unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const extractThumbnail = (callback: (base64: string) => void) => {
        try {
            const video = videoRef.current;
            if (!video) return;

            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg');
                callback(dataUrl.split(',')[1]);
            }
        } catch (e) {
            console.error("Thumbnail extraction failed (likely CORS issue):", e);
            alert("Could not extract thumbnail due to browser security restrictions on this video URL. Try downloading the video instead.");
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto w-full h-full flex flex-col space-y-6 overflow-y-auto">
            {/* Header removed */}
            <div className="flex-shrink-0 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-neutral-200 mb-2">Video Creator <span className="text-sm font-normal text-neutral-500 bg-neutral-800 px-2 py-1 rounded ml-2">Wan 2.2 I2V Lightning</span></h2>
                    <p className="text-neutral-400">Generate cinematic videos from images using the Wan 2.2 I2V Lightning model.</p>
                </div>
                {!hfToken && (
                    <div className="flex items-center gap-2 text-yellow-500 text-sm bg-yellow-900/20 px-3 py-1.5 rounded border border-yellow-500/30">
                        <WarningIcon className="w-4 h-4" />
                        <span>Hugging Face Token missing. Configure in Settings.</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Controls Column */}
                <div className="lg:col-span-1 bg-neutral-800/50 p-6 border border-neutral-700 rounded-lg space-y-6 h-fit">
                    
                    {/* HF Token Status */}
                    <div className="flex items-center justify-between text-xs border border-neutral-700 bg-neutral-900 rounded p-2">
                        <span className="text-neutral-400 font-bold uppercase tracking-wider">Auth Status</span>
                        {hfToken ? (
                            <span className="text-green-400 flex items-center gap-1">● Token Loaded</span>
                        ) : (
                            <span className="text-red-400 flex items-center gap-1">○ No Token (Public Only)</span>
                        )}
                    </div>

                    {/* Image Input (Input Image) */}
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">Input Image *</label>
                        {videoState.image ? (
                            <div className="relative group rounded-lg overflow-hidden border border-neutral-600 bg-black/20 aspect-video">
                                <img src={`data:${videoState.image.mimeType};base64,${videoState.image.base64}`} alt="Reference" className="w-full h-full object-cover" />
                                <button onClick={() => handleClearImage('main')} className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded hover:bg-red-600 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                </button>
                            </div>
                        ) : (
                            <div onClick={() => handleUploadClick('main')} className="w-full aspect-video border-2 border-dashed border-neutral-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-neutral-800/50 hover:border-neutral-500 transition-all text-neutral-500 hover:text-neutral-300">
                                <input type="file" ref={imageInputRef} onChange={(e) => handleFileChange(e, 'main')} className="hidden" accept="image/*" />
                                <span className="text-sm font-medium text-center">Upload Start Frame</span>
                            </div>
                        )}
                    </div>

                    {/* Camera Movement */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <CameraLensIcon className="w-4 h-4 text-blue-400" />
                            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Camera Movement</label>
                        </div>
                        <div className="flex gap-2">
                            {/* Speed Selector */}
                            <div className="w-1/3">
                                <select
                                    value={movementSpeed}
                                    onChange={(e) => setMovementSpeed(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-600 p-2.5 rounded-lg text-sm text-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer hover:border-neutral-500"
                                >
                                    {SPEED_OPTIONS.map((speed, i) => (
                                        <option key={i} value={speed.value}>{speed.label}</option>
                                    ))}
                                </select>
                            </div>
                            {/* Movement Selector */}
                            <div className="w-2/3">
                                <select 
                                    value={cameraMovement}
                                    onChange={(e) => setCameraMovement(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-600 p-2.5 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer hover:border-neutral-500"
                                >
                                    {CAMERA_MOVEMENTS.map((move, i) => (
                                        <option key={i} value={move.value}>{move.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Prompt</label>
                        <textarea
                            value={videoState.prompt}
                            onChange={(e) => onStateUpdate({ ...videoState, prompt: e.target.value })}
                            placeholder="Describe the motion..."
                            className="w-full h-24 bg-neutral-900 border border-neutral-600 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-neutral-200 text-sm"
                        />
                    </div>

                    {/* Basic Parameters */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-neutral-400 mb-1">Duration (s)</label>
                            <div className="flex items-center gap-2">
                                <input type="range" min="0.5" max="10" step="0.5" value={videoState.duration || 3.5} onChange={(e) => onStateUpdate({ ...videoState, duration: parseFloat(e.target.value) })} className="w-full accent-blue-500" />
                                <span className="text-xs text-neutral-300 w-8">{videoState.duration}s</span>
                            </div>
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-neutral-400 mb-1">FPS ({videoState.fps})</label>
                            <input 
                                type="range" 
                                min="8" max="24" step="1" 
                                value={videoState.fps || 16} 
                                onChange={(e) => onStateUpdate({ ...videoState, fps: parseInt(e.target.value) })} 
                                className="w-full accent-blue-500" 
                            />
                        </div>
                    </div>

                    {/* Advanced Toggle */}
                    <div className="pt-2 border-t border-neutral-700">
                        <button 
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center gap-2 text-xs font-bold text-neutral-400 hover:text-white transition-colors uppercase tracking-wider w-full justify-between"
                        >
                            <span>Advanced Settings</span>
                            <ChevronDownIcon className={`w-5 h-5 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    {showAdvanced && (
                        <div className="space-y-4 animate-fade-in bg-black/20 p-3 rounded-lg border border-white/5">
                            
                            {/* Negative Prompt */}
                            <div>
                                <label className="block text-xs font-bold text-neutral-400 mb-1">Negative Prompt</label>
                                <textarea
                                    value={videoState.negativePrompt}
                                    onChange={(e) => onStateUpdate({ ...videoState, negativePrompt: e.target.value })}
                                    placeholder="Elements to avoid"
                                    className="w-full h-16 bg-neutral-900 border border-neutral-600 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-neutral-400 text-xs"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs text-neutral-400 mb-1">Inference Steps: {videoState.steps}</label>
                                    <input type="range" min="1" max="30" step="1" value={videoState.steps || 6} onChange={(e) => onStateUpdate({ ...videoState, steps: parseInt(e.target.value) })} className="w-full accent-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs text-neutral-400 mb-1">Guidance (High): {videoState.guidanceScale}</label>
                                    <input type="range" min="0" max="10" step="0.5" value={videoState.guidanceScale || 5} onChange={(e) => onStateUpdate({ ...videoState, guidanceScale: parseFloat(e.target.value) })} className="w-full accent-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs text-neutral-400 mb-1">Guidance (Low): {videoState.guidanceScale2}</label>
                                    <input type="range" min="0" max="10" step="0.5" value={videoState.guidanceScale2 || 1} onChange={(e) => onStateUpdate({ ...videoState, guidanceScale2: parseFloat(e.target.value) })} className="w-full accent-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs text-neutral-400 mb-1">Scheduler</label>
                                    <select
                                        value={videoState.scheduler || 'UniPCMultistep'}
                                        onChange={(e) => onStateUpdate({ ...videoState, scheduler: e.target.value })}
                                        className="w-full bg-neutral-900 border border-neutral-600 p-2 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer hover:border-neutral-500"
                                    >
                                        {SCHEDULER_OPTIONS.map((opt, i) => (
                                            <option key={i} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-neutral-400 mb-1">Seed</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="number" 
                                            value={videoState.seed} 
                                            onChange={(e) => onStateUpdate({ ...videoState, seed: parseInt(e.target.value), randomizeSeed: false })} 
                                            className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 text-xs"
                                            disabled={videoState.randomizeSeed}
                                        />
                                        <label className="flex items-center gap-1 text-xs whitespace-nowrap cursor-pointer select-none text-neutral-400">
                                            <input 
                                                type="checkbox" 
                                                checked={videoState.randomizeSeed} 
                                                onChange={(e) => onStateUpdate({ ...videoState, randomizeSeed: e.target.checked })} 
                                            /> Random
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>Generating...</>
                        ) : (
                            <><ClapperboardIcon /> Generate Video</>
                        )}
                    </button>
                    {error && <p className="text-sm text-red-400 bg-red-900/20 p-3 rounded border border-red-500/30">{error}</p>}
                </div>

                {/* Preview Column */}
                <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-lg flex flex-col relative overflow-hidden min-h-[500px]">
                    <div className="flex-grow flex items-center justify-center bg-black relative">
                        {isLoading ? (
                            <div className="flex flex-col items-center">
                                <LoadingSpinner />
                                <p className="mt-4 text-neutral-400 animate-pulse font-mono text-sm">{progress}</p>
                            </div>
                        ) : videoState.resultUrl ? (
                            <div className="w-full h-full flex flex-col">
                                {usedFallback && (
                                    <div className="absolute top-4 right-4 z-10 bg-yellow-900/80 text-yellow-200 text-xs px-3 py-1 rounded-full border border-yellow-500/30 backdrop-blur-md shadow-lg">
                                        Fallback Mode (Max 6s)
                                    </div>
                                )}
                                {fallbackWarning && (
                                    <div className="absolute top-16 right-4 z-10 bg-orange-900/80 text-orange-200 text-xs px-3 py-1 rounded-full border border-orange-500/30 backdrop-blur-md shadow-lg">
                                        {fallbackWarning}
                                    </div>
                                )}
                                <video 
                                    ref={videoRef}
                                    src={videoState.resultUrl} 
                                    controls 
                                    autoPlay
                                    loop
                                    className="w-full h-full max-h-[70vh] object-contain" 
                                    crossOrigin="anonymous" 
                                />
                            </div>
                        ) : (
                            <div className="text-neutral-600 flex flex-col items-center select-none">
                                <ClapperboardIcon />
                                <p className="mt-2 text-sm font-medium">Video Preview</p>
                            </div>
                        )}
                    </div>

                    {/* Action Bar - Replaced with AssetActions */}
                    {videoState.resultUrl && !isLoading && (
                        <div className="p-4 border-t border-neutral-800 bg-neutral-800/90 backdrop-blur-sm flex justify-between items-center">
                            <div className="text-xs text-neutral-500 font-mono truncate max-w-xs px-2 hidden sm:block" title={videoState.resultUrl}>
                                {videoState.resultUrl}
                            </div>
                            <AssetActions 
                                asset={{ type: 'video', url: videoState.resultUrl }}
                                onSaveToGrid={onAddAssetToGrid ? () => onAddAssetToGrid({ type: 'video', url: videoState.resultUrl! }) : undefined}
                                onSaveToStoryboard={() => extractThumbnail(onAddToStoryboard)}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};