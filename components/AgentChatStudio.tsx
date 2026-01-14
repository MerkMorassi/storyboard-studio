
import React, { useState, useRef, useEffect } from 'react';
import { Agent, ChatMessage, FunctionCall, ToolCode, ModelEngine } from '../types.ts';
import { LoadingSpinner, WritersRoomIcon, AgentActionIcon } from './icons.tsx';
import { createChat, mythosTools } from '../services/geminiService.ts';
import { runDolphinInference } from '../services/dolphinService.ts';
import { getHfApiKey } from '../services/apiKeyService.ts';
import { Chat as GeminiChat, GenerateContentResponse, Part } from '@google/genai';
import { AssetActions } from './AssetActions';
import { WarningIcon } from './icons/WarningIcon.tsx';

interface AgentChatStudioProps {
    agents: Agent[];
    onUploadLore: (agentId: string, loreText: string) => void;
    onCallTool: (name: string, args: any) => Promise<{ textResult: string; resultData?: any; }>;
    onAddToStoryboard: (base64Image: string) => void;
    onAddToInspiration: (base64Image: string) => void;
    onAddAssetToGrid: (asset: any) => void;
}

export const AgentChatStudio: React.FC<AgentChatStudioProps> = ({ agents, onUploadLore, onCallTool, onAddToStoryboard, onAddToInspiration, onAddAssetToGrid }) => {
    const [selectedAgentId, setSelectedAgentId] = useState<string>('');
    const [engine, setEngine] = useState<ModelEngine>('gemini');
    const [message, setMessage] = useState('');
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [chatSession, setChatSession] = useState<GeminiChat | null>(null);
    const [isResponding, setIsResponding] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const selectedAgent = agents.find(c => c.id === selectedAgentId);

    // Sync engine state when agent changes
    useEffect(() => {
        if (selectedAgent?.preferredEngine) {
            setEngine(selectedAgent.preferredEngine);
        }
    }, [selectedAgentId, selectedAgent]);

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || isResponding) return;

        const currentMsg = message;
        setMessage('');
        setIsResponding(true);
        setError(null);
        
        const newHistory: ChatMessage = { role: 'user', text: currentMsg };
        setHistory(prev => [...prev, newHistory]);

        if (engine === 'dolphin') {
            const hfToken = getHfApiKey() || '';
            const systemPrompt = selectedAgent?.systemPrompt || "";
            const response = await runDolphinInference(currentMsg, systemPrompt, hfToken);
            
            if (response.error) {
                setError(response.error);
                setHistory(prev => [...prev, { role: 'model', text: `ERROR: ${response.error}` }]);
            } else {
                setHistory(prev => [...prev, { role: 'model', text: response.text }]);
            }
            setIsResponding(false);
        } else {
            // Gemini Logic (Standard)
            if (chatSession) {
                try {
                    const result = await chatSession.sendMessage(currentMsg);
                    setHistory(prev => [...prev, { role: 'model', text: result.text || "" }]);
                } catch (e) {
                    setError("Gemini link failed.");
                } finally {
                    setIsResponding(false);
                }
            }
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto w-full h-full flex flex-col">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-neutral-200 mb-2">Agent Chat</h2>
                    <p className="text-neutral-400">Collaborative workspace with multi-engine neural support.</p>
                </div>
                
                {/* Engine Selector */}
                <div className="bg-neutral-800 p-1 rounded-lg flex border border-neutral-700 shadow-lg">
                    <button 
                        onClick={() => setEngine('gemini')}
                        className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${engine === 'gemini' ? 'bg-blue-600 text-white shadow-inner' : 'text-neutral-500 hover:text-neutral-300'}`}
                    >
                        Gemini (Safety On)
                    </button>
                    <button 
                        onClick={() => setEngine('dolphin')}
                        className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${engine === 'dolphin' ? 'bg-orange-600 text-white shadow-inner' : 'text-neutral-500 hover:text-neutral-300'}`}
                    >
                        Dolphin (Uncensored)
                    </button>
                </div>
            </div>

            {/* ... rest of existing chat layout ... */}
            <div className="flex-grow flex flex-col border border-neutral-700 rounded-xl overflow-hidden bg-neutral-900 shadow-2xl relative">
                 {/* Notification for boot sequence */}
                 {engine === 'dolphin' && (
                     <div className="bg-orange-900/20 border-b border-orange-500/20 px-4 py-2 flex items-center justify-center gap-2">
                         <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                         <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Private Dolphin Core Active (A10G Handshake Enabled)</span>
                     </div>
                 )}

                 {/* Message Window and Input (rest of code) */}
                 <div className="flex-grow overflow-y-auto p-6 space-y-6">
                    {history.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-4 rounded-xl ${msg.role === 'user' ? 'bg-blue-600' : 'bg-neutral-800 border border-neutral-700'}`}>
                                <p className="text-sm leading-relaxed">{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    {isResponding && <div className="flex justify-start"><LoadingSpinner className="w-6 h-6 text-brand" /></div>}
                 </div>

                 <div className="p-4 border-t border-neutral-800 bg-neutral-900/50">
                    <form onSubmit={handleFormSubmit} className="flex gap-2">
                        <input 
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={engine === 'dolphin' ? "Enter uncensored creative directive..." : "Task your agent..."}
                            className="flex-grow bg-black border border-neutral-700 rounded-lg p-3 text-sm focus:outline-none focus:border-brand"
                        />
                        <button type="submit" className="bg-brand text-white px-6 py-2 rounded-lg font-bold uppercase text-xs tracking-widest">Send</button>
                    </form>
                 </div>
            </div>
        </div>
    );
};
