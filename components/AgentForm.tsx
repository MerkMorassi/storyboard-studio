

import React, { useState, useRef } from 'react';
import { Agent, getAvailableVoices } from '../services/agentService';
import { UserIcon } from './icons/UserIcon';
import { TrashIcon } from './icons/TrashIcon';

interface AgentFormProps {
  agent?: Agent | null;
  onSave: (agent: Partial<Agent>) => void;
  onCancel: () => void;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB

export const AgentForm: React.FC<AgentFormProps> = ({ agent, onSave, onCancel }) => {
  const [activeTab, setActiveTab] = useState<'identity' | 'directives' | 'voice'>('identity');
  
  // Identity
  const [name, setName] = useState(agent?.name || '');
  const [bio, setBio] = useState(agent?.bio || '');
  const [narrativeRole, setNarrativeRole] = useState(agent?.narrativeRole || '');
  const [tags, setTags] = useState(agent?.tags?.join(', ') || '');
  const [avatar, setAvatar] = useState<string | undefined>(agent?.avatar);

  // Directives
  const [systemPrompt, setSystemPrompt] = useState(agent?.systemPrompt || '');
  
  // Voice
  const [voice, setVoice] = useState(agent?.voice || 'Kore');
  const [speakingRate, setSpeakingRate] = useState(agent?.speakingRate || 1.0);
  const [autoPlayAudio, setAutoPlayAudio] = useState(agent?.autoPlayAudio || false);

  const [formError, setFormError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (saveState !== 'idle') return;

    if (!name.trim()) {
        setFormError("Agent Name cannot be empty.");
        setActiveTab('identity');
        return;
    }
    setFormError(null);
    setSaveState('saving');
    
    onSave({
      name, bio, narrativeRole,
      tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
      avatar, systemPrompt, voice, speakingRate, autoPlayAudio,
    });
    
    setSaveState('saved');
    setTimeout(() => onCancel(), 1000);
  };

  const TabButton = ({ id, label }: { id: typeof activeTab, label: string }) => (
      <button type="button" onClick={() => setActiveTab(id)} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === id ? 'text-white bg-neutral-700' : 'text-neutral-400 hover:bg-neutral-800'}`}>
          {label}
      </button>
  );

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[60] p-4">
      <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-2xl shadow-2xl">
        <div className="p-4 border-b border-neutral-800 flex justify-between items-center">
             <h2 className="text-lg font-bold">Configure Agent</h2>
             <button type="button" onClick={onCancel}>×</button>
        </div>
        
        <div className="flex border-b border-neutral-800">
            <TabButton id="identity" label="Identity" />
            <TabButton id="directives" label="Directives" />
            <TabButton id="voice" label="Voice" />
        </div>

        <div className="p-6 space-y-4">
            {activeTab === 'identity' && (
                <div className="space-y-4">
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Agent Name" className="w-full p-2 bg-neutral-800 rounded" required />
                    <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Bio" rows={3} className="w-full p-2 bg-neutral-800 rounded" />
                    <input value={narrativeRole} onChange={e => setNarrativeRole(e.target.value)} placeholder="Role (e.g., Screenwriter)" className="w-full p-2 bg-neutral-800 rounded" />
                    <input value={tags} onChange={e => setTags(e.target.value)} placeholder="Tags (comma-separated)" className="w-full p-2 bg-neutral-800 rounded" />
                </div>
            )}

            {activeTab === 'directives' && (
                <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} placeholder="System Prompt..." rows={10} className="w-full p-2 bg-neutral-800 rounded font-mono text-xs" />
            )}

            {activeTab === 'voice' && (
                 <div className="space-y-4">
                    <select value={voice} onChange={e => setVoice(e.target.value)} className="w-full p-2 bg-neutral-800 rounded">
                        {getAvailableVoices().map(v => <option key={v.name} value={v.name}>{v.label}</option>)}
                    </select>
                    <div>
                        <label>Speaking Rate: {speakingRate}x</label>
                        <input type="range" min="0.5" max="1.5" step="0.1" value={speakingRate} onChange={e => setSpeakingRate(parseFloat(e.target.value))} />
                    </div>
                </div>
            )}
        </div>

        <div className="p-4 border-t border-neutral-800 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="px-4 py-2 bg-neutral-700 rounded">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-blue-600 rounded">{saveState === 'idle' ? 'Save' : 'Saved!'}</button>
        </div>
      </form>
    </div>
  );
};