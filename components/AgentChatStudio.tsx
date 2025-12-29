
import React, { useState, useRef, useEffect } from 'react';
import { Agent, ChatMessage, FunctionCall, ToolCode } from '../types.ts';
import { LoadingSpinner, WritersRoomIcon, AgentActionIcon } from './icons.tsx';
import { createChat, mythosTools } from '../services/geminiService.ts';
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

const ChatMessageBubble: React.FC<{ message: { role: 'user' | 'model', text: string }, agentName: string }> = ({ message, agentName }) => {
    const isUser = message.role === 'user';
    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
            <div className={`max-w-[85%] rounded-2xl px-5 py-3 shadow-sm ${
                isUser 
                    ? 'bg-blue-600 text-white rounded-br-sm' 
                    : 'bg-neutral-700/50 border border-neutral-600 text-neutral-200 rounded-bl-sm'
            }`}>
                <div className={`text-[10px] font-bold mb-1 uppercase tracking-wider ${isUser ? 'text-blue-200' : 'text-neutral-400'}`}>
                    {isUser ? 'You' : agentName}
                </div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.text}</div>
            </div>
        </div>
    );
};

const AgentActionBubble: React.FC<{
    agentName: string;
    toolCode: ToolCode;
    onAddToStoryboard: (base64: string) => void;
    onAddToInspiration: (base64: string) => void;
    onAddAssetToGrid: (asset: any) => void;
}> = ({ agentName, toolCode, onAddToStoryboard, onAddToInspiration, onAddAssetToGrid }) => {
    const { functionCall, status, result } = toolCode;
    const { name, args } = functionCall;

    const isPending = status === 'pending';
    const isComplete = status === 'complete';
    const hasImageResult = isComplete && result?.image;
    const hasTextResult = isComplete && result?.text;
    const hasError = isComplete && result?.error;

    const renderContent = () => {
        if (hasError) {
            if (result.error.includes("Hardware Sleeping")) {
                return (
                    <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg text-yellow-200 text-sm flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <WarningIcon className="w-4 h-4 text-yellow-500" />
                            <span className="font-bold uppercase tracking-wider">GPU Core Sleeping</span>
                        </div>
                        <p className="text-xs">The dedicated hardware for image generation is waking up.</p>
                        <ol className="text-xs list-decimal list-inside space-y-1 pl-1">
                            <li><a href="https://merkmorassi-mythos-engine.hf.space" target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-white">Click here to wake it</a>.</li>
                            <li>Wait ~60 seconds, then try asking me again.</li>
                        </ol>
                    </div>
                );
            }
            return (
                <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-200 text-sm flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <WarningIcon className="w-4 h-4 text-red-500" />
                        <span className="font-bold uppercase tracking-wider">Tool Fault</span>
                    </div>
                    <p className="font-mono text-[11px] leading-tight text-red-300">
                        {result.error}
                    </p>
                </div>
            );
        }

        if (name === 'generateMythosImage') {
            return (
                <div>
                    <div className="flex flex-col gap-1 text-sm pt-1">
                        <span className="text-neutral-500 text-[10px] uppercase font-bold">Prompt</span>
                        <span className="text-neutral-300 italic leading-relaxed bg-black/20 p-2 rounded border border-white/5">{args.prompt}</span>
                    </div>
                    {isPending && (
                        <div className="mt-4 flex items-center gap-2 text-neutral-400">
                            <LoadingSpinner className="w-4 h-4" />
                            <span>Generating image...</span>
                        </div>
                    )}
                    {hasImageResult && (
                        <div className="mt-4 space-y-3">
                            <div className="aspect-video bg-black rounded-lg overflow-hidden border border-neutral-700">
                                <img 
                                    src={`data:${result.image.mimeType};base64,${result.image.base64}`}
                                    className="w-full h-full object-contain"
                                    alt="Generated by agent"
                                />
                            </div>
                            <AssetActions 
                                asset={{ type: 'image', ...result.image }}
                                onSaveToGrid={() => onAddAssetToGrid({ type: 'image', ...result.image })}
                                onSaveToStoryboard={() => onAddToStoryboard(result.image.base64)}
                                onSaveToInspiration={() => onAddToInspiration(result.image.base64)}
                            />
                        </div>
                    )}
                </div>
            );
        }

        // Fallback for prepareMythosImageGeneration or other tools
        return (
             <div className="space-y-2">
                <div className="flex flex-col gap-1 text-sm pt-1">
                    <span className="text-neutral-500 text-[10px] uppercase font-bold">Prompt</span>
                    <span className="text-neutral-300 italic leading-relaxed bg-black/20 p-2 rounded border border-white/5">{args.prompt || JSON.stringify(args)}</span>
                </div>
                 {isPending && (
                    <div className="mt-2 flex items-center gap-2 text-neutral-400 text-xs">
                        <LoadingSpinner className="w-3 h-3" />
                        <span>Executing...</span>
                    </div>
                )}
                {hasTextResult && (
                    <p className="text-xs text-neutral-400 mt-2 bg-black/20 p-2 rounded border border-white/5">{result.text}</p>
                )}
            </div>
        );
    };
    
    const getActionTitle = () => {
        switch (name) {
            case 'generateMythosImage': return status === 'complete' && hasImageResult ? 'Generated an Image' : 'Generating Image';
            case 'prepareMythosImageGeneration': return 'Prepared a Scene';
            default: return status === 'pending' ? `Executing: ${name}` : `Executed: ${name}`;
        }
    };

    return (
        <div className="flex justify-start mb-4 w-full">
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 max-w-xl w-full shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50"></div>
                <div className="flex items-center gap-2 mb-3 text-blue-400">
                    <AgentActionIcon />
                    <span className="font-bold text-xs uppercase tracking-wider">{agentName} {getActionTitle()}</span>
                </div>
                {renderContent()}
                 {name === 'prepareMythosImageGeneration' && (
                     <p className="text-[10px] text-neutral-600 mt-3 text-right">Go to MythOS Cinematic Studio to generate this.</p>
                 )}
            </div>
        </div>
    );
};


