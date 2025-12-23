
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
  const [activeTab, setActiveTab] = useState<'identity' | 'role' | 'directives' | 'voice'>('identity');
  
  // Identity
  const [name, setName] = useState(agent?.name || '');
  const [actorName, setActorName] = useState(agent?.actorName || '');
  const [actorContact, setActorContact] = useState(agent?.actorContact || '');
  const [tags, setTags] = useState(agent?.tags?.join(', ') || '');
  const [avatar, setAvatar] = useState<string | undefined>(agent?.avatar);

  // Role & Bio
  const [bio, setBio] = useState(agent?.bio || '');
  const [narrativeRole, setNarrativeRole] = useState(agent?.narrativeRole || '');

  // Directives
  const [systemPrompt, setSystemPrompt] = useState(agent?.systemPrompt || '');
  const [protectedWords, setProtectedWords] = useState(agent?.protectedWords || '');

  // Voice
  const [voice, setVoice] = useState(agent?.voice || getAvailableVoices()[0].name);
  const [speakingRate, setSpeakingRate] = useState(agent?.speakingRate ?? 1.0);
  const [autoPlayAudio, setAutoPlayAudio] = useState(agent?.autoPlayAudio ?? false);
  
  const [formError, setFormError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormError(null);
      if (file.size > MAX_AVATAR_SIZE) {
        setFormError("Avatar image must be less than 2MB.");
        return;
      }
      setIsUploading(true);
      try {
        const base64 = await fileToBase64(file);
        setAvatar(base64);
      } catch (error) {
        console.error("Error converting file to base64:", error);
        setFormError("Failed to process image. Please try another file.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleRemoveAvatar = () => {
    setAvatar(undefined);
    if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
    }
  };

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
      name,
      actorName,
      actorContact,
      tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
      avatar,
      bio,
      narrativeRole,
      systemPrompt,
      protectedWords,
      voice,
      speakingRate,
      autoPlayAudio,
    });
    
    setSaveState('saved');
    setTimeout(() => {
        onCancel();
    }, 1000);
  };

  const TabButton = ({ id, label }: { id: typeof activeTab, label: string }) => (
      <button 
        type="button" 
        onClick={() => setActiveTab(id)} 
        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === id ? 'text-white border-blue-500 bg-white/5' : 'text-neutral-500 border-transparent hover:text-neutral-300 hover:bg-white/5'}`}
      >
          {label}
      </button>
  );

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-fade-in">
      <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-neutral-800 bg-neutral-900 flex justify-between items-center">
             <div>
                 <h2 className="text-2xl font-black text-white uppercase tracking-tight">Agent Configuration</h2>
                 <p className="text-neutral-400 text-sm">{name || 'New Agent'}</p>
             </div>
             <button type="button" onClick={onCancel} className="text-neutral-500 hover:text-white transition-colors">
                 <span className="text-2xl">×</span>
             </button>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-800 bg-neutral-900">
            <TabButton id="identity" label="Identity" />
            <TabButton id="role" label="Role & Bio" />
            <TabButton id="directives" label="Directives" />
            <TabButton id="voice" label="Voice" />
        </div>

        {/* Scrollable Content Area */}
        <div className="p-8 overflow-y-auto custom-scrollbar flex-grow bg-neutral-900/50 relative">
             {formError && (
                <div className="absolute top-4 left-8 right-8 bg-red-900/20 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 z-10">
                    {formError}
                </div>
            )}

            {activeTab === 'identity' && (
                <div className="space-y-8 animate-fade-in max-w-2xl mx-auto">
                    <div className="flex items-start gap-6">
                        <div className="relative w-32 h-32 flex-shrink-0 group">
                            {avatar ? (
                                <img src={avatar} alt="Avatar Preview" className="w-32 h-32 rounded-xl object-cover bg-neutral-800 shadow-lg border border-neutral-700" />
                            ) : (
                                <div className="w-32 h-32 rounded-xl bg-neutral-800 flex items-center justify-center border border-neutral-700">
                                    <UserIcon className="w-12 h-12 text-neutral-600"/>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex flex-col items-center justify-center gap-2">
                                <label htmlFor="avatar-upload" className="text-xs font-bold text-white bg-white/20 px-3 py-1 rounded cursor-pointer hover:bg-white/30">Change</label>
                                {avatar && <button type="button" onClick={handleRemoveAvatar} className="text-xs font-bold text-red-300 hover:text-red-200">Remove</button>}
                            </div>
                            <input id="avatar-upload" ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                            {isUploading && <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl"><div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full"></div></div>}
                        </div>
                        
                        <div className="flex-grow space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Agent Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Nexus"
                                    className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none text-white font-bold text-lg"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Specialty Tags</label>
                                <input
                                    type="text"
                                    value={tags}
                                    onChange={(e) => setTags(e.target.value)}
                                    placeholder="e.g. Logic, Planning, Structure"
                                    className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none text-neutral-300 text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 pt-4 border-t border-neutral-800">
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Actor Name (Portrayed By)</label>
                            <input
                                type="text"
                                value={actorName}
                                onChange={(e) => setActorName(e.target.value)}
                                placeholder="Optional real-world actor ref"
                                className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none text-neutral-300 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Contact / Link</label>
                            <input
                                type="text"
                                value={actorContact}
                                onChange={(e) => setActorContact(e.target.value)}
                                placeholder="URL or Contact Info"
                                className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none text-neutral-300 text-sm"
                            />
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'role' && (
                <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
                    <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Narrative Role</label>
                        <input
                            type="text"
                            value={narrativeRole}
                            onChange={(e) => setNarrativeRole(e.target.value)}
                            placeholder="e.g. Lead Investigator"
                            className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none text-white"
                        />
                        <p className="text-xs text-neutral-500 mt-2">The function this agent serves within the story or production team.</p>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Biography</label>
                        <textarea 
                            value={bio} 
                            onChange={e => setBio(e.target.value)}
                            rows={8}
                            placeholder="Enter a detailed biography, personality traits, and background..."
                            className="w-full bg-neutral-800 border border-neutral-700 p-4 rounded-lg text-neutral-300 focus:ring-2 focus:ring-blue-600 outline-none resize-none leading-relaxed"
                        />
                    </div>
                </div>
            )}

            {activeTab === 'directives' && (
                <div className="space-y-6 animate-fade-in h-full flex flex-col">
                    <div className="flex-grow flex flex-col">
                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">System Prompt (The Brain)</label>
                        <textarea 
                            value={systemPrompt} 
                            onChange={e => setSystemPrompt(e.target.value)}
                            className="w-full flex-grow bg-neutral-800 border border-neutral-700 p-4 rounded-lg text-neutral-200 focus:ring-2 focus:ring-blue-600 outline-none resize-none font-mono text-sm leading-relaxed min-h-[300px]"
                            placeholder="You are [Name], a specialized agent..."
                        />
                        <p className="text-xs text-neutral-500 mt-2">Define the agent's core behavior, rules, and personality here. This is the primary instruction set sent to the LLM.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Protected Words</label>
                        <input
                            type="text"
                            value={protectedWords}
                            onChange={(e) => setProtectedWords(e.target.value)}
                            placeholder="Comma separated list of terms to never translate or change..."
                            className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none text-neutral-300 text-sm"
                        />
                    </div>
                </div>
            )}
            
            {activeTab === 'voice' && (
                 <div className="space-y-8 animate-fade-in max-w-xl mx-auto pt-8">
                    <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Voice Model</label>
                        <select
                            value={voice}
                            onChange={(e) => setVoice(e.target.value)}
                            className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none text-white"
                        >
                            {getAvailableVoices().map(v => (
                            <option key={v.name} value={v.name}>{v.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-4">
                            Speaking Rate ({speakingRate.toFixed(1)}x)
                        </label>
                        <input
                            type="range"
                            min="0.5"
                            max="2.0"
                            step="0.1"
                            value={speakingRate}
                            onChange={(e) => setSpeakingRate(parseFloat(e.target.value))}
                            className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                         <div className="flex justify-between text-xs text-neutral-500 mt-2 font-mono">
                             <span>Slow (0.5x)</span>
                             <span>Normal (1.0x)</span>
                             <span>Fast (2.0x)</span>
                         </div>
                    </div>

                    <div className="flex items-center p-4 bg-neutral-800 rounded-xl border border-neutral-700">
                        <input
                            id="auto-play-audio"
                            type="checkbox"
                            checked={autoPlayAudio}
                            onChange={(e) => setAutoPlayAudio(e.target.checked)}
                            className="h-5 w-5 rounded border-neutral-600 bg-neutral-700 text-blue-600 focus:ring-offset-neutral-800"
                        />
                        <label htmlFor="auto-play-audio" className="ml-3 block text-sm font-medium text-neutral-200 cursor-pointer select-none">
                            Auto-play audio on message completion
                        </label>
                    </div>
                 </div>
            )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-neutral-800 bg-neutral-900 flex justify-between items-center">
          <div className="text-xs text-neutral-500">
              {saveState === 'saved' ? <span className="text-green-500 font-bold">✓ Configuration Saved</span> : 'Unsaved changes will be lost.'}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onCancel} className="px-6 py-3 bg-neutral-800 border border-neutral-700 text-neutral-300 font-bold rounded-xl hover:bg-neutral-700 hover:text-white transition-colors">Cancel</button>
            <button type="submit" className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-all shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-wait min-w-[140px]" disabled={saveState !== 'idle'}>
                {saveState === 'idle' && 'Save Agent'}
                {saveState === 'saving' && 'Saving...'}
                {saveState === 'saved' && 'Saved'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
