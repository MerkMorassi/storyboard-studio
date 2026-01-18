


import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Agent } from '../services/agentService';
import { Chat, Part, Content, GenerateContentResponse, GoogleGenAI } from '@google/genai';
import { createChat, generateSpeech, getEmbeddings, mythosTools } from '../services/geminiService';
import { ChatMessage } from './ChatMessage';
import { ChatInterface } from './ChatInterface';
import { decode, decodeAudioData } from '../utils/audio';
import { vectorDb } from '../services/vectorDbService';
import { useLiveChat } from '../hooks/useLiveChat';
import { MicIcon } from './icons/MicIcon';
import { MicOffIcon } from './icons/MicOffIcon';
import { PhoneIcon, ChatIcon, LoadingSpinner, DatabaseIcon, TrashIcon, AgentActionIcon } from './icons.tsx';
import { cosineSimilarity } from '../services/embeddingService';
import { TELEPORTER } from '../utils/numMarkX';
import { runDolphinInference } from '../services/dolphinService';
import { getGeminiApiKey, getHfApiKey } from '../services/apiKeyService';
import { ModelEngine } from '../types';
import { generateImageSDXL } from '../services/huggingFaceService';
import { blobToBase64 } from '../utils/imageUtils';
import { factoryService as lorepackService } from '../services/lorepack';
import { generateImageMCP } from '../services/gradioService';
import { retrieveLivedExperience } from '../services/localRagService';

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
  functionCall?: any;
  toolCode?: { code: string; };
}

