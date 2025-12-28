
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { StudioHeader } from './components/StudioHeader';
import { SettingsModal } from './components/SettingsModal';
import { DashboardStudio } from './components/DashboardStudio';
import { ProjectsStudio } from './components/ProjectsStudio';
import { TeamStudio } from './components/TeamStudio';
import { CoreStudio } from './components/CoreStudio';
import { IdeationStudio } from './components/IdeationStudio';
import { ScriptingStudio } from './components/ScriptingStudio';
import { DesignStudio } from './components/DesignStudio';
import { ArtStudio } from './components/ArtStudio';
import { DirectorStudio } from './modules/director/DirectorStudio';
import { ScriptWriterStudio } from './components/ScriptWriterStudio';
import { MythosCinematicStudio } from './components/MythosCinematicStudio';
import { ImageGeneratorStudio } from './components/ImageGeneratorStudio';
import { GenerativeVideoStudio } from './components/GenerativeVideoStudio';
import { BlenderStudio } from './components/BlenderStudio';
import { SceneCompositorStudio } from './components/SceneCompositorStudio';
import { CompositeStudio } from './components/CompositeStudio';
import { FaceSwapStudio } from './components/FaceSwapStudio';
import { FaceRepairStudio } from './components/FaceRepairStudio';
import { PhotorealismStudio } from './components/PhotorealismStudio';
import { ResizeStudio } from './components/ResizeStudio';
import { GreenScreenStudio } from './components/GreenScreenStudio';
import { TopazStudio } from './components/TopazStudio';
import { ImageGrid } from './components/ImageGrid';
import { Storyboard } from './components/Storyboard';
import { InspirationBoard } from './components/InspirationBoard';
import { VideoGenerator } from './components/VideoGenerator';
import { AgentsStudio } from './components/AgentsStudio';
import { LoreStudio } from './components/LoreStudio';
import { DynamicPromptsStudio } from './components/DynamicPromptsStudio';
import { PromptLibraryStudio } from './components/PromptLibraryStudio';
import { AgentChatStudio } from './components/AgentChatStudio';
import { KnowledgeView } from './components/KnowledgeView';
import { AutomationStudio } from './components/AutomationStudio';
import { GenericAgentStudio } from './components/GenericAgentStudio';

import { 
    ActiveView, Project, Agent, ImageState, ScriptFile, StoryboardFrame, 
    InspirationImage, LoreEntry, DynamicPromptList, PromptTemplate,
    AutomationConfig, ProjectData
} from './types';

import { getTopazApiKey, saveTopazApiKey, getHfApiKey, saveHfApiKey } from './services/apiKeyService';
import { getAnimAgentsTeam } from './services/agentService';
import { getPromptTemplates, savePromptTemplate, deletePromptTemplate } from './services/promptTemplateService';

const generateId = () => Math.random().toString(36).substr(2, 9);

const INITIAL_PROJECT_DATA: ProjectData = {
    images: [],
    storyboard: [],
    scriptText: '',
    scriptsBin: [],
    inspirationImages: [],
    blenderImages: [],
    blenderResult: null,
    sceneCompositorState: { background: null, character: null, result: null },
    compositeState: { refImage1: null, refImage2: null, task1: 'ip', task2: 'style', prompt: '', negativePrompt: '', width: 1024, height: 1024, seed: 0, randomizeSeed: true, resultImage: null, resultVideoUrl: null },
    faceSwapState: { source: null, face: null, result: null },
    faceRepairState: { source: null, result: null },
    photorealismState: { source: null, result: null, prompt: '', negativePrompt: '' },
    resizeState: { source: null, result: null, width: 1024, height: 1024, prompt: '', alignment: 'Middle', overlap: 50, steps: 30, directions: { left: false, right: true, top: false, bottom: false } },
    greenScreenState: { source: null, resultUrl: null },
    generativeVideoState: { prompt: '', negativePrompt: '', image: null, lastImage: null, resultUrl: null, engine: 'external', externalUrl: '', steps: 25, duration: 4, guidanceScale: 7.5, guidanceScale2: 1.0, scheduler: 'UniPCMultistep', fps: 16, seed: 0, randomizeSeed: true },
    topazState: { activeMediaType: 'image', source: null, result: null, resultUrl: null, operation: 'enhance', parameters: { scale: 2, strength: 50 }, faceRecovery: true },
    directorState: { referenceImage: null, analysis: null, chatHistory: [], generatedPreview: null },
    agents: getAnimAgentsTeam(),
    lore: [],
    dynamicPromptLists: [],
    promptTemplates: getPromptTemplates(),
    automationConfig: { ragEnabled: false, ragProvider: 'browser', ragApiKey: '', ragBaseUrl: '', ragKnowledgeBoxId: '', ragLocalhostUrl: '', webhookUrls: [] }
};