export const AgentChatStudio: React.FC<AgentChatStudioProps> = ({ agents, onUploadLore, onCallTool, onAddToStoryboard, onAddToInspiration, onAddAssetToGrid }) => {
    const [selectedAgentId, setSelectedAgentId] = useState<string>('');
    const [message, setMessage] = useState('');
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [chatSession, setChatSession] = useState<GeminiChat | null>(null);
    const [isResponding, setIsResponding] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const userHasScrolledUp = useRef(false);

    const selectedAgent = agents.find(c => c.id === selectedAgentId);

    useEffect(() => {
        if (agents.length > 0 && !selectedAgentId) {
            setSelectedAgentId(agents[0].id);
        }
    }, [agents, selectedAgentId]);

    useEffect(() => {
        if (selectedAgent) {
            const newChat = createChat(selectedAgent.systemPrompt, [], mythosTools);
            setChatSession(newChat);
            setHistory(selectedAgent.chatHistory || []);
        }
    }, [selectedAgent]);


    useEffect(() => {
        const node = chatContainerRef.current;
        if (!node) return;

        const lastMessage = history[history.length - 1];
        const isUserMessage = lastMessage?.role === 'user';
        const isToolCode = lastMessage?.role === 'tool_code';

        if (isUserMessage || isToolCode || !userHasScrolledUp.current) {
            node.scrollTo({
                top: node.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [history]);

    const handleLoreUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedAgentId) return;
        const file = event.target.files?.[0];
        if (file && file.type === 'text/plain') {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                onUploadLore(selectedAgentId, text);
            };
            reader.readAsText(file);
        }
        event.target.value = ''; // Reset
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (message.trim() && selectedAgentId && !isResponding && chatSession) {
            const currentMessage = message.trim();
            setMessage('');
            setIsResponding(true);
            setError(null);

            setHistory(prev => [...prev, { role: 'user', text: currentMessage }]);

            try {
                let response: GenerateContentResponse = await chatSession.sendMessage({ message: currentMessage });
                
                while(response.functionCalls && response.functionCalls.length > 0) {
                    const toolResponseParts: Part[] = [];

                    for(const funcCall of response.functionCalls) {
                        setHistory(prev => [...prev, { role: 'tool_code', toolCode: { id: funcCall.id, functionCall: funcCall, status: 'pending' } }]);
                        
                        const { textResult, resultData } = await onCallTool(funcCall.name, funcCall.args);
                        
                        setHistory(prev => prev.map(msg => 
                            (msg.role === 'tool_code' && msg.toolCode.id === funcCall.id)
                                ? { ...msg, toolCode: { ...msg.toolCode, status: 'complete', result: resultData } }
                                : msg
                        ));
                        
                        const isError = !!resultData?.error;

                        toolResponseParts.push({
                            functionResponse: {
                                name: funcCall.name,
                                response: { 
                                    status: isError ? "ERROR" : "OK",
                                    summary: textResult 
                                }
                            }
                        });
                    }

                    // Send tool responses back to the model
                    response = await chatSession.sendMessage(toolResponseParts);
                }
                
                // Add the final text response from the model
                if (response.text) {
                     setHistory(prev => [...prev, { role: 'model', text: response.text }]);
                }

            } catch (e) {
                console.error("Chat Error:", e);
                setError(e instanceof Error ? e.message : "An unknown error occurred.");
            } finally {
                setIsResponding(false);
            }
        }
    };

    const handleScroll = () => {
        const node = chatContainerRef.current;
        if (node) {
            const atBottom = node.scrollHeight - node.scrollTop <= node.clientHeight + 10;
            userHasScrolledUp.current = !atBottom;
        }
    };
    
    return (
        <div className="p-6 max-w-7xl mx-auto w-full h-full flex flex-col">
            <div className="mb-6 flex-shrink-0">
                <h2 className="text-3xl font-bold text-neutral-200 mb-2">Agent Chat</h2>
                <p className="text-neutral-400">Collaborate with your AI Agents to brainstorm and build scenes.</p>
            </div>

            {agents.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-[50vh] border-2 border-dashed border-neutral-800 rounded-xl bg-neutral-900/30 text-center p-8">
                    <div className="w-16 h-16 text-neutral-700 mb-4"><WritersRoomIcon /></div>
                    <h3 className="text-xl font-semibold text-neutral-300 mb-2">No Agents Found</h3>
                    <p className="text-neutral-500">Please create agents in the "AI Agents" studio first to use Agent Chat.</p>
                </div>
            ) : (
                <div className="flex flex-col flex-grow border border-neutral-700 rounded-xl overflow-hidden shadow-2xl bg-neutral-900 ring-1 ring-white/5">
                    {/* Header / Controls */}
                    <div className="flex-shrink-0 flex justify-between items-center p-4 border-b border-neutral-800 bg-neutral-800/50 backdrop-blur-sm">
                         <div className="flex gap-4 items-center">
                             <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-600 border border-neutral-500 flex items-center justify-center text-white font-bold text-sm shadow-inner">
                                    {selectedAgent?.name.substring(0, 2).toUpperCase() || 'AI'}
                                </div>
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-neutral-800 rounded-full shadow-sm"></div>
                             </div>
                             <div>
                                 <label className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold block mb-0.5">Conversing with</label>
                                 <div className="relative group">
                                     <select
                                        value={selectedAgentId}
                                        onChange={(e) => setSelectedAgentId(e.target.value)}
                                        className="bg-transparent border-none p-0 text-base font-bold text-neutral-200 focus:ring-0 cursor-pointer hover:text-blue-400 transition-colors pr-6 appearance-none"
                                     >
                                        {agents.map(agent => (
                                            <option key={agent.id} value={agent.id}>{agent.name}</option>
                                        ))}
                                     </select>
                                     <span className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500 group-hover:text-blue-400">
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                     </span>
                                 </div>
                             </div>
                         </div>
                         <div className="flex items-center gap-2">
                             <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".txt"
                                onChange={handleLoreUpload}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={!selectedAgentId}
                                className="flex items-center gap-2 text-xs font-bold px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-lg transition border border-neutral-700 shadow-sm"
                                title="Upload a text file to give this agent memory"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                                {selectedAgent?.lore ? 'Update Knowledge' : 'Upload Knowledge'}
                            </button>
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div id="chat-window" ref={chatContainerRef} onScroll={handleScroll} className="flex-grow overflow-y-auto p-6 bg-neutral-900/50 space-y-6">
                        {!history || history.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center text-neutral-600 opacity-60">
                                <WritersRoomIcon />
                                <p className="mt-4 text-sm font-medium">Start the conversation with {selectedAgent?.name || 'agent'}.</p>
                                <p className="text-xs mt-1 text-neutral-700">Try asking to "prepare a cinematic shot of a rainy alleyway at night".</p>
                            </div>
                        ) : (
                            history.map((msg, index) => {
                                if (msg.role === 'tool_code') {
                                    return <AgentActionBubble 
                                        key={index} 
                                        agentName={selectedAgent?.name || 'Agent'} 
                                        toolCode={msg.toolCode} 
                                        onAddToStoryboard={onAddToStoryboard}
                                        onAddToInspiration={onAddToInspiration}
                                        onAddAssetToGrid={onAddAssetToGrid}
                                    />;
                                }
                                if (msg.role === 'user' || msg.role === 'model') {
                                    return <ChatMessageBubble key={index} message={msg} agentName={selectedAgent?.name || 'Agent'} />;
                                }
                                return null;
                            })
                        )}
                         {isResponding && (
                            <div className="flex justify-start mb-4">
                                <div className="bg-neutral-800 border border-neutral-700 rounded-2xl rounded-bl-sm px-5 py-3 shadow-sm">
                                    <div className="flex items-center gap-3 text-neutral-400 text-sm">
                                       <LoadingSpinner /> 
                                       <span className="animate-pulse font-medium">Thinking...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        {error && (
                            <div className="flex justify-center my-4">
                                <div className="bg-red-900/20 border border-red-500/50 text-red-300 px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                    {error}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-neutral-800/80 border-t border-neutral-700 relative z-10 backdrop-blur-sm">
                        <form onSubmit={handleSendMessage} className="relative group">
                             <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage(e);
                                    }
                                }}
                                placeholder={`Message ${selectedAgent?.name || '...'}`}
                                disabled={isResponding || !selectedAgent}
                                className="w-full bg-neutral-900 border border-neutral-600 text-neutral-200 placeholder-neutral-500 rounded-2xl px-5 py-4 pr-14 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none resize-none transition-all shadow-inner min-h-[60px] text-sm leading-relaxed"
                                rows={1}
                                style={{ maxHeight: '150px' }}
                            />
                            <button
                                type="submit"
                                disabled={isResponding || !message.trim() || !selectedAgent}
                                className="absolute right-2.5 bottom-2.5 p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-blue-500/20 transform hover:scale-105 active:scale-95"
                                title="Send Message"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                  <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                                </svg>
                            </button>
                        </form>
                        <p className="text-[10px] text-neutral-600 mt-2 text-center select-none">
                            Press <kbd className="font-sans font-bold text-neutral-500">Enter</kbd> to send, <kbd className="font-sans font-bold text-neutral-500">Shift+Enter</kbd> for new line.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