const fileToPart = async (file: File): Promise<Part> => {
    const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
    });
    return {
        inlineData: {
            mimeType: file.type || 'application/octet-stream',
            data: base64
        }
    };
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
    isGenerating: boolean; isPlaying: boolean; buffer: AudioBuffer | null; error: string | null;
  }>>({});
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRefs = useRef<Record<string, AudioBufferSourceNode | null>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const { isLive, connectionState, liveTranscript, startLiveChat, stopLiveChat } = useLiveChat(agent);

  useEffect(() => { setEngine(agent.preferredEngine || 'gemini'); }, [agent.preferredEngine]);

  useEffect(() => {
      const syncTeleporter = async () => {
          const vectors = await vectorDb.getVectorsByAgent(agent.id);
          TELEPORTER.rebuildIndex(vectors.map(v => ({ id: v.id, text: v.text })));
          setHasLorepack(vectors.length > 0);
      };
      syncTeleporter();
  }, [agent.id]);

   useEffect(() => {
    if (isLive) return;
    const loadChat = async () => {
        const logs = await vectorDb.getAgentChat(agent.id);
        setChatHistory(logs);
        const perspectivePrompt = `${agent.systemPrompt}\n\nCORE PROTOCOL: You have a LOREPACK containing your history and knowledge. When provided with <LIVED_EXPERIENCE> context, you must speak FROM that history as your own lived experience.`;
        
        const geminiHistory: Content[] = logs.map(log => ({
            role: log.role,
            parts: log.parts.map(p => {
                if (p.inlineData) return { inlineData: { mimeType: p.inlineData.mimeType, data: p.inlineData.data } };
                if (p.toolCode) return { text: `[TOOL EXECUTED: ${p.toolCode.code}]`}; // Represent tool calls as simple text in history
                return { text: p.text || '' };
            })
        }));
        // Pass tools to the chat session
        const newChat = createChat(perspectivePrompt, geminiHistory, mythosTools);
        setChatSession(newChat);
    };
    loadChat();
  }, [agent.id, agent.systemPrompt, isLive]);
  
  const saveHistory = useCallback((history: any[]) => {
      vectorDb.saveAgentChat(agent.id, history);
  }, [agent.id]);
  
  useEffect(() => { if (chatHistory.length > 0) saveHistory(chatHistory); }, [chatHistory, saveHistory]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [chatHistory, isChatLoading, liveTranscript, viewMode]);
  
  const getAudioContext = () => { if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 }); return audioContextRef.current; };
  const playAudio = useCallback((messageId: string) => { /* ... */ }, []);
  const stopAudio = useCallback((messageId: string) => { /* ... */ }, []);
  const handleGenerateAudio = async (textToSpeak: string, messageId: string) => { /* ... */ };

  const addSystemNotification = (text: string) => {
    setChatHistory(prev => [...prev, {
        id: `system-${Date.now()}`,
        role: 'model', 
        parts: [{ text: `[System Notification: ${text}]` }]
    }]);
  };

  const handleEngineSwitch = async (newEngine: ModelEngine) => {
    if (newEngine === engine) return;

    if (newEngine === 'dolphin') {
        const hfToken = getHfApiKey();
        if (!hfToken) {
            addSystemNotification("Cannot switch to Dolphin: Hugging Face API Token is not configured in System Settings.");
            return;
        }
    }

    if (newEngine === 'gemini') {
        const geminiKey = getGeminiApiKey();
        if (!geminiKey) {
            addSystemNotification("Cannot switch to Gemini: Gemini API Key is not configured in your environment.");
            return;
        }
    }

    setEngine(newEngine);
    addSystemNotification(`AI core has been switched to the ${newEngine.toUpperCase()} engine for the next interaction.`);
  };
  
    const handleToggleCallView = () => {
        if (viewMode === 'chat') {
            getAudioContext(); // Ensure audio context is ready
            setViewMode('call');
        } else {
            if (isLive) {
                stopLiveChat();
            }
            setViewMode('chat');
        }
    };

  const handleSendMessage = async (files?: File[], isToolCommand?: boolean) => {
    let messageToSend = chatMessage;

    // Handle user-initiated tool commands directly
    const toolCommandRegex = /^Use the (.*?) tool with this prompt: "(.*)"$/s;
    const toolMatch = messageToSend.match(toolCommandRegex);

    if (toolMatch && toolMatch[1] && toolMatch[2]) {
        const toolName = toolMatch[1];
        const prompt = toolMatch[2];

        setIsChatLoading(true);
        setChatMessage('');
        
        setChatHistory(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', parts: [{ text: messageToSend }] }]);
        
        setChatHistory(prev => [...prev, {
            id: `tool-${Date.now()}`, role: 'model',
            parts: [{ toolCode: { code: `Executing Tool: ${toolName}("${prompt.substring(0, 50)}...")` } }]
        }]);

        try {
            if (toolName === 'image_studio_mcp' || toolName === 'generateMythosImage') {
                const blob = toolName === 'generateMythosImage'
                    ? await generateImageSDXL({ prompt, useSuperiorEngine: true }, getHfApiKey() || '')
                    : await generateImageMCP(prompt, getHfApiKey() || undefined);

                const base64 = await blobToBase64(blob);
                const resultPart = { inlineData: { mimeType: blob.type, data: base64 } };

                setChatHistory(prev => [...prev, {
                    id: `model-result-${Date.now()}`, role: 'model',
                    parts: [resultPart, { text: `Image generated via ${toolName} with prompt: "${prompt}"` }]
                }]);
                setIsChatLoading(false);

            } else if (toolName === 'generateMythosVideo') {
                const videoPrompt = prompt;
                
                setChatHistory(prev => [...prev, {
                    id: `status-${Date.now()}`, role: 'model',
                    parts: [{ text: `🎥 Video generation initiated for: "${videoPrompt}". This may take several minutes...` }]
                }]);
                
                setIsChatLoading(false); // It's a background task

                const generateVideoAsync = async () => {
                    try {
                        if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
                            const hasKey = await window.aistudio.hasSelectedApiKey();
                            if (!hasKey && typeof window.aistudio.openSelectKey === 'function') {
                                await window.aistudio.openSelectKey();
                            }
                        }
                        
                        const apiKey = getGeminiApiKey();
                        if (!apiKey) throw new Error("A configured Gemini API key is required for video generation.");
                        const ai = new GoogleGenAI({ apiKey });

                        let operation = await ai.models.generateVideos({
                            model: 'veo-3.1-fast-generate-preview',
                            prompt: videoPrompt,
                            config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
                        });

                        while (!operation.done) {
                            await new Promise(resolve => setTimeout(resolve, 10000));
                            operation = await ai.operations.getVideosOperation({ operation: operation });
                        }

                        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
                        if (!downloadLink) throw new Error("Video generation completed, but no download link was provided.");

                        const videoResponse = await fetch(`${downloadLink}&key=${apiKey}`);
                        if (!videoResponse.ok) throw new Error(`Failed to download generated video. Status: ${videoResponse.status}`);
                        
                        const videoBlob = await videoResponse.blob();
                        const base64 = await blobToBase64(videoBlob);
                        
                        const videoPart = { inlineData: { mimeType: videoBlob.type || 'video/mp4', data: base64 } };
                        
                        setChatHistory(prev => [...prev, {
                            id: `video-result-${Date.now()}`, role: 'model',
                            parts: [videoPart, { text: `Video generated for prompt: "${videoPrompt}"` }]
                        }]);
                    } catch (err: any) {
                        let errMsg = err.message || "Video generation failed.";
                        if (errMsg.includes("Requested entity was not found")) {
                            errMsg = "Video generation failed: The selected API Key is invalid or does not have access to the Veo model. Please select a valid key from a paid GCP project. See [ai.google.dev/gemini-api/docs/billing](https://ai.google.dev/gemini-api/docs/billing) for more info.";
                        }
                        setChatHistory(prev => [...prev, { id: `error-${Date.now()}`, role: 'model', parts: [{ text: `System Alert: ${errMsg}` }] }]);
                    }
                };
                
                generateVideoAsync();

            } else {
                throw new Error(`User tool command '${toolName}' is not implemented.`);
            }
        } catch (err: any) {
            const errMsg = err.message || "Tool execution failed.";
            setChatHistory(prev => [...prev, { id: `error-${Date.now()}`, role: 'model', parts: [{ text: `System Alert: ${errMsg}` }] }]);
            setIsChatLoading(false);
        }
        return; 
    }
    
    if (engine === 'gemini' && !chatSession) return;
    if (!messageToSend.trim() && (!files || files.length === 0)) return;
    
    setIsChatLoading(true);
    const currentMessage = messageToSend;
    setChatMessage('');

    try {
      const partsForHistory: ChatMessagePart[] = [];
      const partsForApi: Part[] = [];

      if (files) {
        for (const file of files) {
          const part = await fileToPart(file);
          partsForApi.push(part);
          partsForHistory.push({ inlineData: { mimeType: part.inlineData!.mimeType, data: part.inlineData!.data, fileName: file.name }});
        }
      }
      
      let promptWithExperience = currentMessage;
      let experienceCitation = "";
      
      if (hasLorepack && currentMessage.trim() && !isToolCommand) {
          const experience = await retrieveLivedExperience(agent.id, currentMessage);
          if (experience) {
              promptWithExperience = `[LOREPACK PERSPECTIVE INITIATED]\n\n<LIVED_EXPERIENCE>\n${experience.text}\n</LIVED_EXPERIENCE>\n\nDIRECTIVE: Respond to the following query using the above history/graph as your own memory:\n\n${currentMessage}`;
              experienceCitation = `\n\n*(Sourced from experiences in: ${experience.sources.join(', ')})*`;
          }
      }

      if (currentMessage.trim()) {
        partsForHistory.push({ text: currentMessage });
        partsForApi.push({ text: promptWithExperience });
      }

      setChatHistory(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', parts: partsForHistory }]);
      
      let finalResponseText = "";
      let finalResponseParts: ChatMessagePart[] = [];

      if (engine === 'dolphin') {
          const hfToken = getHfApiKey() || '';
          const dolphinResponse = await runDolphinInference(promptWithExperience, agent.systemPrompt, hfToken);
          if (dolphinResponse.error) throw new Error(dolphinResponse.error);
          finalResponseText = dolphinResponse.text;
          finalResponseParts.push({ text: finalResponseText });
      } else {
          let result = await chatSession!.sendMessage({ message: partsForApi });
          let response = result as GenerateContentResponse;

          while (response.functionCalls && response.functionCalls.length > 0) {
              const fc = response.functionCalls[0]; // Handle one tool call at a time for simplicity
              
              setChatHistory(prev => [...prev, {
                  id: `tool-${Date.now()}`, role: 'model',
                  parts: [{ toolCode: { code: `Executing Tool: ${fc.name}(${JSON.stringify(fc.args, null, 2)})` } }]
              }]);
              
              if (fc.name === 'generateMythosImage') {
                  const blob = await generateImageSDXL({ prompt: fc.args.prompt, useSuperiorEngine: true }, getHfApiKey() || '');
                  const base64 = await blobToBase64(blob);
                  
                  const toolResultPart = { inlineData: { mimeType: blob.type, data: base64 } };
                  finalResponseParts.push(toolResultPart);

                  const toolResponseResult = await chatSession!.sendMessage({ message: [{ functionResponse: { name: fc.name, response: { result: "Image generated successfully." } } }] });
                  response = toolResponseResult;

              } else if (fc.name === 'generateMythosVideo') {
                  const videoPrompt = fc.args.prompt;
                  
                  const generateVideoAsync = async () => {
                      try {
                          if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
                              const hasKey = await window.aistudio.hasSelectedApiKey();
                              if (!hasKey) {
                                  if (typeof window.aistudio.openSelectKey === 'function') {
                                      await window.aistudio.openSelectKey();
                                  } else {
                                      throw new Error("API key selection is required for video generation, but the function is not available.");
                                  }
                              }
                          }
                          
                          const apiKey = getGeminiApiKey();
                          if (!apiKey) throw new Error("A configured Gemini API key is required for video generation.");
                          const ai = new GoogleGenAI({ apiKey });
                          
                          setChatHistory(prev => [...prev, {
                              id: `status-${Date.now()}`, role: 'model',
                              parts: [{ text: `🎥 Video generation started for: "${videoPrompt}". This may take a few minutes...` }]
                          }]);

                          let operation = await ai.models.generateVideos({
                              model: 'veo-3.1-fast-generate-preview',
                              prompt: videoPrompt,
                              config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
                          });

                          while (!operation.done) {
                              await new Promise(resolve => setTimeout(resolve, 10000));
                              operation = await ai.operations.getVideosOperation({ operation: operation });
                          }

                          const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
                          if (!downloadLink) {
                              throw new Error("Video generation completed, but no download link was provided.");
                          }

                          const videoResponse = await fetch(`${downloadLink}&key=${apiKey}`);
                          if (!videoResponse.ok) throw new Error(`Failed to download generated video. Status: ${videoResponse.status}`);
                          
                          const videoBlob = await videoResponse.blob();
                          const base64 = await blobToBase64(videoBlob);
                          
                          const videoPart = { inlineData: { mimeType: videoBlob.type || 'video/mp4', data: base64 } };
                          
                          setChatHistory(prev => [...prev, {
                              id: `video-result-${Date.now()}`, role: 'model',
                              parts: [videoPart]
                          }]);
                      } catch (err: any) {
                          let errMsg = err.message || "Video generation failed.";
                          if (errMsg.includes("Requested entity was not found")) {
                              errMsg = "Video generation failed: The selected API Key is invalid or does not have access to the Veo model. Please select a valid key from a paid GCP project. See [ai.google.dev/gemini-api/docs/billing](https://ai.google.dev/gemini-api/docs/billing) for more info.";
                          }
                          setChatHistory(prev => [...prev, {
                              id: `error-${Date.now()}`, role: 'model',
                              parts: [{ text: `System Alert: ${errMsg}` }]
                          }]);
                      }
                  };
                  
                  generateVideoAsync(); // Fire and forget

                  const toolResponseResult = await chatSession!.sendMessage({ message: [{ functionResponse: { name: fc.name, response: { result: "Video generation has been initiated. I will post the result in the chat when it's ready." } } }] });
                  response = toolResponseResult;

              } else {
                  // Fallback for unknown tools
                  const toolResponseResult = await chatSession!.sendMessage({ message: [{ functionResponse: { name: fc.name, response: { result: `Tool ${fc.name} not implemented.` } } }] });
                  response = toolResponseResult;
              }
          }
          finalResponseText = response.text || "";
          // Only add a text part if there's text to add.
          if (finalResponseText) {
            finalResponseParts.unshift({ text: finalResponseText + experienceCitation });
          }
      }

      if (finalResponseParts.length > 0) {
        const modelMessageId = `model-${Date.now()}`;
        setChatHistory(prev => [...prev, { id: modelMessageId, role: 'model', parts: finalResponseParts }]);
        if ((viewMode === 'call' || agent.autoPlayAudio) && finalResponseText) {
            handleGenerateAudio(finalResponseText, modelMessageId);
        }
      }

      // Continuous Evolution: Ingest the turn into the LOREPACK
      if (finalResponseText && agent.id && agent.name) {
        lorepackService.ingestConversationalTurn(
            agent.id,
            agent.name,
            currentMessage,
            finalResponseText
        ).catch(console.error); // Fire-and-forget
      }

    } catch (err: any) {
      const errMsg = err.message || "Communication link unstable. Try again.";
      setChatHistory(prev => [...prev, { id: `error-${Date.now()}`, role: 'model', parts: [{ text: `System Alert: ${errMsg}` }] }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSendToolCommand = (toolName: string, prompt: string) => {
    const commandMessage = `Use the ${toolName} tool with this prompt: "${prompt}"`;
    setChatMessage(commandMessage);
    // Use a timeout to ensure state updates before sending
    setTimeout(() => {
        handleSendMessage([], true);
    }, 0);
  };

  return (
    <div className="flex flex-col h-full animate-fade-in px-4 pb-4 md:px-6 md:pb-6 pt-2">
        <div className="flex justify-between items-center mb-4 shrink-0">
            {/* Agent Info */}
            <div className="flex items-center gap-3">
                 <img 
                    src={agent.avatar || `https://ui-avatars.com/api/?name=${agent.name}&background=171717&color=e5e5e5`} 
                    alt={agent.name} 
                    className="w-10 h-10 rounded-full object-cover border-2 border-neutral-700"
                />
                <div>
                    <h2 className="text-lg font-bold text-text-primary">{agent.name}</h2>
                    {hasLorepack && (
                         <div className="px-2 py-0.5 bg-blue-900/30 border border-blue-500/30 rounded flex items-center gap-1 text-[9px] text-blue-300 font-black uppercase tracking-widest" title="LOREPACK Active">
                            <DatabaseIcon className="w-2 h-2" /> PERSPECTIVE SYNCED
                        </div>
                    )}
                </div>
            </div>
             <div className="flex items-center gap-3">
                 <div className="bg-black/40 p-1 rounded-xl border border-neutral-800 flex shadow-inner">
                    <button 
                        onClick={() => handleEngineSwitch('gemini')}
                        className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${engine === 'gemini' ? 'bg-blue-600 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                    >
                        Gemini
                    </button>
                    <button 
                        onClick={() => handleEngineSwitch('dolphin')}
                        className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${engine === 'dolphin' ? 'bg-orange-600 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                    >
                        Dolphin
                    </button>
                 </div>
                 <button 
                    onClick={handleToggleCallView}
                    className="p-2 bg-secondary border border-accent text-text-secondary rounded-xl transition-colors"
                    title={viewMode === 'chat' ? 'Switch to Voice Call' : 'Switch to Text Chat'}
                 >
                    {viewMode === 'chat' ? <PhoneIcon className="w-5 h-5 text-green-400" /> : <ChatIcon className="w-5 h-5 text-blue-400" />}
                 </button>
                 <button onClick={async () => { if (confirm(`Clear history for ${agent.name}?`)) { await vectorDb.deleteAgentChat(agent.id); setChatHistory([]); } }} className="p-2 bg-secondary border border-accent text-text-secondary hover:text-red-400 rounded-xl transition-colors"><TrashIcon className="w-5 h-5" /></button>
            </div>
        </div>

        {engine === 'dolphin' && viewMode === 'chat' && (
            <div className="mb-4 bg-orange-900/10 border border-orange-500/20 px-4 py-2 rounded-lg flex items-center justify-center gap-2 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                <span className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em]">Dolphin Core Active — A10G Hardware Bypass Enabled</span>
            </div>
        )}

        {viewMode === 'call' ? (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
                <div className="mb-6">
                    <img 
                        src={agent.avatar || `https://ui-avatars.com/api/?name=${agent.name}&background=171717&color=e5e5e5`} 
                        alt={agent.name} 
                        className="w-32 h-32 rounded-full object-cover border-4 border-neutral-700 mx-auto shadow-lg"
                    />
                    <h2 className="text-2xl font-bold text-white mt-4">{agent.name}</h2>
                    <p className="text-neutral-400">Live Voice Call</p>
                </div>

                <div className="w-full max-w-2xl min-h-[120px] bg-secondary/30 border border-accent rounded-xl p-4 text-left mb-6 space-y-2 text-sm">
                    <p><span className="font-bold text-neutral-500 uppercase text-xs">You:</span> <span className="text-neutral-300">{liveTranscript.user}</span></p>
                    <div className="h-px bg-accent"></div>
                    <p><span className="font-bold text-blue-400 uppercase text-xs">{agent.name}:</span> <span className="text-white">{liveTranscript.model}</span></p>
                </div>

                <div className="flex flex-col items-center gap-4">
                    <button
                        onClick={isLive ? stopLiveChat : startLiveChat}
                        className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 border-4 ${
                            isLive ? 'bg-red-600 border-red-400 hover:bg-red-500' : 'bg-green-600 border-green-400 hover:bg-green-500'
                        }`}
                    >
                        <div className={`relative w-full h-full flex items-center justify-center ${isLive ? 'animate-pulse' : ''}`}>
                            {isLive ? <MicOffIcon className="w-10 h-10 text-white" /> : <MicIcon className="w-10 h-10 text-white" />}
                        </div>
                    </button>
                    <p className="text-xs text-neutral-500 uppercase font-bold tracking-widest">{connectionState}</p>
                </div>
            </div>
        ) : (
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
        )}

        {viewMode === 'chat' && (
            <div className="mt-4 shrink-0 z-20">
                <ChatInterface 
                    history={chatHistory} 
                    message={chatMessage} 
                    onMessageChange={setChatMessage} 
                    onSendMessage={handleSendMessage} 
                    isLoading={isChatLoading}
                    onSendToolCommand={handleSendToolCommand}
                />
            </div>
        )}
    </div>
  );
};