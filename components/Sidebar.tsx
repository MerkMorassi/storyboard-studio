
import React from 'react';
import { ActiveView } from '../types.ts';
import {
  SettingsIcon, DashboardIcon, GridIcon, BlenderIcon, LayersIcon, SwapIcon, FaceSparkleIcon, PhotoRealismIcon,
  PinIcon, CharacterIcon, WritersRoomIcon, LoreIcon, ShuffleIcon, LibraryIcon, StoryboardIcon, VideoIcon, ScriptIcon, AutomationIcon,
  ChevronLeftIcon, ChevronRightIcon
} from './icons.tsx';

interface SidebarProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  stats: {
    storyboard: number;
    inspiration: number;
    agents: number;
    lore: number;
    dynamicPrompts: number;
    promptLibrary: number;
  };
  isOnline: boolean;
  onOpenSettings: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const NavButton: React.FC<{
    label: string;
    view: ActiveView;
    activeView: ActiveView;
    onNavigate: (view: ActiveView) => void;
    icon: React.ReactNode;
    count?: number;
    isCollapsed: boolean;
}> = ({ label, view, activeView, onNavigate, icon, count, isCollapsed }) => (
  <button
    onClick={() => onNavigate(view)}
    title={isCollapsed ? label : undefined}
    className={`w-full flex items-center px-3 py-2 mb-1 text-sm font-medium rounded-md transition-colors duration-200 ${
      activeView === view 
        ? 'bg-blue-900/30 text-blue-400 border-r-2 border-blue-500' 
        : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
    } ${isCollapsed ? 'justify-center px-2' : ''}`}
  >
    <div className={`flex-shrink-0 ${activeView === view ? 'text-blue-400' : 'text-neutral-500 group-hover:text-neutral-300'}`}>
        {icon}
    </div>
    {!isCollapsed && <span className="ml-3 truncate">{label}</span>}
    {typeof count !== 'undefined' && count > 0 && !isCollapsed && (
      <span className="ml-auto text-xs bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full border border-neutral-700">
        {count}
      </span>
    )}
  </button>
);

const navItems = [
    { view: 'projects', label: 'Projects', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg> },
    { view: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { view: 'grid', label: 'Grid', icon: <GridIcon /> },
    { view: 'story', label: 'Storyboard', icon: <StoryboardIcon />, countKey: 'storyboard' },
    { view: 'agents', label: 'AI Agents', icon: <CharacterIcon />, countKey: 'agents' },
    { view: 'agent-chat', label: 'Agent Chat', icon: <WritersRoomIcon /> },
    { view: 'lore', label: 'Lore', icon: <LoreIcon />, countKey: 'lore' },
    { view: 'prompt-library', label: 'Prompt Library', icon: <LibraryIcon />, countKey: 'promptLibrary' },
    { view: 'dynamic-prompts', label: 'Dynamic Prompts', icon: <ShuffleIcon />, countKey: 'dynamicPrompts' },
    { view: 'script', label: 'Script', icon: <ScriptIcon /> },
    { view: 'inspiration', label: 'Inspiration', icon: <PinIcon />, countKey: 'inspiration' },
    { view: 'video', label: 'Video Studio', icon: <VideoIcon /> },
    { view: 'blender', label: 'Blender Studio', icon: <BlenderIcon /> },
    { view: 'scene-compositor', label: 'Compositor', icon: <LayersIcon /> },
    { view: 'face-swap', label: 'Face Swap', icon: <SwapIcon /> },
    { view: 'face-repair', label: 'Face Repair', icon: <FaceSparkleIcon /> },
    { view: 'photorealism', label: 'Photorealism', icon: <PhotoRealismIcon /> },
    { view: 'automation', label: 'Automation', icon: <AutomationIcon /> },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate, stats, isOnline, onOpenSettings, isCollapsed, onToggleCollapse }) => {
    return (
        <aside 
            id="sidebar" 
            className={`flex flex-col h-full bg-neutral-900 border-r border-neutral-800 flex-shrink-0 transition-all duration-300 ${isCollapsed ? 'w-[60px]' : 'w-[240px]'}`}
        >
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'px-6'} py-5 border-b border-neutral-800 mb-2`}>
                {!isCollapsed ? (
                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Studios</span>
                ) : (
                    <div className="w-1 h-1 bg-neutral-600 rounded-full"></div>
                )}
            </div>
            
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 space-y-0.5 scrollbar-thin scrollbar-thumb-neutral-800">
                {navItems.map(item => (
                    <NavButton
                        key={item.view}
                        label={item.label}
                        view={item.view as ActiveView}
                        activeView={activeView}
                        onNavigate={onNavigate}
                        icon={item.icon}
                        count={item.countKey ? stats[item.countKey as keyof typeof stats] : undefined}
                        isCollapsed={isCollapsed}
                    />
                ))}
            </div>
            
            <div className="mt-auto p-2 border-t border-neutral-800 bg-neutral-900">
                <div className={`flex items-center ${isCollapsed ? 'justify-center flex-col gap-4' : 'justify-between px-2'} py-2 mb-1`}>
                    <div className="flex items-center gap-2" title={isOnline ? "System Online" : "System Offline"}>
                        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></div>
                        {!isCollapsed && <span className="text-xs font-medium text-neutral-500">{isOnline ? 'ONLINE' : 'OFFLINE'}</span>}
                    </div>
                    <button 
                      onClick={onOpenSettings} 
                      className="text-neutral-500 hover:text-neutral-300 transition-colors p-1 rounded-md hover:bg-neutral-800"
                      title="Settings"
                    >
                      <SettingsIcon />
                    </button>
                </div>
                <button
                    onClick={onToggleCollapse}
                    className="w-full py-2 text-neutral-600 hover:text-neutral-300 hover:bg-neutral-800 flex justify-center rounded-md transition-all"
                    title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                >
                    {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                </button>
            </div>
        </aside>
    );
};
