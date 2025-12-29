
import React, { useState } from 'react';
import { ActiveView, Project, ImageState } from '../types.ts';
import { StoryboardIcon, CharacterIcon, LoreIcon, PinIcon, ShuffleIcon, GridIcon, LibraryIcon, DashboardIcon, EditIcon, CheckIcon, ScriptIcon, ImageIcon } from './icons.tsx';

interface DashboardStudioProps {
    project: Project;
    onUpdateProject: (updates: Partial<Project>) => void;
    images: ImageState[];
    stats: {
        storyboardFrames: number;
        agents: number;
        loreEntries: number;
        inspirationImages: number;
        dynamicPromptLists: number;
        promptTemplates: number;
        imagesGenerated: number;
        totalProjects: number;
        scriptsCount: number;
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
    blue: { border: 'hover:border-blue-500/50', text: 'text-blue-400 group-hover:text-blue-300' },
    emerald: { border: 'hover:border-emerald-500/50', text: 'text-emerald-400 group-hover:text-emerald-300' },
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
        className={`bg-neutral-800/40 p-5 border border-neutral-800 hover:bg-neutral-800/80 ${colorClasses[color].border} transition-all duration-300 cursor-pointer group rounded-xl shadow-inner`}
    >
        <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em]">{title}</h3>
            <div className={`${colorClasses[color].text} transition-all transform group-hover:scale-110 duration-500 opacity-70 group-hover:opacity-100`}>{icon}</div>
        </div>
        <p className="text-4xl font-black text-white">{value}</p>
    </div>
);

