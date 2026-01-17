
import React, { useState, useRef } from 'react';
import { Agent, ModelEngine } from '../types.ts';
import { getAvailableVoices } from '../services/agentService';

interface AgentFormProps {
    agent: Agent;
    onCancel: () => void;
    onSave: (updatedAgent: Partial<Agent>) => void;
}

export const AgentForm: React.FC<AgentFormProps> = ({ agent, onCancel, onSave }) => {
    const [name, setName] = useState(agent.name);
    const [systemPrompt, setSystemPrompt] = useState(agent.systemPrompt);
    const [voice, setVoice] = useState(agent.voice);
    const [bio, setBio] = useState(agent.bio || '');
    const [narrativeRole, setNarrativeRole] = useState(agent.narrativeRole || '');
    const [preferredEngine, setPreferredEngine] = useState<ModelEngine>(agent.preferredEngine || 'gemini');
    const [voiceReference, setVoiceReference] = useState(agent.voiceReference || '');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleVoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('audio/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setVoiceReference(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, systemPrompt, voice, bio, narrativeRole, preferredEngine, voiceReference });
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 w-full max-w-lg space-y-4 shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-2">Edit Agent Configuration</h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Display Name</label>
                        <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-neutral-800 p-2.5 rounded border border-neutral-700 text-white" required />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Narrative Role</label>
                        <input value={narrativeRole} onChange={e => setNarrativeRole(e.target.value)} className="w-full bg-neutral-800 p-2.5 rounded border border-neutral-700 text-white" />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Biography</label>
                        <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className="w-full bg-neutral-800 p-2.5 rounded border border-neutral-700 text-white text-sm" />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">System Prompt (Directives)</label>
                        <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} rows={6} className="w-full bg-neutral-800 p-2.5 rounded border border-neutral-700 text-white font-mono text-xs" />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Voice Reference Sample (for Cloning)</label>
                        <div className="flex items-center gap-3 bg-neutral-800 p-2 rounded border border-neutral-700">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="px-4 py-2 text-xs font-bold bg-neutral-700 hover:bg-neutral-600 text-white rounded transition-colors"
                            >
                                Upload Audio
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleVoiceUpload} className="hidden" accept="audio/wav, audio/mpeg, audio/mp3" />
                            {voiceReference ? (
                                <audio src={voiceReference} controls className="h-8 w-full"></audio>
                            ) : (
                                <p className="text-xs text-neutral-500">No sample uploaded. (WAV/MP3)</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Voice Model</label>
                            <select value={voice} onChange={e => setVoice(e.target.value)} className="w-full bg-neutral-800 p-2.5 rounded border border-neutral-700 text-white">
                                {getAvailableVoices().map(v => <option key={v.name} value={v.name}>{v.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Neural Engine Preference</label>
                            <div className="grid grid-cols-2 gap-1 bg-black/40 p-1 rounded border border-neutral-800">
                                <button 
                                    type="button"
                                    onClick={() => setPreferredEngine('gemini')}
                                    className={`py-1.5 text-[9px] font-black uppercase rounded transition-all ${preferredEngine === 'gemini' ? 'bg-blue-600 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                                >
                                    Gemini
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setPreferredEngine('dolphin')}
                                    className={`py-1.5 text-[9px] font-black uppercase rounded transition-all ${preferredEngine === 'dolphin' ? 'bg-orange-600 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                                >
                                    Dolphin
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-neutral-800">
                    <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-bold text-neutral-400 hover:text-white transition-colors">Cancel</button>
                    <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg transition-all">Save Changes</button>
                </div>
            </form>
        </div>
    );
};