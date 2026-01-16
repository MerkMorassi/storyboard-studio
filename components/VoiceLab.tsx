import React, { useState, useEffect, useRef } from 'react';
import { ChatterboxService, ChatterboxRequest } from '../services/chatterbox';
import { Agent } from '../types.ts';
import { getAgentConfig } from '../services/db';
import { SpeakerIcon, UploadIcon, WarningIcon } from './icons.tsx';

interface VoiceLabProps {
    agents: Agent[];
    onAudioGenerated?: (audioUrl: string) => void;
}

export const VoiceLab: React.FC<VoiceLabProps> = ({ agents, onAudioGenerated }) => {
    const [selectedAgentId, setSelectedAgentId] = useState<string>(agents[0]?.id || '');
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [voiceRef, setVoiceRef] = useState<string | null>(null);
    const [isUsingOverride, setIsUsingOverride] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [params, setParams] = useState({
        exaggeration: 0.5,
        temperature: 0.8,
        seed_num: 0,
        cfg_weight: 0.5
    });

    useEffect(() => {
        const loadVoice = async () => {
            if (!selectedAgentId) return;
            
            setLoading(true);
            try {
                const config = await getAgentConfig(selectedAgentId);
                if (config?.voiceReference) {
                    setVoiceRef(config.voiceReference);
                    setIsUsingOverride(false);
                } else {
                    const agent = agents.find(a => a.id === selectedAgentId);
                    if (agent?.voiceReference) {
                        setVoiceRef(agent.voiceReference);
                        setIsUsingOverride(false);
                    } else {
                        setVoiceRef(null);
                    }
                }
            } catch (e) {
                console.error("Failed to load agent voice config", e);
            } finally {
                setLoading(false);
            }
        };
        loadVoice();
    }, [selectedAgentId, agents]);

    const handleSynthesize = async () => {
        if (!voiceRef || !text) {
            setError("Missing text or voice reference.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const req: ChatterboxRequest = {
                text: text,
                audioRef: voiceRef,
                exaggeration: params.exaggeration,
                temperature: params.temperature,
                seed_num: params.seed_num,
                cfg_weight: params.cfg_weight
            };

            const arrayBuffer = await ChatterboxService.synthesize(req);
            
            if (arrayBuffer.byteLength === 0) {
                setError("Mock service returned empty audio. Connect to a real synthesis backend.");
                setLoading(false);
                return;
            }

            const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
            const url = URL.createObjectURL(blob);
            
            setAudioUrl(url);
            if (onAudioGenerated) onAudioGenerated(url);

        } catch (err: any) {
            setError(err.message || "Synthesis failed");
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                const result = evt.target?.result as string;
                setVoiceRef(result);
                setIsUsingOverride(true);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const selectedAgent = agents.find(a => a.id === selectedAgentId);

    return (
        <div className="p-6 max-w-4xl mx-auto w-full h-full flex flex-col space-y-6 overflow-y-auto">
            <div className="flex-shrink-0">
                <h2 className="text-3xl font-bold text-neutral-200 mb-2">Voice Lab</h2>
                <p className="text-neutral-400">Grounded voice synthesis for generating agent dialogue.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Controls */}
                <div className="space-y-6 bg-neutral-800/50 p-6 border border-neutral-700 rounded-xl h-fit">
                    <div>
                        <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Target Voice Profile</label>
                        <div className="flex gap-2">
                            <select 
                                className="w-full bg-neutral-800 border border-neutral-700 p-2 rounded-lg text-sm text-white"
                                value={selectedAgentId} 
                                onChange={(e) => setSelectedAgentId(e.target.value)}
                            >
                                {agents.map(a => (
                                    <option key={a.id} value={a.id}>{a.name.toUpperCase()}</option>
                                ))}
                            </select>
                            <button className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white text-sm font-bold rounded-lg" title="Upload Override Wav" onClick={() => fileInputRef.current?.click()}>
                                <UploadIcon className="w-4 h-4" />
                            </button>
                            <input type="file" accept="audio/*" onChange={handleFileUpload} ref={fileInputRef} className="hidden" />
                        </div>
                        <div className={`text-[10px] mt-2 font-bold uppercase tracking-wider ${isUsingOverride ? 'text-yellow-400' : (voiceRef ? 'text-green-400' : 'text-red-400')}`}>
                            {isUsingOverride ? "⚠️ Using Manual Upload Override" : (voiceRef ? "✓ System Profile Loaded" : "❌ No Voice Reference Found")}
                        </div>
                    </div>

                    <textarea
                        className="w-full bg-neutral-900 border border-neutral-700 p-3 rounded-lg text-sm text-white resize-y"
                        placeholder="Enter text to synthesize..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={5}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="flex justify-between text-xs text-neutral-400"><span>Exaggeration</span><span>{params.exaggeration}</span></div>
                            <input type="range" min="0" max="1" step="0.05" value={params.exaggeration} onChange={(e) => setParams(p => ({...p, exaggeration: parseFloat(e.target.value)}))} className="w-full accent-blue-500" />
                        </div>
                        <div>
                            <div className="flex justify-between text-xs text-neutral-400"><span>Stability (Temp)</span><span>{params.temperature}</span></div>
                            <input type="range" min="0.1" max="1.5" step="0.05" value={params.temperature} onChange={(e) => setParams(p => ({...p, temperature: parseFloat(e.target.value)}))} className="w-full accent-blue-500" />
                        </div>
                        <div>
                            <div className="flex justify-between text-xs text-neutral-400"><span>Pace (CFG)</span><span>{params.cfg_weight}</span></div>
                            <input type="range" min="0" max="1" step="0.1" value={params.cfg_weight} onChange={(e) => setParams(p => ({...p, cfg_weight: parseFloat(e.target.value)}))} className="w-full accent-blue-500" />
                        </div>
                        <div>
                            <label className="text-xs text-neutral-400">Seed</label>
                            <input type="number" value={params.seed_num} onChange={(e) => setParams(p => ({...p, seed_num: parseInt(e.target.value) || 0}))} className="w-full bg-neutral-900 border border-neutral-700 p-1 rounded-lg text-sm text-center" />
                        </div>
                    </div>
                </div>

                {/* Right Column: Output */}
                <div className="flex flex-col gap-6">
                    <button 
                        className={`w-full py-4 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${loading ? 'bg-neutral-600' : 'bg-blue-600 hover:bg-blue-500'}`}
                        onClick={handleSynthesize}
                        disabled={loading || !voiceRef || !text}
                    >
                        {loading ? 'Synthesizing...' : <><SpeakerIcon className="w-5 h-5"/> Generate Speech</>}
                    </button>

                    {error && (
                        <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-200 text-sm flex items-center gap-2">
                            <WarningIcon className="w-4 h-4"/>
                            {error}
                        </div>
                    )}

                    {audioUrl && (
                        <div className="mt-4 p-4 border border-neutral-700 rounded-lg bg-neutral-900/50">
                            <audio controls src={audioUrl} className="w-full" autoPlay />
                            <div className="flex justify-between mt-2">
                                <span className="text-xs text-green-400 font-bold">✓ Audio Generated</span>
                                <a href={audioUrl} download={`voice_${selectedAgentId}_${Date.now()}.wav`} className="text-xs underline hover:text-blue-300 text-blue-400">
                                    Download WAV
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
