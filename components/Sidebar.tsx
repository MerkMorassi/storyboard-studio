
import React, { useState, useEffect, useRef } from 'react';
import { ActiveView } from '../types.ts';
import {
  SettingsIcon, DashboardIcon, GridIcon, BlenderIcon, LayersIcon, SwapIcon, FaceSparkleIcon, PhotoRealismIcon,
  PinIcon, CharacterIcon, LoreIcon, ShuffleIcon, LibraryIcon, StoryboardIcon, VideoIcon, ScriptIcon, AutomationIcon,
  ChevronLeftIcon, ChevronRightIcon, ClapperboardIcon, MagicIcon, CameraLensIcon, ImageIcon, ScissorsIcon, PuzzleIcon, ExpandIcon, AgentsIcon, AnalyzerIcon
} from './icons.tsx';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { PencilIcon } from './icons/PencilIcon';

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

type SidebarItemType = 'link' | 'header';

interface SidebarItem {
    id: string;
    type: SidebarItemType;
    label: string;
    view?: ActiveView; // Only for links
    icon?: string; // String key for icon lookup
    statKey?: keyof SidebarProps['stats']; // Optional stat count to show
}

// Icon Mapping for serialization
const ICON_MAP: Record<string, React.ReactNode> = {
    'DashboardIcon': <DashboardIcon />,
    'ProjectsIcon': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>,
    'AgentsIcon': <AgentsIcon />,
    'AutomationIcon': <AutomationIcon />,
    'MagicIcon': <MagicIcon />,
    'ScriptIcon': <ScriptIcon />,
    'PencilIcon': <PencilIcon className="w-5 h-5" />,
    'ImageIcon': <ImageIcon />,
    'AnalyzerIcon': <AnalyzerIcon />,
    'ClapperboardIcon': <ClapperboardIcon />,
    'VideoIcon': <VideoIcon />,
    'LayersIcon': <LayersIcon />,
    'ScissorsIcon': <ScissorsIcon />,
    'ExpandIcon': <ExpandIcon />,
    'SwapIcon': <SwapIcon />,
    'FaceSparkleIcon': <FaceSparkleIcon />,
    'BlenderIcon': <BlenderIcon />,
    'PuzzleIcon': <PuzzleIcon />,
    'PhotoRealismIcon': <PhotoRealismIcon />,
    'GridIcon': <GridIcon />,
    'StoryboardIcon': <StoryboardIcon />,
    'CharacterIcon': <CharacterIcon />,
    'DatabaseIcon': <DatabaseIcon />,
    'LoreIcon': <LoreIcon />,
    'LibraryIcon': <LibraryIcon />,
    'ShuffleIcon': <ShuffleIcon />,
    'PinIcon': <PinIcon />,
    'CameraLensIcon': <CameraLensIcon />,
};

const DEFAULT_SIDEBAR_ITEMS: SidebarItem[] = [
    { id: 'dashboard', type: 'link', label: 'Dashboard', view: 'dashboard', icon: 'DashboardIcon' },
    { id: 'projects', type: 'link', label: 'Projects', view: 'projects', icon: 'ProjectsIcon' },
    
    { id: 'header-depts', type: 'header', label: 'Departments' },
    { id: 'team', type: 'link', label: 'Team Overview', view: 'team', icon: 'AgentsIcon' },
    { id: 'core', type: 'link', label: 'Producer (Core)', view: 'core', icon: 'AutomationIcon' },
    { id: 'ideation', type: 'link', label: 'Ideation (Spark)', view: 'ideation', icon: 'MagicIcon' },
    { id: 'scripting', type: 'link', label: 'Scripting (Scribe)', view: 'scripting', icon: 'ScriptIcon' },
    { id: 'design', type: 'link', label: 'Design (Stylus)', view: 'design', icon: 'PencilIcon' },
    { id: 'art', type: 'link', label: 'Art (Canvas)', view: 'art', icon: 'ImageIcon' },

    { id: 'header-tools', type: 'header', label: 'Creation Tools' },
    { id: 'director', type: 'link', label: 'Visual Analyzer', view: 'director', icon: 'AnalyzerIcon' },
    { id: 'mythos-engine', type: 'link', label: 'MythOS Cinematic Engine', view: 'mythos-cinematic-engine', icon: 'CameraLensIcon' },
    { id: 'image-generator', type: 'link', label: 'Image Studio', view: 'image-generator', icon: 'ImageIcon' },
    { id: 'generative-video', type: 'link', label: 'Video Creator', view: 'generative-video', icon: 'ClapperboardIcon' },
    { id: 'video', type: 'link', label: 'Animatic Studio', view: 'video', icon: 'VideoIcon' },
    
    { id: 'header-post', type: 'header', label: 'Post-Production' },
    { id: 'topaz', type: 'link', label: 'Enhance Studio', view: 'topaz', icon: 'MagicIcon' },
    { id: 'scene-compositor', type: 'link', label: 'Compositor', view: 'scene-compositor', icon: 'LayersIcon' },
    { id: 'green-screen', type: 'link', label: 'Green Screen', view: 'green-screen', icon: 'ScissorsIcon' },
    { id: 'resize', type: 'link', label: 'Resize & Outpaint', view: 'resize', icon: 'ExpandIcon' },
    { id: 'face-swap', type: 'link', label: 'Face Swap', view: 'face-swap', icon: 'SwapIcon' },
    { id: 'face-repair', type: 'link', label: 'Face Repair', view: 'face-repair', icon: 'FaceSparkleIcon' },
    { id: 'blender', type: 'link', label: 'Blender', view: 'blender', icon: 'BlenderIcon' },
    { id: 'composite', type: 'link', label: 'Composite', view: 'composite', icon: 'PuzzleIcon' },
    { id: 'photorealism', type: 'link', label: 'UHD Generator', view: 'photorealism', icon: 'PhotoRealismIcon' },

    { id: 'header-assets', type: 'header', label: 'Assets & Lore' },
    { id: 'grid', type: 'link', label: 'Gallery', view: 'grid', icon: 'GridIcon' },
    { id: 'story', type: 'link', label: 'Storyboard', view: 'story', icon: 'StoryboardIcon', statKey: 'storyboard' },
    { id: 'agents', type: 'link', label: 'Studio Players', view: 'agents', icon: 'CharacterIcon', statKey: 'agents' },
    { id: 'knowledge', type: 'link', label: 'Knowledge Base', view: 'knowledge', icon: 'DatabaseIcon' },
    { id: 'lore', type: 'link', label: 'Lore', view: 'lore', icon: 'LoreIcon', statKey: 'lore' },
    { id: 'prompt-library', type: 'link', label: 'Prompt Library', view: 'prompt-library', icon: 'LibraryIcon', statKey: 'promptLibrary' },
    { id: 'dynamic-prompts', type: 'link', label: 'Dynamic Prompts', view: 'dynamic-prompts', icon: 'ShuffleIcon', statKey: 'dynamicPrompts' },
    { id: 'script', type: 'link', label: 'Script', view: 'script', icon: 'ScriptIcon' },
    { id: 'inspiration', type: 'link', label: 'Inspiration', view: 'inspiration', icon: 'PinIcon', statKey: 'inspiration' },
    { id: 'automation', type: 'link', label: 'Automation', view: 'automation', icon: 'AutomationIcon' },
];