const INITIAL_PROJECT: Project = {
    id: 'proj_default',
    name: 'Untitled Production',
    tagline: 'A new creative endeavor',
    progress: 0,
    data: INITIAL_PROJECT_DATA
};

const App: React.FC = () => {
    const [activeView, setActiveView] = useState<ActiveView>('dashboard');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    
    // Global Settings
    const [topazApiKey, setTopazApiKey] = useState(getTopazApiKey() || '');
    const [hfApiKey, setHfApiKey] = useState(getHfApiKey() || '');

    // Projects
    const [projects, setProjects] = useState<Project[]>([INITIAL_PROJECT]);
    const [activeProjectId, setActiveProjectId] = useState<string>(INITIAL_PROJECT.id);
    const project = projects.find(p => p.id === activeProjectId) || projects[0];

    // Navigation Context
    const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
    const [imageGridFilter, setImageGridFilter] = useState('');

    // --- Helpers ---

    const updateProject = (updates: Partial<Project>) => {
        setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, ...updates } : p));
    };

    const updateProjectData = (updates: Partial<ProjectData>) => {
        setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, data: { ...p.data, ...updates } } : p));
    };

    const handleAddAssetToGrid = (asset: { type: 'image' | 'video'; base64?: string; url?: string; mimeType?: string; metadata?: any }) => {
        const newAsset: ImageState = {
            id: generateId(),
            type: asset.type,
            base64: asset.base64,
            url: asset.url,
            mimeType: asset.mimeType,
            isUpscaling: false,
            metadata: asset.metadata
        };
        updateProjectData({ images: [newAsset, ...project.data.images] });
    };

    // --- Render Logic ---

    const renderContent = () => {
        // Team Accessors
        const team = project.data.agents;
        const nexus = team.find(a => a.id === 'agent-core') || team[0];
        const spark = team.find(a => a.id === 'agent-ideation') || team[0];
        const scribe = team.find(a => a.id === 'agent-scripting') || team[0];
        const stylus = team.find(a => a.id === 'agent-design') || team[0];
        const canvas = team.find(a => a.id === 'agent-art') || team[0];
        const directorAgent = team.find(a => a.id === 'agent-dop') || team[0];

        switch (activeView) {
            case 'dashboard':
                return (
                    <DashboardStudio 
                        project={project}
                        onUpdateProject={updateProject}
                        images={project.data.images}
                        stats={{
                            storyboardFrames: project.data.storyboard.length,
                            agents: project.data.agents.length,
                            loreEntries: project.data.lore.length,
                            inspirationImages: project.data.inspirationImages.length,
                            dynamicPromptLists: project.data.dynamicPromptLists.length,
                            promptTemplates: project.data.promptTemplates.length,
                            imagesGenerated: project.data.images.length,
                            totalProjects: projects.length,
                            scriptsCount: project.data.scriptsBin.length
                        }}
                        onNavigate={(view) => setActiveView(view)}
                    />
                );
            case 'projects':
                return (
                    <ProjectsStudio 
                        projects={projects}
                        activeProjectId={activeProjectId}
                        onSelectProject={setActiveProjectId}
                        onCreateProject={(data) => setProjects([...projects, { id: generateId(), ...data, progress: 0, data: INITIAL_PROJECT_DATA }])}
                        onRenameProject={(id, name) => setProjects(prev => prev.map(p => p.id === id ? { ...p, name } : p))}
                        onDeleteProject={(id) => {
                            const remaining = projects.filter(p => p.id !== id);
                            setProjects(remaining.length ? remaining : [INITIAL_PROJECT]);
                            if (activeProjectId === id) setActiveProjectId(remaining[0]?.id || INITIAL_PROJECT.id);
                        }}
                    />
                );
            case 'team':
                return (
                    <TeamStudio 
                        team={team}
                        onUpdateAgent={(id, updates) => updateProjectData({ agents: team.map(a => a.id === id ? { ...a, ...updates } : a) })}
                        onNavigate={(view, id) => { setActiveView(view); if(id) setActiveAgentId(id); }}
                        onCallAgent={(agent) => { setActiveAgentId(agent.id); setActiveView('agent-chat'); }}
                    />
                );
            case 'core':
                return <CoreStudio agent={nexus} onNavigate={setActiveView} onCallAgent={() => { setActiveAgentId(nexus.id); setActiveView('agent-chat'); }} />;
            case 'ideation':
                return <IdeationStudio agent={spark} onNavigate={setActiveView} onCallAgent={() => { setActiveAgentId(spark.id); setActiveView('agent-chat'); }} />;
            case 'scripting':
                return (
                    <ScriptingStudio 
                        agent={scribe} 
                        scriptText={project.data.scriptText}
                        scriptsBin={project.data.scriptsBin}
                        onScriptUpload={(file) => {
                            const reader = new FileReader();
                            reader.onload = (e) => updateProjectData({ scriptText: e.target?.result as string });
                            reader.readAsText(file);
                        }}
                        onDeleteScript={(id) => updateProjectData({ scriptsBin: project.data.scriptsBin.filter(s => s.id !== id) })}
                        onNavigate={setActiveView} 
                        onCallAgent={() => { setActiveAgentId(scribe.id); setActiveView('agent-chat'); }} 
                    />
                );
            case 'design':
                return <DesignStudio agent={stylus} onNavigate={setActiveView} onCallAgent={() => { setActiveAgentId(stylus.id); setActiveView('agent-chat'); }} />;
            case 'art':
                return <ArtStudio agent={canvas} onNavigate={setActiveView} onCallAgent={() => { setActiveAgentId(canvas.id); setActiveView('agent-chat'); }} />;
            case 'director':
                return <DirectorStudio onNavigate={setActiveView} />;
            
            case 'mythos-cinematic-engine':
                return (
                    <div className="flex flex-col h-full bg-primary">
                        <StudioHeader 
                            breadcrumbs={[{ label: 'Art Department', onClick: () => setActiveView('director') }, { label: 'MythOS Cinematic Engine' }]} 
                            agent={directorAgent}
                            onCallAgent={() => { setActiveAgentId(directorAgent.id); setActiveView('agent-chat'); }}
                        />
                        <MythosCinematicStudio 
                            hfToken={hfApiKey} 
                            promptTemplates={project.data.promptTemplates}
                            dynamicPromptLists={project.data.dynamicPromptLists}
                            onAddAssetToGrid={handleAddAssetToGrid}
                            onAddToStoryboard={(base64) => updateProjectData({ storyboard: [...project.data.storyboard, { id: generateId(), base64Image: base64, notes: '', prompt: '' }] })}
                            onAddToInspiration={(base64) => updateProjectData({ inspirationImages: [...project.data.inspirationImages, { id: generateId(), base64Image: base64 }] })}
                        />
                    </div>
                );

            case 'script-writer':
                return (
                    <ScriptWriterStudio 
                        onSendToScriptsBin={(s) => updateProjectData({ scriptsBin: [...project.data.scriptsBin, { id: generateId(), date: new Date().toLocaleDateString(), ...s }] })}
                        onNavigate={setActiveView}
                        promptTemplates={project.data.promptTemplates}
                        dynamicPromptLists={project.data.dynamicPromptLists}
                    />
                );
            
            case 'scripts-bin':
                return (
                    <ScriptingStudio 
                        agent={scribe} 
                        scriptText={project.data.scriptText}
                        scriptsBin={project.data.scriptsBin}
                        onScriptUpload={(file) => {}}
                        onDeleteScript={(id) => updateProjectData({ scriptsBin: project.data.scriptsBin.filter(s => s.id !== id) })}
                        onNavigate={setActiveView} 
                        onCallAgent={() => { setActiveAgentId(scribe.id); setActiveView('agent-chat'); }} 
                        defaultTab='bin'
                    />
                );

            case 'image-generator':
                return (
                    <div className="flex flex-col h-full bg-primary">
                        <StudioHeader 
                            breadcrumbs={[{ label: 'Generators' }, { label: 'Image Studio' }]} 
                            agent={canvas}
                            onCallAgent={() => { setActiveAgentId(canvas.id); setActiveView('agent-chat'); }}
                        />
                        <ImageGeneratorStudio 
                            hfToken={hfApiKey}
                            promptTemplates={project.data.promptTemplates}
                            dynamicPromptLists={project.data.dynamicPromptLists}
                            agents={team}
                            onAddAssetToGrid={handleAddAssetToGrid}
                            onAddToStoryboard={(base64) => updateProjectData({ storyboard: [...project.data.storyboard, { id: generateId(), base64Image: base64, notes: '', prompt: '' }] })}
                            onAddToInspiration={(base64) => updateProjectData({ inspirationImages: [...project.data.inspirationImages, { id: generateId(), base64Image: base64 }] })}
                        />
                    </div>
                );

            case 'generative-video':
                return (
                    <GenerativeVideoStudio 
                        apiKey={''} // Deprecated, handled by ENV
                        hfToken={hfApiKey}
                        videoState={project.data.generativeVideoState}
                        onStateUpdate={(ns) => updateProjectData({ generativeVideoState: ns })}
                        onAddImageToGrid={() => {}} // Legacy
                        onAddAssetToGrid={handleAddAssetToGrid}
                        onAddToStoryboard={(base64) => updateProjectData({ storyboard: [...project.data.storyboard, { id: generateId(), base64Image: base64, notes: '', prompt: '' }] })}
                    />
                );

            case 'blender':
                return (
                    <BlenderStudio 
                        sourceImages={project.data.blenderImages}
                        resultImage={project.data.blenderResult}
                        isLoading={false}
                        error={null}
                        onUpload={(files) => {
                            const newImages: any[] = [];
                            Array.from(files).forEach(file => {
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                    newImages.push({ id: generateId(), base64: (e.target?.result as string).split(',')[1] });
                                    if(newImages.length === files.length) updateProjectData({ blenderImages: [...project.data.blenderImages, ...newImages] });
                                };
                                reader.readAsDataURL(file);
                            });
                        }}
                        onRemoveImage={(id) => updateProjectData({ blenderImages: project.data.blenderImages.filter(i => i.id !== id) })}
                        onGenerate={() => {}} // Handled internally
                        onAddToStoryboard={(base64) => updateProjectData({ storyboard: [...project.data.storyboard, { id: generateId(), base64Image: base64, notes: '', prompt: '' }] })}
                        onAddToInspiration={(base64) => updateProjectData({ inspirationImages: [...project.data.inspirationImages, { id: generateId(), base64Image: base64 }] })}
                        hfToken={hfApiKey}
                    />
                );

            case 'scene-compositor':
                return (
                    <SceneCompositorStudio 
                        sceneState={project.data.sceneCompositorState}
                        isLoading={false}
                        error={null}
                        onUpload={(type, file) => {
                            const reader = new FileReader();
                            reader.onload = (e) => {
                                const result = e.target?.result as string;
                                const mimeType = result.split(',')[0].split(':')[1].split(';')[0];
                                const base64 = result.split(',')[1];
                                updateProjectData({ sceneCompositorState: { ...project.data.sceneCompositorState, [type]: { base64, mimeType } } });
                            };
                            reader.readAsDataURL(file);
                        }}
                        onUpdateImage={(type, base64, mimeType) => updateProjectData({ sceneCompositorState: { ...project.data.sceneCompositorState, [type]: { base64, mimeType } } })}
                        onRemoveImage={(type) => updateProjectData({ sceneCompositorState: { ...project.data.sceneCompositorState, [type]: null } })}
                        onGenerate={() => {}} // Handled internally
                        onAddToStoryboard={(base64) => updateProjectData({ storyboard: [...project.data.storyboard, { id: generateId(), base64Image: base64, notes: '', prompt: '' }] })}
                        onAddToInspiration={(base64) => updateProjectData({ inspirationImages: [...project.data.inspirationImages, { id: generateId(), base64Image: base64 }] })}
                        hfToken={hfApiKey}
                    />
                );

            case 'composite':
                return (
                    <CompositeStudio 
                        state={project.data.compositeState}
                        onStateUpdate={(ns) => updateProjectData({ compositeState: ns })}
                        onAddAssetToGrid={handleAddAssetToGrid}
                        onAddToStoryboard={(base64) => updateProjectData({ storyboard: [...project.data.storyboard, { id: generateId(), base64Image: base64, notes: '', prompt: '' }] })}
                        onAddToInspiration={(base64) => updateProjectData({ inspirationImages: [...project.data.inspirationImages, { id: generateId(), base64Image: base64 }] })}
                        hfToken={hfApiKey}
                    />
                );

            case 'face-swap':
                return (
                    <FaceSwapStudio 
                        faceSwapState={project.data.faceSwapState}
                        isLoading={false}
                        error={null}
                        onUpload={(type, file) => {
                            const reader = new FileReader();
                            reader.onload = (e) => {
                                const result = e.target?.result as string;
                                const mimeType = result.split(',')[0].split(':')[1].split(';')[0];
                                const base64 = result.split(',')[1];
                                updateProjectData({ faceSwapState: { ...project.data.faceSwapState, [type]: { base64, mimeType } } });
                            };
                            reader.readAsDataURL(file);
                        }}
                        onRemoveImage={(type) => updateProjectData({ faceSwapState: { ...project.data.faceSwapState, [type]: null } })}
                        onGenerate={() => {}}
                        onAddToStoryboard={(base64) => updateProjectData({ storyboard: [...project.data.storyboard, { id: generateId(), base64Image: base64, notes: '', prompt: '' }] })}
                        onAddToInspiration={(base64) => updateProjectData({ inspirationImages: [...project.data.inspirationImages, { id: generateId(), base64Image: base64 }] })}
                        hfToken={hfApiKey}
                    />
                );

            case 'face-repair':
                return (
                    <FaceRepairStudio 
                        faceRepairState={project.data.faceRepairState}
                        isLoading={false}
                        error={null}
                        onUpload={(file) => {
                            const reader = new FileReader();
                            reader.onload = (e) => {
                                const result = e.target?.result as string;
                                const mimeType = result.split(',')[0].split(':')[1].split(';')[0];
                                const base64 = result.split(',')[1];
                                updateProjectData({ faceRepairState: { ...project.data.faceRepairState, source: { base64, mimeType }, result: null } });
                            };
                            reader.readAsDataURL(file);
                        }}
                        onRemoveImage={() => updateProjectData({ faceRepairState: { ...project.data.faceRepairState, source: null, result: null } })}
                        onGenerate={() => {}}
                        onAddToStoryboard={(base64) => updateProjectData({ storyboard: [...project.data.storyboard, { id: generateId(), base64Image: base64, notes: '', prompt: '' }] })}
                        onAddToInspiration={(base64) => updateProjectData({ inspirationImages: [...project.data.inspirationImages, { id: generateId(), base64Image: base64 }] })}
                        hfToken={hfApiKey}
                    />
                );

            case 'photorealism':
                return (
                    <PhotorealismStudio 
                        photorealismState={project.data.photorealismState}
                        isLoading={false}
                        error={null}
                        onUpload={() => {}}
                        onRemoveImage={() => updateProjectData({ photorealismState: { ...project.data.photorealismState, source: null } })}
                        onGenerate={() => {}}
                        onPromptChange={(p, n) => updateProjectData({ photorealismState: { ...project.data.photorealismState, prompt: p, negativePrompt: n } })}
                        onAddToStoryboard={(base64) => updateProjectData({ storyboard: [...project.data.storyboard, { id: generateId(), base64Image: base64, notes: '', prompt: '' }] })}
                        onAddToInspiration={(base64) => updateProjectData({ inspirationImages: [...project.data.inspirationImages, { id: generateId(), base64Image: base64 }] })}
                        onAddAssetToGrid={handleAddAssetToGrid}
                        hfToken={hfApiKey}
                    />
                );

            case 'resize':
                return (
                    <ResizeStudio 
                        state={project.data.resizeState}
                        onStateUpdate={(ns) => updateProjectData({ resizeState: ns })}
                        onAddAssetToGrid={handleAddAssetToGrid}
                        onAddToStoryboard={(base64) => updateProjectData({ storyboard: [...project.data.storyboard, { id: generateId(), base64Image: base64, notes: '', prompt: '' }] })}
                        onAddToInspiration={(base64) => updateProjectData({ inspirationImages: [...project.data.inspirationImages, { id: generateId(), base64Image: base64 }] })}
                        hfToken={hfApiKey}
                    />
                );

            case 'green-screen':
                return (
                    <GreenScreenStudio 
                        greenScreenState={project.data.greenScreenState}
                        isLoading={false}
                        error={null}
                        onStateUpdate={(ns) => updateProjectData({ greenScreenState: ns })}
                        onAddToStoryboard={(base64) => updateProjectData({ storyboard: [...project.data.storyboard, { id: generateId(), base64Image: base64, notes: '', prompt: '' }] })}
                        onAddAssetToGrid={handleAddAssetToGrid}
                        hfToken={hfApiKey}
                    />
                );

            case 'topaz':
                return (
                    <TopazStudio 
                        topazState={project.data.topazState}
                        isLoading={false}
                        error={null}
                        onStateUpdate={(ns) => updateProjectData({ topazState: ns })}
                        onGenerate={() => {}}
                        onAddToStoryboard={(base64) => updateProjectData({ storyboard: [...project.data.storyboard, { id: generateId(), base64Image: base64, notes: '', prompt: '' }] })}
                        onAddToInspiration={(base64) => updateProjectData({ inspirationImages: [...project.data.inspirationImages, { id: generateId(), base64Image: base64 }] })}
                        onAddAssetToGrid={handleAddAssetToGrid}
                        progress=""
                    />
                );

            case 'grid':
                return (
                    <div className="p-6 h-full overflow-y-auto">
                        <ImageGrid 
                            images={imageGridFilter ? project.data.images.filter(i => i.agentId === imageGridFilter) : project.data.images}
                            isLoading={false}
                            error={null}
                            onViewImage={() => {}}
                            gridOverlay="none"
                            onGridOverlayChange={() => {}}
                            onEditImage={() => {}}
                            onAddToStoryboard={(base64) => updateProjectData({ storyboard: [...project.data.storyboard, { id: generateId(), base64Image: base64, notes: '', prompt: '' }] })}
                            onAddToInspiration={(base64) => updateProjectData({ inspirationImages: [...project.data.inspirationImages, { id: generateId(), base64Image: base64 }] })}
                            onUpscaleImage={() => setActiveView('topaz')}
                            agents={team}
                            onAssignAgentToImage={(imgId, agId) => {
                                updateProjectData({ images: project.data.images.map(i => i.id === imgId ? { ...i, agentId: agId || undefined } : i) });
                            }}
                            onCreateAgent={(name) => {
                                const newAgent = { ...team[0], id: generateId(), name };
                                updateProjectData({ agents: [...team, newAgent] });
                                return newAgent;
                            }}
                            agentFilter={imageGridFilter}
                            onAgentFilterChange={setImageGridFilter}
                            awaitingExternalGeneration={false}
                        />
                    </div>
                );

            case 'story':
                return (
                    <Storyboard 
                        frames={project.data.storyboard}
                        onUpdateNote={(id, notes) => updateProjectData({ storyboard: project.data.storyboard.map(f => f.id === id ? { ...f, notes } : f) })}
                        onRemove={(id) => updateProjectData({ storyboard: project.data.storyboard.filter(f => f.id !== id) })}
                        onReorder={(start, end) => {
                            const newFrames = [...project.data.storyboard];
                            const [removed] = newFrames.splice(start, 1);
                            newFrames.splice(end, 0, removed);
                            updateProjectData({ storyboard: newFrames });
                        }}
                    />
                );

            case 'inspiration':
                return (
                    <InspirationBoard 
                        images={project.data.inspirationImages}
                        onUpload={(file) => {
                            const reader = new FileReader();
                            reader.onload = (e) => updateProjectData({ inspirationImages: [...project.data.inspirationImages, { id: generateId(), base64Image: (e.target?.result as string).split(',')[1] }] });
                            reader.readAsDataURL(file);
                        }}
                        onRemove={(id) => updateProjectData({ inspirationImages: project.data.inspirationImages.filter(i => i.id !== id) })}
                        onUseAsGuide={() => setActiveView('image-generator')}
                    />
                );

            case 'agents':
                return (
                    <AgentsStudio 
                        agents={team}
                        images={project.data.images}
                        onCreateAgent={(name) => {
                            const newAgent = { ...team[0], id: generateId(), name };
                            updateProjectData({ agents: [...team, newAgent] });
                            return newAgent;
                        }}
                        onUpdateAgent={(id, updates) => updateProjectData({ agents: team.map(a => a.id === id ? { ...a, ...updates } : a) })}
                        onDeleteAgent={(id) => updateProjectData({ agents: team.filter(a => a.id !== id) })}
                        onViewImage={() => {}}
                        onImageUpload={(id, file) => {
                            const reader = new FileReader();
                            reader.onload = (e) => {
                                const base64 = (e.target?.result as string).split(',')[1];
                                const mimeType = file.type;
                                updateProjectData({ images: [...project.data.images, { id: generateId(), type: 'image', base64, mimeType, isUpscaling: false, agentId: id }] });
                            };
                            reader.readAsDataURL(file);
                        }}
                        onCallAgent={(a) => { setActiveAgentId(a.id); setActiveView('agent-chat'); }}
                    />
                );

            case 'agent-chat':
                const chatAgent = team.find(a => a.id === activeAgentId) || team[0];
                return (
                    <AgentChatStudio 
                        agents={team}
                        isResponding={false}
                        error={null}
                        onSendMessage={() => {}} // Stub, handled in view
                        onUploadLore={() => {}} // Stub
                    />
                );

            case 'agent-workspace':
                const wsAgent = team.find(a => a.id === activeAgentId) || team[0];
                return <GenericAgentStudio agent={wsAgent} onNavigate={setActiveView} onCallAgent={() => setActiveView('agent-chat')} />;

            case 'lore':
                return (
                    <LoreStudio 
                        lore={project.data.lore}
                        onCreate={(title, content) => updateProjectData({ lore: [...project.data.lore, { id: generateId(), title, content }] })}
                        onUpdate={(id, title, content) => updateProjectData({ lore: project.data.lore.map(l => l.id === id ? { ...l, title, content } : l) })}
                        onDelete={(id) => updateProjectData({ lore: project.data.lore.filter(l => l.id !== id) })}
                    />
                );

            case 'dynamic-prompts':
                return (
                    <DynamicPromptsStudio 
                        lists={project.data.dynamicPromptLists}
                        onCreate={(name, items) => updateProjectData({ dynamicPromptLists: [...project.data.dynamicPromptLists, { id: generateId(), name, items }] })}
                        onUpdate={(id, name, items) => updateProjectData({ dynamicPromptLists: project.data.dynamicPromptLists.map(l => l.id === id ? { ...l, name, items } : l) })}
                        onDelete={(id) => updateProjectData({ dynamicPromptLists: project.data.dynamicPromptLists.filter(l => l.id !== id) })}
                    />
                );

            case 'prompt-library':
                return (
                    <PromptLibraryStudio 
                        templates={project.data.promptTemplates}
                        onCreate={(name, positive, negative) => updateProjectData({ promptTemplates: [...project.data.promptTemplates, { id: generateId(), name, positivePrompt: positive, negativePrompt: negative }] })}
                        onUpdate={(id, name, positive, negative) => updateProjectData({ promptTemplates: project.data.promptTemplates.map(t => t.id === id ? { ...t, name, positivePrompt: positive, negativePrompt: negative } : t) })}
                        onDelete={(id) => updateProjectData({ promptTemplates: project.data.promptTemplates.filter(t => t.id !== id) })}
                    />
                );

            case 'knowledge':
                return <KnowledgeView agents={team} onUpdateAgent={(id, updates) => updateProjectData({ agents: team.map(a => a.id === id ? { ...a, ...updates } : a) })} />;

            case 'automation':
                return (
                    <AutomationStudio 
                        config={project.data.automationConfig}
                        onSave={(cfg) => updateProjectData({ automationConfig: cfg })}
                        onTestWebhook={async () => true}
                    />
                );

            default:
                return (
                    <div className="flex items-center justify-center h-full text-neutral-500">
                        View not found: {activeView}
                    </div>
                );
        }
    };

    return (
        <div className="flex h-screen bg-primary text-text-primary overflow-hidden font-sans">
            <Sidebar 
                activeView={activeView}
                onNavigate={setActiveView}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                onOpenSettings={() => setIsSettingsOpen(true)}
                isOnline={true} // Simplified
                stats={{
                    storyboard: project.data.storyboard.length,
                    inspiration: project.data.inspirationImages.length,
                    agents: project.data.agents.length,
                    lore: project.data.lore.length,
                    dynamicPrompts: project.data.dynamicPromptLists.length,
                    promptLibrary: project.data.promptTemplates.length
                }}
            />
            
            <div className="flex-grow flex flex-col h-full overflow-hidden relative">
                {renderContent()}
            </div>

            <SettingsModal 
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                currentTopazApiKey={topazApiKey}
                currentHfApiKey={hfApiKey}
                onSave={(topaz, hf) => {
                    saveTopazApiKey(topaz);
                    setTopazApiKey(topaz);
                    saveHfApiKey(hf);
                    setHfApiKey(hf);
                    setIsSettingsOpen(false);
                }}
            />
        </div>
    );
};

export default App;