export const DashboardStudio: React.FC<DashboardStudioProps> = ({ project, onUpdateProject, images, stats, onNavigate }) => {
    const [isEditingBrief, setIsEditingBrief] = useState(false);
    const [brief, setBrief] = useState(project.brief || '');
    const [progress, setProgress] = useState(project.progress || 0);

    const handleSaveBrief = () => {
        onUpdateProject({ brief });
        setIsEditingBrief(false);
    };

    const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);
        setProgress(val);
        onUpdateProject({ progress: val });
    };

    const galleryImages = images.slice(0, 8);

    return (
        <div className="p-8 max-w-7xl mx-auto w-full animate-fade-in h-full overflow-y-auto space-y-10 custom-scrollbar">
             <style>{`.animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1); } @keyframes fadeIn { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }`}</style>
            
            {/* Project Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <span className="text-[10px] font-black text-brand uppercase tracking-[0.4em] mb-2 block">Project Matrix</span>
                    <h1 className="text-5xl font-black text-white tracking-tighter uppercase leading-none">{project.name}</h1>
                    <p className="text-neutral-500 text-lg mt-2 font-medium">{project.tagline || 'A new creative endeavor in development.'}</p>
                </div>
                <div className="bg-neutral-800/50 px-5 py-2.5 rounded-full border border-neutral-700 flex items-center gap-3 shadow-xl backdrop-blur-md">
                    <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Status</span>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]"></span>
                        <span className="text-xs font-black text-white uppercase tracking-tighter">Live Production</span>
                    </div>
                </div>
            </div>

            {/* Progress Section */}
            <div className="bg-neutral-900/50 border border-neutral-800 p-8 rounded-2xl space-y-6 relative overflow-hidden group shadow-2xl">
                <div className="absolute top-0 left-0 w-1 h-full bg-brand/50"></div>
                <div className="flex justify-between items-end">
                    <div>
                        <h3 className="text-[11px] font-black text-neutral-500 uppercase tracking-[0.3em]">Production Lifecycle</h3>
                        <p className="text-xs text-neutral-400 mt-1">Completion tracking for current production milestones.</p>
                    </div>
                    <span className="text-4xl font-black text-brand italic tracking-tighter">{progress}%</span>
                </div>
                <div className="relative w-full h-3 bg-neutral-950 rounded-full overflow-hidden border border-white/5">
                    <div 
                        className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(59,130,246,0.3)]" 
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
                <input 
                    type="range" 
                    min="0" max="100" 
                    value={progress} 
                    onChange={handleProgressChange} 
                    className="w-full h-1 bg-transparent appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-brand [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-neutral-900 hover:[&::-webkit-slider-thumb]:scale-125 transition-all opacity-0 hover:opacity-100 absolute bottom-0 left-0"
                    title="Adjust Progress"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Project Brief Column */}
                <div className="lg:col-span-2 bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 flex flex-col min-h-[450px] shadow-2xl">
                    <div className="flex justify-between items-center mb-6 border-b border-neutral-800 pb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg text-brand">
                                <LibraryIcon className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">Mission Brief</h2>
                        </div>
                        <button 
                            onClick={() => isEditingBrief ? handleSaveBrief() : setIsEditingBrief(true)}
                            className={`px-5 py-2 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${isEditingBrief ? 'bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-900/20' : 'bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-700'}`}
                        >
                            {isEditingBrief ? <><CheckIcon className="w-3 h-3"/> Commit Changes</> : <><EditIcon className="w-3 h-3"/> Update Brief</>}
                        </button>
                    </div>
                    
                    <div className="flex-grow">
                        {isEditingBrief ? (
                            <textarea
                                value={brief}
                                onChange={(e) => setBrief(e.target.value)}
                                className="w-full h-full min-h-[300px] bg-black/40 border border-neutral-800 rounded-xl p-6 text-neutral-200 focus:ring-1 focus:ring-brand outline-none resize-none font-mono text-sm leading-relaxed"
                                placeholder="Define the creative vision, high-level plot points, and technical objectives..."
                            />
                        ) : (
                            <div className="prose prose-invert prose-sm max-w-none text-neutral-400 whitespace-pre-wrap leading-loose font-medium">
                                {brief || <div className="h-full flex items-center justify-center border-2 border-dashed border-neutral-800 rounded-xl py-20 text-neutral-600 italic">Vision documents required. Click 'Update Brief' to initialize.</div>}
                            </div>
                        )}
                    </div>
                </div>

                {/* Stats Grid Column */}
                <div className="lg:col-span-1 space-y-6">
                    <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.4em] mb-2 px-2">Asset Inventory</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <StatCard title="Storyboard" value={stats.storyboardFrames} icon={<StoryboardIcon />} onClick={() => onNavigate('story')} color="purple" />
                        <StatCard title="Drafts" value={stats.scriptsCount} icon={<ScriptIcon />} onClick={() => onNavigate('scripts-bin')} color="emerald" />
                        <StatCard title="Talent" value={stats.agents} icon={<CharacterIcon />} onClick={() => onNavigate('agents')} color="sky" />
                        <StatCard title="Inspo" value={stats.inspirationImages} icon={<PinIcon />} onClick={() => onNavigate('inspiration')} color="pink" />
                    </div>
                    
                    <div className="mt-8 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-brand/5 blur-[80px] rounded-full"></div>
                        <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.3em] mb-4">Command Center</h3>
                        <div className="space-y-3">
                            <button onClick={() => onNavigate('team')} className="w-full text-left px-5 py-4 bg-neutral-800/40 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-xs font-black uppercase tracking-widest text-neutral-300 transition-all flex items-center justify-between group">
                                <span>Consult Studio Crew</span>
                                <span className="text-neutral-600 group-hover:text-brand transition-colors">→</span>
                            </button>
                            <button onClick={() => onNavigate('script-writer')} className="w-full text-left px-5 py-4 bg-neutral-800/40 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-xs font-black uppercase tracking-widest text-neutral-300 transition-all flex items-center justify-between group">
                                <span>Initialize New Script</span>
                                <span className="text-neutral-600 group-hover:text-brand transition-colors">→</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Asset Gallery Strip */}
            <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-8 shadow-2xl relative">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-6 bg-red-600 rounded-full"></div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">Recent Visual Data</h3>
                    </div>
                    <button onClick={() => onNavigate('grid')} className="text-[10px] font-black text-brand hover:text-brand-hover transition-colors uppercase tracking-[0.2em] border-b border-brand/20 pb-0.5">Access Vault →</button>
                </div>
                
                {galleryImages.length > 0 ? (
                    <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent snap-x">
                        {galleryImages.map((img) => (
                            <div key={img.id} className="flex-shrink-0 w-72 aspect-video bg-black rounded-xl overflow-hidden border border-neutral-800 shadow-xl group relative snap-start">
                                {img.type === 'video' ? (
                                    <video src={img.url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-700 scale-110 group-hover:scale-100" muted />
                                ) : (
                                    <img src={`data:${img.mimeType};base64,${img.base64}`} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-700 scale-110 group-hover:scale-100" alt="Asset" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-end p-4">
                                    <div className="w-full">
                                        <span className="text-[9px] font-black text-brand uppercase tracking-widest block mb-1">Asset ID</span>
                                        <span className="text-[10px] font-mono text-neutral-400 truncate block w-full">{img.id}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-40 flex flex-col items-center justify-center bg-black/20 rounded-xl border border-dashed border-neutral-800 text-neutral-600 text-sm py-10">
                        <ImageIcon className="w-8 h-8 mb-3 opacity-20" />
                        <span className="font-bold uppercase tracking-widest text-[10px]">No visual assets detected in project buffer</span>
                    </div>
                )}
            </div>
            
            {/* Project Footer Detail */}
            <div className="pt-10 flex justify-center opacity-30 border-t border-neutral-800">
                <span className="text-[9px] font-black uppercase tracking-[1em] text-neutral-500">MythOS Director Pro / System Version 4.2 / Finalized Build</span>
            </div>
        </div>
    );
};
