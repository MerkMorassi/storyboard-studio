
import React, { useState } from 'react';
import { Agent, ActiveView } from '../types.ts';
import { AgentChatView } from './AgentChatView.tsx';
import { StudioHeader } from './StudioHeader.tsx';
import { getApiKey } from '../services/apiKeyService.ts';
import { ScriptIcon, ChatIcon } from './icons.tsx';
import { ScriptViewer } from './ScriptViewer.tsx';

interface ScriptingStudioProps {
    agent: Agent;
    onNavigate: (view: ActiveView) => void;
    onCallAgent: (agent: Agent) => void;
    scriptText: string;
    onScriptUpload: (file: File) => void;
}

export const ScriptingStudio: React.FC<ScriptingStudioProps> = ({ agent, onNavigate, onCallAgent, scriptText, onScriptUpload }) => {
    const hasApiKey = !!getApiKey();
    const [activeTab, setActiveTab] = useState<'chat' | 'viewer'>('chat');

    return (
        <div className="flex flex-col h-full w-full bg-primary">
            <StudioHeader 
                breadcrumbs={[
                    { label: 'Production Team', onClick: () => onNavigate('team') }, 
                    { label: "Writers' Room (Scribe)" }
                ]}
                agent={agent}
                onCallAgent={() => onCallAgent(agent)}
            />

            {/* Sub-Navigation Tabs */}
            <div className="flex items-center px-6 pt-2 bg-neutral-900 border-b border-neutral-800 gap-1 z-10">
                <button
                    onClick={() => setActiveTab('chat')}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
                        activeTab === 'chat' 
                            ? 'border-emerald-500 text-white' 
                            : 'border-transparent text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50 rounded-t-lg'
                    }`}
                >
                    <ChatIcon className="w-4 h-4" /> Scribe Chat
                </button>
                <button
                    onClick={() => setActiveTab('viewer')}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
                        activeTab === 'viewer' 
                            ? 'border-emerald-500 text-white' 
                            : 'border-transparent text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50 rounded-t-lg'
                    }`}
                >
                    <ScriptIcon className="w-4 h-4" /> Script Viewer
                </button>
            </div>

            <main className="flex-grow overflow-hidden flex flex-col relative">
                {activeTab === 'chat' ? (
                    <>
                        <div className="p-6 pb-0 max-w-6xl mx-auto w-full">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-900 to-teal-900 border border-emerald-500/30 flex items-center justify-center overflow-hidden shadow-lg shadow-emerald-900/20">
                                    <ScriptIcon className="w-8 h-8 text-emerald-400" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-black text-white tracking-tight">Script Department</h1>
                                    <p className="text-emerald-300 font-medium">Narrative Structure & Screenwriting</p>
                                </div>
                            </div>
                            
                            <div className="bg-emerald-900/20 border border-emerald-500/20 p-4 rounded-xl mb-6">
                                <p className="text-sm text-emerald-200">
                                    <strong>Scribe Status:</strong> Typewriter loaded. Paste your rough notes for formatting, or ask me to outline Act 1.
                                </p>
                            </div>

                            <div className="h-px bg-neutral-800 w-full mb-2"></div>
                        </div>

                        <div className="flex-grow overflow-hidden">
                            <AgentChatView agent={agent} hasApiKey={hasApiKey} />
                        </div>
                    </>
                ) : (
                    <div className="flex-grow overflow-hidden h-full">
                        <ScriptViewer scriptText={scriptText} onUpload={onScriptUpload} />
                    </div>
                )}
            </main>
        </div>
    );
};
