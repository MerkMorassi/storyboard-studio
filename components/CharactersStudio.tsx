
import React, { useState, useRef } from 'react';
import { Agent, ImageState } from '../types';
import { CharacterIcon, EditIcon } from './icons';

interface AgentsStudioProps {
    agents: Agent[];
    images: ImageState[];
    onCreateAgent: (name: string) => Agent;
    onViewImage: (image: ImageState) => void;
    onUpdateAgent: (agentId: string, newName: string) => void;
    onDeleteAgent: (agentId: string) => void;
    onImageUpload: (agentId: string, file: File) => void;
}

const AgentCard: React.FC<{
    agent: Agent;
    images: ImageState[];
    onViewImage: (image: ImageState) => void;
    onUpdateAgent: (agentId: string, newName: string) => void;
    onDeleteAgent: (agentId: string) => void;
    onImageUpload: (agentId: string, file: File) => void;
}> = ({ agent, images, onViewImage, onUpdateAgent, onDeleteAgent, onImageUpload }) => {
    const previewImages = images.slice(0, 4);
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(agent.name);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSave = () => {
        if (editedName.trim() && editedName.trim() !== agent.name) {
            onUpdateAgent(agent.id, editedName.trim());
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditedName(agent.name);
        setIsEditing(false);
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onImageUpload(agent.id, file);
        }
    };

    return (
        <div className="bg-neutral-800/50 border border-neutral-700 p-4 transition-all duration-300 group hover:bg-neutral-700/50 hover:border-neutral-600">
            <div className="flex justify-between items-start mb-4">
                {isEditing ? (
                    <div className="flex-grow">
                        <input
                            type="text"
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-600 p-1.5 text-lg font-bold focus:ring-2 focus:ring-neutral-500 outline-none"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                        />
                        <div className="flex gap-2 mt-2">
                            <button onClick={handleSave} className="text-xs bg-neutral-600 hover:bg-neutral-500 px-2 py-1">Save</button>
                            <button onClick={handleCancel} className="text-xs bg-neutral-700 hover:bg-neutral-600 px-2 py-1">Cancel</button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <h3 className="text-lg font-bold text-neutral-200 truncate">{agent.name}</h3>
                        <p className="text-sm text-neutral-400">{images.length} {images.length === 1 ? 'image' : 'images'}</p>
                    </div>
                )}
                <div className={`flex items-center gap-2 transition-opacity ${isEditing ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}>
                    <button onClick={() => setIsEditing(true)} title="Edit name" className="p-1.5 text-neutral-400 hover:text-white">
                        <EditIcon />
                    </button>
                    <button onClick={() => onDeleteAgent(agent.id)} title="Delete agent" className="p-1.5 text-neutral-400 hover:text-red-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    </button>
                </div>
            </div>
            
            {images.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 aspect-square">
                    {previewImages.map((image) => (
                        <div
                            key={image.id}
                            className="relative group/image aspect-square cursor-pointer overflow-hidden"
                            onClick={() => onViewImage(image)}
                        >
                            <img 
                                src={`data:image/jpeg;base64,${image.base64}`}
                                alt={`Preview for ${agent.name}`}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover/image:scale-110"
                            />
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                    <div
                        onClick={handleUploadClick}
                        className="aspect-square flex flex-col items-center justify-center bg-neutral-900/50 border-2 border-dashed border-neutral-700 text-center p-2 cursor-pointer hover:bg-neutral-800/50 hover:border-neutral-600 transition-colors"
                    >
                        <svg className="w-8 h-8 mb-2 text-neutral-600" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/></svg>
                        <p className="text-xs text-neutral-500">Upload Image</p>
                    </div>
                </>
            )}
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
        <form onSubmit={handleSubmit} className="mb-6">
            <div className="flex gap-2">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="New AI Agent name..."
                    className="flex-grow bg-neutral-800 border border-neutral-700 p-2 focus:ring-2 focus:ring-neutral-500 focus:border-neutral-500 transition duration-200 outline-none"
                />
                <button
                    type="submit"
                    className="bg-neutral-700 text-white font-semibold py-2 px-4 hover:bg-neutral-600 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!name.trim()}
                >
                    Create Agent
                </button>
            </div>
        </form>
    );
};

export const AgentsStudio: React.FC<AgentsStudioProps> = ({ agents, images, onCreateAgent, onViewImage, onUpdateAgent, onDeleteAgent, onImageUpload }) => {
    return (
        <div className="bg-neutral-900/50 p-6 border border-neutral-800 space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-neutral-300 mb-4">AI Agents</h2>
                <CreateAgentForm onCreateAgent={onCreateAgent} />
            </div>

            {agents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[50vh] bg-neutral-900/50 border-2 border-dashed border-neutral-800 p-8 text-center">
                    <div className="w-16 h-16 text-neutral-700">
                      <CharacterIcon />
                    </div>
                    <h3 className="mt-4 text-xl font-semibold text-neutral-400">No Agents Created</h3>
                    <p className="mt-1 text-neutral-500">Create an agent above or assign one from the grid to get started.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {agents.map(agent => (
                        <AgentCard
                            key={agent.id}
                            agent={agent}
                            images={images.filter(img => img.agentId === agent.id)}
                            onViewImage={onViewImage}
                            onUpdateAgent={onUpdateAgent}
                            onDeleteAgent={onDeleteAgent}
                            onImageUpload={onImageUpload}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
