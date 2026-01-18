










import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { DashboardStudio } from './components/DashboardStudio';
import { ProjectsStudio } from './components/ProjectsStudio';
import { AutomationStudio } from './components/AutomationStudio';
import { DirectorStudio } from './modules/director/DirectorStudio';
import { ScriptWriterStudio } from './components/ScriptWriterStudio';
import { ImageGeneratorStudio } from './components/ImageGeneratorStudio';
import { MythosCinematicStudio } from './components/MythosCinematicStudio';
import { SimpleCinematicStudio } from './components/SimpleCinematicStudio';
import { GenerativeVideoStudio } from './components/GenerativeVideoStudio';
import { TransitionStudio } from './components/TransitionStudio';
import { CameraMovementStudio } from './components/CameraMovementStudio';
import { CameraMovesStudio } from './components/CameraMovesStudio';
import { BlenderStudio } from './components/BlenderStudio';
import { SceneCompositorStudio } from './components/SceneCompositorStudio';
import { CompositeStudio } from './components/CompositeStudio';
import { FaceSwapStudio } from './components/FaceSwapStudio';
import { FaceRepairStudio } from './components/FaceRepairStudio';
import { PhotorealismStudio } from './components/PhotorealismStudio';
import { ResizeStudio } from './components/ResizeStudio';
import { GreenScreenStudio } from './components/GreenScreenStudio';
import { BackgroundRemovalStudio } from './components/BackgroundRemovalStudio';
import { QwenImageEditStudio } from './components/QwenImageEditStudio';
import { TopazStudio } from './components/TopazStudio';
import { ImageGrid } from './components/ImageGrid';
import { Storyboard } from './components/Storyboard';
import { InspirationBoard } from './components/InspirationBoard';
import { ScriptViewer } from './components/ScriptViewer';
import { CharactersStudio } from './components/CharactersStudio';
import { LoreStudio } from './components/LoreStudio';
import { PromptLibraryStudio } from './components/PromptLibraryStudio';
import { DynamicPromptsStudio } from './components/DynamicPromptsStudio';
import { AgentChatStudio } from './components/AgentChatStudio';
import { KnowledgeView } from './components/KnowledgeView';
import { ModelSettingsStudio } from './components/ModelSettingsStudio';
import { GenericAgentStudio } from './components/GenericAgentStudio';
import { CoreStudio } from './components/CoreStudio';
import { IdeationStudio } from './components/IdeationStudio';
import { ScriptingStudio } from './components/ScriptingStudio';
import { DesignStudio } from './components/DesignStudio';
import { ArtStudio } from './components/ArtStudio';
import { RosterStudio } from './components/RosterStudio';
import { VoiceLab } from './components/VoiceLab.tsx';
import { ImageModal } from './components/ImageModal.tsx';
import { Agent, Project, ActiveView, ImageState } from './types';
import { getHfApiKey, getTopazApiKey, saveHfApiKey, saveTopazApiKey, getVoiceLabUrl, saveVoiceLabUrl, getDolphinUrl, saveDolphinUrl, getCinematicCoreUrl, saveCinematicCoreUrl, getCameraDollyUrl, saveCameraDollyUrl } from './services/apiKeyService';
import { getAnimAgentsTeam } from './services/agentService';
import { vectorDb } from './services/vectorDbService';
import { AgentsStudio } from './components/AgentsStudio.tsx';
import { WanimateStudio } from './components/WanimateStudio.tsx';
import { DubbingStudio } from './components/DubbingStudio.tsx';

const DEFAULT_PROJECT_ID = 'project-alpha';

