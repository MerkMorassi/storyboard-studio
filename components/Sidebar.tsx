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
    className={`relative flex items-center h-12 transition-colors duration-200 group w-full ${
      activeView === view ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:bg-neutral-800'
    } ${isCollapsed ? 'justify-center' : 'px-4'}`}
  >
    <div className="flex-shrink-0 w-6 h-6">{icon}</div>
    {!isCollapsed && <span className="ml-4 text-sm font-medium whitespace-nowrap">{label}</span>}
    {typeof count !== 'undefined' && count > 0 && (
      <span className={`absolute top-2 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full transition-all ${isCollapsed ? 'right-2 bg-red-600' : `right-4 ${activeView === view ? 'bg-red-500' : 'bg-red-600'}`}`}>
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
        <nav className={`bg-neutral-900 flex flex-col flex-shrink-0 border-r border-neutral-800 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-16' : 'w-64'}`}>
            <div className="flex-shrink-0 h-16 flex items-center border-b border-neutral-800 px-4">
                {!isCollapsed && <span className="text-lg font-bold">Studios</span>}
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 space-y-1">
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
            
            <div className="flex-shrink-0 border-t border-neutral-800 p-2">
                <div className={`flex items-center h-12 transition-colors duration-200 w-full ${isCollapsed ? 'justify-center' : 'px-2 justify-between'}`}>
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 transition-colors rounded-full ${isOnline ? 'bg-green-500' : 'bg-neutral-600'}`} title={isOnline ? 'Online' : 'Offline'}></div>
                        {!isCollapsed && <span className="text-xs text-neutral-400">{isOnline ? 'Online' : 'Offline'}</span>}
                    </div>
                    <button 
                      onClick={onOpenSettings} 
                      className="text-neutral-400 hover:text-white transition-colors"
                      aria-label="Open settings"
                      title={isCollapsed ? "Settings" : undefined}
                    >
                      <SettingsIcon />
                    </button>
                </div>
                <button
                    onClick={onToggleCollapse}
                    className="w-full h-12 flex items-center justify-center text-neutral-400 hover:bg-neutral-800 transition-colors"
                    title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                >
                    {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                </button>
            </div>
        </nav>
    );
};
