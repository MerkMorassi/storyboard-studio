import React from 'react';
import { StoryboardFrame } from '../types';
import { LoadingSpinner } from './icons';

interface VideoGeneratorProps {
    storyboard: StoryboardFrame[];
    onGenerateVideo: (frame: StoryboardFrame) => void;
    isLoading: boolean;
    videoUrl: string | null;
    error: string | null;
    progress: string;
}

export const VideoGenerator: React.FC<VideoGeneratorProps> = ({ storyboard, onGenerateVideo, isLoading, videoUrl, error, progress }) => {
    
    const handleGenerateClick = () => {
        if (storyboard.length > 0) {
            onGenerateVideo(storyboard[0]); // For now, generate from the first frame
        }
    };
    
    if (storyboard.length === 0) {
        return (
             <div className="flex flex-col items-center justify-center h-full min-h-[50vh] bg-neutral-900/50 border-2 border-dashed border-neutral-800 p-8 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <h3 className="mt-4 text-xl font-semibold text-neutral-400">No Storyboard Frames</h3>
                <p className="mt-1 text-neutral-500">Please create a storyboard first to generate a video animatic.</p>
            </div>
        );
    }
    
    return (
        <div className="bg-neutral-900/50 p-6 border border-neutral-800">
            <h2 className="text-2xl font-bold text-neutral-300 mb-4">Video Studio</h2>
            
            <div className="bg-neutral-800/50 p-4">
                <p className="text-sm text-neutral-400 mb-4">
                    This tool will generate a video animatic from your storyboard. Currently, it creates a clip from the <strong className="text-neutral-300">first frame</strong> using its prompt and notes as instructions for camera movement.
                </p>

                {error && (
                     <div className="mb-4 bg-red-900/20 border border-red-500 p-4 text-center">
                        <h3 className="text-lg font-semibold text-red-400">Video Generation Failed</h3>
                        <p className="mt-1 text-red-300 text-sm">{error}</p>
                    </div>
                )}
                
                {isLoading && (
                    <div className="flex flex-col items-center justify-center min-h-[200px] bg-neutral-900/50 p-4">
                        <LoadingSpinner />
                        <p className="mt-4 text-lg text-neutral-300 animate-pulse">{progress || 'Initializing...'}</p>
                    </div>
                )}

                {videoUrl && !isLoading && (
                    <div className="space-y-4 mb-4">
                        <video controls src={videoUrl} className="w-full bg-black" />
                        <a 
                            href={videoUrl} 
                            download={`storyboard-animatic-${Date.now()}.mp4`}
                            className="w-full block text-center bg-neutral-700 text-white font-bold py-3 px-4 hover:bg-neutral-600 transition duration-300"
                        >
                            Download Video
                        </a>
                    </div>
                )}

                {!isLoading && (
                     <button
                        onClick={handleGenerateClick}
                        disabled={isLoading}
                        className="w-full bg-neutral-700 text-white font-bold py-3 px-4 hover:bg-neutral-600 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {videoUrl ? 'Generate New Animatic' : 'Generate Animatic from First Frame'}
                    </button>
                )}
            </div>
        </div>
    );
};