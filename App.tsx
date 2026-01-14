import React, { useState, useEffect } from 'react';
import { Project, ActiveView, ImageState, StoryboardFrame, InspirationImage, BlenderImage, SceneCompositorState, CompositeState, FaceSwapState, FaceRepairState, PhotorealismState, ResizeState, GreenScreenState, BackgroundRemovalState, QwenImageEditState, GenerativeVideoState, CameraMovementState, TransitionState, TopazState, AutomationConfig, Agent, LoreEntry, DynamicPromptList, PromptTemplate, ScriptFile } from './types.ts';
import { DashboardStudio } from './components/DashboardStudio.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { ImageGeneratorStudio } from './components/ImageGeneratorStudio.tsx';
import { Storyboard } from './components/Storyboard.tsx';
import { ScriptWriterStudio } from './components/ScriptWriterStudio.tsx';
import { CharactersStudio } from './components/CharactersStudio.tsx';
import { LoreStudio } from './components/LoreStudio.tsx';
import { PromptLibraryStudio } from './components/PromptLibraryStudio.tsx';
import { DynamicPromptsStudio } from './components/DynamicPromptsStudio.tsx';
import { TeamStudio } from './components/TeamStudio.tsx';
import { GenericAgentStudio } from './components/GenericAgentStudio.tsx';
import { CoreStudio } from './components/CoreStudio.tsx';
import { IdeationStudio } from './components/IdeationStudio.tsx';
import { ScriptingStudio } from './components/ScriptingStudio.tsx';
import { DesignStudio } from './components/DesignStudio.tsx';
import { ArtStudio } from './components/ArtStudio.tsx';
import { KnowledgeView } from './components/KnowledgeView.tsx';
import { AutomationStudio } from './components/AutomationStudio.tsx';
import { ProjectsStudio } from './components/ProjectsStudio.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { ImageModal } from './components/ImageModal.tsx';
import { InspirationBoard } from './components/InspirationBoard.tsx';
import { ScriptViewer } from './components/ScriptViewer.tsx';
import { VideoGenerator } from './components/VideoGenerator.tsx';
import { MythosCinematicStudio } from './components/MythosCinematicStudio.tsx';
import { GenerativeVideoStudio } from './components/GenerativeVideoStudio.tsx';
import { TransitionStudio } from './components/TransitionStudio.tsx';
import { CameraMovementStudio } from './components/CameraMovementStudio.tsx';
import { BlenderStudio } from './components/BlenderStudio.tsx';
import { SceneCompositorStudio } from './components/SceneCompositorStudio.tsx';
import { CompositeStudio } from './components/CompositeStudio.tsx';
import { FaceSwapStudio } from './components/FaceSwapStudio.tsx';
import { FaceRepairStudio } from './components/FaceRepairStudio.tsx';
import { PhotorealismStudio } from './components/PhotorealismStudio.tsx';
import { ResizeStudio } from './components/ResizeStudio.tsx';
import { GreenScreenStudio } from './components/GreenScreenStudio.tsx';
import { BackgroundRemovalStudio } from './components/BackgroundRemovalStudio.tsx';
import { QwenImageEditStudio } from './components/QwenImageEditStudio.tsx';
import { TopazStudio } from './components/TopazStudio.tsx';
import { DirectorStudio } from './modules/director/DirectorStudio.tsx';
import { getHfApiKey, getTopazApiKey, saveHfApiKey, saveTopazApiKey } from './services/apiKeyService.ts';
import { getAnimAgentsTeam } from './services/agentService.ts';
import { SimpleCinematicStudio } from './components/SimpleCinematicStudio.tsx';
import { RosterStudio } from './components/RosterStudio.tsx';
import { AgentChatStudio } from './components/AgentChatStudio.tsx';

