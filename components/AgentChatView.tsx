import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Agent } from '../services/agentService';
import { Chat, Part, Content } from '@google/genai';
import { createChat, generateSpeech, getEmbeddings } from '../services/geminiService';
import { ChatMessage } from './ChatMessage';
import { ChatInterface } from './ChatInterface';
import { decode, decodeAudioData } from '../utils/audio';
import { vectorDb } from '../services/vectorDbService';
import { useLiveChat } from '../hooks/useLiveChat';
import { MicIcon } from './icons/MicIcon';
import { MicOffIcon } from './icons/MicOffIcon';
import { PhoneIcon, ChatIcon, LoadingSpinner, DatabaseIcon, TrashIcon } from './icons.tsx';
import { cosineSimilarity } from '../services/embeddingService';
import { TELEPORTER } from '../utils/numMarkX';
import { runDolphinInference } from '../services/dolphinService';
import { getHfApiKey } from '../services/apiKeyService';
import { ModelEngine } from '../types';

interface AgentChatViewProps {
  agent: Agent;
  initialMode?: 'chat' | 'call';
  onClose?: () => void;
}

interface ChatMessagePart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
    fileName?: string;
  };
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });

const retrieveLivedExperience = async (agentId: string, query: string): Promise<{ text: string, sources: string[] } | null> => {
    try {
        // 1. Vector Retrieval
        const allVectors = await vectorDb.getVectorsByAgent(agentId);
        
        let contextText = "";
        const sources = new Set<string>();

        // 1a. Teleport (Exact Match)
        const teleportIds = TELEPORTER.teleport(query);
        if (teleportIds && teleportIds.length > 0) {
            const directNodes = allVectors.filter(v => teleportIds.includes(v.id));
            if (directNodes.length > 0) {
                contextText += directNodes.map(v => `[DIRECT HIT: ${v.source}]\n${v.text}`).join('\n\n') + "\n\n";
                directNodes.forEach(v => sources.add(v.source));
            }
        }

        // 1b. Semantic Search
        const queryVector = await getEmbeddings(query);
        if (queryVector) {
            const scored = allVectors.map(v => ({
                ...v,
                score: cosineSimilarity(queryVector, v.vector)
            })).sort((a, b) => b.score - a.score);
            
            const relevant = scored.slice(0, 5).filter(v => v.score > 0.45);
            if (relevant.length > 0) {
                contextText += relevant.map(v => `[EXPERIENCE NODE: ${v.source}]\n${v.text}`).join('\n\n') + "\n\n";
                relevant.forEach(v => sources.add(v.source));
            }
        }

        // 2. Graph Retrieval (Graph RAG)
        const graphNodes = await vectorDb.getGraphNodesByAgent(agentId);
        if (graphNodes.length > 0) {
            const lowerQuery = query.toLowerCase();
            // Simple keyword matching for graph nodes (can be upgraded to embedding search later)
            const matchedNodes = graphNodes.filter(n => lowerQuery.includes(n.label.toLowerCase()) || (n.name && lowerQuery.includes(n.name.toLowerCase())));
            
            if (matchedNodes.length > 0) {
                const edges = await vectorDb.getGraphEdgesByAgent(agentId);
                let graphContext = "[GRAPH KNOWLEDGE TOPOLOGY]\n";
                
                matchedNodes.forEach(node => {
                    graphContext += `Node: ${node.label} (${node.description || 'No Desc'})\n`;
                    
                    // Find connected edges
                    const connectedEdges = edges.filter(e => e.source === node.id || e.target === node.id);
                    connectedEdges.forEach(e => {
                        const isSource = e.source === node.id;
                        const otherId = isSource ? e.target : e.source;
                        const otherNode = graphNodes.find(n => n.id === otherId);
                        if (otherNode) {
                            graphContext += `  -> ${e.label} -> ${otherNode.label}\n`;
                        }
                    });
                    graphContext += "\n";
                });
                
                if (graphContext.trim() !== "[GRAPH KNOWLEDGE TOPOLOGY]") {
                    contextText += graphContext;
                    sources.add("Neural Graph");
                }
            }
        }

        if (!contextText.trim()) return null;
        
        return { text: contextText, sources: Array.from(sources) };
    } catch (e) {
        console.error("[LOREPACK] Retrieval Fault", e);
        return null;
    }
};