const INITIAL_PROJECT: Project = {
    id: DEFAULT_PROJECT_ID,
    name: 'New MythOS Production',
    tagline: 'Film, TV, Audio & Digital Content Creation.',
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
        compositeState: { refImage1: null, refImage2: null, task1: 'ip', task2: 'ip', prompt: '', negativePrompt: '', width: 1024, height: 1024, seed: 0, randomizeSeed: true, resultImage: null, resultVideoUrl: null },
        faceSwapState: { source: null, face: null, result: null },
        faceRepairState: { source: null, result: null },
        photorealismState: { source: null, result: null, prompt: '', negativePrompt: '' },
        resizeState: { source: null, result: null, width: 1024, height: 1024, prompt: '', alignment: 'Middle', overlap: 50, steps: 50, directions: { left: false, right: false, top: false, bottom: false } },
        greenScreenState: { source: null, resultUrl: null },
        backgroundRemovalState: { source: null, result: null },
        qwenImageEditState: { images: [null, null, null, null, null, null], result: null, prompt: '', negativePrompt: '', cfgScale: 4.0, seed: 0, randomizeSeed: true, width: 1024, height: 1024, steps: 25 },
        generativeVideoState: { prompt: '', negativePrompt: '', image: null, lastImage: null, resultUrl: null, engine: '', externalUrl: '', steps: 25, duration: 4, guidanceScale: 7.5, guidanceScale2: 7.5, fps: 24, seed: 0, randomizeSeed: true },
        cameraMovementState: { source: null, prompt: '', negativePrompt: '', movementType: '', steps: 25, guidanceScale: 7.5, seed: 0, randomizeSeed: true, resultUrl: null },
        cameraMovesState: { sourceVideo: null, prompt: 'A cinematic camera move around the subject', cameraType: '1', steps: 20, resultUrl: null },
        transitionState: { startImage: null, endImage: null, prompt: '', negativePrompt: '', duration: 4, steps: 25, guidanceScale: 7.5, guidanceScale2: 7.5, seed: 0, randomizeSeed: true, resultUrl: null },
        topazState: { activeMediaType: 'image', source: null, result: null, resultUrl: null, operation: 'enhance', parameters: { scale: 2, strength: 50 }, faceRecovery: true },
        directorState: {},
        agents: getAnimAgentsTeam(),
        studioPlayers: [],
        characters: [],
        lore: [],
        dynamicPromptLists: [],
        promptTemplates: [],
        wanimateState: {
            inputImage: null,
            lastImage: null,
            prompt: "make this image come alive, cinematic motion, smooth animation",
            steps: 6,
            negativePrompt: "static, details fuzzy, subtitles, style, artwork, painting, still image, worst quality, low quality, JPEG artifacts, ugly, deformed, extra fingers, poorly drawn hands, poorly drawn faces, malformed, disfigured, malformed limbs, fused fingers, motionless image, cluttered background",
            durationSeconds: 3.5,
            guidanceScale: 1,
            guidanceScale2: 1,
            seed: 42,
            randomizeSeed: true,
            quality: 6,
            scheduler: 'UniPCMultistep',
            flowShift: 3,
            frameMultiplier: '16',
            resultUrl: null,
        },
        dubbingState: {
            sourceVideo: null,
            sourceAudio: null,
            resultUrl: null,
        },
        automationConfig: { ragEnabled: false, ragProvider: 'browser', ragApiKey: '', ragBaseUrl: '', ragKnowledgeBoxId: '', ragLocalhostUrl: '', webhookUrls: [] }
    }
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