// Mock initial data
const INITIAL_PROJECT: Project = {
    id: 'proj_default',
    name: 'Untitled Project',
    tagline: 'A new creative endeavor.',
    progress: 0,
    data: {
        images: [],
        storyboard: [],
        scriptText: '',
        scriptsBin: [],
        inspirationImages: [],
        blenderImages: [],
        blenderResult: null,
        sceneCompositorState: { background: null, character: null, result: null },
        compositeState: { refImage1: null, refImage2: null, task1: 'style', task2: 'style', prompt: '', negativePrompt: '', width: 1024, height: 1024, seed: 0, randomizeSeed: true, resultImage: null, resultVideoUrl: null },
        faceSwapState: { source: null, face: null, result: null },
        faceRepairState: { source: null, result: null },
        photorealismState: { source: null, result: null, prompt: '', negativePrompt: '' },
        resizeState: { source: null, result: null, width: 1024, height: 1024, prompt: '', alignment: 'Middle', overlap: 50, steps: 50, directions: { left: false, right: false, top: false, bottom: false } },
        greenScreenState: { source: null, resultUrl: null },
        backgroundRemovalState: { source: null, result: null },
        qwenImageEditState: { images: [null, null, null, null, null, null], result: null, prompt: '', negativePrompt: '', cfgScale: 4.0, seed: 0, randomizeSeed: true, width: 1024, height: 1024, steps: 25 },
        generativeVideoState: { prompt: '', negativePrompt: '', image: null, lastImage: null, resultUrl: null, engine: 'wan', externalUrl: '', steps: 6, duration: 3.5, guidanceScale: 5, guidanceScale2: 1, scheduler: 'UniPCMultistep', fps: 16, seed: 42, randomizeSeed: true },
        cameraMovementState: { source: null, prompt: '', negativePrompt: '', movementType: '', steps: 50, guidanceScale: 3, seed: 42, randomizeSeed: true, resultUrl: null },
        transitionState: { startImage: null, endImage: null, prompt: '', negativePrompt: '', duration: 2.0, steps: 20, guidanceScale: 5, guidanceScale2: 1, seed: 42, randomizeSeed: true, resultUrl: null },
        topazState: { activeMediaType: 'image', source: null, result: null, resultUrl: null, operation: 'enhance', parameters: { scale: 2, strength: 50 }, faceRecovery: true },
        directorState: null,
        agents: getAnimAgentsTeam(),
        studioPlayers: [],
        characters: [],
        lore: [],
        dynamicPromptLists: [],
        promptTemplates: [],
        automationConfig: { ragEnabled: false, ragProvider: 'browser', ragApiKey: '', ragBaseUrl: '', ragKnowledgeBoxId: '', ragLocalhostUrl: 'http://localhost:4000/api/rag', webhookUrls: [] }
    }
};

