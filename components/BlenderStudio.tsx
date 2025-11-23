import React, { useRef } from 'react';
import { BlenderImage } from '../types.ts';
import { LoadingSpinner, DownloadIcon, AddToStoryIcon, PinIcon } from './icons.tsx';

interface BlenderStudioProps {
    sourceImages: BlenderImage[];
    resultImage: string | null;
    isLoading: boolean;
    error: string | null;
    onUpload: (files: FileList) => void;
    onRemoveImage: (id: string) => void;
    onGenerate: () => void;
    onAddToStoryboard: (base64: string) => void;
    onAddToInspiration: (base64: string) => void;
}

const ResultDisplay: React.FC<{
    resultImage: string;
    onAddToStoryboard: (base64: string) => void;
    onAddToInspiration: (base64: string) => void;
}> = ({ resultImage, onAddToStoryboard, onAddToInspiration }) => {

    const downloadImage = (base64: string) => {
        const link = document.createElement('a');
        link.href = `data:image/jpeg;base64,${base64}`;
        link.download = `blender-result-${Date.now()}.jpeg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="mt-6 space-y-4">
            <h3 className="text-xl font-semibold text-neutral-300">Blender Result</h3>
            <div className="bg-neutral-800/50 p-4 flex flex-col items-center">
                <img src={`data:image/jpeg;base64,${resultImage}`} alt="Blender Result" className="max-w-full max-h-[50vh] shadow-lg" />
                <div className="mt-4 flex items-center gap-3">
                    <button onClick={() => downloadImage(resultImage)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-300 bg-neutral-700 hover:bg-neutral-600 transition"><DownloadIcon /> Download</button>
                    <button onClick={() => onAddToStoryboard(resultImage)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-300 bg-neutral-700 hover:bg-neutral-600 transition"><AddToStoryIcon /> Add to Storyboard</button>
                    <button onClick={() => onAddToInspiration(resultImage)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-300 bg-neutral-700 hover:bg-neutral-600 transition"><PinIcon /> Add to Inspiration</button>
                </div>
            </div>
        </div>
    );
};


export const BlenderStudio: React.FC<BlenderStudioProps> = ({ sourceImages, resultImage, isLoading, error, onUpload, onRemoveImage, onGenerate, onAddToStoryboard, onAddToInspiration }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            onUpload(event.target.files);
        }
        event.target.value = ''; // Reset
    };
    
    return (
        <div className="bg-neutral-900/50 p-6 border border-neutral-800">
            <h2 className="text-2xl font-bold text-neutral-300 mb-2">Blender Studio</h2>
            <p className="text-sm text-neutral-400 mb-6">Upload multiple images (e.g., portraits) and the AI will blend their features into a single, new character.</p>

            <div className="bg-neutral-800/50 p-4">
                <h3 className="text-lg font-semibold text-neutral-300 mb-3">Source Images</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mb-4">
                    {sourceImages.map(img => (
                        <div key={img.id} className="relative group aspect-square">
                            <img src={`data:image/jpeg;base64,${img.base64}`} alt="Source" className="w-full h-full object-cover"/>
                            <button
                                onClick={() => onRemoveImage(img.id)}
                                className="absolute top-1 right-1 bg-black/50 text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Remove image"
                            >
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            </button>
                        </div>
                    ))}
                     <label htmlFor="blender-upload" className="aspect-square flex flex-col items-center justify-center w-full border-2 border-neutral-700 border-dashed cursor-pointer bg-neutral-900/50 hover:bg-neutral-800/50 transition">
                        <div className="flex flex-col items-center justify-center text-neutral-400">
                           <svg className="w-8 h-8" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/></svg>
                        </div>
                        <input id="blender-upload" type="file" className="hidden" onChange={handleFileChange} multiple accept="image/*"/>
                    </label>
                </div>

                 <button
                    onClick={onGenerate}
                    disabled={isLoading || sourceImages.length < 2}
                    className="w-full bg-neutral-700 text-white font-bold py-3 px-4 hover:bg-neutral-600 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                    {isLoading ? 'Generating...' : `Generate Blend (${sourceImages.length} images)`}
                </button>
            </div>

             {error && (
                 <div className="mt-6 bg-red-900/20 border border-red-500 p-4 text-center">
                    <h3 className="text-lg font-semibold text-red-400">Generation Failed</h3>
                    <p className="mt-1 text-red-300 text-sm">{error}</p>
                </div>
            )}
            
            {isLoading && (
                <div className="mt-6 flex flex-col items-center justify-center min-h-[200px] bg-neutral-900/50 p-4">
                    <LoadingSpinner />
                    <p className="mt-4 text-lg text-neutral-300 animate-pulse">Blending images...</p>
                </div>
            )}

            {resultImage && !isLoading && (
                <ResultDisplay 
                    resultImage={resultImage}
                    onAddToStoryboard={onAddToStoryboard}
                    onAddToInspiration={onAddToInspiration}
                />
            )}
        </div>
    );
};