

import React from 'react';
import { ActiveView } from '../types.ts';
import { StoryboardIcon, CharacterIcon, LoreIcon, PinIcon, ShuffleIcon, GridIcon, LibraryIcon } from './icons.tsx';

interface DashboardStudioProps {
    stats: {
        storyboardFrames: number;
        agents: number;
        loreEntries: number;
        inspirationImages: number;
        dynamicPromptLists: number;
        promptTemplates: number;
        imagesGenerated: number;
    };
    onNavigate: (view: ActiveView) => void;
}

const colorClasses = {
    purple: { border: 'hover:border-purple-500/50', text: 'text-purple-400 group-hover:text-purple-300' },
    sky: { border: 'hover:border-sky-500/50', text: 'text-sky-400 group-hover:text-sky-300' },
    amber: { border: 'hover:border-amber-500/50', text: 'text-amber-400 group-hover:text-amber-300' },
    pink: { border: 'hover:border-pink-500/50', text: 'text-pink-400 group-hover:text-pink-300' },
    green: { border: 'hover:border-green-500/50', text: 'text-green-400 group-hover:text-green-300' },
    teal: { border: 'hover:border-teal-500/50', text: 'text-teal-400 group-hover:text-teal-300' },
    red: { border: 'hover:border-red-500/50', text: 'text-red-400 group-hover:text-red-300' },
};

const StatCard: React.FC<{
    title: string;
    value: number;
    icon: React.ReactNode;
    onClick: () => void;
    color: keyof typeof colorClasses;
}> = ({ title, value, icon, onClick, color }) => (
    <div
        onClick={onClick}
        className={`bg-neutral-800/50 p-4 border border-neutral-700 hover:bg-neutral-700/50 ${colorClasses[color].border} transition-all duration-300 cursor-pointer group rounded-lg`}
    >
        <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">{title}</h3>
            <div className={`${colorClasses[color].text} transition-colors`}>{icon}</div>
        </div>
        <p className="text-4xl font-bold text-neutral-100 mt-2">{value}</p>
    </div>
);


export const DashboardStudio: React.FC<DashboardStudioProps> = ({ stats, onNavigate }) => {
    return (
        <div className="p-6 max-w-7xl mx-auto w-full animate-fade-in">
             <style>{`.animate-fade-in { animation: fadeIn 0.5s ease-out; } @keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }`}</style>
            
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-neutral-200 mb-2">Production Dashboard</h2>
                <p className="text-neutral-400">Overview of your project's current assets and progress.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard
                    title="Storyboard Frames"
                    value={stats.storyboardFrames}
                    icon={<StoryboardIcon />}
                    onClick={() => onNavigate('story')}
                    color="purple"
                />
                 <StatCard
                    title="AI Agents"
                    value={stats.agents}
                    icon={<CharacterIcon />}
                    onClick={() => onNavigate('agents')}
                    color="sky"
                />
                 <StatCard
                    title="Lore Entries"
                    value={stats.loreEntries}
                    icon={<LoreIcon />}
                    onClick={() => onNavigate('lore')}
                    color="amber"
                />
                 <StatCard
                    title="Inspiration Images"
                    value={stats.inspirationImages}
                    icon={<PinIcon />}
                    onClick={() => onNavigate('inspiration')}
                    color="pink"
                />
                 <StatCard
                    title="Prompt Library"
                    value={stats.promptTemplates}
                    icon={<LibraryIcon />}
                    onClick={() => onNavigate('prompt-library')}
                    color="teal"
                />
                 <StatCard
                    title="Dynamic Prompt Lists"
                    value={stats.dynamicPromptLists}
                    icon={<ShuffleIcon />}
                    onClick={() => onNavigate('dynamic-prompts')}
                    color="green"
                />
                 <StatCard
                    title="Total Generated Images"
                    value={stats.imagesGenerated}
                    icon={<GridIcon />}
                    onClick={() => onNavigate('grid')}
                    color="red"
                />
            </div>

            <div className="mt-8 bg-neutral-800/50 p-6 border border-neutral-700 rounded-lg">
                <h3 className="text-xl font-bold text-neutral-200 mb-4">Quick Start</h3>
                <p className="text-neutral-400 mb-4">Jump right back into creating the next scene for your project.</p>
                <button
                    onClick={() => onNavigate('grid')}
                    className="w-full bg-neutral-700 text-white font-bold py-3 px-4 hover:bg-neutral-600 transition duration-300 flex items-center justify-center rounded"
                >
                    Go to Image Generation Grid
                </button>
            </div>
        </div>
    );
};
