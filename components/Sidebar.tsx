
import React, { useState, useRef, useEffect } from 'react';
import { ActiveView } from '../types';
import { 
    DashboardIcon, FolderIcon, AgentsIcon, AutomationIcon, MagicIcon, ScriptIcon, 
    PencilIcon, ImageIcon, AnalyzerIcon, CameraLensIcon, ClapperboardIcon, 
    BlenderIcon, LayersIcon, PuzzleIcon, SwapIcon, FaceSparkleIcon, PhotoRealismIcon, 
    ExpandIcon, ScissorsIcon, GridIcon, StoryboardIcon, PinIcon, LoreIcon, 
    LibraryIcon, ShuffleIcon, SettingsIcon, WritersRoomIcon, EditIcon
} from './icons';

interface SidebarProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenSettings: () => void;
  isOnline: boolean;
  stats: {
    storyboard: number;
    inspiration: number;
    agents: number;
    lore: number;
    dynamicPrompts: number;
    promptLibrary: number;
  };
}

interface MenuItem {
    id: string;
    type: 'link' | 'header';
    label: string;
    view?: ActiveView;
    icon?: React.FC<{ className?: string }>;
}

const DEFAULT_MENU_ITEMS: MenuItem[] = [
    { id: 'dashboard', type: 'link', label: 'Dashboard', view: 'dashboard', icon: DashboardIcon },
    { id: 'projects', type: 'link', label: 'Projects', view: 'projects', icon: FolderIcon },
    
    { id: 'header-team', type: 'header', label: 'AnimAgents Team' },
    { id: 'team', type: 'link', label: 'Team Overview', view: 'team', icon: AgentsIcon },
    { id: 'core', type: 'link', label: 'Producer (Nexus)', view: 'core', icon: AutomationIcon },
    { id: 'ideation', type: 'link', label: 'Ideation (Spark)', view: 'ideation', icon: MagicIcon },
    { id: 'scripting', type: 'link', label: 'Scripting (Scribe)', view: 'scripting', icon: ScriptIcon },
    { id: 'design', type: 'link', label: 'Design (Stylus)', view: 'design', icon: PencilIcon },
    { id: 'art', type: 'link', label: 'Art (Canvas)', view: 'art', icon: ImageIcon },
    { id: 'director', type: 'link', label: 'Visual (Kine)', view: 'director', icon: AnalyzerIcon },

    { id: 'header-tools', type: 'header', label: 'Creation Tools' },
    { id: 'script-writer', type: 'link', label: 'Script Writer', view: 'script-writer', icon: EditIcon },
    { id: 'mythos-engine', type: 'link', label: 'MythOS Cinematic', view: 'mythos-cinematic-engine', icon: CameraLensIcon },
    { id: 'image-generator', type: 'link', label: 'Image Studio', view: 'image-generator', icon: ImageIcon },
    { id: 'generative-video', type: 'link', label: 'Video Creator', view: 'generative-video', icon: ClapperboardIcon },
    
    { id: 'header-utils', type: 'header', label: 'Utilities' },
    { id: 'blender', type: 'link', label: 'Blender', view: 'blender', icon: BlenderIcon },
    { id: 'scene-compositor', type: 'link', label: 'Compositor', view: 'scene-compositor', icon: LayersIcon },
    { id: 'composite', type: 'link', label: 'Composite', view: 'composite', icon: PuzzleIcon },
    { id: 'face-swap', type: 'link', label: 'Face Swap', view: 'face-swap', icon: SwapIcon },
    { id: 'face-repair', type: 'link', label: 'Face Repair', view: 'face-repair', icon: FaceSparkleIcon },
    { id: 'photorealism', type: 'link', label: 'UHD Generator', view: 'photorealism', icon: PhotoRealismIcon },
    { id: 'resize', type: 'link', label: 'Resize/Outpaint', view: 'resize', icon: ExpandIcon },
    { id: 'green-screen', type: 'link', label: 'Green Screen', view: 'green-screen', icon: ScissorsIcon },
    { id: 'topaz', type: 'link', label: 'Enhance (Topaz)', view: 'topaz', icon: MagicIcon },
    
    { id: 'header-assets', type: 'header', label: 'Assets' },
    { id: 'grid', type: 'link', label: 'Gallery', view: 'grid', icon: GridIcon },
    { id: 'story', type: 'link', label: 'Storyboard', view: 'story', icon: StoryboardIcon },
    { id: 'inspiration', type: 'link', label: 'Inspiration', view: 'inspiration', icon: PinIcon },
    { id: 'scripts-bin', type: 'link', label: 'Scripts Bin', view: 'scripts-bin', icon: LibraryIcon },
    
    { id: 'header-data', type: 'header', label: 'Knowledge' },
    { id: 'agents', type: 'link', label: 'Studio Players', view: 'agents', icon: AgentsIcon },
    { id: 'lore', type: 'link', label: 'Lore', view: 'lore', icon: LoreIcon },
    { id: 'prompt-library', type: 'link', label: 'Prompt Library', view: 'prompt-library', icon: LibraryIcon },
    { id: 'dynamic-prompts', type: 'link', label: 'Dynamic Prompts', view: 'dynamic-prompts', icon: ShuffleIcon },
    { id: 'agent-chat', type: 'link', label: 'Agent Chat', view: 'agent-chat', icon: WritersRoomIcon },
    { id: 'knowledge', type: 'link', label: 'Knowledge Base', view: 'knowledge', icon: ScriptIcon },
    { id: 'automation', type: 'link', label: 'Automation', view: 'automation', icon: AutomationIcon },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate, isCollapsed, onToggleCollapse, onOpenSettings, isOnline, stats }) => {
    const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
        try {
            const savedOrder = localStorage.getItem('mythos_sidebar_order_v3');
            if (savedOrder) {
                const orderedIds = JSON.parse(savedOrder) as string[];
                const rehydrated = orderedIds
                    .map(id => DEFAULT_MENU_ITEMS.find(item => item.id === id))
                    .filter((item): item is MenuItem => !!item);
                const newItems = DEFAULT_MENU_ITEMS.filter(item => !orderedIds.includes(item.id));
                return [...rehydrated, ...newItems];
            }
        } catch (e) {
            console.error("Failed to load sidebar order", e);
        }
        return DEFAULT_MENU_ITEMS;
    });

    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const onDragStart = (e: React.DragEvent, index: number) => {
        dragItem.current = index;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", index.toString());
    };

    const onDragEnter = (e: React.DragEvent, index: number) => {
        dragOverItem.current = index;
    };

    const onDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault(); 
        dragOverItem.current = index;
    };

    const onDragEnd = () => {
        const startIndex = dragItem.current;
        const endIndex = dragOverItem.current;

        if (startIndex !== null && endIndex !== null && startIndex !== endIndex) {
            const newItems = [...menuItems];
            const [removed] = newItems.splice(startIndex, 1);
            newItems.splice(endIndex, 0, removed);
            setMenuItems(newItems);
            localStorage.setItem('mythos_sidebar_order_v3', JSON.stringify(newItems.map(i => i.id)));
        }
        dragItem.current = null;
        dragOverItem.current = null;
    };

    return (
        <aside className={`bg-neutral-900 border-r border-neutral-800 flex flex-col transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} h-full shrink-0 z-20`}>
            <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-800 shrink-0">
                {!isCollapsed && (
                    <h1 className="text-xl font-black tracking-tighter text-white">MYTHOS</h1>
                )}
                <button 
                    onClick={onToggleCollapse} 
                    className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 custom-scrollbar">
                {menuItems.map((item, index) => {
                    if (item.type === 'header') {
                        if (isCollapsed) return <div key={item.id} className="h-px bg-neutral-800 mx-4 my-2"></div>;
                        return (
                            <div 
                                key={item.id} 
                                className="px-6 py-2 mt-4 first:mt-0 cursor-grab active:cursor-grabbing hover:bg-neutral-800/30 transition-colors"
                                draggable
                                onDragStart={(e) => onDragStart(e, index)}
                                onDragEnter={(e) => onDragEnter(e, index)}
                                onDragOver={(e) => onDragOver(e, index)}
                                onDragEnd={onDragEnd}
                            >
                                <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pointer-events-none select-none">{item.label}</h3>
                            </div>
                        );
                    }

                    const Icon = item.icon;
                    const isActive = activeView === item.view;
                    const count = item.view === 'story' ? stats.storyboard 
                                : item.view === 'agents' ? stats.agents
                                : item.view === 'lore' ? stats.lore
                                : item.view === 'inspiration' ? stats.inspiration
                                : undefined;

                    return (
                        <div
                            key={item.id}
                            draggable
                            onDragStart={(e) => onDragStart(e, index)}
                            onDragEnter={(e) => onDragEnter(e, index)}
                            onDragOver={(e) => onDragOver(e, index)}
                            onDragEnd={onDragEnd}
                            className="cursor-grab active:cursor-grabbing"
                        >
                            <button
                                onClick={() => item.view && onNavigate(item.view)}
                                className={`w-full flex items-center px-4 py-2.5 mx-2 mb-1 rounded-lg transition-all duration-200 group relative ${isCollapsed ? 'justify-center max-w-[calc(100%-16px)]' : 'max-w-[calc(100%-16px)]'} ${
                                    isActive 
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                                        : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                                }`}
                                title={isCollapsed ? item.label : undefined}
                            >
                                {Icon && <Icon className={`w-5 h-5 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'} ${isActive ? 'text-white' : 'text-neutral-500 group-hover:text-white'}`} />}
                                
                                {!isCollapsed && (
                                    <div className="flex-1 text-left flex justify-between items-center overflow-hidden pointer-events-none">
                                        <span className="text-sm font-medium truncate">{item.label}</span>
                                        {count !== undefined && count > 0 && (
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-blue-800 text-blue-200' : 'bg-neutral-800 text-neutral-500'}`}>
                                                {count}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>

            <div className="p-4 border-t border-neutral-800 shrink-0 bg-neutral-900">
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} mb-4`}>
                    {!isCollapsed && (
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className="text-xs font-medium text-neutral-400">{isOnline ? 'System Online' : 'Offline'}</span>
                        </div>
                    )}
                    <button 
                        onClick={onOpenSettings}
                        className={`p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors ${isCollapsed ? '' : 'ml-auto'}`}
                        title="Settings"
                    >
                        <SettingsIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </aside>
    );
};
