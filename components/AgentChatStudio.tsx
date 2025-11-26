import React, { useState, useRef, useEffect } from 'react';
import { Agent, ChatMessage, FunctionCall } from '../types.ts';
import { LoadingSpinner, WritersRoomIcon, AgentActionIcon } from './icons.tsx';

interface AgentChatStudioProps {
    agents: Agent[];
    onUploadLore: (agentId: string, loreText: string) => void;
    onSendMessage: (agentId: string, message: string) => void;
    isResponding: boolean;
    error: string | null;
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

const AgentActionBubble: React.FC<{ agentName: string; functionCall: FunctionCall; }> = ({ agentName, functionCall }) => {
    const { args } = functionCall;
    const sceneHeading = `${args.sceneType || 'INT'}. ${args.location || 'LOCATION'} - ${args.timeOfDay || 'DAY'}`;

    return (
        <div className="flex justify-start mb-4 w-full">
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 max-w-xl w-full shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50"></div>
                <div className="flex items-center gap-2 mb-3 text-blue-400">
                    <AgentActionIcon />
                    <span className="font-bold text-xs uppercase tracking-wider">{agentName} prepared a scene</span>
                </div>
                <div className="space-y-2">
                    <div className="flex items-baseline gap-2 text-sm border-b border-neutral-700/50 pb-2">
                        <span className="text-neutral-500 text-[10px] uppercase font-bold w-16">Scene</span>
                        <span className="text-neutral-200 font-mono font-bold">{sceneHeading}</span>
                    </div>
                    {args.cameraAngle && (
                        <div className="flex items-baseline gap-2 text-sm border-b border-neutral-700/50 pb-2">
                            <span className="text-neutral-500 text-[10px] uppercase font-bold w-16">Angle</span>
                            <span className="text-neutral-300">{args.cameraAngle}</span>
                        </div>
                    )}
                    <div className="flex flex-col gap-1 text-sm pt-1">
                        <span className="text-neutral-500 text-[10px] uppercase font-bold">Prompt</span>
                        <span className="text-neutral-300 italic leading-relaxed bg-black/20 p-2 rounded border border-white/5">{args.prompt}</span>
                    </div>
                </div>
                <p className="text-[10px] text-neutral-600 mt-3 text-right">Go to Grid View to generate this.</p>
            </div>
        </div>
    );
};


export const AgentChatStudio: React.FC<AgentChatStudioProps> = ({ agents, onUploadLore, onSendMessage, isResponding, error }) => {
    const [selectedAgentId, setSelectedAgentId] = useState<string>('');
    const [message, setMessage] = useState('');
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
        const node = chatContainerRef.current;
        if (!node) return;

        const lastMessage = selectedAgent?.chatHistory?.[selectedAgent.chatHistory.length - 1];
        const isUserMessage = lastMessage?.role === 'user';
        const isToolCode = lastMessage?.role === 'tool_code';

        if (isUserMessage || isToolCode || !userHasScrolledUp.current) {
            node.scrollTo({
                top: node.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [selectedAgent?.chatHistory]);

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

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (message.trim() && selectedAgentId && !isResponding) {
            onSendMessage(selectedAgentId, message.trim());
            setMessage('');
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
                        {!selectedAgent?.chatHistory || selectedAgent.chatHistory.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center text-neutral-600 opacity-60">
                                <WritersRoomIcon />
                                <p className="mt-4 text-sm font-medium">Start the conversation with {selectedAgent?.name || 'agent'}.</p>
                                <p className="text-xs mt-1 text-neutral-700">Try asking to "prepare a prompt for a sci-fi scene".</p>
                            </div>
                        ) : (
                            selectedAgent.chatHistory.map((msg, index) => {
                                if (msg.role === 'tool_code') {
                                    return <AgentActionBubble key={index} agentName={selectedAgent.name} functionCall={msg.toolCode.functionCall} />;
                                }
                                if (msg.role === 'user' || msg.role === 'model') {
                                    return <ChatMessageBubble key={index} message={msg} agentName={selectedAgent.name} />;
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
