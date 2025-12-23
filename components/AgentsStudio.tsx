
import React, { useState, useRef, useEffect } from 'react';
import { Agent, ImageState } from '../types.ts';
import { CharacterIcon, EditIcon, CloseIcon } from './icons.tsx';
import { TrashIcon } from './icons/TrashIcon';
import { UploadIcon } from './icons/UploadIcon';

interface AgentsStudioProps {
    agents: Agent[];
    images: ImageState[];
    onCreateAgent: (name: string) => Agent;
    onViewImage: (image: ImageState) => void;
    onUpdateAgent: (agentId: string, newName: string) => void;
    onDeleteAgent: (agentId: string) => void;
    onImageUpload: (agentId: string, file: File) => void;
}

// --- Character Sheet Modal ---
const CharacterSheetModal: React.FC<{
    agent: Agent;
    assignedImages: ImageState[];
    onClose: () => void;
    onSave: (updatedAgent: Partial<Agent>) => void;
    onImageUpload: (agentId: string, file: File) => void;
    onViewImage: (image: ImageState) => void;
}> = ({ agent, assignedImages, onClose, onSave, onImageUpload, onViewImage }) => {
    const [isEditing, setIsEditing] = useState(false);
    
    // Form State
    const [name, setName] = useState(agent.name);
    const [actorName, setActorName] = useState(agent.actorName || '');
    const [actorContact, setActorContact] = useState(agent.actorContact || '');
    const [bio, setBio] = useState(agent.bio || '');
    const [narrativeRole, setNarrativeRole] = useState(agent.narrativeRole || '');
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    // If agent changes (e.g. parent updates), sync state
    useEffect(() => {
        setName(agent.name);
        setActorName(agent.actorName || '');
        setActorContact(agent.actorContact || '');
        setBio(agent.bio || '');
        setNarrativeRole(agent.narrativeRole || '');
    }, [agent]);

    const handleSave = () => {
        onSave({
            name,
            actorName,
            actorContact,
            bio,
            narrativeRole
        });
        setIsEditing(false);
    };

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // We use the existing image upload logic which assigns to agent
            // But we also might want to specifically set this as the 'avatar' string if it's small enough,
            // or just rely on the assigned images list.
            // For this implementation, we upload to the grid assigned to this agent.
            onImageUpload(agent.id, file);
        }
    };

    // Determine the primary headshot to display
    // Priority: agent.avatar (base64 string) -> first assigned image -> placeholder
    let headshotSrc = agent.avatar;
    if (!headshotSrc && assignedImages.length > 0) {
        headshotSrc = `data:${assignedImages[0].mimeType};base64,${assignedImages[0].base64}`;
    }

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
            <style>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.2s ease-out; }
            `}</style>
            
            <div className="bg-neutral-900 border border-neutral-700 w-full max-w-5xl h-[85vh] rounded-xl flex flex-col overflow-hidden shadow-2xl relative">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-neutral-800 bg-neutral-800/50">
                    <div>
                        <h2 className="text-2xl font-bold text-white uppercase tracking-widest">Player Profile</h2>
                        <p className="text-sm text-neutral-400">Studio Contract & Details</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsEditing(!isEditing)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${isEditing ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 border border-neutral-600'}`}
                        >
                            {isEditing ? 'Editing Mode' : 'Edit Details'}
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition-colors">
                            <CloseIcon />
                        </button>
                    </div>
                </div>

                <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
                    {/* Left Column: Headshot */}
                    <div className="w-full md:w-1/3 bg-black flex flex-col border-r border-neutral-800 relative">
                        <div className="flex-grow relative overflow-hidden group">
                            {headshotSrc ? (
                                <img src={headshotSrc} alt={agent.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600 bg-neutral-900">
                                    <CharacterIcon className="w-20 h-20 opacity-20" />
                                    <p className="mt-4 text-sm font-medium opacity-50">No Headshot</p>
                                </div>
                            )}
                            
                            {/* Headshot Actions */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-lg text-white text-sm font-bold border border-white/20"
                                >
                                    Change Headshot
                                </button>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={handleAvatarUpload} 
                                />
                            </div>
                        </div>
                        
                        {/* Image Gallery Strip */}
                        {assignedImages.length > 0 && (
                            <div className="h-24 bg-neutral-900 border-t border-neutral-800 p-2 flex gap-2 overflow-x-auto">
                                {assignedImages.map(img => (
                                    <img 
                                        key={img.id}
                                        src={`data:${img.mimeType};base64,${img.base64}`}
                                        className="h-full aspect-square object-cover rounded cursor-pointer hover:opacity-80 border border-transparent hover:border-blue-500"
                                        onClick={() => onViewImage(img)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Column: Data */}
                    <div className="w-full md:w-2/3 p-8 overflow-y-auto bg-neutral-900/50">
                        {isEditing ? (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Player Name</label>
                                    <input 
                                        type="text" 
                                        value={name} 
                                        onChange={e => setName(e.target.value)}
                                        className="w-full bg-neutral-800 border border-neutral-700 p-3 rounded-lg text-xl font-bold text-white focus:ring-2 focus:ring-blue-600 outline-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Real Name / Model</label>
                                        <input 
                                            type="text" 
                                            value={actorName} 
                                            onChange={e => setActorName(e.target.value)}
                                            placeholder="e.g. Skye Urania"
                                            className="w-full bg-neutral-800 border border-neutral-700 p-3 rounded-lg text-white focus:ring-2 focus:ring-blue-600 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Representation / Link</label>
                                        <input 
                                            type="text" 
                                            value={actorContact} 
                                            onChange={e => setActorContact(e.target.value)}
                                            placeholder="URL or Email"
                                            className="w-full bg-neutral-800 border border-neutral-700 p-3 rounded-lg text-white focus:ring-2 focus:ring-blue-600 outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Biography / Background</label>
                                    <textarea 
                                        value={bio} 
                                        onChange={e => setBio(e.target.value)}
                                        rows={6}
                                        placeholder="Enter the player's background and key characteristics..."
                                        className="w-full bg-neutral-800 border border-neutral-700 p-3 rounded-lg text-neutral-300 focus:ring-2 focus:ring-blue-600 outline-none resize-y"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Typical Roles</label>
                                    <textarea 
                                        value={narrativeRole} 
                                        onChange={e => setNarrativeRole(e.target.value)}
                                        rows={4}
                                        placeholder="What kind of roles does this player usually inhabit?"
                                        className="w-full bg-neutral-800 border border-neutral-700 p-3 rounded-lg text-neutral-300 focus:ring-2 focus:ring-blue-600 outline-none resize-y"
                                    />
                                </div>
                                <div className="pt-4 border-t border-neutral-800 flex justify-end">
                                    <button 
                                        onClick={handleSave} 
                                        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors shadow-lg"
                                    >
                                        Update Contract
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-8 animate-fade-in">
                                <div>
                                    <h1 className="text-4xl font-black text-white tracking-tight">{name}</h1>
                                    <div className="flex items-center gap-2 mt-2 text-xl">
                                        <span className="text-neutral-500">Portrayed by</span>
                                        <span className="text-blue-400 font-semibold">{actorName || 'Digital Twin'}</span>
                                    </div>
                                    {actorContact && (
                                        <div className="mt-2 text-sm">
                                            {actorContact.startsWith('http') ? (
                                                <a href={actorContact} target="_blank" rel="noreferrer" className="text-neutral-400 hover:text-white underline decoration-neutral-600 underline-offset-4">
                                                    View Contact Info &rarr;
                                                </a>
                                            ) : (
                                                <span className="text-neutral-400 font-mono bg-neutral-800 px-2 py-1 rounded">{actorContact}</span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="bg-neutral-800/30 border border-neutral-800 p-6 rounded-xl">
                                        <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-3 border-b border-neutral-700 pb-2">Biography</h3>
                                        <p className="text-neutral-200 leading-relaxed whitespace-pre-wrap">
                                            {bio || <span className="italic text-neutral-600">No biography added yet.</span>}
                                        </p>
                                    </div>

                                    <div className="bg-neutral-800/30 border border-neutral-800 p-6 rounded-xl">
                                        <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-3 border-b border-neutral-700 pb-2">Typical Roles</h3>
                                        <p className="text-neutral-200 leading-relaxed whitespace-pre-wrap">
                                            {narrativeRole || <span className="italic text-neutral-600">No role details added yet.</span>}
                                        </p>
                                    </div>
                                    
                                    <div className="bg-neutral-800/30 border border-neutral-800 p-6 rounded-xl">
                                        <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-3 border-b border-neutral-700 pb-2">Training Data</h3>
                                        <div className="flex items-center gap-2 text-neutral-400">
                                            <UploadIcon className="w-4 h-4" />
                                            <span>{assignedImages.length} reference images in studio vault.</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Casting Card (Headshot) ---
const CastingCard: React.FC<{
    agent: Agent;
    images: ImageState[];
    onClick: () => void;
    onDelete: () => void;
}> = ({ agent, images, onClick, onDelete }) => {
    // Determine image to show
    let bgImage = agent.avatar;
    if (!bgImage && images.length > 0) {
        bgImage = `data:${images[0].mimeType};base64,${images[0].base64}`;
    }

    return (
        <div 
            onClick={onClick}
            className="group relative w-full aspect-[2/3] bg-neutral-800 rounded-xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] ring-1 ring-white/10 hover:ring-blue-500/50"
        >
            {bgImage ? (
                <img src={bgImage} alt={agent.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600 bg-neutral-900">
                    <CharacterIcon className="w-16 h-16 opacity-20" />
                    <span className="mt-2 text-sm font-medium opacity-50 uppercase tracking-widest">No Headshot</span>
                </div>
            )}
            
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-5 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                <h3 className="text-2xl font-black text-white leading-none mb-1 shadow-black drop-shadow-md">{agent.name}</h3>
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-blue-300 truncate max-w-[70%]">
                        {agent.actorName ? agent.actorName : <span className="italic opacity-70">Uncast</span>}
                    </p>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity delay-100">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            className="p-2 bg-red-500/20 hover:bg-red-500 text-red-200 hover:text-white rounded-full transition-colors backdrop-blur-sm"
                            title="Release from Contract"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Status Indicator */}
            <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] font-bold text-neutral-300 border border-white/10">
                {images.length} IMAGES
            </div>
        </div>
    );
};

const CreateAgentForm: React.FC<{
    onCreateAgent: (name: string) => void;
}> = ({ onCreateAgent }) => {
    const [name, setName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onCreateAgent(name.trim());
            setName('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mb-8 bg-neutral-800/30 p-1 rounded-xl border border-neutral-700/50 flex max-w-md">
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="New Player Name..."
                className="flex-grow bg-transparent border-none p-3 px-4 text-white focus:ring-0 placeholder-neutral-500 font-medium"
            />
            <button
                type="submit"
                className="bg-neutral-200 hover:bg-white text-black font-bold py-2 px-6 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed m-1"
                disabled={!name.trim()}
            >
                Sign
            </button>
        </form>
    );
};

export const AgentsStudio: React.FC<AgentsStudioProps> = ({ agents, images, onCreateAgent, onViewImage, onUpdateAgent, onDeleteAgent, onImageUpload }) => {
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

    const handleUpdateSelectedAgent = (updatedData: Partial<Agent>) => {
        if (selectedAgent) {
            onUpdateAgent(selectedAgent.id, updatedData.name || selectedAgent.name);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto w-full space-y-8 h-full overflow-y-auto">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-neutral-200 mb-2">Studio Players</h2>
                <p className="text-neutral-400">
                    Manage your exclusive roster of contract actors. Like the old Hollywood studio system, these digital players are on standby, ready to be cast in any of your productions.
                </p>
                <div className="mt-6">
                    <CreateAgentForm onCreateAgent={onCreateAgent} />
                </div>
            </div>

            {agents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[50vh] border-2 border-dashed border-neutral-800 rounded-xl bg-neutral-900/30 text-center p-8">
                    <div className="w-16 h-16 text-neutral-700 mb-4">
                      <CharacterIcon className="w-full h-full" />
                    </div>
                    <h3 className="text-xl font-semibold text-neutral-300 mb-2">No Players Under Contract</h3>
                    <p className="text-neutral-500">Sign a player to the studio roster to begin.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {agents.map(agent => (
                        <CastingCard
                            key={agent.id}
                            agent={agent}
                            images={images.filter(img => img.agentId === agent.id)}
                            onClick={() => setSelectedAgent(agent)}
                            onDelete={() => onDeleteAgent(agent.id)}
                        />
                    ))}
                </div>
            )}

            {selectedAgent && (
                <CharacterSheetModal 
                    agent={selectedAgent}
                    assignedImages={images.filter(img => img.agentId === selectedAgent.id)}
                    onClose={() => setSelectedAgent(null)}
                    onSave={(updated) => {
                        onUpdateAgent(selectedAgent.id, updated as any); 
                    }}
                    onImageUpload={onImageUpload}
                    onViewImage={onViewImage}
                />
            )}
        </div>
    );
};