export const AgentChatView: React.FC<AgentChatViewProps> = ({ agent, initialMode = 'chat', onClose }) => {
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [chatHistory, setChatHistory] = useState<{ id: string; role: 'user' | 'model'; parts: ChatMessagePart[] }[]>([]);
  const [chatMessage, setChatMessage] = useState<string>('');
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'chat' | 'call'>(initialMode);
  const [hasLorepack, setHasLorepack] = useState(false);
  const [engine, setEngine] = useState<ModelEngine>(agent.preferredEngine || 'gemini');
  
  const [messageAudioStates, setMessageAudioStates] = useState<Record<string, {
    isGenerating: boolean;
    isPlaying: boolean;
    buffer: AudioBuffer | null;
    error: string | null;
  }>>({});
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRefs = useRef<Record<string, AudioBufferSourceNode | null>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const handleLiveTurnComplete = useCallback((transcript: { user: string; model: string }) => {
      setChatHistory(prev => {
          const newHistory = [...prev];
          if (transcript.user.trim()) {
              newHistory.push({ id: `user-live-${Date.now()}`, role: 'user', parts: [{ text: transcript.user }] });
          }
          if (transcript.model.trim()) {
              newHistory.push({ id: `model-live-${Date.now()}`, role: 'model', parts: [{ text: transcript.model }] });
          }
          return newHistory;
      });
  }, []);

  const { isLive, connectionState, liveTranscript, startLiveChat, stopLiveChat } = useLiveChat(agent, handleLiveTurnComplete);

  useEffect(() => {
      const syncTeleporter = async () => {
          const vectors = await vectorDb.getVectorsByAgent(agent.id);
          const nodes = await vectorDb.getGraphNodesByAgent(agent.id);
          TELEPORTER.rebuildIndex(vectors.map(v => ({ id: v.id, text: v.text })));
          setHasLorepack(vectors.length > 0 || nodes.length > 0);
      };
      syncTeleporter();
  }, [agent.id]);

   useEffect(() => {
    if (isLive || engine === 'dolphin') return;
    const loadChat = async () => {
        const logs = await vectorDb.getAgentChat(agent.id);
        setChatHistory(logs);
        const perspectivePrompt = `${agent.systemPrompt}\n\nCORE PROTOCOL: You have a LOREPACK containing your history and knowledge (Vectors & Graph). When provided with <LIVED_EXPERIENCE> or [GRAPH KNOWLEDGE TOPOLOGY] context, you must speak FROM that history. Do not say "based on the context"; simply embody the knowledge as your own lived experience. Use graph connections to reason about relationships between concepts.`;
        
        const geminiHistory: Content[] = logs.map(log => ({
            role: log.role,
            parts: log.parts.map(p => {
                if (p.inlineData) return { inlineData: { mimeType: p.inlineData.mimeType, data: p.inlineData.data } };
                return { text: p.text || '' };
            })
        }));
        const newChat = createChat(perspectivePrompt, geminiHistory);
        setChatSession(newChat);
    };
    loadChat();
  }, [agent.id, agent.systemPrompt, isLive, engine]);
  
  const saveHistory = useCallback((history: any[]) => {
      vectorDb.saveAgentChat(agent.id, history);
  }, [agent.id]);
  
  useEffect(() => {
    if (chatHistory.length > 0) saveHistory(chatHistory);
  }, [chatHistory, saveHistory]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatHistory, isChatLoading, liveTranscript, viewMode]);
  
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  const playAudio = useCallback((messageId: string) => {
    const audioState = messageAudioStates[messageId];
    if (!audioState?.buffer || audioState.isPlaying) return;
    const audioCtx = getAudioContext();
    const source = audioCtx.createBufferSource();
    source.buffer = audioState.buffer;
    source.connect(audioCtx.destination);
    source.onended = () => {
      setMessageAudioStates(prev => ({...prev, [messageId]: {...prev[messageId], isPlaying: false}}));
      audioSourceRefs.current[messageId] = null;
    };
    source.start();
    setMessageAudioStates(prev => ({...prev, [messageId]: {...prev[messageId], isPlaying: true}}));
    audioSourceRefs.current[messageId] = source;
  }, [messageAudioStates]);

  const stopAudio = useCallback((messageId: string) => {
    if (audioSourceRefs.current[messageId]) {
        audioSourceRefs.current[messageId]?.stop();
        audioSourceRefs.current[messageId] = null;
    }
  }, []);
  
  const handleGenerateAudio = async (textToSpeak: string, messageId: string) => {
    if (!agent?.voice) return;
    setMessageAudioStates(prev => ({...prev, [messageId]: { ...prev[messageId], isGenerating: true, error: null }}));
    try {
        const plainText = textToSpeak.replace(/<[^>]*>/g, '').replace(/[\*\_]/g, '');
        const audioData = await generateSpeech(plainText, agent.voice, agent.speakingRate || 1.0);
        const audioBytes = decode(audioData);
        const audioCtx = getAudioContext();
        const buffer = await decodeAudioData(audioBytes, audioCtx, 24000, 1);
        setMessageAudioStates(prev => ({ ...prev, [messageId]: { ...prev[messageId], isGenerating: false, buffer, isPlaying: false } }));
        playAudio(messageId);
    } catch (audioErr) {
         setMessageAudioStates(prev => ({ ...prev, [messageId]: { ...prev[messageId], isGenerating: false, error: "Voice synthesis failed." } }));
    }
  };

  const handleSendMessage = async (files?: File[]) => {
    if (engine === 'gemini' && !chatSession) return;
    if (!chatMessage.trim() && (!files || files.length === 0)) return;
    
    setIsChatLoading(true);
    const currentMessage = chatMessage;
    setChatMessage('');

    try {
      const partsForHistory: ChatMessagePart[] = [];
      const partsForApi: Part[] = [];
      if (files) {
        for (const file of files) {
          const base64 = await fileToBase64(file);
          partsForHistory.push({ inlineData: { mimeType: file.type || 'application/octet-stream', data: base64, fileName: file.name } });
          partsForApi.push({ inlineData: { mimeType: file.type || 'application/octet-stream', data: base64 } });
        }
      }
      
      let promptWithExperience = currentMessage;
      let experienceCitation = "";
      
      if (hasLorepack && currentMessage.trim()) {
          const experience = await retrieveLivedExperience(agent.id, currentMessage);
          if (experience) {
              promptWithExperience = `[LOREPACK PERSPECTIVE INITIATED]\n\n<LIVED_EXPERIENCE>\n${experience.text}\n</LIVED_EXPERIENCE>\n\nDIRECTIVE: Respond to the following query using the above history/graph as your own memory:\n\n${currentMessage}`;
              experienceCitation = `\n\n*(Sourced from experiences in: ${experience.sources.join(', ')})*`;
          }
      }

      if (currentMessage.trim()) {
        partsForHistory.push({ text: currentMessage });
        partsForApi.push({ text: promptWithExperience });
      } else if (files && files.length > 0) {
          partsForApi.push({ text: "Analyze these production files." });
      }

      setChatHistory(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', parts: partsForHistory }]);
      
      let responseText = "";
      
      if (engine === 'dolphin') {
          const hfToken = getHfApiKey() || '';
          const dolphinResponse = await runDolphinInference(promptWithExperience, agent.systemPrompt, hfToken);
          if (dolphinResponse.error) throw new Error(dolphinResponse.error);
          responseText = dolphinResponse.text;
      } else {
          const result = await chatSession!.sendMessage({ message: partsForApi });
          responseText = result.text || "";
      }

      if (responseText) {
        const modelMessageId = `model-${Date.now()}`;
        setChatHistory(prev => [...prev, { id: modelMessageId, role: 'model', parts: [{ text: responseText + experienceCitation }] }]);
        if (viewMode === 'call' || agent.autoPlayAudio) handleGenerateAudio(responseText, modelMessageId);
      }
    } catch (err: any) {
      const errMsg = err.message || "Communication link unstable. Try again.";
      setChatHistory(prev => [...prev, { id: `error-${Date.now()}`, role: 'model', parts: [{ text: `System Alert: ${errMsg}` }] }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  if (viewMode === 'call') {
      const lastMessage = chatHistory[chatHistory.length - 1];
      const isAgentSpeaking = (lastMessage?.role === 'model' && messageAudioStates[lastMessage.id]?.isPlaying) || connectionState === 'connected';
      return (
          <div className="flex flex-col h-full bg-black relative overflow-hidden animate-fade-in">
              <div className="absolute inset-0 z-0 opacity-40">
                  <img src={agent.avatar || `https://ui-avatars.com/api/?name=${agent.name}`} className="w-full h-full object-cover blur-2xl scale-125" alt="" />
                  <div className="absolute inset-0 bg-black/60"></div>
              </div>
              
              <div className="relative z-10 flex justify-between items-center p-4 bg-gradient-to-b from-black/80 to-transparent">
                  <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-500 animate-pulse shadow-[0_0_8px_red]' : 'bg-green-500'}`}></div>
                      <span className="text-xs font-black text-neutral-300 uppercase tracking-widest">{isLive ? 'LIVED FEED' : 'STUDIO LINK'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                      <button onClick={() => setViewMode('chat')} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-colors"><ChatIcon className="w-5 h-5"/></button>
                      <button onClick={onClose} className="p-2 bg-red-600 hover:bg-red-500 rounded-full text-white shadow-lg transition-colors"><PhoneIcon className="h-5 w-5 transform rotate-[135deg]" /></button>
                  </div>
              </div>

              <div className="relative z-10 flex-grow flex flex-col items-center justify-center p-6 space-y-8 overflow-hidden">
                  <div className="relative">
                      <div className={`absolute -inset-8 rounded-full bg-blue-500/20 blur-2xl transition-opacity duration-500 ${isAgentSpeaking ? 'opacity-100 scale-110' : 'opacity-0 scale-100'}`}></div>
                      <div className={`w-48 h-48 rounded-full border-4 overflow-hidden shadow-2xl relative z-10 transition-all duration-500 ${isAgentSpeaking ? 'border-blue-500 scale-105' : 'border-neutral-800'}`}>
                          <img src={agent.avatar || `https://ui-avatars.com/api/?name=${agent.name}`} className="w-full h-full object-cover" alt="" />
                      </div>
                  </div>
                  <div className="w-full max-w-lg bg-black/40 backdrop-blur-md rounded-2xl p-6 min-h-[120px] border border-white/10 text-center flex flex-col items-center justify-center shadow-2xl">
                      <p className="text-neutral-200 text-lg font-medium leading-relaxed">
                          {isLive ? (liveTranscript.model || liveTranscript.user || (connectionState === 'connecting' ? "Initializing link..." : "Listening for voice...")) : (lastMessage?.role === 'model' ? lastMessage.parts[0].text : "Establishing communication...")}
                      </p>
                  </div>
              </div>

              <div className="relative z-20 bg-neutral-900 border-t border-neutral-800 p-4 pb-6 flex flex-col gap-4">
                  <ChatInterface history={chatHistory} message={chatMessage} onMessageChange={setChatMessage} onSendMessage={handleSendMessage} isLoading={isChatLoading} />
                  <div className="flex justify-center">
                      <button 
                        onClick={() => {
                            getAudioContext(); // Ensure context is ready
                            isLive ? stopLiveChat() : startLiveChat();
                        }} 
                        className={`flex items-center gap-2 px-8 py-3 rounded-full font-black uppercase tracking-tighter transition-all shadow-xl ${isLive ? 'bg-red-600 text-white hover:bg-red-500 animate-pulse' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
                      >
                          {isLive ? <MicOffIcon className="w-5 h-5" /> : <MicIcon className="w-5 h-5" />}
                          {isLive ? 'TERMINATE SESSION' : 'ENGAGE VOICE LINK'}
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full animate-fade-in px-4 pb-4 md:px-6 md:pb-6 pt-2">
        <div className="flex justify-between items-center mb-4 shrink-0">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-text-primary">Agent Workspace</h2>
                    {hasLorepack && (
                        <div className="px-2 py-1 bg-blue-900/30 border border-blue-500/30 rounded flex items-center gap-1 text-[10px] text-blue-300 font-black uppercase tracking-widest" title="LOREPACK Active">
                            <DatabaseIcon className="w-3 h-3" /> PERSPECTIVE SYNCED
                        </div>
                    )}
                </div>
                <p className="text-text-secondary text-sm">Syncing with <span className="font-semibold text-text-primary">{agent.name}</span>.</p>
            </div>
             <div className="flex items-center gap-3">
                 {/* ENGINE SWITCHER */}
                 <div className="bg-black/40 p-1 rounded-xl border border-neutral-800 flex shadow-inner">
                    <button 
                        onClick={() => setEngine('gemini')}
                        className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${engine === 'gemini' ? 'bg-blue-600 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                    >
                        Gemini
                    </button>
                    <button 
                        onClick={() => setEngine('dolphin')}
                        className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${engine === 'dolphin' ? 'bg-orange-600 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                    >
                        Dolphin
                    </button>
                 </div>

                 <button onClick={() => { getAudioContext(); setViewMode('call'); }} className="px-4 py-2 text-sm font-semibold bg-green-600/10 border border-green-600/50 text-green-400 hover:bg-green-600/20 rounded-xl transition-all flex items-center gap-2"><PhoneIcon className="w-4 h-4" /> Call</button>
                 <button onClick={async () => { if (confirm(`Clear history for ${agent.name}?`)) { await vectorDb.deleteAgentChat(agent.id); setChatHistory([]); } }} className="p-2 bg-secondary border border-accent text-text-secondary hover:text-red-400 rounded-xl transition-colors"><TrashIcon className="w-5 h-5" /></button>
            </div>
        </div>

        {engine === 'dolphin' && (
            <div className="mb-4 bg-orange-900/10 border border-orange-500/20 px-4 py-2 rounded-lg flex items-center justify-center gap-2 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                <span className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em]">Dolphin Core Active — A10G Hardware Bypass Enabled</span>
            </div>
        )}

        <div className="flex-grow flex flex-col space-y-4 overflow-y-auto min-h-0 pr-2 custom-scrollbar">
             {chatHistory.map((msg) => (
              <ChatMessage key={msg.id} message={msg} agent={agent} audioState={messageAudioStates[msg.id]} onPlayAudio={() => playAudio(msg.id)} onStopAudio={() => stopAudio(msg.id)} onGenerateAudio={(text) => handleGenerateAudio(text, msg.id)} />
            ))}
            {isChatLoading && (
                <div className="flex justify-start">
                    <div className="flex items-center gap-4 bg-secondary/30 border border-accent rounded-xl p-4 shadow-sm w-full">
                        <LoadingSpinner className="w-5 h-5 text-blue-500" />
                        <span className="text-sm font-semibold text-text-secondary animate-pulse">
                            {engine === 'dolphin' ? 'Handshaking with HF A10G...' : 'Consulting LOREPACK...'}
                        </span>
                    </div>
                </div>
            )}
            <div ref={chatEndRef} />
        </div>
      <div className="mt-4 shrink-0 z-20">
        <ChatInterface history={chatHistory} message={chatMessage} onMessageChange={setChatMessage} onSendMessage={handleSendMessage} isLoading={isChatLoading} />
      </div>
    </div>
  );
};