const STORAGE_KEY = 'sidebar-order-v3'; // Bumped version for new items

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
    className={`w-full flex items-center px-3 py-2 mb-1 text-sm font-medium rounded-md transition-colors duration-200 cursor-pointer ${
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

const SectionHeader: React.FC<{ title: string; isCollapsed: boolean }> = ({ title, isCollapsed }) => (
    !isCollapsed ? (
        <div className="px-3 pt-4 pb-2 text-[10px] font-bold text-neutral-500 uppercase tracking-widest cursor-move">
            {title}
        </div>
    ) : (
        <div className="py-2 border-t border-neutral-800 mx-2 mt-2 cursor-move"></div>
    )
);

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate, stats, isOnline, onOpenSettings, isCollapsed, onToggleCollapse }) => {
    const [items, setItems] = useState<SidebarItem[]>(DEFAULT_SIDEBAR_ITEMS);
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                setItems(JSON.parse(saved));
            }
        } catch (e) {
            console.error("Failed to load sidebar order", e);
        }
    }, []);

    const saveOrder = (newItems: SidebarItem[]) => {
        setItems(newItems);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
        dragItem.current = position;
        e.dataTransfer.effectAllowed = "move";
        // Make the ghost transparent or styled if needed, defaults are usually okay
        if (e.currentTarget) {
             e.currentTarget.style.opacity = '0.5';
        }
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
        dragOverItem.current = position;
        e.preventDefault();
    };
    
    const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
        if (e.currentTarget) {
             e.currentTarget.style.opacity = '1';
        }
        
        if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
            const newItems = [...items];
            const draggedItemContent = newItems[dragItem.current];
            newItems.splice(dragItem.current, 1);
            newItems.splice(dragOverItem.current, 0, draggedItemContent);
            dragItem.current = null;
            dragOverItem.current = null;
            saveOrder(newItems);
        } else {
            dragItem.current = null;
            dragOverItem.current = null;
        }
    };

    return (
        <aside 
            id="sidebar" 
            className={`flex flex-col h-full bg-neutral-900 border-r border-neutral-800 flex-shrink-0 transition-all duration-300 ${isCollapsed ? 'w-[60px]' : 'w-[240px]'}`}
        >
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'px-6'} py-5 border-b border-neutral-800 mb-2`}>
                {!isCollapsed ? (
                    <span className="text-sm font-black text-white uppercase tracking-widest">Mythos</span>
                ) : (
                    <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-600 to-purple-600"></div>
                )}
            </div>
            
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 space-y-0.5 scrollbar-thin scrollbar-thumb-neutral-800">
                {items.map((item, index) => (
                    <div 
                        key={item.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnter={(e) => handleDragEnter(e, index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                        className="transition-transform duration-200"
                    >
                        {item.type === 'header' ? (
                            <SectionHeader title={item.label} isCollapsed={isCollapsed} />
                        ) : (
                            <NavButton 
                                label={item.label} 
                                view={item.view!} 
                                activeView={activeView} 
                                onNavigate={onNavigate} 
                                icon={ICON_MAP[item.icon || ''] || <div className="w-5 h-5 bg-neutral-700 rounded-full" />} 
                                count={item.statKey ? stats[item.statKey] : undefined}
                                isCollapsed={isCollapsed} 
                            />
                        )}
                    </div>
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
