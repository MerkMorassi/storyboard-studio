

import React, { useState, useRef, useEffect } from 'react';
import { Agent, ChatMessage, FunctionCall } from '../types';
import { LoadingSpinner, WritersRoomIcon, AgentActionIcon } from './icons';

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
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xl p-3 my-1 ${isUser ? 'bg-neutral-700' : 'bg-neutral-800'}`}>
                <p className="text-sm font-bold mb-1">{isUser ? 'You' : agentName}</p>
                <p className="text-base whitespace-pre-wrap">{message.text}</p>
            </div>
        </div>
    );
};

const AgentActionBubble: React.FC<{ agentName: string; functionCall: FunctionCall; }> = ({ agentName, functionCall }) => {
    const { args } = functionCall;
    const sceneHeading = `${args.sceneType || 'INT'}. ${args.location || 'LOCATION'} - ${args.timeOfDay || 'DAY'}`;

    return (
        <div className="flex justify-center my-2">
            <div className="text-xs text-neutral-400 bg-neutral-800/70 border border-neutral-700 p-3 w-full max-w-xl">
                <div className="flex items-center gap-2 mb-2">
                    <AgentActionIcon />
                    <span className="font-bold">{agentName} prepared an image generation prompt.</span>
                </div>
                <div className="space-y-1 font-mono bg-neutral-900/50 p-2 border border-neutral-700 text-neutral-300 text-left">
                    <p><b>Scene:</b> {sceneHeading}</p>
                    {args.cameraAngle && <p><b>Angle:</b> {args.cameraAngle}</p>}
                    <p><b>Prompt:</b> {args.prompt}</p>
                    {args.negativePrompt && <p><b>Negative:</b> {args.negativePrompt}</p>}
                </div>
                <p className="text-center mt-2 text-neutral-500">View and adjust these settings on the <b>Grid</b> tab.</p>
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

        // Always scroll to bottom if the user just sent a message or a tool was called.
        // Otherwise, only scroll if they haven't manually scrolled up.
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
            // A buffer of 10px helps with subpixel rendering inconsistencies
            const atBottom = node.scrollHeight - node.scrollTop <= node.clientHeight + 10;
            userHasScrolledUp.current = !atBottom;
        }
    };
    
    return (
        <div className="bg-neutral-900/50 p-6 border border-neutral-800">
            <h2 className="text-2xl font-bold text-neutral-300 mb-2">Agent Chat</h2>
            <p className="text-sm text-neutral-400 mb-6">Collaborate with your AI Agents. Upload their conversational history as lore to chat with them in character.</p>
            
            {agents.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-full min-h-[50vh] bg-neutral-900/50 border-2 border-dashed border-neutral-800 p-8 text-center">
                    <div className="w-16 h-16 text-neutral-700"><WritersRoomIcon /></div>
                    <h3 className="mt-4 text-xl font-semibold text-neutral-400">No Agents Found</h3>
                    <p className="mt-1 text-neutral-500">Please create agents in the "AI Agents" studio first to use Agent Chat.</p>
                </div>
            ) : (
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Left Panel: Agent Selection & Lore */}
                    <div className="w-full md:w-1/3 space-y-4">
                        <div className="bg-neutral-800/50 p-4">
                             <h3 className="text-lg font-semibold text-neutral-300 mb-3">Select Agent</h3>
                             <select
                                value={selectedAgentId}
                                onChange={(e) => setSelectedAgentId(e.target.value)}
                                className="w-full bg-neutral-700 border border-neutral-600 p-2 focus:ring-2 focus:ring-neutral-500 outline-none"
                             >
                                {agents.map(agent => (
                                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                                ))}
                             </select>
                        </div>
                        <div className="bg-neutral-800/50 p-4">
                            <h3 className="text-lg font-semibold text-neutral-300 mb-3">Agent Lore</h3>
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
                                className="w-full bg-neutral-700 text-white font-semibold py-2 px-4 hover:bg-neutral-600 transition duration-300 disabled:opacity-50"
                            >
                                {selectedAgent?.lore ? 'Replace Lore (.txt)' : 'Upload Lore (.txt)'}
                            </button>
                            {selectedAgent?.lore ? (
                                <p className="text-xs text-green-400 mt-2">Lore uploaded for {selectedAgent.name}.</p>
                            ) : (
                                <p className="text-xs text-neutral-500 mt-2">Upload a .txt file of conversational history to give this agent a personality and memory.</p>
                            )}
                        </div>
                    </div>

                    {/* Right Panel: Chat Interface */}
                    <div className="w-full md:w-2/3 flex flex-col bg-neutral-800/50 h-[70vh]">
                        <div ref={chatContainerRef} onScroll={handleScroll} className="flex-grow p-4 overflow-y-auto">
                            {!selectedAgent?.chatHistory || selectedAgent.chatHistory.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-center text-neutral-500">
                                    <p>Start the conversation with {selectedAgent?.name || 'your agent'}.</p>
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
                                <div className="flex justify-start">
                                    <div className="max-w-xl p-3 my-1 bg-neutral-800">
                                        <p className="text-sm font-bold mb-1">{selectedAgent?.name}</p>
                                        <div className="flex items-center gap-2">
                                           <LoadingSpinner /> <span className="text-sm animate-pulse">thinking...</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        {error && <div className="p-2 text-center text-sm text-red-400 bg-red-900/30">{error}</div>}
                        <form onSubmit={handleSendMessage} className="flex-shrink-0 p-4 border-t border-neutral-700 flex gap-2">
                             <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage(e);
                                    }
                                }}
                                placeholder={`Send a message to ${selectedAgent?.name || '...'}`}
                                disabled={isResponding || !selectedAgent}
                                className="w-full bg-neutral-700 border border-neutral-600 p-2 focus:ring-2 focus:ring-neutral-500 outline-none resize-none"
                                rows={2}
                            />
                            <button
                                type="submit"
                                disabled={isResponding || !message.trim() || !selectedAgent}
                                className="bg-neutral-600 text-white font-semibold py-2 px-4 hover:bg-neutral-500 transition duration-300 disabled:opacity-50"
                            >
                                Send
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
