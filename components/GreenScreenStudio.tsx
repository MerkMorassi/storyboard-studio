
import React, { useState, useRef } from 'react';
import { GreenScreenState } from '../types.ts';
import { LoadingSpinner, DownloadIcon, AddToStoryIcon, PinIcon, ScissorsIcon, VideoIcon } from './icons.tsx';
import { AssetActions } from './AssetActions.tsx';
import { getGradioClient } from '../services/gradioService';

interface GreenScreenStudioProps {
    greenScreenState: GreenScreenState;
    isLoading: boolean;
    error: string | null;
    onStateUpdate: (newState: GreenScreenState) => void;
    onAddToStoryboard: (base64: string) => void; // Extracts a frame
    onAddAssetToGrid?: (asset: { type: 'image' | 'video'; base64?: string; url?: string; mimeType?: string }) => void;
    hfToken?: string;
}

const base64ToBlob = async (base64: string, mimeType: string): Promise<Blob> => {
    const res = await fetch(`data:${mimeType};base64,${base64}`);
    return await res.blob();
};

export const GreenScreenStudio: React.FC<GreenScreenStudioProps> = ({ 
    greenScreenState, 
    isLoading, 
    error, 
    onStateUpdate, 
    onAddToStoryboard, 
    onAddAssetToGrid,
    hfToken 
}) => {
    const [localLoading, setLocalLoading] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const [progress, setProgress] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                const mimeType = result.split(',')[0].split(':')[1].split(';')[0];
                const base64 = result.split(',')[1];
                onStateUpdate({ ...greenScreenState, source: { base64, mimeType }, resultUrl: null });
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    const handleRemoveBackground = async () => {
        if (!greenScreenState.source) return;
        
        setLocalLoading(true);
        setLocalError(null);
        setProgress('Connecting to background removal service...');

        try {
            const blob = await base64ToBlob(greenScreenState.source.base64, greenScreenState.source.mimeType);
            
            // Target the fantaxy/Remove-Video-Background space
            const client = await getGradioClient("fantaxy/Remove-Video-Background", { hfToken });
            
            setProgress('Processing video frames (this may take a minute)...');
            
            // The space usually takes a video file path/blob
            const result = await client.predict("/predict", [blob]);

            if (result && result.data && result.data.length > 0) {
                // Usually returns a path to the processed video
                let videoUrl = '';
                const output = result.data[0];
                
                if (typeof output === 'string') {
                    videoUrl = output;
                } else if (output?.url) {
                    videoUrl = output.url;
                } else if (output?.video?.url) {
                    videoUrl = output.video.url;
                }

                if (videoUrl) {
                    onStateUpdate({ ...greenScreenState, resultUrl: videoUrl });
                } else {
                    throw new Error("Could not parse video URL from response.");
                }
            } else {
                throw new Error("API returned no data.");
            }

        } catch (err) {
            console.error("Green Screen Error:", err);
            setLocalError(err instanceof Error ? err.message : "Background removal failed.");
        } finally {
            setLocalLoading(false);
            setProgress('');
        }
    };

    const activeLoading = isLoading || localLoading;
    const activeError = error || localError;

    return (
        <div className="p-6 max-w-7xl mx-auto w-full h-full flex flex-col space-y-6 overflow-y-auto">
            {/* Header removed */}
            <div className="flex-shrink-0">
                <h2 className="text-3xl font-bold text-neutral-200 mb-2">Green Screen Studio</h2>
                <p className="text-neutral-400">Upload a video to automatically remove the background and generate a transparency mask or green screen compositing layer.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-grow">
                {/* Input Column */}
                <div className="flex flex-col gap-4">
                    <div className="bg-neutral-800/50 p-6 border border-neutral-700 rounded-xl flex-grow flex flex-col items-center justify-center relative min-h-[400px]">
                        {greenScreenState.source ? (
                            <div className="relative w-full h-full flex items-center justify-center bg-black/40 rounded-lg overflow-hidden">
                                <video 
                                    src={`data:${greenScreenState.source.mimeType};base64,${greenScreenState.source.base64}`} 
                                    controls 
                                    className="max-w-full max-h-[500px] object-contain" 
                                />
                                <button 
                                    onClick={() => onStateUpdate({ ...greenScreenState, source: null, resultUrl: null })}
                                    className="absolute top-2 right-2 p-2 bg-black/60 text-white rounded-full hover:bg-red-600 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                </button>
                            </div>
                        ) : (
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="text-center cursor-pointer p-8 border-2 border-dashed border-neutral-600 rounded-xl hover:border-neutral-400 hover:bg-neutral-800/50 transition-all w-full h-full flex flex-col items-center justify-center"
                            >
                                <VideoIcon className="w-16 h-16 text-neutral-600 mb-4" />
                                <h3 className="text-xl font-bold text-neutral-400">Upload Video</h3>
                                <p className="text-sm text-neutral-500 mt-2">MP4, MOV, WEBM</p>
                            </div>
                        )}
                        <input 
                            ref={fileInputRef} 
                            type="file" 
                            accept="video/*" 
                            className="hidden" 
                            onChange={handleUpload} 
                        />
                    </div>
                    
                    <button
                        onClick={handleRemoveBackground}
                        disabled={activeLoading || !greenScreenState.source}
                        className="w-full py-4 bg-green-700 hover:bg-green-600 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {activeLoading ? (
                            <><LoadingSpinner className="w-5 h-5 text-white" /> Processing...</>
                        ) : (
                            <><ScissorsIcon className="w-5 h-5" /> Remove Background</>
                        )}
                    </button>
                    
                    {activeError && (
                        <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-200 text-sm">
                            {activeError}
                        </div>
                    )}
                </div>

                {/* Output Column */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col relative overflow-hidden min-h-[400px]">
                    <div className="p-4 border-b border-neutral-800 bg-neutral-800/90 backdrop-blur-sm flex justify-between items-center">
                        <h3 className="font-bold text-neutral-300">Processed Output</h3>
                    </div>
                    
                    <div className="flex-grow flex items-center justify-center bg-[url('https://transparenttextures.com/patterns/cubes.png')] bg-neutral-800/30">
                        {activeLoading ? (
                            <div className="flex flex-col items-center">
                                <LoadingSpinner className="w-12 h-12 text-green-500" />
                                <p className="mt-4 text-green-400 animate-pulse font-mono text-sm">{progress}</p>
                            </div>
                        ) : greenScreenState.resultUrl ? (
                            <div className="w-full h-full flex flex-col">
                                <video 
                                    src={greenScreenState.resultUrl} 
                                    controls 
                                    autoPlay 
                                    loop 
                                    className="w-full h-full object-contain bg-transparent"
                                />
                            </div>
                        ) : (
                            <div className="text-neutral-600 flex flex-col items-center select-none">
                                <ScissorsIcon className="w-16 h-16 opacity-30" />
                                <p className="mt-4 text-sm font-medium opacity-50">Output will appear here</p>
                            </div>
                        )}
                    </div>

                    {greenScreenState.resultUrl && !activeLoading && (
                        <div className="p-4 border-t border-neutral-800 bg-neutral-800/90 backdrop-blur-sm">
                            <AssetActions 
                                asset={{ type: 'video', url: greenScreenState.resultUrl }}
                                onSaveToGrid={onAddAssetToGrid ? () => onAddAssetToGrid({ type: 'video', url: greenScreenState.resultUrl! }) : undefined}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
