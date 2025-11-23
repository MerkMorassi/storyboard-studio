import React from 'react';
import { FaceRepairState } from '../types.ts';
import { LoadingSpinner, DownloadIcon, AddToStoryIcon, PinIcon, FaceSparkleIcon } from './icons.tsx';

interface FaceRepairStudioProps {
    faceRepairState: FaceRepairState;
    isLoading: boolean;
    error: string | null;
    onUpload: (file: File) => void;
    onRemoveImage: () => void;
    onGenerate: () => void;
    onAddToStoryboard: (base64: string) => void;
    onAddToInspiration: (base64: string) => void;
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
            <div className="relative group w-full max-w-lg mx-auto">
                <img src={`data:${image.mimeType};base64,${image.base64}`} alt="Source for face repair" className="w-full h-full object-cover" />
                <button
                    onClick={onRemoveImage}
                    className="absolute top-2 right-2 bg-black/50 text-white p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove Image"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
            </div>
        )
    }

    return (
        <label htmlFor="face-repair-upload" className="w-full max-w-lg mx-auto aspect-video flex flex-col items-center justify-center border-2 border-neutral-700 border-dashed cursor-pointer bg-neutral-900/50 hover:bg-neutral-800/50 transition">
            <div className="flex flex-col items-center justify-center text-neutral-400 p-4 text-center">
                <svg className="w-10 h-10 mb-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/></svg>
                <p className="text-lg font-semibold">Upload Image for Face Repair</p>
                <p className="text-sm">Click here to select a file</p>
            </div>
            <input id="face-repair-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
        </label>
    );
};

const ResultDisplay: React.FC<{
    source: { base64: string; mimeType: string };
    resultImage: string;
    onAddToStoryboard: (base64: string) => void;
    onAddToInspiration: (base64: string) => void;
}> = ({ source, resultImage, onAddToStoryboard, onAddToInspiration }) => {
    const downloadImage = (base64: string) => {
        const link = document.createElement('a');
        link.href = `data:image/jpeg;base64,${base64}`;
        link.download = `face-repair-result-${Date.now()}.jpeg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="mt-8 space-y-4">
            <h3 className="text-xl font-semibold text-neutral-300 text-center">Repair Result</h3>
            <div className="bg-neutral-800/50 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="w-full md:w-1/2">
                        <h4 className="text-center text-lg font-semibold text-neutral-400 mb-2">Before</h4>
                        <img src={`data:${source.mimeType};base64,${source.base64}`} alt="Original" className="w-full shadow-lg" />
                    </div>
                    <div className="w-full md:w-1/2">
                        <h4 className="text-center text-lg font-semibold text-neutral-300 mb-2">After</h4>
                        <img src={`data:image/jpeg;base64,${resultImage}`} alt="Repaired Result" className="w-full shadow-lg" />
                    </div>
                </div>
                 <div className="mt-4 flex items-center justify-center gap-3">
                    <button onClick={() => downloadImage(resultImage)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-300 bg-neutral-700 hover:bg-neutral-600 transition"><DownloadIcon /> Download</button>
                    <button onClick={() => onAddToStoryboard(resultImage)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-300 bg-neutral-700 hover:bg-neutral-600 transition"><AddToStoryIcon /> Add to Storyboard</button>
                    <button onClick={() => onAddToInspiration(resultImage)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-300 bg-neutral-700 hover:bg-neutral-600 transition"><PinIcon /> Add to Inspiration</button>
                </div>
            </div>
        </div>
    );
};

export const FaceRepairStudio: React.FC<FaceRepairStudioProps> = ({ faceRepairState, isLoading, error, onUpload, onRemoveImage, onGenerate, onAddToStoryboard, onAddToInspiration }) => {
    return (
        <div className="bg-neutral-900/50 p-6 border border-neutral-800">
            <h2 className="text-2xl font-bold text-neutral-300 mb-2">Face Repair Studio</h2>
            <p className="text-sm text-neutral-400 mb-6">Improve the quality of faces in your images. Fix blur, enhance details, and correct lighting.</p>
            
            <div className="flex flex-col items-center gap-6">
                <ImageUpload image={faceRepairState.source} onUpload={onUpload} onRemoveImage={onRemoveImage} />

                {faceRepairState.source && (
                    <button
                        onClick={onGenerate}
                        disabled={isLoading}
                        className="w-full max-w-xs bg-neutral-700 text-white font-bold py-3 px-4 hover:bg-neutral-600 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? 'Repairing...' : <><FaceSparkleIcon /> Repair Face</>}
                    </button>
                )}
            </div>
            
             {error && (
                 <div className="mt-8 bg-red-900/20 border border-red-500 p-4 text-center">
                    <h3 className="text-lg font-semibold text-red-400">Generation Failed</h3>
                    <p className="mt-1 text-red-300 text-sm">{error}</p>
                </div>
            )}
            
            {isLoading && (
                <div className="mt-8 flex flex-col items-center justify-center min-h-[200px] bg-neutral-900/50 p-4">
                    <LoadingSpinner />
                    <p className="mt-4 text-lg text-neutral-300 animate-pulse">Enhancing face...</p>
                </div>
            )}
            
            {faceRepairState.result && faceRepairState.source && !isLoading && (
                 <ResultDisplay
                    source={faceRepairState.source}
                    resultImage={faceRepairState.result}
                    onAddToStoryboard={onAddToStoryboard}
                    onAddToInspiration={onAddToInspiration}
                />
            )}
        </div>
    );
};