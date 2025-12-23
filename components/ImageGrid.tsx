
import React, { useState, useRef, useEffect } from 'react';
import { LoadingSpinner, BasicGridOverlay, TriadicGridOverlay, BasicGoldenRatioGridOverlay, TriadicGoldenRatioGridOverlay, EditIcon, AddToStoryIcon, PinIcon, DownloadIcon, UpscaleIcon, CharacterIcon, AutomationIcon, VideoIcon } from './icons.tsx';
import { GridOverlayType, ImageState, Agent } from '../types.ts';

interface ImageGridProps {
  images: ImageState[];
  isLoading: boolean;
  error: string | null;
  onViewImage: (image: ImageState) => void;
  gridOverlay: GridOverlayType;
  onGridOverlayChange: (type: GridOverlayType) => void;
  onEditImage: (base64Image: string) => void;
  onAddToStoryboard: (base64Image: string) => void;
  onAddToInspiration: (base64Image: string) => void;
  onUpscaleImage: (id: string) => void;
  agents: Agent[];
  onAssignAgentToImage: (imageId: string, agentId: string | null) => void;
  onCreateAgent: (name: string) => Agent;
  agentFilter: string;
  onAgentFilterChange: (filter: string) => void;
  awaitingExternalGeneration: boolean;
}

const gridOptions: { id: GridOverlayType; label: string }[] = [
    { id: 'none', label: 'No Grid' },
    { id: 'basic', label: 'Basic' },
    { id: 'triadic', label: 'Triadic' },
    { id: 'golden-basic', label: 'Golden Ratio 1. Basic' },
    { id: 'golden-triadic', label: 'Golden Ratio 2. Triadic' },
];

