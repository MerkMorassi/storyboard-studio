import React, { useState } from 'react';
import { StoryboardFrame as StoryboardFrameType } from '../types.ts';
import { DownloadIcon } from './icons.tsx';

interface StoryboardProps {
    frames: StoryboardFrameType[];
    onUpdateNote: (id: string, notes: string) => void;
    onRemove: (id: string) => void;
    onReorder: (startIndex: number, endIndex: number) => void;
}

const downloadImage = (base64Image: string, filename: string) => {
    const link = document.createElement('a');
    link.href = `data:image/jpeg;base64,${base64Image}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const StoryboardFrame: React.FC<{
    frame: StoryboardFrameType;
    index: number;
    onUpdateNote: (id: string, notes: string) => void;
    onRemove: (id: string) => void;
    onDragStart: (e: React.DragEvent, index: number) => void;
    onDragEnter: (e: React.DragEvent, index: number) => void;
    onDragEnd: (e: React.DragEvent) => void;
    draggedOverIndex: number | null;
}> = ({ frame, index, onUpdateNote, onRemove, onDragStart, onDragEnter, onDragEnd, draggedOverIndex }) => {
    
    const isBeingDraggedOver = draggedOverIndex === index;
    
    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, index)}
            onDragEnter={(e) => onDragEnter(e, index)}
            onDragEnd={onDragEnd}
            onDragOver={(e) => e.preventDefault()}
            className={`flex-shrink-0 w-72 bg-neutral-900 shadow-lg border border-neutral-800 transition-all duration-300 ${isBeingDraggedOver ? 'transform scale-105 bg-neutral-800' : ''}`}
        >
            <div className="relative group">
                <img src={`data:image/jpeg;base64,${frame.base64Image}`} alt={`Storyboard frame ${index + 1}`} className="w-full h-40 object-cover" />
                <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onRemove(frame.id)}
                        className="bg-black/50 text-white p-1.5 hover:bg-neutral-700 transition-colors"
                        aria-label="Remove frame"
                        title="Remove"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <button
                        onClick={() => downloadImage(frame.base64Image, `storyboard-frame-${index + 1}.jpeg`)}
                        className="bg-black/50 text-white p-1.5 hover:bg-neutral-700 transition-colors"
                        aria-label="Download frame"
                        title="Download"
                    >
                        <DownloadIcon />
                    </button>
                </div>
            </div>
            <div className="p-3 space-y-2">
                <textarea
                    value={frame.notes}
                    onChange={(e) => onUpdateNote(frame.id, e.target.value)}
                    placeholder="Add notes, dialogue, or camera directions..."
                    className="w-full h-24 bg-neutral-800/50 text-sm text-neutral-300 border border-neutral-700 p-2 resize-y focus:ring-2 focus:ring-neutral-500 outline-none"
                />
            </div>
        </div>
    );
};


export const Storyboard: React.FC<StoryboardProps> = ({ frames, onUpdateNote, onRemove, onReorder }) => {
    const dragItem = React.useRef<number | null>(null);
    const dragOverItem = React.useRef<number | null>(null);
    const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);

    const handleDragStart = (e: React.DragEvent, position: number) => {
        dragItem.current = position;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.currentTarget as any);
    };

    const handleDragEnter = (e: React.DragEvent, position: number) => {
        dragOverItem.current = position;
        setDraggedOverIndex(position);
    };

    const handleDrop = (e: React.DragEvent) => {
        if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
            onReorder(dragItem.current, dragOverItem.current);
        }
        dragItem.current = null;
        dragOverItem.current = null;
        setDraggedOverIndex(null);
    };

    if (frames.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[50vh] bg-neutral-900/50 border-2 border-dashed border-neutral-800 p-8 text-center">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-4 text-xl font-semibold text-neutral-400">Your Storyboard is Empty</h3>
                <p className="mt-1 text-neutral-500">Go to the Grid View and add images to start building your story.</p>
            </div>
        );
    }
    
    return (
        <div>
            <h2 className="text-2xl font-bold text-neutral-300 mb-4">Storyboard</h2>
            <div 
                className="flex gap-4 overflow-x-auto pb-4"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={() => setDraggedOverIndex(null)}
            >
                {frames.map((frame, index) => (
                    <StoryboardFrame
                        key={frame.id}
                        frame={frame}
                        index={index}
                        onUpdateNote={onUpdateNote}
                        onRemove={onRemove}
                        onDragStart={handleDragStart}
                        onDragEnter={handleDragEnter}
                        onDragEnd={handleDrop}
                        draggedOverIndex={draggedOverIndex}
                    />
                ))}
            </div>
        </div>
    );
};