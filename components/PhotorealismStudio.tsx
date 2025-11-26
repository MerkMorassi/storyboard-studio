
import React, { useState } from 'react';
import { PhotorealismState } from '../types.ts';
import { LoadingSpinner, DownloadIcon, AddToStoryIcon, PinIcon, PhotoRealismIcon } from './icons.tsx';
import { BeforeAfterModal } from './BeforeAfterModal.tsx';

interface PhotorealismStudioProps {
    photorealismState: PhotorealismState;
    isLoading: boolean;
    error: string | null;
    onUpload: (file: File) => void;
    onRemoveImage: () => void;
    onGenerate: () => void;
    onAddToStoryboard: (base64: string) => void;
    onAddToInspiration: (base64: string) => void;
    onPromptChange: (prompt: string, negativePrompt: string) => void;
}

const ImageUpload: React.FC<{
    image: { base64: string; mimeType: string } | null;
    onUpload: (file: File) => void;
    onRemoveImage: () => void;
}> = ({ image, onUpload, onRemoveImage }) => {
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onUpload(file);
        }
        event.target.value = '';
    };

    if (image) {
        return (
            <div className="relative group w-full max-w-lg mx-auto rounded overflow-hidden">
                <img src={`data:${image.mimeType};base64,${image.base64}`} alt="Source for photorealism" className="w-full h-full object-cover" />
                <button
                    onClick={onRemoveImage}
                    className="absolute top-2 right-2 bg-black/50 text-white p-1.5 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                    aria-label="Remove Image"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
            </div>
        )
    }

    return (
        <label htmlFor="photorealism-upload" className="w-full h-[50vh] flex flex-col items-center justify-center border-2 border-dashed border-neutral-800 rounded-xl bg-neutral-900/30 cursor-pointer hover:bg-neutral-800/50 transition text-neutral-500">
            <div className="flex flex-col items-center justify-center p-4 text-center">
                <div className="w-16 h-16 text-neutral-700 mb-4"><PhotoRealismIcon /></div>
                <h3 className="text-xl font-semibold text-neutral-300 mb-2">Upload Cartoon or Illustration</h3>
                <p className="text-sm">Click here to select a file</p>
            </div>
            <input id="photorealism-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
        </label>
    );
};