const downloadAsset = (image: ImageState) => {
    const link = document.createElement('a');
    if (image.type === 'video' && image.url) {
        link.href = image.url;
        link.download = `video-${Date.now()}.mp4`;
        link.target = "_blank";
    } else if (image.base64) {
        link.href = `data:${image.mimeType || 'image/jpeg'};base64,${image.base64}`;
        link.download = `image-${Date.now()}.jpeg`;
    } else {
        return;
    }
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const AssignAgentControl: React.FC<{ 
    image: ImageState;
    agents: Agent[];
    onAssignAgentToImage: (imageId: string, agentId: string | null) => void;
    onCreateAgent: (name: string) => Agent;
}> = ({ image, agents, onAssignAgentToImage, onCreateAgent }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const handleAssign = (agentId: string | null) => {
        onAssignAgentToImage(image.id, agentId);
        setIsOpen(false);
    };

    const handleCreateAndAssign = () => {
        const name = prompt("Enter the new agent's name:");
        if (name && name.trim()) {
            const newAgent = onCreateAgent(name);
            onAssignAgentToImage(image.id, newAgent.id);
        }
        setIsOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef} onClick={(e) => e.stopPropagation()}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 bg-black/60 text-white hover:bg-neutral-600 transition-colors rounded-md"
                title="Assign Agent"
            >
                <CharacterIcon />
            </button>
            {isOpen && (
                <div className="absolute bottom-full right-0 mb-1 w-48 bg-neutral-800 border border-neutral-700 shadow-lg z-20 rounded-md overflow-hidden">
                    <div className="p-1 text-xs text-neutral-400">Assign Agent</div>
                    <div className="max-h-40 overflow-y-auto">
                        {agents.map(agent => (
                            <button
                                key={agent.id}
                                onClick={() => handleAssign(agent.id)}
                                className="w-full text-left px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-700"
                            >
                                {agent.name}
                            </button>
                        ))}
                    </div>
                    <div className="border-t border-neutral-700">
                        <button
                            onClick={handleCreateAndAssign}
                            className="w-full text-left px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-700"
                        >
                            + Create new...
                        </button>
                        {image.agentId && (
                             <button
                                onClick={() => handleAssign(null)}
                                className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-neutral-700"
                            >
                                x Unassign
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export const ImageGrid: React.FC<ImageGridProps> = ({ images, isLoading, error, onViewImage, gridOverlay, onGridOverlayChange, onEditImage, onAddToStoryboard, onAddToInspiration, onUpscaleImage, agents, onAssignAgentToImage, onCreateAgent, agentFilter, onAgentFilterChange, awaitingExternalGeneration }) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <LoadingSpinner />
        <p className="mt-4 text-lg text-neutral-300 animate-pulse">Generating your masterpieces...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-red-900/20 border border-red-500 p-8 text-center rounded-lg">
        <div>
          <h3 className="text-xl font-semibold text-red-400">Generation Failed</h3>
          <p className="mt-2 text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  if (awaitingExternalGeneration) {
    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center rounded-lg">
            <div className="w-16 h-16 text-neutral-700"><AutomationIcon /></div>
            <h3 className="mt-4 text-xl font-semibold text-neutral-400">Request Sent to External Engine</h3>
            <p className="mt-1 text-neutral-500">Your images are being generated by your external service. Check your configured output folder for results.</p>
        </div>
    );
  }

  if (images.length === 0 && !agentFilter) {
    return (
       <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <h3 className="mt-4 text-xl font-semibold text-neutral-400">Project Gallery</h3>
        <p className="mt-1 text-neutral-500">Generated images and videos will appear here.</p>
      </div>
    );
  }

  const compositionHint: Record<GridOverlayType, string> = {
    'none': '',
    'basic': 'Composition Hint: Prompt is being enhanced for Rule of Thirds.',
    'triadic': 'Composition Hint: Prompt is being enhanced for Triadic composition.',
    'golden-basic': 'Composition Hint: Prompt is being enhanced for Golden Ratio composition.',
    'golden-triadic': 'Composition Hint: Prompt is being enhanced for Golden Ratio (Triadic) composition.',
  };
  
  const getAgentName = (agentId?: string) => {
      if (!agentId) return null;
      return agents.find(c => c.id === agentId)?.name;
  };

  return (
    <div>
        <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
             <div className="relative w-full sm:w-auto flex-grow max-w-xs">
                <input
                    type="text"
                    value={agentFilter}
                    onChange={(e) => onAgentFilterChange(e.target.value)}
                    placeholder="Filter by agent..."
                    className="w-full pl-8 py-2 px-3 bg-neutral-900 text-neutral-200 border border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
                 <div className="absolute inset-y-0 left-0 flex items-center pl-2 text-neutral-500 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                </div>
            </div>
            <div className="flex items-center justify-end gap-2 flex-wrap">
                <span className="text-sm text-neutral-400 hidden md:inline">Composition Grids:</span>
                {gridOptions.map(option => (
                    <button
                        key={option.id}
                        onClick={() => onGridOverlayChange(option.id)}
                        className={`px-3 py-1 text-sm font-medium transition-colors duration-200 rounded-md ${
                            gridOverlay === option.id
                                ? 'bg-neutral-700 text-white shadow-md'
                                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                        }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
        {gridOverlay !== 'none' && (
            <p className="text-xs text-neutral-300 h-4 text-right mb-2">{compositionHint[gridOverlay]}</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {images.map((image, index) => (
                <div 
                    key={image.id} 
                    className="relative bg-neutral-800 rounded-lg overflow-hidden group transition-all duration-300 hover:scale-105 shadow-lg cursor-pointer ring-2 ring-transparent hover:ring-blue-500/50"
                    onClick={() => onViewImage(image)}
                >
                    {image.type === 'video' ? (
                        <div className="relative w-full h-full">
                            <video 
                                src={image.url} 
                                className="w-full h-full object-cover" 
                                controls={false} // Hide controls in grid, show icon
                                muted
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                                <VideoIcon className="w-12 h-12 text-white/80" />
                            </div>
                        </div>
                    ) : (
                        <img
                            src={`data:${image.mimeType || 'image/jpeg'};base64,${image.base64}`}
                            alt={`Gallery asset ${index + 1}`}
                            className="w-full h-full object-cover transition-opacity duration-500"
                        />
                    )}

                    {image.isUpscaling && (
                        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-10">
                            <LoadingSpinner />
                            <p className="mt-2 text-sm text-white">Preparing...</p>
                        </div>
                    )}
                    {gridOverlay !== 'none' && image.type === 'image' && (
                        <>
                            {gridOverlay === 'basic' && <BasicGridOverlay />}
                            {gridOverlay === 'triadic' && <TriadicGridOverlay />}
                            {gridOverlay === 'golden-basic' && <BasicGoldenRatioGridOverlay />}
                            {gridOverlay === 'golden-triadic' && <TriadicGoldenRatioGridOverlay />}
                        </>
                    )}
                    
                    <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                      {image.type === 'image' && image.base64 && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); onEditImage(image.base64!); }}
                            className="p-2 bg-black/60 text-white hover:bg-neutral-600 transition-colors rounded-md"
                            aria-label="Edit image"
                            title="Edit Image (Inpaint)"
                          >
                            <EditIcon />
                          </button>
                      )}
                      
                      {(image.type === 'image' || image.type === 'video') && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); onUpscaleImage(image.id); }}
                            className="p-2 bg-black/60 text-white hover:bg-neutral-600 transition-colors rounded-md"
                            aria-label="Upscale asset"
                            title={`Upscale ${image.type === 'image' ? 'Image' : 'Video'} (Enhance)`}
                          >
                            <UpscaleIcon />
                          </button>
                      )}

                      {image.type === 'image' && image.base64 && (
                          <>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onAddToStoryboard(image.base64!); }}
                                className="p-2 bg-black/60 text-white hover:bg-neutral-600 transition-colors rounded-md"
                                aria-label="Add to storyboard"
                                title="Add to Storyboard"
                            >
                                <AddToStoryIcon />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onAddToInspiration(image.base64!); }}
                                className="p-2 bg-black/60 text-white hover:bg-neutral-600 transition-colors rounded-md"
                                aria-label="Add to inspiration"
                                title="Add to Inspiration"
                            >
                                <PinIcon />
                            </button>
                          </>
                      )}
                      
                       <button 
                        onClick={(e) => { e.stopPropagation(); downloadAsset(image); }}
                        className="p-2 bg-black/60 text-white hover:bg-neutral-600 transition-colors rounded-md"
                        aria-label="Download asset"
                        title="Download"
                      >
                        <DownloadIcon />
                      </button>
                       <AssignAgentControl
                         image={image}
                         agents={agents}
                         onAssignAgentToImage={onAssignAgentToImage}
                         onCreateAgent={onCreateAgent}
                       />
                    </div>
                    {image.agentId && (
                        <div className="absolute bottom-2 left-2 p-1 px-2 bg-black/60 text-white text-xs font-bold pointer-events-none rounded-md">
                            {getAgentName(image.agentId)}
                        </div>
                    )}
                </div>
            ))}
        </div>
        {images.length === 0 && agentFilter && (
             <div className="mt-8 flex flex-col items-center justify-center h-full text-center">
                <h3 className="mt-4 text-xl font-semibold text-neutral-400">No Images Found</h3>
                <p className="mt-1 text-neutral-500">No images assigned to an agent matching "{agentFilter}".</p>
            </div>
        )}
    </div>
  );
};
