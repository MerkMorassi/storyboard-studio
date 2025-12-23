
import React, { useState, useRef } from 'react';
import { CompositeState } from '../types.ts';
import { LoadingSpinner, PuzzleIcon, ClapperboardIcon, ChevronDownIcon, ImageIcon } from './icons.tsx';
import { AssetActions } from './AssetActions';
import { getGradioClient } from '../services/gradioService';

interface CompositeStudioProps {
    state: CompositeState;
    onStateUpdate: (newState: CompositeState) => void;
    onAddAssetToGrid: (asset: { type: 'image' | 'video'; base64?: string; url?: string; mimeType?: string }) => void;
    onAddToStoryboard: (base64: string) => void;
    onAddToInspiration: (base64: string) => void;
    hfToken?: string;
}

const TASKS = [
    { value: 'ip', label: 'Image Prompt (Content)' },
    { value: 'style', label: 'Style Transfer' },
    { value: 'id', label: 'Identity (Face)' },
    { value: 'structure', label: 'Structure / Depth' },
];

const base64ToBlob = async (base64: string, mimeType: string): Promise<Blob> => {
    const res = await fetch(`data:${mimeType};base64,${base64}`);
    return await res.blob();
};

export const CompositeStudio: React.FC<CompositeStudioProps> = ({ 
    state, 
    onStateUpdate, 
    onAddAssetToGrid,
    onAddToStoryboard,
    onAddToInspiration,
    hfToken 
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isVideoLoading, setIsVideoLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<string>('');
    
    const fileInputRef1 = useRef<HTMLInputElement>(null);
    const fileInputRef2 = useRef<HTMLInputElement>(null);

    const handleUpload = (index: 1 | 2, file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            const mimeType = result.split(',')[0].split(':')[1].split(';')[0];
            const base64 = result.split(',')[1];
            if (index === 1) {
                onStateUpdate({ ...state, refImage1: { base64, mimeType } });
            } else {
                onStateUpdate({ ...state, refImage2: { base64, mimeType } });
            }
        };
        reader.readAsDataURL(file);
    };

    const handleGenerateImage = async () => {
        if (!state.refImage1 || !state.refImage2) {
            setError("Both reference images are required.");
            return;
        }
        
        setIsLoading(true);
        setError(null);
        setProgress("Initializing DreamO...");
        
        try {
            const ref1Blob = await base64ToBlob(state.refImage1.base64, state.refImage1.mimeType);
            const ref2Blob = await base64ToBlob(state.refImage2.base64, state.refImage2.mimeType);
            
            const client = await getGradioClient("openfree/DreamO-video", { hfToken });
            
            setProgress("Generating composite image...");
            
            const result = await client.predict("/generate_image", { 
                ref_image1: ref1Blob, 
                ref_image2: ref2Blob, 		
                ref_task1: state.task1, 		
                ref_task2: state.task2, 		
                prompt: state.prompt, 		
                seed: state.randomizeSeed ? -1 : state.seed, 		
                width: state.width, 		
                height: state.height, 		
                ref_res: 512, 		
                num_steps: 12, 		
                guidance: 3.5, 		
                true_cfg: 1, 		
                cfg_start_step: 0, 		
                cfg_end_step: 0, 		
                neg_prompt: state.negativePrompt, 		
                neg_guidance: 3.5, 		
                first_step_guidance: 0, 
            });

            if (result && result.data) {
                // Returns [image_path, gallery_json, seed_string]
                const outputImage = result.data[0];
                let imageUrl = '';
                
                if (typeof outputImage === 'string') {
                    imageUrl = outputImage;
                } else if (outputImage?.url) {
                    imageUrl = outputImage.url;
                }

                if (imageUrl) {
                    const res = await fetch(imageUrl);
                    const blob = await res.blob();
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64 = (reader.result as string).split(',')[1];
                        onStateUpdate({ 
                            ...state, 
                            resultImage: { base64, mimeType: blob.type },
                            resultVideoUrl: null // clear video when new image generated
                        });
                        setIsLoading(false);
                    };
                    reader.readAsDataURL(blob);
                } else {
                    throw new Error("Could not parse output image.");
                }
            } else {
                throw new Error("API returned no data.");
            }

        } catch (err) {
            console.error("DreamO Image Error:", err);
            setError(err instanceof Error ? err.message : "Image generation failed.");
            setIsLoading(false);
        }
    };

    const handleGenerateVideo = async () => {
        if (!state.resultImage) return;
        
        setIsVideoLoading(true);
        setError(null);
        setProgress("Generating video motion...");
        
        try {
            const imgBlob = await base64ToBlob(state.resultImage.base64, state.resultImage.mimeType);
            const client = await getGradioClient("openfree/DreamO-video", { hfToken });
            
            const result = await client.predict("/on_click_generate_video", { 
                img: imgBlob, 
            });

            if (result && result.data && result.data.length > 0) {
                const output = result.data[0];
                let videoUrl = '';
                if (typeof output === 'string') videoUrl = output;
                else if (output?.url) videoUrl = output.url;
                else if (output?.video?.url) videoUrl = output.video.url;

                if (videoUrl) {
                    onStateUpdate({ ...state, resultVideoUrl: videoUrl });
                } else {
                    throw new Error("Could not parse output video.");
                }
            }
        } catch (err) {
            console.error("DreamO Video Error:", err);
            setError(err instanceof Error ? err.message : "Video generation failed.");
        } finally {
            setIsVideoLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto w-full h-full flex flex-col space-y-6 overflow-y-auto">
            {/* Header removed */}
            <div className="flex-shrink-0">
                <h2 className="text-3xl font-bold text-neutral-200 mb-2">Composite Studio <span className="text-sm font-normal text-neutral-500 bg-neutral-800 px-2 py-1 rounded ml-2">DreamO</span></h2>
                <p className="text-neutral-400">Fuse concepts, styles, and identities from multiple reference images into a cohesive new visual.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
                {/* Inputs Column */}
                <div className="lg:col-span-1 space-y-6 pr-2">
                    {/* Ref 1 */}
                    <div className="bg-neutral-800/50 p-4 rounded-xl border border-neutral-700">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Reference 1</h3>
                            <select 
                                value={state.task1} 
                                onChange={(e) => onStateUpdate({ ...state, task1: e.target.value as any })}
                                className="bg-neutral-900 border border-neutral-600 text-xs rounded p-1 text-white focus:ring-1 focus:ring-blue-500 outline-none"
                            >
                                {TASKS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div 
                            onClick={() => fileInputRef1.current?.click()}
                            className="aspect-square bg-neutral-900/50 border-2 border-dashed border-neutral-700 rounded-lg flex items-center justify-center cursor-pointer hover:bg-neutral-900 hover:border-neutral-500 transition-all relative overflow-hidden group"
                        >
                            {state.refImage1 ? (
                                <img src={`data:${state.refImage1.mimeType};base64,${state.refImage1.base64}`} className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-center text-neutral-500">
                                    <span className="text-2xl">+</span>
                                    <p className="text-xs mt-1">Upload Image</p>
                                </div>
                            )}
                            <input ref={fileInputRef1} type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUpload(1, e.target.files[0])} />
                        </div>
                    </div>

                    {/* Ref 2 */}
                    <div className="bg-neutral-800/50 p-4 rounded-xl border border-neutral-700">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Reference 2</h3>
                            <select 
                                value={state.task2} 
                                onChange={(e) => onStateUpdate({ ...state, task2: e.target.value as any })}
                                className="bg-neutral-900 border border-neutral-600 text-xs rounded p-1 text-white focus:ring-1 focus:ring-blue-500 outline-none"
                            >
                                {TASKS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div 
                            onClick={() => fileInputRef2.current?.click()}
                            className="aspect-square bg-neutral-900/50 border-2 border-dashed border-neutral-700 rounded-lg flex items-center justify-center cursor-pointer hover:bg-neutral-900 hover:border-neutral-500 transition-all relative overflow-hidden group"
                        >
                            {state.refImage2 ? (
                                <img src={`data:${state.refImage2.mimeType};base64,${state.refImage2.base64}`} className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-center text-neutral-500">
                                    <span className="text-2xl">+</span>
                                    <p className="text-xs mt-1">Upload Image</p>
                                </div>
                            )}
                            <input ref={fileInputRef2} type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUpload(2, e.target.files[0])} />
                        </div>
                    </div>
                </div>

                {/* Settings Column */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-neutral-800/50 p-6 border border-neutral-700 rounded-xl space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-neutral-400 uppercase mb-2">Prompt</label>
                            <textarea 
                                value={state.prompt} 
                                onChange={(e) => onStateUpdate({ ...state, prompt: e.target.value })}
                                className="w-full bg-neutral-900 border border-neutral-600 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                                placeholder="Describe the desired output..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-neutral-400 uppercase mb-2">Negative Prompt</label>
                            <textarea 
                                value={state.negativePrompt} 
                                onChange={(e) => onStateUpdate({ ...state, negativePrompt: e.target.value })}
                                className="w-full bg-neutral-900 border border-neutral-600 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-16 resize-none"
                                placeholder="Low quality, blurry..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Width</label>
                                <select 
                                    value={state.width} 
                                    onChange={(e) => onStateUpdate({ ...state, width: parseInt(e.target.value) })}
                                    className="w-full bg-neutral-900 border border-neutral-600 rounded p-2 text-sm"
                                >
                                    <option value="768">768</option>
                                    <option value="1024">1024</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Height</label>
                                <select 
                                    value={state.height} 
                                    onChange={(e) => onStateUpdate({ ...state, height: parseInt(e.target.value) })}
                                    className="w-full bg-neutral-900 border border-neutral-600 rounded p-2 text-sm"
                                >
                                    <option value="768">768</option>
                                    <option value="1024">1024</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Seed</label>
                            <div className="flex gap-2">
                                <input 
                                    type="number" 
                                    value={state.seed} 
                                    onChange={(e) => onStateUpdate({ ...state, seed: parseInt(e.target.value), randomizeSeed: false })}
                                    className="w-full bg-neutral-900 border border-neutral-600 rounded p-2 text-sm"
                                    disabled={state.randomizeSeed}
                                />
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="checkbox" 
                                        checked={state.randomizeSeed} 
                                        onChange={(e) => onStateUpdate({ ...state, randomizeSeed: e.target.checked })} 
                                        id="rndSeed"
                                    />
                                    <label htmlFor="rndSeed" className="text-xs text-neutral-400 cursor-pointer">Random</label>
                                </div>
                            </div>
                        </div>
                        
                        <button
                            onClick={handleGenerateImage}
                            disabled={isLoading}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                        >
                            {isLoading ? (
                                <><LoadingSpinner className="w-4 h-4 text-white" /> Processing...</>
                            ) : (
                                <><PuzzleIcon className="w-4 h-4" /> Generate Composite</>
                            )}
                        </button>
                        {error && <div className="text-xs text-red-400 bg-red-900/20 p-2 rounded border border-red-500/30">{error}</div>}
                    </div>
                </div>

                {/* Result Column */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden flex flex-col h-[400px]">
                        <div className="p-3 border-b border-neutral-800 bg-neutral-800/50 flex justify-between items-center">
                            <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Result Image</h3>
                            {state.resultImage && (
                                <AssetActions 
                                    asset={{ type: 'image', base64: state.resultImage.base64, mimeType: state.resultImage.mimeType }}
                                    onSaveToGrid={() => onAddAssetToGrid({ type: 'image', base64: state.resultImage!.base64, mimeType: state.resultImage!.mimeType })}
                                    onSaveToStoryboard={() => onAddToStoryboard(state.resultImage!.base64)}
                                    onSaveToInspiration={() => onAddToInspiration(state.resultImage!.base64)}
                                />
                            )}
                        </div>
                        <div className="flex-grow flex items-center justify-center bg-black relative p-4">
                            {isLoading ? (
                                <div className="flex flex-col items-center">
                                    <LoadingSpinner className="w-8 h-8 text-blue-500" />
                                    <p className="mt-2 text-xs text-neutral-400 animate-pulse">{progress}</p>
                                </div>
                            ) : state.resultImage ? (
                                <img src={`data:${state.resultImage.mimeType};base64,${state.resultImage.base64}`} className="w-full h-full object-contain" />
                            ) : (
                                <ImageIcon className="w-12 h-12 text-neutral-700" />
                            )}
                        </div>
                    </div>

                    {state.resultVideoUrl && (
                        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden flex flex-col h-[300px] mt-4">
                            <div className="p-3 border-b border-neutral-800 bg-neutral-800/50 flex justify-between items-center">
                                <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Result Video</h3>
                                <AssetActions 
                                    asset={{ type: 'video', url: state.resultVideoUrl }}
                                    onSaveToGrid={() => onAddAssetToGrid({ type: 'video', url: state.resultVideoUrl! })}
                                />
                            </div>
                            <div className="flex-grow flex items-center justify-center bg-black relative">
                                <video src={state.resultVideoUrl} controls autoPlay loop className="w-full h-full object-contain" />
                            </div>
                        </div>
                    )}

                    <div className="mt-6">
                        <button
                            onClick={handleGenerateVideo}
                            disabled={isVideoLoading || !state.resultImage}
                            className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isVideoLoading ? (
                                <><LoadingSpinner className="w-4 h-4 text-white" /> Animating...</>
                            ) : (
                                <><ClapperboardIcon className="w-4 h-4" /> Animate (Image to Video)</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