export const App = () => {
    const [project, setProject] = useState<Project>(INITIAL_PROJECT);
    const [activeView, setActiveView] = useState<ActiveView>('dashboard');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState<ImageState | null>(null);
    const [activeAgentId, setActiveAgentId] = useState<string | null>(null);

    const updateProjectData = (updates: Partial<Project['data']>) => {
        setProject(prev => ({
            ...prev,
            data: { ...prev.data, ...updates }
        }));
    };

    const handleAddAssetToGrid = (asset: any) => {
        const newImage: ImageState = {
            id: `img_${Date.now()}`,
            type: asset.type,
            base64: asset.base64,
            url: asset.url,
            mimeType: asset.mimeType,
            metadata: asset.metadata
        };
        updateProjectData({ images: [newImage, ...project.data.images] });
    };

    const handleAddToStoryboard = (base64: string) => {
        const newFrame: StoryboardFrame = {
            id: `frame_${Date.now()}`,
            base64Image: base64,
            notes: ''
        };
        updateProjectData({ storyboard: [...project.data.storyboard, newFrame] });
    };

    const handleAddToInspiration = (base64: string) => {
        const newInspo: InspirationImage = {
            id: `inspo_${Date.now()}`,
            base64Image: base64
        };
        updateProjectData({ inspirationImages: [...project.data.inspirationImages, newInspo] });
    };

    const handleNavigate = (view: ActiveView, agentId?: string) => {
        setActiveView(view);
        if (agentId) setActiveAgentId(agentId);
    };

    const renderView = () => {
        switch(activeView) {
            case 'dashboard': return <DashboardStudio project={project} onUpdateProject={(u) => setProject({...project, ...u})} images={project.data.images} stats={{ storyboardFrames: project.data.storyboard.length, agents: project.data.agents.length, loreEntries: project.data.lore.length, inspirationImages: project.data.inspirationImages.length, dynamicPromptLists: project.data.dynamicPromptLists.length, promptTemplates: project.data.promptTemplates.length, imagesGenerated: project.data.images.length, totalProjects: 1, scriptsCount: project.data.scriptsBin.length }} onNavigate={handleNavigate} />;
            case 'projects': return <ProjectsStudio projects={[project]} activeProjectId={project.id} onSelectProject={() => {}} onCreateProject={() => {}} onRenameProject={() => {}} onDeleteProject={() => {}} />;
            case 'image-generator': return <ImageGeneratorStudio hfToken={getHfApiKey() || ''} promptTemplates={project.data.promptTemplates} dynamicPromptLists={project.data.dynamicPromptLists} agents={project.data.agents} onAddAssetToGrid={handleAddAssetToGrid} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} onCreateAgent={() => project.data.agents[0]} />;
            case 'story': return <Storyboard frames={project.data.storyboard} onUpdateNote={(id, note) => updateProjectData({ storyboard: project.data.storyboard.map(f => f.id === id ? { ...f, notes: note } : f) })} onRemove={(id) => updateProjectData({ storyboard: project.data.storyboard.filter(f => f.id !== id) })} onReorder={() => {}} />;
            case 'inspiration': return <InspirationBoard images={project.data.inspirationImages} onUpload={() => {}} onRemove={(id) => updateProjectData({ inspirationImages: project.data.inspirationImages.filter(i => i.id !== id) })} onUseAsGuide={() => {}} />;
            case 'script-writer': return <ScriptWriterStudio onSendToScriptsBin={(script) => updateProjectData({ scriptsBin: [...project.data.scriptsBin, { ...script, id: `script_${Date.now()}`, date: new Date().toLocaleDateString() }] })} onNavigate={handleNavigate} promptTemplates={project.data.promptTemplates} dynamicPromptLists={project.data.dynamicPromptLists} />;
            case 'characters': return <CharactersStudio characters={project.data.characters} onCreate={(c) => updateProjectData({ characters: [...project.data.characters, { ...c, id: `char_${Date.now()}` } as any] })} onUpdate={(id, c) => updateProjectData({ characters: project.data.characters.map(ch => ch.id === id ? { ...ch, ...c } : ch) })} onDelete={(id) => updateProjectData({ characters: project.data.characters.filter(ch => ch.id !== id) })} />;
            case 'lore': return <LoreStudio lore={project.data.lore} projects={[{ id: project.id, name: project.name }]} onCreate={(t, c, pid) => updateProjectData({ lore: [...project.data.lore, { id: `lore_${Date.now()}`, title: t, content: c, projectId: pid }] })} onUpdate={(id, t, c) => updateProjectData({ lore: project.data.lore.map(l => l.id === id ? { ...l, title: t, content: c } : l) })} onDelete={(id) => updateProjectData({ lore: project.data.lore.filter(l => l.id !== id) })} />;
            case 'prompt-library': return <PromptLibraryStudio templates={project.data.promptTemplates} onCreate={(n, p, neg) => updateProjectData({ promptTemplates: [...project.data.promptTemplates, { id: `pt_${Date.now()}`, name: n, positivePrompt: p, negativePrompt: neg }] })} onUpdate={(id, n, p, neg) => updateProjectData({ promptTemplates: project.data.promptTemplates.map(t => t.id === id ? { ...t, name: n, positivePrompt: p, negativePrompt: neg } : t) })} onDelete={(id) => updateProjectData({ promptTemplates: project.data.promptTemplates.filter(t => t.id !== id) })} />;
            case 'dynamic-prompts': return <DynamicPromptsStudio lists={project.data.dynamicPromptLists} onCreate={(n, i) => updateProjectData({ dynamicPromptLists: [...project.data.dynamicPromptLists, { id: `dpl_${Date.now()}`, name: n, items: i }] })} onUpdate={(id, n, i) => updateProjectData({ dynamicPromptLists: project.data.dynamicPromptLists.map(l => l.id === id ? { ...l, name: n, items: i } : l) })} onDelete={(id) => updateProjectData({ dynamicPromptLists: project.data.dynamicPromptLists.filter(l => l.id !== id) })} />;
            case 'team': return <TeamStudio team={project.data.agents} onUpdateAgent={(id, u) => updateProjectData({ agents: project.data.agents.map(a => a.id === id ? { ...a, ...u } : a) })} onNavigate={handleNavigate} onCallAgent={() => {}} />;
            case 'agent-workspace': {
                const agent = project.data.agents.find(a => a.id === activeAgentId) || project.data.agents[0];
                if (agent.id === 'agent-core') return <CoreStudio agent={agent} onNavigate={handleNavigate} onCallAgent={() => {}} />;
                if (agent.id === 'agent-ideation') return <IdeationStudio agent={agent} onNavigate={handleNavigate} onCallAgent={() => {}} />;
                if (agent.id === 'agent-scripting') return <ScriptingStudio agent={agent} onNavigate={handleNavigate} onCallAgent={() => {}} scriptText={project.data.scriptText} scriptsBin={project.data.scriptsBin} onDeleteScript={(id) => updateProjectData({ scriptsBin: project.data.scriptsBin.filter(s => s.id !== id) })} onScriptUpload={() => {}} />;
                if (agent.id === 'agent-design') return <DesignStudio agent={agent} onNavigate={handleNavigate} onCallAgent={() => {}} />;
                if (agent.id === 'agent-art') return <ArtStudio agent={agent} onNavigate={handleNavigate} onCallAgent={() => {}} />;
                return <GenericAgentStudio agent={agent} onNavigate={handleNavigate} onCallAgent={() => {}} />;
            }
            case 'mythos-cinematic-engine': return <MythosCinematicStudio hfToken={getHfApiKey() || ''} promptTemplates={project.data.promptTemplates} dynamicPromptLists={project.data.dynamicPromptLists} onAddAssetToGrid={handleAddAssetToGrid} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} onClearInitialPrompt={() => {}} />;
            case 'generative-video': return <GenerativeVideoStudio apiKey={''} hfToken={getHfApiKey() || ''} videoState={project.data.generativeVideoState} onStateUpdate={s => updateProjectData({ generativeVideoState: s })} onAddImageToGrid={handleAddAssetToGrid} onAddToStoryboard={handleAddToStoryboard} onAddAssetToGrid={handleAddAssetToGrid} projects={[{ id: project.id, name: project.name }]} activeProjectId={project.id} />;
            case 'transition-studio': return <TransitionStudio state={project.data.transitionState} onStateUpdate={s => updateProjectData({ transitionState: s })} onAddAssetToGrid={handleAddAssetToGrid} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} hfToken={getHfApiKey() || ''} projects={[{ id: project.id, name: project.name }]} activeProjectId={project.id} />;
            case 'camera-movement': return <CameraMovementStudio state={project.data.cameraMovementState} onStateUpdate={s => updateProjectData({ cameraMovementState: s })} onAddAssetToGrid={handleAddAssetToGrid} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} hfToken={getHfApiKey() || ''} />;
            case 'blender': return <BlenderStudio sourceImages={project.data.blenderImages} resultImage={project.data.blenderResult} isLoading={false} error={null} onUpload={() => {}} onRemoveImage={() => {}} onGenerate={() => {}} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} hfToken={getHfApiKey() || ''} />;
            case 'scene-compositor': return <SceneCompositorStudio sceneState={project.data.sceneCompositorState} isLoading={false} error={null} onUpload={() => {}} onRemoveImage={() => {}} onGenerate={() => {}} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} hfToken={getHfApiKey() || ''} onUpdateImage={() => {}} />;
            case 'composite': return <CompositeStudio state={project.data.compositeState} onStateUpdate={s => updateProjectData({ compositeState: s })} onAddAssetToGrid={handleAddAssetToGrid} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} hfToken={getHfApiKey() || ''} />;
            case 'face-swap': return <FaceSwapStudio faceSwapState={project.data.faceSwapState} isLoading={false} error={null} onUpload={() => {}} onRemoveImage={() => {}} onGenerate={() => {}} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} hfToken={getHfApiKey() || ''} />;
            case 'face-repair': return <FaceRepairStudio faceRepairState={project.data.faceRepairState} isLoading={false} error={null} onUpload={() => {}} onRemoveImage={() => {}} onGenerate={() => {}} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} hfToken={getHfApiKey() || ''} />;
            case 'photorealism': return <PhotorealismStudio photorealismState={project.data.photorealismState} isLoading={false} error={null} onUpload={() => {}} onRemoveImage={() => {}} onGenerate={() => {}} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} onPromptChange={() => {}} hfToken={getHfApiKey() || ''} onAddAssetToGrid={handleAddAssetToGrid} />;
            case 'resize': return <ResizeStudio state={project.data.resizeState} onStateUpdate={s => updateProjectData({ resizeState: s })} onAddAssetToGrid={handleAddAssetToGrid} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} hfToken={getHfApiKey() || ''} />;
            case 'green-screen': return <GreenScreenStudio greenScreenState={project.data.greenScreenState} isLoading={false} error={null} onStateUpdate={s => updateProjectData({ greenScreenState: s })} onAddToStoryboard={handleAddToStoryboard} onAddAssetToGrid={handleAddAssetToGrid} hfToken={getHfApiKey() || ''} />;
            case 'background-removal': return <BackgroundRemovalStudio state={project.data.backgroundRemovalState} onStateUpdate={s => updateProjectData({ backgroundRemovalState: s })} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} onAddAssetToGrid={handleAddAssetToGrid} hfToken={getHfApiKey() || ''} />;
            case 'qwen-image-edit': return <QwenImageEditStudio state={project.data.qwenImageEditState} onStateUpdate={s => updateProjectData({ qwenImageEditState: s })} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} onAddAssetToGrid={handleAddAssetToGrid} hfToken={getHfApiKey() || ''} />;
            case 'topaz': return <TopazStudio topazState={project.data.topazState} isLoading={false} error={null} onStateUpdate={s => updateProjectData({ topazState: s })} onGenerate={() => {}} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} onAddAssetToGrid={handleAddAssetToGrid} progress="" />;
            case 'director': return <DirectorStudio onNavigate={handleNavigate} />;
            case 'grid': return <ImageGeneratorStudio hfToken={getHfApiKey() || ''} promptTemplates={project.data.promptTemplates} dynamicPromptLists={project.data.dynamicPromptLists} agents={project.data.agents} onAddAssetToGrid={handleAddAssetToGrid} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} onCreateAgent={() => project.data.agents[0]} />;
            case 'knowledge': return <KnowledgeView agents={project.data.agents} onUpdateAgent={(id, u) => updateProjectData({ agents: project.data.agents.map(a => a.id === id ? { ...a, ...u } : a) })} />;
            case 'automation': return <AutomationStudio config={project.data.automationConfig} onSave={(c) => updateProjectData({ automationConfig: c })} onTestWebhook={async () => true} />;
            case 'studio-players': return <RosterStudio rosterType="player" agents={project.data.studioPlayers} images={project.data.images} onCreateEntity={(d) => project.data.agents[0]} onViewImage={() => {}} onUpdateEntity={() => {}} onDeleteEntity={() => {}} onImageUpload={() => {}} onCallEntity={() => {}} />;
            case 'agents': return <RosterStudio rosterType="ai" agents={project.data.agents} images={project.data.images} onCreateEntity={(d) => project.data.agents[0]} onViewImage={() => {}} onUpdateEntity={(id, u) => updateProjectData({ agents: project.data.agents.map(a => a.id === id ? { ...a, ...u } : a) })} onDeleteEntity={() => {}} onImageUpload={() => {}} onCallEntity={() => {}} />;
            case 'one-shot-cinematic': return <SimpleCinematicStudio hfToken={getHfApiKey() || ''} onAddAssetToGrid={handleAddAssetToGrid} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} project={project} />;
            case 'scripts-bin': return <ScriptingStudio agent={project.data.agents[0]} onNavigate={handleNavigate} onCallAgent={() => {}} scriptText={project.data.scriptText} scriptsBin={project.data.scriptsBin} onDeleteScript={() => {}} onScriptUpload={() => {}} defaultTab="bin" />;
            case 'agent-chat': return <AgentChatStudio agents={project.data.agents} onUploadLore={() => {}} onCallTool={async () => ({ textResult: '' })} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} onAddAssetToGrid={handleAddAssetToGrid} />;
            default: return <DashboardStudio project={project} onUpdateProject={(u) => setProject({...project, ...u})} images={project.data.images} stats={{ storyboardFrames: project.data.storyboard.length, agents: project.data.agents.length, loreEntries: project.data.lore.length, inspirationImages: project.data.inspirationImages.length, dynamicPromptLists: project.data.dynamicPromptLists.length, promptTemplates: project.data.promptTemplates.length, imagesGenerated: project.data.images.length, totalProjects: 1, scriptsCount: project.data.scriptsBin.length }} onNavigate={handleNavigate} />;
        }
    };

    return (
        <div className="flex h-screen w-full bg-black text-white font-sans overflow-hidden">
            <Sidebar activeView={activeView} onNavigate={handleNavigate} onOpenSettings={() => setIsSettingsOpen(true)} />
            <div className="flex-grow flex flex-col h-full overflow-hidden bg-neutral-900 relative">
                {renderView()}
                {selectedImage && (
                    <ImageModal 
                        image={selectedImage} 
                        onClose={() => setSelectedImage(null)} 
                        onEdit={() => {}} 
                        onAddToStoryboard={handleAddToStoryboard} 
                        onAddToInspiration={handleAddToInspiration} 
                        agents={project.data.agents} 
                        onAssignAgentToImage={() => {}} 
                        onCreateAgent={() => project.data.agents[0]} 
                    />
                )}
                <SettingsModal 
                    isOpen={isSettingsOpen} 
                    onClose={() => setIsSettingsOpen(false)} 
                    onSave={(t, h) => { saveTopazApiKey(t); saveHfApiKey(h); setIsSettingsOpen(false); }} 
                    currentTopazApiKey={getTopazApiKey() || ''} 
                    currentHfApiKey={getHfApiKey() || ''} 
                />
            </div>
        </div>
    );
};