import React from 'react';
import { ActiveView } from '../types.ts';
import { 
    DashboardIcon, FolderIcon, AgentsIcon, AutomationIcon, MagicIcon, ScriptIcon, 
    PencilIcon, ImageIcon, AnalyzerIcon, CameraLensIcon, ClapperboardIcon, 
    BlenderIcon, LayersIcon, PuzzleIcon, SwapIcon, FaceSparkleIcon, PhotoRealismIcon, 
    ExpandIcon, ScissorsIcon, GridIcon, StoryboardIcon, PinIcon, LoreIcon, 
    LibraryIcon, ShuffleIcon, SettingsIcon, WritersRoomIcon, EditIcon, CharacterIcon,
    TransitionIcon, DollyIcon, WarningIcon
} from './icons.tsx';
import { hasCriticalKeys } from '../services/apiKeyService';

interface SidebarProps {
    activeView: ActiveView;
    onNavigate: (view: ActiveView) => void;
    onOpenSettings: () => void;
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
    { id: 'team', type: 'link', label: 'Team', view: 'team', icon: AgentsIcon },
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

    { id: 'header-vfx', type: 'header', label: 'VFX & Post' },
    { id: 'camera-movement', type: 'link', label: 'Camera Dolly (LTX)', view: 'camera-movement', icon: DollyIcon },
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
];

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate, onOpenSettings }) => {
    const keysPresent = hasCriticalKeys();

    return (
        <div className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col h-full flex-shrink-0">
            <div className="p-6 border-b border-neutral-800">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-lg shadow-blue-900/50">M</div>
                    <div>
                        <h1 className="text-lg font-black text-white tracking-tighter leading-none">MYTHOS</h1>
                        <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Studio OS 4.2</p>
                    </div>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto py-4 custom-scrollbar">
                <nav className="space-y-1 px-3">
                    {DEFAULT_MENU_ITEMS.map((item) => {
                        if (item.type === 'header') {
                            return (
                                <div key={item.id} className="px-3 pt-5 pb-2">
                                    <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">{item.label}</p>
                                </div>
                            );
                        }
                        
                        const isActive = activeView === item.view;
                        const Icon = item.icon || FolderIcon;
                        
                        return (
                            <button
                                key={item.id}
                                onClick={() => item.view && onNavigate(item.view)}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-bold rounded-lg transition-all group ${
                                    isActive 
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                                        : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                                }`}
                            >
                                <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-white' : 'text-neutral-500 group-hover:text-white'}`} />
                                {item.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            <div className="p-4 border-t border-neutral-800 bg-neutral-900">
                <button 
                    onClick={onOpenSettings}
                    className={`w-full flex items-center justify-between px-3 py-3 text-xs font-bold rounded-lg transition-all ${!keysPresent ? 'bg-red-900/20 text-red-400 border border-red-500/50 hover:bg-red-900/40' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
                >
                    <div className="flex items-center gap-3">
                        <SettingsIcon className="w-4 h-4" />
                        <span>System Settings</span>
                    </div>
                    {!keysPresent && <WarningIcon className="w-4 h-4 animate-pulse" />}
                </button>
            </div>
        </div>
    );
};