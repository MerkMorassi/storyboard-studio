import React, { useRef } from 'react';
import { InspirationImage } from '../types';
import { UseAsGuideIcon } from './icons';

interface InspirationBoardProps {
    images: InspirationImage[];
    onUpload: (file: File) => void;
    onRemove: (id: string) => void;
    onUseAsGuide: (base64Image: string) => void;
}

export const InspirationBoard: React.FC<InspirationBoardProps> = ({ images, onUpload, onRemove, onUseAsGuide }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            onUpload(file);
        }
        event.target.value = ''; // Reset
    };

    return (
        <div className="min-h-[70vh]">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-neutral-300">Inspiration Board</h2>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                />
                <button
                    onClick={handleUploadClick}
                    className="bg-neutral-700 text-white font-semibold py-2 px-4 hover:bg-neutral-600 transition duration-300"
                >
                    Upload Inspiration
                </button>
            </div>

            {images.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-full min-h-[50vh] bg-neutral-900/50 border-2 border-dashed border-neutral-800 p-8 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h3 className="mt-4 text-xl font-semibold text-neutral-400">Your Board is Empty</h3>
                    <p className="mt-1 text-neutral-500">Upload images or add them from the grid to build your mood board.</p>
                </div>
            ) : (
                <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4 space-y-4">
                    {images.map(image => (
                        <div key={image.id} className="break-inside-avoid relative group">
                            <img 
                                src={`data:image/jpeg;base64,${image.base64Image}`}
                                alt="Inspiration"
                                className="w-full shadow-lg"
                            />
                             <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                <button
                                    onClick={() => onUseAsGuide(image.base64Image)}
                                    className="p-2 bg-black/60 text-white hover:bg-neutral-600 transition-colors"
                                    title="Use as Guiding Image"
                                >
                                    <UseAsGuideIcon />
                                </button>
                                <button
                                    onClick={() => onRemove(image.id)}
                                    className="p-2 bg-black/60 text-white hover:bg-neutral-600 transition-colors"
                                    title="Remove"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};