const ResultDisplay: React.FC<{
    source: { base64: string; mimeType: string };
    resultImage: string;
    onAddToStoryboard: (base64: string) => void;
    onAddToInspiration: (base64: string) => void;
    onViewFull: () => void;
}> = ({ source, resultImage, onAddToStoryboard, onAddToInspiration, onViewFull }) => {
    const downloadImage = (base64: string) => {
        const link = document.createElement('a');
        link.href = `data:image/jpeg;base64,${base64}`;
        link.download = `photorealistic-result-${Date.now()}.jpeg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="mt-8 space-y-4">
            <h3 className="text-xl font-semibold text-neutral-300 text-center">Transformation Result</h3>
            <div className="bg-neutral-800/50 p-4 rounded-lg border border-neutral-700">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="w-full md:w-1/2 cursor-pointer group" onClick={onViewFull}>
                        <h4 className="text-center text-lg font-semibold text-neutral-400 mb-2">Before</h4>
                        <div className="relative">
                            <img src={`data:${source.mimeType};base64,${source.base64}`} alt="Original" className="w-full shadow-lg rounded" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold rounded">
                                Click to enlarge
                            </div>
                        </div>
                    </div>
                    <div className="w-full md:w-1/2 cursor-pointer group" onClick={onViewFull}>
                        <h4 className="text-center text-lg font-semibold text-neutral-300 mb-2">After</h4>
                         <div className="relative">
                            <img src={`data:image/jpeg;base64,${resultImage}`} alt="Photorealistic Result" className="w-full shadow-lg rounded" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold rounded">
                                Click to enlarge
                            </div>
                        </div>
                    </div>
                </div>
                 <div className="mt-4 flex items-center justify-center gap-3">
                    <button onClick={() => downloadImage(resultImage)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-300 bg-neutral-700 hover:bg-neutral-600 transition rounded"><DownloadIcon /> Download</button>
                    <button onClick={() => onAddToStoryboard(resultImage)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-300 bg-neutral-700 hover:bg-neutral-600 transition rounded"><AddToStoryIcon /> Add to Storyboard</button>
                    <button onClick={() => onAddToInspiration(resultImage)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-300 bg-neutral-700 hover:bg-neutral-600 transition rounded"><PinIcon /> Add to Inspiration</button>
                </div>
            </div>
        </div>
    );
};

export const PhotorealismStudio: React.FC<PhotorealismStudioProps> = ({ photorealismState, isLoading, error, onUpload, onRemoveImage, onGenerate, onAddToStoryboard, onAddToInspiration, onPromptChange }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { source, result, prompt, negativePrompt } = photorealismState;

    const baseInputClasses = "w-full bg-neutral-800/60 border border-neutral-700 p-2 focus:ring-2 focus:ring-neutral-500 focus:border-neutral-500 transition duration-200 outline-none rounded";

    const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onPromptChange(e.target.value, negativePrompt);
    };

    const handleNegativePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onPromptChange(prompt, e.target.value);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto w-full">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-neutral-200 mb-2">Photorealism Studio</h2>
                <p className="text-neutral-400">Transform cartoons and illustrations into photorealistic images while preserving the original composition and subject.</p>
            </div>
            
            <div className="flex flex-col items-center gap-6">
                <ImageUpload image={photorealismState.source} onUpload={onUpload} onRemoveImage={onRemoveImage} />

                {photorealismState.source && (
                    <div className="w-full max-w-lg space-y-4">
                         <div>
                            <label className="text-sm font-semibold text-neutral-400 mb-2 block">Positive Prompt (Optional)</label>
                            <textarea
                                value={prompt}
                                onChange={handlePromptChange}
                                placeholder="e.g., cinematic lighting, dramatic shadows, 8k"
                                className={`${baseInputClasses} h-24 resize-y`}
                                disabled={isLoading}
                            />
                        </div>
                         <div>
                            <label className="text-sm font-semibold text-neutral-400 mb-2 block">Negative Prompt (Optional)</label>
                            <textarea
                                value={negativePrompt}
                                onChange={handleNegativePromptChange}
                                placeholder="e.g., blurry, watermark, text, signature"
                                className={`${baseInputClasses} h-24 resize-y`}
                                disabled={isLoading}
                            />
                        </div>
                        <button
                            onClick={onGenerate}
                            disabled={isLoading}
                            className="w-full bg-neutral-700 text-white font-bold py-3 px-4 hover:bg-neutral-600 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 rounded"
                        >
                            {isLoading ? 'Generating...' : <><PhotoRealismIcon /> Generate Photorealistic Image</>}
                        </button>
                    </div>
                )}
            </div>
            
             {error && (
                 <div className="mt-8 bg-red-900/20 border border-red-500 p-4 text-center rounded">
                    <h3 className="text-lg font-semibold text-red-400">Generation Failed</h3>
                    <p className="mt-1 text-red-300 text-sm">{error}</p>
                </div>
            )}
            
            {isLoading && (
                <div className="mt-8 flex flex-col items-center justify-center min-h-[200px] bg-neutral-900/50 p-4 rounded border border-neutral-800">
                    <LoadingSpinner />
                    <p className="mt-4 text-lg text-neutral-300 animate-pulse">Transforming to photorealism...</p>
                </div>
            )}
            
            {result && source && !isLoading && (
                 <ResultDisplay
                    source={source}
                    resultImage={result}
                    onAddToStoryboard={onAddToStoryboard}
                    onAddToInspiration={onAddToInspiration}
                    onViewFull={() => setIsModalOpen(true)}
                />
            )}
             <BeforeAfterModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                beforeImage={source}
                afterImage={result}
            />
        </div>
    );
};