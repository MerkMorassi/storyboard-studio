import React, { useState } from 'react';
import { ActiveView } from '../../types';
import { MediaInput } from '../../components/MediaInput';
import { 
    AnalyzerIcon, CameraLensIcon, ChatIcon, ImageIcon, ClapperboardIcon, 
    StoryboardIcon, PinIcon, BlenderIcon, LayersIcon, SwapIcon, 
    PhotoRealismIcon, MagicIcon, FaceSparkleIcon, PuzzleIcon, ExpandIcon, ScissorsIcon
} from '../../components/icons';
import { analyzeImage, analyzeVideo } from './service';
import { AnalysisResult } from '../../components/AnalysisResult';
import { AgentChatView } from '../../components/AgentChatView';
import { getAgent } from '../../services/agentService';
import { getApiKey } from '../../services/apiKeyService';

interface DirectorStudioProps {
    onNavigate?: (view: ActiveView) => void;
}

interface StudioCardProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    onClick: () => void;
    isExternal?: boolean;
    color?: string;
}

const StudioCard: React.FC<StudioCardProps> = ({ title, description, icon, onClick, isExternal, color = "text-neutral-400" }) => (
    <div 
        onClick={onClick}
        className="bg-neutral-800/50 border border-neutral-700 hover:border-blue-500/50 hover:bg-neutral-800 rounded-xl p-5 cursor-pointer transition-all group h-full flex flex-col shadow-sm hover:shadow-md"
    >
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 bg-neutral-900 rounded-lg ${color} group-hover:text-white group-hover:bg-blue-600/20 transition-colors`}>
                {icon}
            </div>
            {isExternal && (
                <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-500 border border-neutral-700 px-1.5 py-0.5 rounded">Ext</span>
            )}
        </div>
        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">{title}</h3>
        <p className="text-xs text-neutral-400 leading-relaxed flex-grow">{description}</p>
    </div>
);

export const DirectorStudio: React.FC<DirectorStudioProps> = ({ onNavigate }) => {
    const [activeTab, setActiveTab] = useState<'hub' | 'analyzer' | 'chat'>('hub');
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [clearKey, setClearKey] = useState(0);

    const kineAgent = getAgent(); // Or specifically find Kine from team
    const hasApiKey = !!getApiKey();

    const handleMediaChange = async (media: { type: 'video' | 'image'; source: File | string | null }) => {
        if (!media.source) return;
        
        setIsAnalyzing(true);
        setAnalysis(null);
        
        try {
            const apiKey = getApiKey() || '';
            if (!apiKey) throw new Error("API Key is missing. Check your settings.");

            let result;

            if (media.type === 'image') {
                let base64 = '';
                let mimeType = '';

                if (typeof media.source === 'string') {
                    // Handle URL if passed directly (uncommon for image unless from grid)
                    console.warn("URL analysis not fully implemented for images in this view");
                    setIsAnalyzing(false);
                    return;
                } else {
                    const file = media.source;
                    mimeType = file.type;
                    const reader = new FileReader();
                    base64 = await new Promise<string>((resolve) => {
                        reader.onload = () => resolve((reader.result as string).split(',')[1]);
                        reader.readAsDataURL(file);
                    });
                }
                
                result = await analyzeImage(apiKey, base64, mimeType);

            } else if (media.type === 'video') {
                let videoUrl = '';
                if (typeof media.source === 'string') {
                    videoUrl = media.source;
                } else {
                    videoUrl = URL.createObjectURL(media.source);
                }
                
                result = await analyzeVideo(apiKey, videoUrl);
            }

            if (result) {
                const formattedResult = `
### Subject
${result.subject}

### Lighting
${result.lighting}

### Camera & Lens
${result.camera}

### Color & Mood
${result.color}

### Composition
${result.composition}

### Extracted Prompt
\`${result.extractedPrompt}\`
                `;
                setAnalysis(formattedResult);
            }

        } catch (e) {
            console.error("Analysis failed", e);
            setAnalysis(`Analysis failed: ${e instanceof Error ? e.message : "Unknown error"}. Please check the logs.`);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleClear = () => {
        setAnalysis(null);
        setClearKey(prev => prev + 1);
    };

    const navigateTo = (view: ActiveView) => {
        if (onNavigate) onNavigate(view);
    };

    return (
        <div className="flex flex-col h-full bg-primary text-text-primary">
            {activeTab === 'hub' && (
                <div className="p-8 max-w-7xl mx-auto w-full overflow-y-auto custom-scrollbar">
                    <div className="mb-10 text-center">
                        <div className="inline-block p-4 rounded-full bg-neutral-800 mb-4 border border-neutral-700 shadow-xl">
                            <AnalyzerIcon className="w-12 h-12 text-blue-500" />
                        </div>
                        <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Visual Director (Kine)</h1>
                        <p className="text-xl text-neutral-400 max-w-2xl mx-auto">
                            Advanced cinematography analysis, asset generation, and visual effects command center.
                        </p>
                    </div>

                    <div className="space-y-8 pb-10">
                        {/* Core Analysis & Chat */}
                        <div>
                            <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-4 border-b border-neutral-800 pb-2">Analysis & Direction</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <StudioCard 
                                    title="Visual Analyzer" 
                                    description="Upload reference images or video to extract cinematography data, lighting setups, and prompts."
                                    icon={<AnalyzerIcon className="w-6 h-6"/>}
                                    onClick={() => setActiveTab('analyzer')}
                                    color="text-blue-400"
                                />
                                <StudioCard 
                                    title="Director Chat" 
                                    description="Discuss visual style, lenses, and lighting with Kine, your AI Director of Photography."
                                    icon={<ChatIcon className="w-6 h-6"/>}
                                    onClick={() => setActiveTab('chat')}
                                    color="text-green-400"
                                />
                                <StudioCard 
                                    title="MythOS Cinematic" 
                                    description="Next-gen Illustrious SDXL engine for high-fidelity, cinematic still photography."
                                    icon={<CameraLensIcon className="w-6 h-6"/>}
                                    onClick={() => navigateTo('mythos-cinematic-engine')}
                                    color="text-purple-400"
                                    isExternal
                                />
                            </div>
                        </div>

                        {/* Generation Tools */}
                        <div>
                            <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-4 border-b border-neutral-800 pb-2">Generation Suite</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <StudioCard 
                                    title="Image Studio" 
                                    description="Generate conceptual images and storyboards using standard models."
                                    icon={<ImageIcon className="w-6 h-6"/>}
                                    onClick={() => navigateTo('image-generator')}
                                />
                                <StudioCard 
                                    title="Video Creator" 
                                    description="Turn images into cinematic video clips using Wan 2.2."
                                    icon={<ClapperboardIcon className="w-6 h-6"/>}
                                    onClick={() => navigateTo('generative-video')}
                                />
                                <StudioCard 
                                    title="Storyboard" 
                                    description="Assemble your generated assets into a narrative sequence."
                                    icon={<StoryboardIcon className="w-6 h-6"/>}
                                    onClick={() => navigateTo('story')}
                                />
                                <StudioCard 
                                    title="UHD Generator" 
                                    description="Create massive 4K+ detailed renders for final assets."
                                    icon={<PhotoRealismIcon className="w-6 h-6"/>}
                                    onClick={() => navigateTo('photorealism')}
                                />
                            </div>
                        </div>

                        {/* VFX & Utilities */}
                        <div>
                            <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-4 border-b border-neutral-800 pb-2">VFX & Post-Production</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <StudioCard 
                                    title="Blender" 
                                    description="Mix concepts and styles from multiple images."
                                    icon={<BlenderIcon className="w-6 h-6"/>}
                                    onClick={() => navigateTo('blender')}
                                />
                                <StudioCard 
                                    title="Compositor" 
                                    description="Place characters into backgrounds with auto-masking."
                                    icon={<LayersIcon className="w-6 h-6"/>}
                                    onClick={() => navigateTo('scene-compositor')}
                                />
                                <StudioCard 
                                    title="DreamO Composite" 
                                    description="Advanced identity and style fusion."
                                    icon={<PuzzleIcon className="w-6 h-6"/>}
                                    onClick={() => navigateTo('composite')}
                                />
                                <StudioCard 
                                    title="Face Swap" 
                                    description="Replace actor identities in scenes."
                                    icon={<SwapIcon className="w-6 h-6"/>}
                                    onClick={() => navigateTo('face-swap')}
                                />
                                <StudioCard 
                                    title="Face Repair" 
                                    description="Restore and enhance facial details."
                                    icon={<FaceSparkleIcon className="w-6 h-6"/>}
                                    onClick={() => navigateTo('face-repair')}
                                />
                                <StudioCard 
                                    title="Resize / Outpaint" 
                                    description="Expand image borders and change aspect ratios."
                                    icon={<ExpandIcon className="w-6 h-6"/>}
                                    onClick={() => navigateTo('resize')}
                                />
                                <StudioCard 
                                    title="Green Screen" 
                                    description="Remove video backgrounds automatically."
                                    icon={<ScissorsIcon className="w-6 h-6"/>}
                                    onClick={() => navigateTo('green-screen')}
                                />
                                <StudioCard 
                                    title="Enhance (Topaz)" 
                                    description="Professional upscaling and restoration."
                                    icon={<MagicIcon className="w-6 h-6"/>}
                                    onClick={() => navigateTo('topaz')}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab !== 'hub' && (
                <div className="flex-shrink-0 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-10">
                    <div className="max-w-7xl mx-auto flex items-center">
                        <button 
                            onClick={() => setActiveTab('hub')} 
                            className="px-6 py-4 text-sm font-bold text-neutral-400 hover:text-white border-r border-neutral-800 transition-colors"
                        >
                            ← Hub
                        </button>
                        <div className="flex">
                            <button 
                                onClick={() => setActiveTab('analyzer')} 
                                className={`px-6 py-4 text-sm font-bold flex items-center gap-2 transition-colors border-b-2 ${activeTab === 'analyzer' ? 'text-white border-blue-500 bg-neutral-800/50' : 'text-neutral-500 border-transparent hover:text-neutral-300'}`}
                            >
                                <AnalyzerIcon className="w-4 h-4" /> Visual Analyzer
                            </button>
                            <button 
                                onClick={() => setActiveTab('chat')} 
                                className={`px-6 py-4 text-sm font-bold flex items-center gap-2 transition-colors border-b-2 ${activeTab === 'chat' ? 'text-white border-blue-500 bg-neutral-800/50' : 'text-neutral-500 border-transparent hover:text-neutral-300'}`}
                            >
                                <ChatIcon className="w-4 h-4" /> Director Chat
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-grow overflow-hidden">
                {activeTab === 'analyzer' && (
                    <div className="h-full overflow-y-auto p-6 max-w-7xl mx-auto w-full custom-scrollbar">
                        <div className="flex flex-col gap-8 pb-20">
                            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-lg">
                                <h3 className="text-lg font-bold text-white mb-4">Input Reference</h3>
                                <MediaInput key={clearKey} onMediaChange={handleMediaChange} />
                            </div>

                            {isAnalyzing && (
                                <div className="text-center py-12">
                                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                                    <p className="text-neutral-400 animate-pulse">Kine is analyzing the shot...</p>
                                </div>
                            )}

                            {analysis && (
                                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-lg animate-fade-in">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-lg font-bold text-white">Cinematography Report</h3>
                                        <button onClick={handleClear} className="text-sm text-neutral-500 hover:text-white">Clear</button>
                                    </div>
                                    <AnalysisResult 
                                        result={analysis}
                                        onPlayAudio={() => {}} 
                                        onStopAudio={() => {}}
                                        onGenerateAudio={() => {}}
                                        onReEngineerPrompt={() => {}}
                                        isReEngineering={false}
                                        onForgeArtifact={() => {}}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'chat' && (
                    <AgentChatView agent={kineAgent} hasApiKey={hasApiKey} />
                )}
            </div>
        </div>
    );
};