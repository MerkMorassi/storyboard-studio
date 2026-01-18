






import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ActiveView } from '../types.ts';
import { 
    DashboardIcon, FolderIcon, AgentsIcon, AutomationIcon, MagicIcon, ScriptIcon, 
    PencilIcon, ImageIcon, AnalyzerIcon, CameraLensIcon, ClapperboardIcon, 
    BlenderIcon, LayersIcon, PuzzleIcon, SwapIcon, FaceSparkleIcon, PhotoRealismIcon, 
    ExpandIcon, ScissorsIcon, GridIcon, StoryboardIcon, PinIcon, LoreIcon, 
    LibraryIcon, ShuffleIcon, SettingsIcon, WritersRoomIcon, EditIcon, CharacterIcon,
    TransitionIcon, DollyIcon, WarningIcon, SpeakerIcon, ChevronLeftIcon
} from './icons.tsx';
import { hasCriticalKeys } from '../services/apiKeyService';

interface SidebarProps {
    activeView: ActiveView;
    onNavigate: (view: ActiveView) => void;
}

interface MenuItem {
    id: string;
    type: 'link' | 'header';
    label: string;
    view?: ActiveView;
    icon?: React.ComponentType<{ className?: string }>;
}

const DEFAULT_MENU_ITEMS: MenuItem[] = [
    { id: 'header-main', type: 'header', label: 'Production' },
    { id: 'dashboard', type: 'link', label: 'Dashboard', view: 'dashboard', icon: DashboardIcon },
    { id: 'projects', type: 'link', label: 'Projects', view: 'projects', icon: FolderIcon },
    { id: 'agents', type: 'link', label: 'Agents', view: 'agents', icon: AgentsIcon },
    { id: 'automation', type: 'link', label: 'Automation', view: 'automation', icon: AutomationIcon },
    
    { id: 'header-agents', type: 'header', label: 'Agents' },
    { id: 'director', type: 'link', label: 'Visual Director (Kine)', view: 'director', icon: AnalyzerIcon },
    { id: 'agent-chat', type: 'link', label: 'Agent Chat', view: 'agent-chat', icon: AgentsIcon },

    { id: 'header-create', type: 'header', label: 'Creation' },
    { id: 'script-writer', type: 'link', label: 'Script Writer', view: 'script-writer', icon: EditIcon },
    { id: 'image-generator', type: 'link', label: 'Image Studio', view: 'image-generator', icon: ImageIcon },
    { id: 'one-shot', type: 'link', label: 'One-Shot Cinematic', view: 'one-shot-cinematic', icon: MagicIcon },
    { id: 'mythos-cinematic', type: 'link', label: 'MythOS Cinematic', view: 'mythos-cinematic-engine', icon: CameraLensIcon },
    { id: 'generative-video', type: 'link', label: 'Video Creator', view: 'generative-video', icon: ClapperboardIcon },
    { id: 'wanimate-studio', type: 'link', label: 'Wanimate Studio', view: 'wanimate-studio', icon: ClapperboardIcon },

    { id: 'header-vfx', type: 'header', label: 'VFX & Post' },
    { id: 'camera-movement', type: 'link', label: 'Camera Dolly (LTX)', view: 'camera-movement', icon: DollyIcon },
    { id: 'camera-moves', type: 'link', label: 'Camera Moves (ReCam)', view: 'camera-moves', icon: DollyIcon },
    { id: 'transition', type: 'link', label: 'Transition Studio', view: 'transition-studio', icon: TransitionIcon },
    { id: 'blender', type: 'link', label: 'Blender', view: 'blender', icon: BlenderIcon },
    { id: 'compositor', type: 'link', label: 'Compositor', view: 'scene-compositor', icon: LayersIcon },
    { id: 'composite', type: 'link', label: 'DreamO Composite', view: 'composite', icon: PuzzleIcon },
    { id: 'face-swap', type: 'link', label: 'Face Swap', view: 'face-swap', icon: SwapIcon },
    { id: 'face-repair', type: 'link', label: 'Face Repair', view: 'face-repair', icon: FaceSparkleIcon },
    { id: 'photorealism', type: 'link', label: 'UHD Generator', view: 'photorealism', icon: PhotoRealismIcon },
    { id: 'resize', type: 'link', label: 'Resize / Outpaint', view: 'resize', icon: ExpandIcon },
    { id: 'green-screen', type: 'link', label: 'Green Screen', view: 'green-screen', icon: ScissorsIcon },
    { id: 'bg-removal', type: 'link', label: 'BG Remover', view: 'background-removal', icon: ScissorsIcon },
    { id: 'qwen-edit', type: 'link', label: 'Qwen Edit', view: 'qwen-image-edit', icon: EditIcon },
    { id: 'topaz', type: 'link', label: 'Enhance (Topaz)', view: 'topaz', icon: MagicIcon },

    { id: 'header-audio', type: 'header', label: 'Audio' },
    { id: 'voice-lab', type: 'link', label: 'Voice Lab', view: 'voice-lab', icon: SpeakerIcon },
    { id: 'dubbing-studio', type: 'link', label: 'Dubbing Studio', view: 'dubbing-studio', icon: SpeakerIcon },

    { id: 'header-assets', type: 'header', label: 'Assets' },
    { id: 'grid', type: 'link', label: 'Project Vault', view: 'grid', icon: GridIcon },
    { id: 'storyboard', type: 'link', label: 'Storyboard', view: 'story', icon: StoryboardIcon },
    { id: 'inspiration', type: 'link', label: 'Inspiration', view: 'inspiration', icon: PinIcon },
    { id: 'scripts-bin', type: 'link', label: 'Scripts Bin', view: 'scripts-bin', icon: ScriptIcon },
    
    { id: 'header-knowledge', type: 'header', label: 'Knowledge' },
    { id: 'characters', type: 'link', label: 'Characters', view: 'characters', icon: CharacterIcon },
    { id: 'lore', type: 'link', label: 'Lore Bible', view: 'lore', icon: LoreIcon },
    { id: 'prompt-library', type: 'link', label: 'Prompt Library', view: 'prompt-library', icon: LibraryIcon },
    { id: 'dynamic-prompts', type: 'link', label: 'Dynamic Prompts', view: 'dynamic-prompts', icon: ShuffleIcon },
    { id: 'knowledge', type: 'link', label: 'LorePack Studio', view: 'knowledge', icon: LibraryIcon },
    
    { id: 'header-system', type: 'header', label: 'System' },
    { id: 'model-settings', type: 'link', label: 'Model Settings', view: 'model-settings', icon: SettingsIcon },
];

