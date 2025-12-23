
import React, { useState } from 'react';
import { DownloadIcon, AddToStoryIcon, PinIcon, GridIcon } from './icons';

interface AssetActionsProps {
    asset: {
        type: 'image' | 'video';
        base64?: string;
        url?: string;
        mimeType?: string;
    };
    onSaveToGrid?: () => void;
    onSaveToStoryboard?: () => void;
    onSaveToInspiration?: () => void;
    className?: string;
}

export const AssetActions: React.FC<AssetActionsProps> = ({ 
    asset, 
    onSaveToGrid, 
    onSaveToStoryboard, 
    onSaveToInspiration,
    className = ""
}) => {
    const [feedback, setFeedback] = useState<string | null>(null);

    const showFeedback = (msg: string) => {
        setFeedback(msg);
        setTimeout(() => setFeedback(null), 2000);
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        if (asset.type === 'video' && asset.url) {
            link.href = asset.url;
            link.download = `video-asset-${Date.now()}.mp4`;
            link.target = '_blank'; // Needed for some cross-origin setups
        } else if (asset.type === 'image' && asset.base64) {
            link.href = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
            link.download = `image-asset-${Date.now()}.jpeg`;
        } else {
            console.error("Invalid asset format for download");
            return;
        }
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showFeedback("Downloaded");
    };

    const wrapAction = (action: (() => void) | undefined, msg: string) => {
        if (!action) return undefined;
        return () => {
            action();
            showFeedback(msg);
        };
    };

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <button 
                onClick={handleDownload} 
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-300 bg-neutral-700 hover:bg-neutral-600 transition rounded shadow-sm"
                title="Download to computer"
            >
                <DownloadIcon /> <span className="hidden sm:inline">Download</span>
            </button>

            {onSaveToGrid && (
                <button 
                    onClick={wrapAction(onSaveToGrid, "Saved to Grid")} 
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-300 bg-neutral-700 hover:bg-neutral-600 transition rounded shadow-sm"
                    title="Save to Project Gallery"
                >
                    <GridIcon /> <span className="hidden sm:inline">To Grid</span>
                </button>
            )}

            {onSaveToStoryboard && (
                <button 
                    onClick={wrapAction(onSaveToStoryboard, "Added to Storyboard")} 
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-300 bg-neutral-700 hover:bg-neutral-600 transition rounded shadow-sm"
                    title="Add to Storyboard"
                >
                    <AddToStoryIcon />
                </button>
            )}

            {onSaveToInspiration && asset.type === 'image' && (
                <button 
                    onClick={wrapAction(onSaveToInspiration, "Pinned to Inspiration")} 
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-300 bg-neutral-700 hover:bg-neutral-600 transition rounded shadow-sm"
                    title="Pin to Inspiration"
                >
                    <PinIcon />
                </button>
            )}

            {feedback && (
                <span className="text-xs text-brand animate-fade-in font-bold ml-2">
                    {feedback}
                </span>
            )}
        </div>
    );
};