export const App = () => {
    const [activeView, setActiveView] = useState<ActiveView>('dashboard');
    const [activeProjectId, setActiveProjectId] = useState<string>(DEFAULT_PROJECT_ID);
    const [projects, setProjects] = useState<Project[]>([INITIAL_PROJECT]);
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const [viewingImage, setViewingImage] = useState<ImageState | null>(null);

    // Load initial data
    useEffect(() => {
        const loadData = async () => {
            // Here you would load from DB/Storage
            // For now, using in-memory default
        };
        loadData();
    }, []);

    const project = projects.find(p => p.id === activeProjectId) || projects[0];

    const updateProjectData = (updates: Partial<typeof project.data>) => {
        setProjects(prev => prev.map(p => 
            p.id === activeProjectId 
                ? { ...p, data: { ...p.data, ...updates } } 
                : p
        ));
    };

    const handleAddAssetToGrid = (asset: { type: 'image' | 'video'; base64?: string; url?: string; mimeType?: string; metadata?: any, agentId?: string }, targetProjectId?: string) => {
        const pid = targetProjectId || activeProjectId;
        setProjects(prev => prev.map(p => {
            if (p.id === pid) {
                const newAsset: ImageState = {
                    id: `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    type: asset.type,
                    base64: asset.base64,
                    url: asset.url,
                    mimeType: asset.mimeType,
                    metadata: asset.metadata,
                    agentId: asset.agentId
                };
                
                if (asset.agentId) {
                    // Find the agent and add the asset to their private media gallery
                    const updatedAgents = p.data.agents.map(agent => {
                        if (agent.id === asset.agentId) {
                            return {
                                ...agent,
                                media: [newAsset, ...(agent.media || [])]
                            };
                        }
                        return agent;
                    });
                    return { ...p, data: { ...p.data, agents: updatedAgents } };
                } else {
                    // Add to the global project vault
                    return { ...p, data: { ...p.data, images: [newAsset, ...p.data.images] } };
                }
            }
            return p;
        }));
    };

    const handleAddToStoryboard = (base64: string) => {
        const newFrame = {
            id: `frame_${Date.now()}`,
            base64Image: base64,
            notes: ''
        };
        updateProjectData({ storyboard: [...project.data.storyboard, newFrame] });
    };

    const handleAddToInspiration = (base64: string) => {
        const newImage = {
            id: `inspo_${Date.now()}`,
            base64Image: base64
        };
        updateProjectData({ inspirationImages: [...project.data.inspirationImages, newImage] });
    };

    const handleNavigate = (view: ActiveView, agentId?: string) => {
        setActiveView(view);
        if (agentId) setSelectedAgentId(agentId);
    };

    const renderContent = () => {
        switch (activeView) {
            case 'dashboard': return <DashboardStudio project={project} onUpdateProject={(u) => setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, ...u } : p))} images={project.data.images} stats={{ storyboardFrames: project.data.storyboard.length, agents: project.data.agents.length, loreEntries: project.data.lore.length, inspirationImages: project.data.inspirationImages.length, dynamicPromptLists: project.data.dynamicPromptLists.length, promptTemplates: project.data.promptTemplates.length, imagesGenerated: project.data.images.length, totalProjects: projects.length, scriptsCount: project.data.scriptsBin.length }} onNavigate={handleNavigate} />;
            case 'projects': return <ProjectsStudio projects={projects} activeProjectId={activeProjectId} onSelectProject={setActiveProjectId} onCreateProject={(d) => setProjects(prev => [...prev, { ...INITIAL_PROJECT, id: `proj_${Date.now()}`, name: d.name, tagline: d.tagline, thumbnail: d.thumbnail }])} onRenameProject={(id, name) => setProjects(prev => prev.map(p => p.id === id ? { ...p, name } : p))} onDeleteProject={(id) => { setProjects(prev => prev.filter(p => p.id !== id)); if (activeProjectId === id && projects.length > 1) setActiveProjectId(projects[0].id); }} />;
            case 'agents': return <AgentsStudio agents={project.data.agents} images={project.data.images} onCreateEntity={(d) => { const newAgent = { ...d, id: `agent_${Date.now()}`, media: [] } as Agent; updateProjectData({ agents: [...project.data.agents, newAgent] }); return newAgent; }} onViewImage={setViewingImage} onUpdateEntity={(id, u) => updateProjectData({ agents: project.data.agents.map(a => a.id === id ? { ...a, ...u } : a) })} onDeleteEntity={(id) => updateProjectData({ agents: project.data.agents.filter(a => a.id !== id) })} onImageUpload={async (id, file) => { const b64 = await fileToBase64(file); updateProjectData({ agents: project.data.agents.map(a => a.id === id ? {...a, avatar: b64} : a) }) }} onCallEntity={(a) => { setSelectedAgentId(a.id); setActiveView('agent-workspace'); }} />;
            case 'agent-workspace': return selectedAgentId ? <GenericAgentStudio agent={project.data.agents.find(a => a.id === selectedAgentId)!} onNavigate={handleNavigate} onCallAgent={() => {}} /> : <div className="p-10 text-center text-neutral-500">Agent Not Found</div>;
            
            // Core Agents
            case 'core': return <CoreStudio agent={project.data.agents.find(a => a.id === 'agent-core')!} onNavigate={handleNavigate} onCallAgent={() => {}} />;
            case 'ideation': return <IdeationStudio agent={project.data.agents.find(a => a.id === 'agent-ideation')!} onNavigate={handleNavigate} onCallAgent={() => {}} />;
            case 'scripting': return <ScriptingStudio agent={project.data.agents.find(a => a.id === 'agent-scripting')!} onNavigate={handleNavigate} onCallAgent={() => {}} scriptText={project.data.scriptText} scriptsBin={project.data.scriptsBin} onDeleteScript={(id) => updateProjectData({ scriptsBin: project.data.scriptsBin.filter(s => s.id !== id) })} onScriptUpload={(f) => { const r = new FileReader(); r.onload = e => updateProjectData({ scriptText: e.target?.result as string }); r.readAsText(f); }} />;
            case 'design': return <DesignStudio agent={project.data.agents.find(a => a.id === 'agent-design')!} onNavigate={handleNavigate} onCallAgent={() => {}} />;
            case 'art': return <ArtStudio agent={project.data.agents.find(a => a.id === 'agent-art')!} onNavigate={handleNavigate} onCallAgent={() => {}} />;
            
            // Tools
            case 'director': return <DirectorStudio onNavigate={handleNavigate} />;
            case 'agent-chat': return <AgentChatStudio agents={project.data.agents} onUploadLore={() => {}} onCallTool={async () => ({ textResult: '' })} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} onAddAssetToGrid={handleAddAssetToGrid} />;
            
            // Creation
            case 'script-writer': return <ScriptWriterStudio onSendToScriptsBin={(s) => updateProjectData({ scriptsBin: [...project.data.scriptsBin, { ...s, id: `script_${Date.now()}`, date: new Date().toLocaleDateString() }] })} onNavigate={handleNavigate} promptTemplates={project.data.promptTemplates} dynamicPromptLists={project.data.dynamicPromptLists} />;
            case 'image-generator': return <ImageGeneratorStudio hfToken={getHfApiKey() || ''} promptTemplates={project.data.promptTemplates} dynamicPromptLists={project.data.dynamicPromptLists} agents={project.data.agents} onAddAssetToGrid={handleAddAssetToGrid} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} onCreateAgent={(d) => { const newAgent = { ...d, id: `agent_${Date.now()}` } as Agent; updateProjectData({ agents: [...project.data.agents, newAgent] }); return newAgent; }} />;
            case 'one-shot-cinematic': return <SimpleCinematicStudio hfToken={getHfApiKey() || ''} onAddAssetToGrid={handleAddAssetToGrid} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} project={project} />;
            case 'mythos-cinematic-engine': return <MythosCinematicStudio hfToken={getHfApiKey() || ''} promptTemplates={project.data.promptTemplates} dynamicPromptLists={project.data.dynamicPromptLists} onAddAssetToGrid={handleAddAssetToGrid} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} onClearInitialPrompt={() => {}} />;
            case 'generative-video': return <GenerativeVideoStudio apiKey={''} hfToken={getHfApiKey() || ''} videoState={project.data.generativeVideoState} onStateUpdate={s => updateProjectData({ generativeVideoState: s })} onAddImageToGrid={() => {}} onAddToStoryboard={handleAddToStoryboard} onAddAssetToGrid={handleAddAssetToGrid} projects={[{ id: project.id, name: project.name }]} activeProjectId={project.id} />;
            case 'wanimate-studio': return <WanimateStudio state={project.data.wanimateState} onStateUpdate={s => updateProjectData({ wanimateState: s })} onAddAssetToGrid={handleAddAssetToGrid} onAddToStoryboard={handleAddToStoryboard} hfToken={getHfApiKey() || ''} projects={[{ id: project.id, name: project.name }]} activeProjectId={project.id} />;
            case 'transition-studio': return <TransitionStudio state={project.data.transitionState} onStateUpdate={s => updateProjectData({ transitionState: s })} onAddAssetToGrid={handleAddAssetToGrid} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} hfToken={getHfApiKey() || ''} projects={[{ id: project.id, name: project.name }]} activeProjectId={project.id} promptTemplates={project.data.promptTemplates} />;
            case 'camera-movement': return <CameraMovementStudio state={project.data.cameraMovementState} onStateUpdate={s => updateProjectData({ cameraMovementState: s })} onAddAssetToGrid={handleAddAssetToGrid} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} hfToken={getHfApiKey() || ''} />;
            case 'camera-moves': return <CameraMovesStudio state={project.data.cameraMovesState} onStateUpdate={s => updateProjectData({ cameraMovesState: s })} onAddAssetToGrid={handleAddAssetToGrid} onAddToStoryboard={handleAddToStoryboard} hfToken={getHfApiKey() || ''} />;
            case 'blender': return <BlenderStudio sourceImages={project.data.blenderImages} resultImage={project.data.blenderResult} isLoading={false} error={null} onUpload={() => {}} onRemoveImage={() => {}} onGenerate={() => {}} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} hfToken={getHfApiKey() || ''} />;
            case 'scene-compositor': return <SceneCompositorStudio sceneState={project.data.sceneCompositorState} isLoading={false} error={null} onUpload={(t, f) => { const r = new FileReader(); r.onload = e => updateProjectData({ sceneCompositorState: { ...project.data.sceneCompositorState, [t]: { base64: (e.target?.result as string).split(',')[1], mimeType: f.type } } }); r.readAsDataURL(f); }} onRemoveImage={(t) => updateProjectData({ sceneCompositorState: { ...project.data.sceneCompositorState, [t]: null } })} onGenerate={() => {}} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} hfToken={getHfApiKey() || ''} onUpdateImage={(t, b, m) => updateProjectData({ sceneCompositorState: { ...project.data.sceneCompositorState, [t]: { base64: b, mimeType: m } } })} />;
            case 'composite': return <CompositeStudio state={project.data.compositeState} onStateUpdate={s => updateProjectData({ compositeState: s })} onAddAssetToGrid={handleAddAssetToGrid} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} hfToken={getHfApiKey() || ''} />;
            case 'face-swap': return <FaceSwapStudio faceSwapState={project.data.faceSwapState} isLoading={false} error={null} onUpload={(t, f) => { const r = new FileReader(); r.onload = e => updateProjectData({ faceSwapState: { ...project.data.faceSwapState, [t]: { base64: (e.target?.result as string).split(',')[1], mimeType: f.type } } }); r.readAsDataURL(f); }} onRemoveImage={(t) => updateProjectData({ faceSwapState: { ...project.data.faceSwapState, [t]: null } })} onGenerate={() => {}} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} hfToken={getHfApiKey() || ''} />;
            case 'face-repair': return <FaceRepairStudio faceRepairState={project.data.faceRepairState} isLoading={false} error={null} onUpload={(f) => { const r = new FileReader(); r.onload = e => updateProjectData({ faceRepairState: { ...project.data.faceRepairState, source: { base64: (e.target?.result as string).split(',')[1], mimeType: f.type } } }); r.readAsDataURL(f); }} onRemoveImage={() => updateProjectData({ faceRepairState: { ...project.data.faceRepairState, source: null } })} onGenerate={() => {}} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} hfToken={getHfApiKey() || ''} />;
            case 'photorealism': return <PhotorealismStudio photorealismState={project.data.photorealismState} isLoading={false} error={null} onUpload={() => {}} onRemoveImage={() => {}} onGenerate={() => {}} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} onPromptChange={(p, n) => updateProjectData({ photorealismState: { ...project.data.photorealismState, prompt: p, negativePrompt: n } })} hfToken={getHfApiKey() || ''} onAddAssetToGrid={handleAddAssetToGrid} />;
            case 'resize': return <ResizeStudio state={project.data.resizeState} onStateUpdate={s => updateProjectData({ resizeState: s })} onAddAssetToGrid={handleAddAssetToGrid} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} hfToken={getHfApiKey() || ''} />;
            case 'green-screen': return <GreenScreenStudio greenScreenState={project.data.greenScreenState} isLoading={false} error={null} onStateUpdate={s => updateProjectData({ greenScreenState: s })} onAddToStoryboard={handleAddToStoryboard} onAddAssetToGrid={handleAddAssetToGrid} hfToken={getHfApiKey() || ''} />;
            case 'background-removal': return <BackgroundRemovalStudio state={project.data.backgroundRemovalState} onStateUpdate={s => updateProjectData({ backgroundRemovalState: s })} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} onAddAssetToGrid={handleAddAssetToGrid} hfToken={getHfApiKey() || ''} />;
            case 'qwen-image-edit': return <QwenImageEditStudio state={project.data.qwenImageEditState} onStateUpdate={s => updateProjectData({ qwenImageEditState: s })} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} onAddAssetToGrid={handleAddAssetToGrid} hfToken={getHfApiKey() || ''} />;
            case 'topaz': return <TopazStudio topazState={project.data.topazState} isLoading={false} error={null} onStateUpdate={s => updateProjectData({ topazState: s })} onGenerate={() => {}} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} onAddAssetToGrid={handleAddAssetToGrid} progress="" />;
            
            // Audio
            case 'voice-lab': return <VoiceLab agents={project.data.agents} />;
            case 'dubbing-studio': return <DubbingStudio state={project.data.dubbingState} onStateUpdate={s => updateProjectData({ dubbingState: s })} onAddAssetToGrid={handleAddAssetToGrid} onAddToStoryboard={handleAddToStoryboard} projects={[{ id: project.id, name: project.name }]} activeProjectId={project.id} />;

            // Assets
            case 'grid': return <ImageGrid images={project.data.images} isLoading={false} error={null} onViewImage={() => {}} gridOverlay='none' onGridOverlayChange={() => {}} onEditImage={() => {}} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} onUpscaleImage={() => {}} agents={project.data.agents} onAssignAgentToImage={(iid, aid) => updateProjectData({ images: project.data.images.map(i => i.id === iid ? { ...i, agentId: aid || undefined } : i) })} onCreateAgent={(d) => { const newAgent = { ...d, id: `agent_${Date.now()}` } as Agent; updateProjectData({ agents: [...project.data.agents, newAgent] }); return newAgent; }} agentFilter='' onAgentFilterChange={() => {}} awaitingExternalGeneration={false} showGridSelectors={false} />;
            case 'story': return <Storyboard frames={project.data.storyboard} onUpdateNote={(id, notes) => updateProjectData({ storyboard: project.data.storyboard.map(f => f.id === id ? { ...f, notes } : f) })} onRemove={(id) => updateProjectData({ storyboard: project.data.storyboard.filter(f => f.id !== id) })} onReorder={(s, e) => { const list = [...project.data.storyboard]; const [removed] = list.splice(s, 1); list.splice(e, 0, removed); updateProjectData({ storyboard: list }); }} />;
            case 'inspiration': return <InspirationBoard images={project.data.inspirationImages} onUpload={(f) => { const r = new FileReader(); r.onload = e => handleAddToInspiration((e.target?.result as string).split(',')[1]); r.readAsDataURL(f); }} onRemove={(id) => updateProjectData({ inspirationImages: project.data.inspirationImages.filter(i => i.id !== id) })} onUseAsGuide={() => {}} />;
            case 'scripts-bin': return <ScriptingStudio agent={project.data.agents.find(a => a.id === 'agent-scripting')!} onNavigate={handleNavigate} onCallAgent={() => {}} scriptText={project.data.scriptText} scriptsBin={project.data.scriptsBin} onDeleteScript={(id) => updateProjectData({ scriptsBin: project.data.scriptsBin.filter(s => s.id !== id) })} onScriptUpload={(f) => { const r = new FileReader(); r.onload = e => updateProjectData({ scriptText: e.target?.result as string }); r.readAsText(f); }} defaultTab="bin" />;
            
            // Knowledge
            case 'characters': return <CharactersStudio characters={project.data.characters} onCreate={(c) => updateProjectData({ characters: [...project.data.characters, { ...c, id: `char_${Date.now()}` } as any] })} onUpdate={(id, u) => updateProjectData({ characters: project.data.characters.map(c => c.id === id ? { ...c, ...u } : c) })} onDelete={(id) => updateProjectData({ characters: project.data.characters.filter(c => c.id !== id) })} />;
            case 'lore': return <LoreStudio lore={project.data.lore} projects={projects} onCreate={(t, c, pid) => updateProjectData({ lore: [...project.data.lore, { id: `lore_${Date.now()}`, title: t, content: c, projectId: pid }] })} onUpdate={(id, t, c) => updateProjectData({ lore: project.data.lore.map(l => l.id === id ? { ...l, title: t, content: c } : l) })} onDelete={(id) => updateProjectData({ lore: project.data.lore.filter(l => l.id !== id) })} />;
            case 'prompt-library': return <PromptLibraryStudio templates={project.data.promptTemplates} onCreate={(n, p, neg) => updateProjectData({ promptTemplates: [...project.data.promptTemplates, { id: `tmpl_${Date.now()}`, name: n, positivePrompt: p, negativePrompt: neg }] })} onUpdate={(id, n, p, neg) => updateProjectData({ promptTemplates: project.data.promptTemplates.map(t => t.id === id ? { ...t, name: n, positivePrompt: p, negativePrompt: neg } : t) })} onDelete={(id) => updateProjectData({ promptTemplates: project.data.promptTemplates.filter(t => t.id !== id) })} />;
            case 'dynamic-prompts': return <DynamicPromptsStudio lists={project.data.dynamicPromptLists} onCreate={(n, i) => updateProjectData({ dynamicPromptLists: [...project.data.dynamicPromptLists, { id: `list_${Date.now()}`, name: n, items: i }] })} onUpdate={(id, n, i) => updateProjectData({ dynamicPromptLists: project.data.dynamicPromptLists.map(l => l.id === id ? { ...l, name: n, items: i } : l) })} onDelete={(id) => updateProjectData({ dynamicPromptLists: project.data.dynamicPromptLists.filter(l => l.id !== id) })} />;
            case 'knowledge': return <KnowledgeView agents={project.data.agents} onUpdateAgent={(id, u) => updateProjectData({ agents: project.data.agents.map(a => a.id === id ? { ...a, ...u } : a) })} />;
            case 'automation': return <AutomationStudio config={project.data.automationConfig} onSave={(c) => updateProjectData({ automationConfig: c })} onTestWebhook={async () => true} />;
            case 'studio-players': return <RosterStudio rosterType='player' agents={project.data.studioPlayers} images={[]} onCreateEntity={(d) => { const newAgent = { ...d, id: `player_${Date.now()}` } as Agent; updateProjectData({ studioPlayers: [...project.data.studioPlayers, newAgent] }); return newAgent; }} onViewImage={() => {}} onUpdateEntity={(id, u) => updateProjectData({ studioPlayers: project.data.studioPlayers.map(p => p.id === id ? { ...p, ...u } : p) })} onDeleteEntity={(id) => updateProjectData({ studioPlayers: project.data.studioPlayers.filter(p => p.id !== id) })} onImageUpload={() => {}} onCallEntity={() => {}} />;
            
            case 'model-settings': return <ModelSettingsStudio />;

            default: return <DashboardStudio project={project} onUpdateProject={(u) => setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, ...u } : p))} images={project.data.images} stats={{ storyboardFrames: project.data.storyboard.length, agents: project.data.agents.length, loreEntries: project.data.lore.length, inspirationImages: project.data.inspirationImages.length, dynamicPromptLists: project.data.dynamicPromptLists.length, promptTemplates: project.data.promptTemplates.length, imagesGenerated: project.data.images.length, totalProjects: projects.length, scriptsCount: project.data.scriptsBin.length }} onNavigate={handleNavigate} />;
        }
    };

    return (
        <div className="flex h-screen bg-primary text-text-primary overflow-hidden">
            <Sidebar activeView={activeView} onNavigate={handleNavigate} />
            <div className="flex-grow flex flex-col min-w-0 bg-secondary/20">
                {renderContent()}
            </div>
             {viewingImage && (
                <ImageModal 
                    image={viewingImage}
                    onClose={() => setViewingImage(null)}
                    onEdit={() => {}}
                    onAddToStoryboard={(b64) => { handleAddToStoryboard(b64); setViewingImage(null); }}
                    onAddToInspiration={(b64) => { handleAddToInspiration(b64); setViewingImage(null); }}
                    agents={project.data.agents}
                    onAssignAgentToImage={(iid, aid) => updateProjectData({ images: project.data.images.map(i => i.id === iid ? { ...i, agentId: aid || undefined } : i) })}
                    onCreateAgent={(d) => { const newAgent = { ...d, id: `agent_${Date.now()}` } as Agent; updateProjectData({ agents: [...project.data.agents, newAgent] }); return newAgent; }}
                />
            )}
        </div>
    );
};