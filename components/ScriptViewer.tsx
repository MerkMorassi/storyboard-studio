import React, { useRef } from 'react';

interface ScriptViewerProps {
    scriptText: string;
    onUpload: (file: File) => void;
}

export const ScriptViewer: React.FC<ScriptViewerProps> = ({ scriptText, onUpload }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type === 'text/plain') {
            onUpload(file);
        }
        event.target.value = ''; // Reset for re-uploading the same file
    };

    return (
        <div className="bg-neutral-900/50 p-6 border border-neutral-800 min-h-[70vh]">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-neutral-300">Script</h2>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".txt"
                    onChange={handleFileChange}
                />
                <button
                    onClick={handleUploadClick}
                    className="bg-neutral-700 text-white font-semibold py-2 px-4 hover:bg-neutral-600 transition duration-300"
                >
                    {scriptText ? 'Replace Script (.txt)' : 'Upload Script (.txt)'}
                </button>
            </div>
            {scriptText ? (
                <pre className="whitespace-pre-wrap break-words font-mono text-sm text-neutral-300 bg-neutral-800/70 p-4 overflow-y-auto h-[60vh]">
                    {scriptText}
                </pre>
            ) : (
                <div className="flex flex-col items-center justify-center h-[60vh] text-center text-neutral-500 border-2 border-dashed border-neutral-800">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0011.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <h3 className="text-xl font-semibold">No Script Loaded</h3>
                    <p>Upload a .txt file to view your screenplay here.</p>
                </div>
            )}
        </div>
    );
};