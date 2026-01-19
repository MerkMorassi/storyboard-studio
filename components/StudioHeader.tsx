
import React from 'react';
import { HomeIcon, PhoneIcon, ChatIcon, ChevronRightIcon, CloseIcon } from './icons.tsx';
import { Agent } from '../types.ts';
import { AgentChatView } from './AgentChatView.tsx';

interface StudioHeaderProps {
    breadcrumbs: { label: string; onClick?: () => void }[];
    agent: Agent;
    onOpenChat: (mode: 'chat' | 'call') => void;
}

export const StudioHeader: React.FC<StudioHeaderProps> = ({ breadcrumbs, agent, onOpenChat }) => {
    return (
        <div className="flex-shrink-0 bg-neutral-900 border-b border-neutral-800 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-30">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm text-neutral-400 font-medium">
                <div className="p-2 bg-neutral-800 rounded-lg text-neutral-500">
                    <HomeIcon className="w-4 h-4" />
                </div>
                {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={index}>
                        <ChevronRightIcon className="w-4 h-4 text-neutral-600" />
                        {crumb.onClick ? (
                            <button 
                                onClick={crumb.onClick}
                                className="hover:text-white transition-colors hover:underline decoration-neutral-600 underline-offset-4"
                            >
                                {crumb.label}
                            </button>
                        ) : (
                            <span className="text-white font-bold">{crumb.label}</span>
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Agent Controls */}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-neutral-800/50 border border-neutral-700 rounded-full pl-1 pr-4 py-1">
                    <img 
                        src={agent.avatar || `https://ui-avatars.com/api/?name=${agent.name}&background=random`} 
                        alt={agent.name} 
                        className="w-8 h-8 rounded-full border border-neutral-600 object-cover" 
                    />
                    <div className="text-left">
                        <p className="text-[10px] text-neutral-500 font-bold uppercase leading-none">{agent.narrativeRole || 'Agent'}</p>
                        <p className="text-xs font-bold text-white leading-none">{agent.name}</p>
                    </div>
                </div>

                <button 
                    onClick={() => onOpenChat('chat')}
                    className="p-2.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors border border-neutral-700 group relative"
                    title="Chat with Agent"
                >
                    <ChatIcon className="w-5 h-5" />
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-neutral-900"></span>
                </button>

                <button 
                    onClick={() => onOpenChat('call')}
                    className="p-2.5 rounded-full bg-green-600 hover:bg-green-500 text-white transition-colors shadow-lg hover:shadow-green-500/20 active:scale-95"
                    title="Call Agent (Voice Mode)"
                >
                    <PhoneIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};