const SIDEBAR_COLLAPSED_KEY = 'mythos_sidebar_collapsed_v1';
const MENU_ORDER_KEY = 'mythos_menu_order_v1';

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate }) => {
    const keysPresent = hasCriticalKeys();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [menuItems, setMenuItems] = useState(DEFAULT_MENU_ITEMS);

    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    useEffect(() => {
        // Load collapsed state
        try {
            const savedCollapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
            if (savedCollapsed) setIsCollapsed(JSON.parse(savedCollapsed));
        } catch (e) { console.error("Could not parse sidebar collapsed state."); }

        // Load menu order
        try {
            const savedOrder = localStorage.getItem(MENU_ORDER_KEY);
            if (savedOrder) {
                const orderedIds = JSON.parse(savedOrder) as string[];
                const defaultMap = new Map(DEFAULT_MENU_ITEMS.map(item => [item.id, item]));
                const newMenuItems: MenuItem[] = [];
                const addedIds = new Set<string>();

                orderedIds.forEach(id => {
                    const item = defaultMap.get(id);
                    if (item) {
                        newMenuItems.push(item);
                        addedIds.add(id);
                    }
                });

                DEFAULT_MENU_ITEMS.forEach(item => {
                    if (!addedIds.has(item.id)) newMenuItems.push(item);
                });

                setMenuItems(newMenuItems);
            }
        } catch (e) {
            console.error("Could not parse menu order, using default.");
        }
    }, []);

    const toggleCollapse = () => {
        setIsCollapsed(prev => {
            const newState = !prev;
            localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(newState));
            return newState;
        });
    };

    const handleDrop = () => {
        if (dragItem.current === null || dragOverItem.current === null) return;

        const newMenuItems = [...menuItems];
        const draggedItemContent = newMenuItems.splice(dragItem.current, 1)[0];
        newMenuItems.splice(dragOverItem.current, 0, draggedItemContent);
        
        dragItem.current = null;
        dragOverItem.current = null;
        
        setMenuItems(newMenuItems);
        localStorage.setItem(MENU_ORDER_KEY, JSON.stringify(newMenuItems.map(item => item.id)));
    };
    
    return (
        <div className={`bg-neutral-900 border-r border-neutral-800 flex flex-col h-full flex-shrink-0 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
            <div className={`p-6 border-b border-neutral-800 transition-all duration-300 ${isCollapsed ? 'py-4' : 'py-6'}`}>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-lg shadow-blue-900/50 flex-shrink-0">M</div>
                    {!isCollapsed && (
                        <div className="transition-opacity duration-200">
                            <h1 className="text-lg font-black text-white tracking-tighter leading-none">MYTHOS</h1>
                            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Studio OS 4.2</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-grow overflow-y-auto py-4 custom-scrollbar">
                <nav className="space-y-1 px-3" onDragOver={(e) => e.preventDefault()}>
                    {menuItems.map((item, index) => {
                        if (item.type === 'header') {
                            return (
                                <div key={item.id} className={`px-3 pt-5 pb-2 transition-all ${isCollapsed ? 'text-center' : ''}`}>
                                    <p className={`text-[10px] font-black text-neutral-600 uppercase tracking-widest transition-all ${isCollapsed ? 'opacity-0 h-0' : 'opacity-100'}`}>
                                        {!isCollapsed ? item.label : ''}
                                    </p>
                                </div>
                            );
                        }
                        
                        const isActive = activeView === item.view;
                        const Icon = item.icon || FolderIcon;
                        
                        const isSettings = item.view === 'model-settings';
                        
                        return (
                            <button
                                key={item.id}
                                draggable
                                onDragStart={() => dragItem.current = index}
                                onDragEnter={() => dragOverItem.current = index}
                                onDragEnd={handleDrop}
                                onClick={() => item.view && onNavigate(item.view)}
                                title={isCollapsed ? item.label : undefined}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-bold rounded-lg transition-all group ${isCollapsed ? 'justify-center' : ''} ${
                                    isActive 
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                                        : isSettings && !keysPresent
                                        ? 'text-red-400 hover:bg-red-900/20'
                                        : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                                }`}
                            >
                                <Icon className={`w-4 h-4 transition-colors flex-shrink-0 ${isActive ? 'text-white' : isSettings && !keysPresent ? 'text-red-400' : 'text-neutral-500 group-hover:text-white'}`} />
                                {!isCollapsed && <span className="truncate">{item.label}</span>}
                                {!isCollapsed && isSettings && !keysPresent && <WarningIcon className="w-4 h-4 text-red-400 animate-pulse ml-auto" />}
                            </button>
                        );
                    })}
                </nav>
            </div>

            <div className={`p-4 border-t border-neutral-800 bg-neutral-900 transition-all duration-300`}>
                <button onClick={toggleCollapse} className="w-full flex items-center justify-center gap-3 px-3 py-2 text-xs font-bold text-neutral-500 hover:text-white rounded-lg transition-all mt-2 hover:bg-neutral-800">
                    <ChevronLeftIcon className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
                </button>
            </div>
        </div>
    );
};