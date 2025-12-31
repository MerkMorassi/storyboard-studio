
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Agent } from '../services/agentService';
import { Chat, Part, Content } from '@google/genai';
import { createChat, generateSpeech, getEmbeddings } from '../services/geminiService';
import { ChatMessage } from './ChatMessage';
import { ChatInterface } from './ChatInterface';
import { decode, decodeAudioData } from '../utils/audio';
import { TrashIcon } from './icons/TrashIcon';
import { vectorDb } from '../services/vectorDbService';
import { WarningIcon } from './icons/WarningIcon';
import { useLiveChat } from '../hooks/useLiveChat';
import { MicIcon } from './icons/MicIcon';
import { MicOffIcon } from './icons/MicOffIcon';
import { PhoneIcon } from './icons.tsx';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { cosineSimilarity } from '../services/embeddingService';

interface AgentChatViewProps {
  agent: Agent;
  initialMode?: 'chat' | 'call';
  onClose?: () => void;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
  
interface ChatMessagePart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
    fileName?: string;
  };
}

const retrieveContext = async (agentId: string, query: string): Promise<{ text: string, sources: string[] } | null> => {
    try {
        console.log(`[RAG] Retrieving context for agent: ${agentId}`);
        const vectors = await vectorDb.getVectorsByAgent(agentId);
        console.log(`[RAG] Found ${vectors.length} total vectors for agent.`);
        
        if (vectors.length === 0) return null;

        const queryVector = await getEmbeddings(query);
        if (!queryVector) {
            console.warn("[RAG] Failed to generate query embedding.");
            return null;
        }

        const scored = vectors.map(v => ({
            ...v,
            score: cosineSimilarity(queryVector, v.vector)
        }));

        scored.sort((a, b) => b.score - a.score);
        
        // Log top score
        console.log(`[RAG] Top match score: ${scored[0]?.score}`);

        // Strict relevance filter
        const relevant = scored.slice(0, 5).filter(v => v.score > 0.55);
        
        console.log(`[RAG] Relevant chunks found: ${relevant.length}`);

        if (relevant.length === 0) return null;

        const contextText = relevant.map(v => `[Source: ${v.source}]\n${v.text}`).join('\n\n');
        const sources = Array.from(new Set(relevant.map(v => v.source)));
        
        return { text: contextText, sources };
    } catch (e) {
        console.error("RAG Retrieval Failed", e);
        return null;
    }
};

