
import React, { useState, useRef } from 'react';
import { Agent, ActiveView } from '../types.ts';
import { AgentsIcon, EditIcon, CloseIcon, CameraLensIcon, PhoneIcon, ChatIcon } from './icons.tsx';
import { AgentForm } from './AgentForm.tsx';

interface TeamStudioProps {
    team: Agent[];
    onUpdateAgent: (agentId: string, updates: Partial<Agent>) => void;
    onNavigate: (view: ActiveView, agentId?: string) => void;
    onCallAgent: (agent: Agent) => void;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

const AgentCard: React.FC<{
    agent: Agent;
    onClick: () => void;
    onEdit: () => void;
    onCall: () => void;
    onUpdateAgent: (agentId: string, updates: Partial<Agent>) => void;
}> = ({ agent, onClick, onEdit, onCall, onUpdateAgent }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Check if this agent belongs to the Art Department
    const isArtDept = agent.name.includes("Canvas") || agent.name.includes("Kore") || agent.narrativeRole?.includes("Director");

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const base64 = await fileToBase64(file);
                onUpdateAgent(agent.id, { avatar: base64 });
            } catch (err) {
                console.error("Failed to upload agent image", err);
            }
        }
    };

    return (
        <div 
            onClick={onClick}
            className="group relative bg-neutral-800 border border-neutral-700 rounded-xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300 hover:border-blue-500/50 hover:-translate-y-1 h-full flex flex-col"
        >
            <div className="h-48 bg-gradient-to-br from-neutral-900 to-neutral-800 flex items-center justify-center border-b border-neutral-700 group-hover:from-blue-900/20 group-hover:to-neutral-900 transition-colors relative overflow-hidden">
                {agent.avatar ? (
                    <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                    <AgentsIcon className="w-16 h-16 text-neutral-500 group-hover:text-blue-400 transition-colors" />
                )}
                
                {isArtDept && (
                    <div className="absolute top-2 right-2 z-10">
                        <span className="text-[10px] font-bold text-blue-400 bg-blue-900/80 px-2 py-0.5 rounded-full border border-blue-500/30 backdrop-blur-sm">ART DEPT</span>
                    </div>
                )}

                {/* Hover Actions Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-colors border border-white/10"
                        title="Upload Photo"
                    >
                        <CameraLensIcon className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={onEdit}
                        className="p-2 bg-blue-600/80 hover:bg-blue-500 rounded-full text-white backdrop-blur-md transition-colors border border-blue-400/30"
                        title="Edit Configuration"
                    >
                        <EditIcon className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={onCall}
                        className="p-2 bg-green-600/80 hover:bg-green-500 rounded-full text-white backdrop-blur-md transition-colors shadow-lg border border-green-400/30"
                        title="Call Agent"
                    >
                        <PhoneIcon className="w-4 h-4" />
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleImageUpload}
                    />
                </div>
            </div>

            <div className="p-5 flex-grow flex flex-col">
                <div className="mb-2">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider border border-neutral-600 px-2 py-0.5 rounded-full bg-neutral-900">
                        {agent.narrativeRole || 'Specialist'}
                    </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{agent.name}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed line-clamp-3 mb-4 flex-grow">
                    {agent.bio}
                </p>
                
                <div className="flex gap-2 mt-auto">
                    <button 
                        className="flex-1 py-2 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 font-bold text-xs uppercase rounded transition-colors flex items-center justify-center gap-2 border border-neutral-600"
                    >
                        <ChatIcon className="w-3 h-3" /> Enter Office
                    </button>
                </div>
            </div>
        </div>
    );
};

export const TeamStudio: React.FC<TeamStudioProps> = ({ team, onUpdateAgent, onNavigate, onCallAgent }) => {
    const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

    const handleCardClick = (agent: Agent) => {
        onNavigate('agent-workspace', agent.id);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto w-full space-y-8 h-full overflow-y-auto">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-neutral-200 mb-2">Production Team</h2>
                <p className="text-neutral-400">Your specialized AI crew. Click a card to enter their personal workspace.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {team.map(agent => (
                    <AgentCard
                        key={agent.id}
                        agent={agent}
                        onClick={() => handleCardClick(agent)}
                        onEdit={() => setEditingAgent(agent)}
                        onCall={() => onCallAgent(agent)}
                        onUpdateAgent={onUpdateAgent}
                    />
                ))}
            </div>

            {editingAgent && (
                <AgentForm 
                    agent={editingAgent}
                    onCancel={() => setEditingAgent(null)}
                    onSave={(updated) => onUpdateAgent(editingAgent.id, updated)}
                />
            )}
        </div>
    );
};
