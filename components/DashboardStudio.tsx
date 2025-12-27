
import React, { useState } from 'react';
import { ActiveView, Project, ImageState } from '../types.ts';
import { StoryboardIcon, CharacterIcon, LoreIcon, PinIcon, ShuffleIcon, GridIcon, LibraryIcon, DashboardIcon, EditIcon, CheckIcon, ScriptIcon } from './icons.tsx';

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
        className={`bg-neutral-800/50 p-4 border border-neutral-700 hover:bg-neutral-700/50 ${colorClasses[color].border} transition-all duration-300 cursor-pointer group rounded-lg`}
    >
        <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{title}</h3>
            <div className={`${colorClasses[color].text} transition-colors transform group-hover:scale-110 duration-300`}>{icon}</div>
        </div>
        <p className="text-3xl font-black text-neutral-100 mt-2">{value}</p>
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

    // Get latest 8 images for the gallery
    const galleryImages = images.slice(0, 8);

    return (
        <div className="p-6 max-w-7xl mx-auto w-full animate-fade-in h-full overflow-y-auto space-y-8">
             <style>{`.animate-fade-in { animation: fadeIn 0.5s ease-out; } @keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }`}</style>
            
            {/* Project Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight uppercase">{project.name}</h1>
                    <p className="text-neutral-400 text-lg">{project.tagline || 'No tagline set.'}</p>
                </div>
                <div className="bg-neutral-800/80 px-4 py-2 rounded-xl border border-neutral-700 flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Status</span>
                    <span className="text-sm font-bold text-green-400">● Active</span>
                </div>
            </div>

            {/* Progress Section */}
            <div className="bg-neutral-800/30 border border-neutral-700 p-6 rounded-xl space-y-4">
                <div className="flex justify-between items-end">
                    <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Production Progress</h3>
                    <span className="text-2xl font-mono font-bold text-blue-400">{progress}%</span>
                </div>
                <div className="relative w-full h-4 bg-neutral-900 rounded-full overflow-hidden border border-neutral-700">
                    <div 
                        className="h-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 transition-all duration-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
                <input 
                    type="range" 
                    min="0" max="100" 
                    value={progress} 
                    onChange={handleProgressChange} 
                    className="w-full h-1 bg-transparent appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-neutral-500 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-white transition-all opacity-50 hover:opacity-100"
                    title="Adjust Progress"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Project Brief Column */}
                <div className="lg:col-span-2 bg-neutral-800/30 border border-neutral-700 rounded-xl p-6 flex flex-col min-h-[400px]">
                    <div className="flex justify-between items-center mb-4 border-b border-neutral-700 pb-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <LibraryIcon className="w-5 h-5 text-blue-500" />
                            Project Brief
                        </h2>
                        <button 
                            onClick={() => isEditingBrief ? handleSaveBrief() : setIsEditingBrief(true)}
                            className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold uppercase ${isEditingBrief ? 'bg-green-600 text-white hover:bg-green-500' : 'bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-600'}`}
                        >
                            {isEditingBrief ? <><CheckIcon className="w-4 h-4"/> Save Brief</> : <><EditIcon className="w-4 h-4"/> Edit</>}
                        </button>
                    </div>
                    
                    <div className="flex-grow">
                        {isEditingBrief ? (
                            <textarea
                                value={brief}
                                onChange={(e) => setBrief(e.target.value)}
                                className="w-full h-full min-h-[300px] bg-neutral-900/50 border border-neutral-600 rounded-lg p-4 text-neutral-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono text-sm leading-relaxed"
                                placeholder="Enter project details, logline, synopsis, and director's notes here..."
                            />
                        ) : (
                            <div className="prose prose-invert prose-sm max-w-none text-neutral-300 whitespace-pre-wrap leading-relaxed">
                                {brief || <span className="text-neutral-600 italic">No brief defined. Click 'Edit' to add project details.</span>}
                            </div>
                        )}
                    </div>
                </div>

                {/* Stats Grid Column */}
                <div className="lg:col-span-1 space-y-4">
                    <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-2">Asset Overview</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard title="Storyboard" value={stats.storyboardFrames} icon={<StoryboardIcon />} onClick={() => onNavigate('story')} color="purple" />
                        <StatCard title="Scripts" value={stats.scriptsCount} icon={<ScriptIcon />} onClick={() => onNavigate('scripts-bin')} color="emerald" />
                        <StatCard title="Studio Players" value={stats.agents} icon={<CharacterIcon />} onClick={() => onNavigate('agents')} color="sky" />
                        <StatCard title="Inspiration" value={stats.inspirationImages} icon={<PinIcon />} onClick={() => onNavigate('inspiration')} color="pink" />
                        <StatCard title="Gallery" value={stats.imagesGenerated} icon={<GridIcon />} onClick={() => onNavigate('grid')} color="red" />
                    </div>
                    
                    <div className="mt-4 bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3">Quick Actions</h3>
                        <div className="space-y-2">
                            <button onClick={() => onNavigate('team')} className="w-full text-left px-4 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm font-bold text-neutral-300 transition-colors flex items-center justify-between group">
                                <span>Consult Production Team</span>
                                <span className="text-neutral-500 group-hover:text-white">→</span>
                            </button>
                            <button onClick={() => onNavigate('script-writer')} className="w-full text-left px-4 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm font-bold text-neutral-300 transition-colors flex items-center justify-between group">
                                <span>Draft New Screenplay</span>
                                <span className="text-neutral-500 group-hover:text-white">→</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Asset Gallery Slideshow */}
            <div className="bg-neutral-800/30 border border-neutral-700 rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Recent Assets</h3>
                    <button onClick={() => onNavigate('grid')} className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors">View All Gallery →</button>
                </div>
                
                {galleryImages.length > 0 ? (
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
                        {galleryImages.map((img) => (
                            <div key={img.id} className="flex-shrink-0 w-64 aspect-video bg-black rounded-lg overflow-hidden border border-neutral-800 shadow-sm group relative">
                                {img.type === 'video' ? (
                                    <video src={img.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" muted />
                                ) : (
                                    <img src={`data:${img.mimeType};base64,${img.base64}`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Asset" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                    <span className="text-[10px] font-mono text-neutral-400 truncate w-full">{img.id}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-32 flex items-center justify-center bg-neutral-900/50 rounded-lg border border-dashed border-neutral-800 text-neutral-600 text-sm">
                        No assets generated yet.
                    </div>
                )}
            </div>
        </div>
    );
};