export const AgentChatView: React.FC<AgentChatViewProps> = ({ agent, initialMode = 'chat', onClose }) => {
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [chatHistory, setChatHistory] = useState<{ id: string; role: 'user' | 'model'; parts: ChatMessagePart[] }[]>([]);
  const [chatMessage, setChatMessage] = useState<string>('');
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'chat' | 'call'>(initialMode);
  
  const [messageAudioStates, setMessageAudioStates] = useState<Record<string, {
    isGenerating: boolean;
    isPlaying: boolean;
    buffer: AudioBuffer | null;
    error: string | null;
  }>>({});
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRefs = useRef<Record<string, AudioBufferSourceNode | null>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Callback to handle completed turns from the live chat
  const handleLiveTurnComplete = useCallback((transcript: { user: string; model: string }) => {
      setChatHistory(prev => {
          const newHistory = [...prev];
          if (transcript.user.trim()) {
              newHistory.push({ 
                  id: `user-live-${Date.now()}`, 
                  role: 'user', 
                  parts: [{ text: transcript.user }] 
              });
          }
          if (transcript.model.trim()) {
              newHistory.push({ 
                  id: `model-live-${Date.now()}`, 
                  role: 'model', 
                  parts: [{ text: transcript.model }] 
              });
          }
          return newHistory;
      });
  }, []);

  const { isLive, connectionState, liveTranscript, startLiveChat, stopLiveChat } = useLiveChat(agent, handleLiveTurnComplete);


   useEffect(() => {
    if (isLive) return;
    const loadChat = async () => {
        const logs = await vectorDb.getAgentChatLogs();
        setChatHistory(logs);

        // Keep instruction clean but we will rely on our markdown parser now
        const formattingInstruction = ""; 
        const chatSystemPrompt = `${agent.systemPrompt} ${formattingInstruction}`;
        
        const geminiHistory: Content[] = logs.map(log => ({
            role: log.role,
            parts: log.parts.map(p => {
                if (p.inlineData) {
                    return { inlineData: { mimeType: p.inlineData.mimeType, data: p.inlineData.data } };
                }
                return { text: p.text || '' };
            })
        }));

        const newChat = createChat(chatSystemPrompt, geminiHistory);
        setChatSession(newChat);
    };
    loadChat();
  }, [agent.systemPrompt, isLive]);
  
  const saveHistory = useCallback((history: { id: string; role: 'user' | 'model'; parts: ChatMessagePart[] }[]) => {
      vectorDb.saveAgentChatLogs(history);
  }, []);
  
  useEffect(() => {
    if (chatHistory.length > 0) {
        saveHistory(chatHistory);
    }
  }, [chatHistory, saveHistory]);

  useEffect(() => {
    // Scroll to bottom whenever history updates
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatHistory, isChatLoading, liveTranscript, viewMode]);
  
    const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)({ sampleRate: 24000 });
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
    }
  }, []);
  
    const handleGenerateAudio = async (textToSpeak: string, messageId: string) => {
    if (!agent?.voice) return;

    setMessageAudioStates(prev => ({...prev, [messageId]: { ...prev[messageId], isGenerating: true, error: null }}));

    try {
        const plainText = textToSpeak.replace(/<[^>]*>/g, '');
        const audioData = await generateSpeech(plainText, agent.voice, agent.speakingRate || 1.0);
        const audioBytes = decode(audioData);
        const audioCtx = getAudioContext();
        const buffer = await decodeAudioData(audioBytes, audioCtx, 24000, 1);
        
        setMessageAudioStates(prev => ({
            ...prev,
            [messageId]: { ...prev[messageId], isGenerating: false, buffer, isPlaying: false }
        }));
        // Auto-play immediately in call mode or if configured
        playAudio(messageId);
    } catch (audioErr) {
         console.error("Audio generation failed", audioErr);
         setMessageAudioStates(prev => ({
            ...prev,
            [messageId]: { ...prev[messageId], isGenerating: false, error: "Audio generation failed. Please try again." }
        }));
    }
  };

  const handleSendMessage = async (files?: File[]) => {
    if (!chatSession || (!chatMessage.trim() && (!files || files.length === 0))) return;

    setIsChatLoading(true);
    const currentMessage = chatMessage;
    setChatMessage('');

    try {
      const partsForHistory: ChatMessagePart[] = [];
      const partsForApi: Part[] = [];

      if (files && files.length > 0) {
        for (const file of files) {
          const base64 = await fileToBase64(file);
          const mimeType = file.type || 'application/octet-stream';
          partsForHistory.push({ inlineData: { mimeType, data: base64, fileName: file.name } });
          partsForApi.push({ inlineData: { mimeType, data: base64 } });
        }
      }
      
      let messageToSend = currentMessage;
      let ragNote = "";

      // RAG Logic
      if (agent.enableLocalRag && currentMessage.trim()) {
          const contextResult = await retrieveContext(agent.id, currentMessage);
          if (contextResult) {
              messageToSend = `Use the following context from your knowledge base to answer the user's question. If the context isn't relevant to the specific question, ignore it and answer based on your general knowledge.\n\n<CONTEXT>\n${contextResult.text}\n</CONTEXT>\n\nUser Query: ${currentMessage}`;
              ragNote = `\n\n*(Used context from: ${contextResult.sources.join(', ')})*`;
          }
      }

      if (currentMessage.trim()) {
        // Show original message in history
        partsForHistory.push({ text: currentMessage });
        // Send augmented message to API
        partsForApi.push({ text: messageToSend });
      }

      const newHistoryEntry = {
        id: `user-${Date.now()}`,
        role: 'user' as const,
        parts: partsForHistory,
      };
      setChatHistory((prev) => [...prev, newHistoryEntry]);

      const result = await chatSession.sendMessage({ message: partsForApi });
      const responseText = result.text;

      if (responseText) {
        const modelMessageId = `model-${Date.now()}`;
        setChatHistory((prev) => [...prev, { id: modelMessageId, role: 'model', parts: [{ text: responseText + (ragNote ? `\n${ragNote}` : '') }] }]);
        
        // Auto-generate audio if in call mode OR if agent setting is on
        if (viewMode === 'call' || agent.autoPlayAudio) {
          handleGenerateAudio(responseText, modelMessageId);
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      setChatHistory((prev) => [
        ...prev,
        { id: `error-${Date.now()}`, role: 'model', parts: [{ text: "Sorry, I encountered an error. Please try again." }] },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleUpdateMessage = (messageId: string, newText: string) => {
      setChatHistory(prev => {
          return prev.map(msg => {
              if (msg.id === messageId) {
                  const newParts = msg.parts.map(p => {
                      if (p.text !== undefined) return { ...p, text: newText };
                      return p;
                  });
                  return { ...msg, parts: newParts };
              }
              return msg;
          });
      });
  };

  const handleDownloadTranscript = () => {
    let transcript = `Agent Chat Transcript\nAgent: ${agent.name}\nTimestamp: ${new Date().toISOString()}\n\n---\n\n`;
    chatHistory.forEach(msg => {
        const prefix = msg.role === 'user' ? 'HITL:' : `${agent.name.toUpperCase()}:`;
        const textContent = msg.parts.map(p => {
            if (p.text) return p.text;
            if (p.inlineData) return `[Attachment: ${p.inlineData.fileName || p.inlineData.mimeType}]`;
            return '';
        }).join(' ');
        transcript += `${prefix} ${textContent}\n\n`;
    });
    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat_transcript_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearChat = async () => {
    if (window.confirm("Are you sure you want to clear this entire chat history?")) {
        await vectorDb.clearAgentChatLogs();
        setChatHistory([]);
        
        const chatSystemPrompt = agent.systemPrompt;
        const newChat = createChat(chatSystemPrompt);
        setChatSession(newChat);
    }
  };
  
    const handleToggleLiveChat = async () => {
        if (isLive) {
            await stopLiveChat();
        } else {
            startLiveChat();
        }
    };

    const getLiveStatusText = () => {
        switch (connectionState) {
            case 'connecting': return 'Connecting...';
            case 'connected': return 'Live';
            case 'error': return 'Error';
            default: return 'Voice';
        }
    };

  // --- CALL MODE UI ---
  if (viewMode === 'call') {
      const lastMessage = chatHistory[chatHistory.length - 1];
      const isAgentSpeaking = lastMessage?.role === 'model' && messageAudioStates[lastMessage.id]?.isPlaying;
      
      return (
          <div className="flex flex-col h-full bg-black relative overflow-hidden animate-fade-in">
              {/* Blurred Background */}
              <div className="absolute inset-0 z-0 opacity-40">
                  <img 
                    src={agent.avatar || `https://ui-avatars.com/api/?name=${agent.name}&background=random`} 
                    className="w-full h-full object-cover blur-2xl scale-125" 
                    alt="Background" 
                  />
                  <div className="absolute inset-0 bg-black/60"></div>
              </div>

              {/* Call Header */}
              <div className="relative z-10 flex justify-between items-center p-4">
                  <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                      <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
                          {isLive ? 'Live Connection' : 'Voice Call'}
                      </span>
                  </div>
                  <div className="flex items-center gap-2">
                      <button onClick={() => setViewMode('chat')} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-colors" title="Switch to Text View">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                      </button>
                      <button onClick={onClose} className="p-2 bg-red-600 hover:bg-red-500 rounded-full text-white shadow-lg transition-colors" title="End Call">
                          <PhoneIcon className="h-5 w-5 transform rotate-[135deg]" />
                      </button>
                  </div>
              </div>

              {/* Main Avatar Area */}
              <div className="relative z-10 flex-grow flex flex-col items-center justify-center p-6 space-y-8">
                  <div className="relative">
                      <div className={`absolute inset-0 rounded-full bg-blue-500 blur-xl transition-opacity duration-300 ${isAgentSpeaking || (isLive && liveTranscript.model) ? 'opacity-40 animate-pulse' : 'opacity-0'}`}></div>
                      <div className="w-48 h-48 rounded-full border-4 border-neutral-800 overflow-hidden shadow-2xl relative z-10">
                          <img 
                            src={agent.avatar || `https://ui-avatars.com/api/?name=${agent.name}&background=random`} 
                            className="w-full h-full object-cover" 
                            alt={agent.name} 
                          />
                      </div>
                      <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 bg-neutral-900/80 backdrop-blur-md px-4 py-1 rounded-full border border-neutral-700 z-20">
                          <h3 className="text-white font-bold text-lg">{agent.name}</h3>
                      </div>
                  </div>

                  {/* Transcript Overlay */}
                  <div className="w-full max-w-lg bg-black/40 backdrop-blur-sm rounded-xl p-4 min-h-[100px] max-h-[200px] overflow-y-auto border border-white/5 text-center flex flex-col items-center justify-center custom-scrollbar">
                      {isLive && (liveTranscript.user || liveTranscript.model) ? (
                          <div className="space-y-2">
                              {liveTranscript.user && <p className="text-blue-300 text-sm">"{liveTranscript.user}"</p>}
                              {liveTranscript.model && <p className="text-white text-base font-medium">"{liveTranscript.model}"</p>}
                          </div>
                      ) : (
                          <p className="text-neutral-300 text-base font-medium leading-relaxed">
                              {lastMessage?.role === 'model' ? 
                                lastMessage.parts[0].text : 
                                (isChatLoading ? "Listening..." : "Waiting for input...")}
                          </p>
                      )}
                  </div>
              </div>

              {/* Bottom Controls */}
              <div className="relative z-20 bg-neutral-900/90 backdrop-blur-lg border-t border-neutral-800 p-4 pb-6">
                  <ChatInterface 
                      history={chatHistory} 
                      message={chatMessage} 
                      onMessageChange={setChatMessage} 
                      onSendMessage={handleSendMessage} 
                      isLoading={isChatLoading} 
                  />
                  <div className="flex justify-center mt-4">
                      <button
                          onClick={handleToggleLiveChat}
                          className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all shadow-lg ${
                              isLive 
                                ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30' 
                                : 'bg-neutral-800 text-neutral-300 border border-neutral-700 hover:bg-neutral-700'
                          }`}
                      >
                          {isLive ? <MicOffIcon className="w-5 h-5" /> : <MicIcon className="w-5 h-5" />}
                          {isLive ? 'Stop Live Voice' : 'Start Live Voice'}
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  // --- STANDARD CHAT UI ---
  return (
    <div className="flex flex-col h-full animate-fade-in px-4 pb-4 md:px-6 md:pb-6 pt-2">
        <div className="flex justify-between items-center mb-4 shrink-0">
            <div className="flex items-center gap-2">
                <div>
                    <h2 className="text-2xl font-bold text-text-primary">Agent Chat</h2>
                    <p className="text-text-secondary">Have a conversation with <span className="font-semibold text-text-primary">{agent.name}</span>.</p>
                </div>
                {agent.enableLocalRag && (
                    <div className="px-2 py-1 bg-blue-900/30 border border-blue-500/30 rounded flex items-center gap-1 text-[10px] text-blue-300 font-bold uppercase tracking-wider" title="RAG Active">
                        <DatabaseIcon className="w-3 h-3" /> Knowledge Active
                    </div>
                )}
            </div>
             <div className="flex items-center gap-2">
                 <button
                    onClick={() => setViewMode('call')}
                    className="px-4 py-2 text-sm font-semibold bg-green-600/10 border border-green-600/50 text-green-400 hover:bg-green-600/20 rounded-xl transition-all flex items-center gap-2"
                >
                    <PhoneIcon className="w-4 h-4" /> Switch to Call
                </button>
                <button
                    onClick={handleDownloadTranscript}
                    disabled={chatHistory.length === 0 || isLive}
                    className="px-4 py-2 text-sm font-semibold bg-secondary border border-accent text-text-secondary hover:bg-accent hover:text-text-primary rounded-xl transition-colors disabled:opacity-50"
                >
                    Transcript
                </button>
                 <button
                    onClick={handleClearChat}
                    disabled={chatHistory.length === 0 || isLive}
                    className="p-2 text-sm font-semibold bg-secondary border border-accent text-text-secondary hover:bg-red-900/20 hover:text-red-400 rounded-xl transition-colors disabled:opacity-50"
                    title="Clear Chat History"
                >
                    <TrashIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
      
        <div className="flex-grow flex flex-col space-y-4 overflow-y-auto min-h-0 pr-2">
             {chatHistory.length === 0 && !isChatLoading && !isLive && (
                <div className="text-center p-8 text-text-secondary italic">
                    No messages yet. Start the conversation below or switch to Call Mode.
                </div>
            )}
             {chatHistory.map((msg) => (
              <ChatMessage 
                key={msg.id} 
                message={msg} 
                agent={agent} 
                audioState={messageAudioStates[msg.id]}
                onPlayAudio={() => playAudio(msg.id)}
                onStopAudio={() => stopAudio(msg.id)}
                onGenerateAudio={(text) => handleGenerateAudio(text, msg.id)}
                onUpdateMessage={handleUpdateMessage}
              />
            ))}
            
            {isChatLoading && (
                <div className="flex justify-start">
                    <div className="flex items-center gap-4 bg-secondary/30 border border-accent rounded-xl p-4 shadow-sm w-full">
                        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0"><div className="animate-spin h-5 w-5 border-2 border-brand border-t-transparent rounded-full"></div></div>
                        <span className="text-sm font-semibold text-text-secondary">Thinking...</span>
                    </div>
                </div>
            )}
            <div ref={chatEndRef} />
        </div>

      <div className="mt-4 shrink-0 z-20">
        <ChatInterface 
            history={chatHistory} 
            message={chatMessage} 
            onMessageChange={setChatMessage} 
            onSendMessage={handleSendMessage} 
            isLoading={isChatLoading} 
        />
      </div>
    </div>
  );
};
