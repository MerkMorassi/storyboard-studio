
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { DashboardStudio } from './components/DashboardStudio';
import { ProjectsStudio } from './components/ProjectsStudio';
import { TeamStudio } from './components/TeamStudio';
import { CoreStudio } from './components/CoreStudio';
import { IdeationStudio } from './components/IdeationStudio';
import { ScriptingStudio } from './components/ScriptingStudio';
import { DesignStudio } from './components/DesignStudio';
import { ArtStudio } from './components/ArtStudio';
import { DirectorStudio } from './modules/director/DirectorStudio';
import { ImageGeneratorStudio } from './components/ImageGeneratorStudio';
import { MythosCinematicStudio } from './components/MythosCinematicStudio';
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
import { AgentsStudio } from './components/AgentsStudio';
import { LoreStudio } from './components/LoreStudio';
import { PromptLibraryStudio } from './components/PromptLibraryStudio';
import { DynamicPromptsStudio } from './components/DynamicPromptsStudio';
import { AgentChatView } from './components/AgentChatView';
import { GenericAgentStudio } from './components/GenericAgentStudio';
import { KnowledgeView } from './components/KnowledgeView';
import { AutomationStudio } from './components/AutomationStudio';
import { SettingsModal } from './components/SettingsModal';
import { ImageModal } from './components/ImageModal';
import { StudioHeader } from './components/StudioHeader';
import { ScriptWriterStudio } from './components/ScriptWriterStudio';

import { Project, Agent, ImageState, ActiveView, ScriptFile } from './types';
import { getApiKey, getTopazApiKey, getHfApiKey, saveTopazApiKey, saveHfApiKey } from './services/apiKeyService';
import { getAnimAgentsTeam } from './services/agentService';
import { getPromptTemplates, savePromptTemplate, deletePromptTemplate } from './services/promptTemplateService';

const DEFAULT_PROJECT: Project = {
    id: 'default-project',
    name: 'Untitled Project',
    tagline: 'A new creative endeavor',
    data: {
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
        resizeState: { source: null, result: null, width: 1024, height: 1024, prompt: '', alignment: 'Middle', overlap: 10, steps: 20, directions: { left: false, right: false, top: false, bottom: false } },
        greenScreenState: { source: null, resultUrl: null },
        generativeVideoState: { prompt: '', negativePrompt: '', image: null, lastImage: null, resultUrl: null, engine: 'external', externalUrl: '', steps: 25, duration: 4, guidanceScale: 7.5, guidanceScale2: 1.0, scheduler: 'default', seed: 0, randomizeSeed: true, fps: 24 },
        topazState: { activeMediaType: 'image', source: null, result: null, operation: 'enhance', parameters: { scale: 2, strength: 50 }, faceRecovery: true },
        directorState: { referenceImage: null, analysis: null, chatHistory: [], generatedPreview: null },
        agents: [],
        lore: [],
        dynamicPromptLists: [],
        promptTemplates: [],
        automationConfig: { ragEnabled: false, ragProvider: 'browser', ragApiKey: '', ragBaseUrl: '', ragKnowledgeBoxId: '', ragLocalhostUrl: '', webhookUrls: [] }
    }
};

const generateId = () => Math.random().toString(36).substr(2, 9);

export const App: React.FC = () => {
    const [activeView, setActiveView] = useState<ActiveView>('dashboard');
    const [project, setProject] = useState<Project>(() => {
        try {
            const saved = localStorage.getItem('mythos_current_project');
            return saved ? JSON.parse(saved) : DEFAULT_PROJECT;
        } catch (e) {
            console.error("Failed to load project", e);
            return DEFAULT_PROJECT;
        }
    });
    
    const [topazApiKey, setTopazApiKey] = useState(getTopazApiKey() || '');
    const [hfApiKey, setHfApiKey] = useState(getHfApiKey() || '');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<ImageState | null>(null);
    const [gridOverlay, setGridOverlay] = useState<'none' | 'basic' | 'triadic' | 'golden-basic' | 'golden-triadic'>('none');
    const [agentFilter, setAgentFilter] = useState('');

    useEffect(() => {
        localStorage.setItem('mythos_current_project', JSON.stringify(project));
    }, [project]);

    const updateProject = (updates: Partial<Project>) => {
        setProject(prev => ({ ...prev, ...updates }));
    };

    const updateProjectData = (updates: Partial<Project['data']>) => {
        setProject(prev => ({ ...prev, data: { ...prev.data, ...updates } }));
    };

    const handleAddAssetToGrid = (asset: { type: 'image' | 'video'; base64?: string; url?: string; mimeType?: string; metadata?: any }) => {
        const newImage: ImageState = {
            id: generateId(),
            type: asset.type,
            base64: asset.base64,
            url: asset.url,
            mimeType: asset.mimeType || (asset.type === 'image' ? 'image/jpeg' : 'video/mp4'),
            isUpscaling: false,
            metadata: asset.metadata
        };
        updateProjectData({ images: [newImage, ...project.data.images] });
    };

    const handleAddScriptToBin = (script: Omit<ScriptFile, 'id' | 'date'>) => {
        const newScript: ScriptFile = {
            ...script,
            id: generateId(),
            date: new Date().toLocaleString()
        };
        updateProjectData({ scriptsBin: [newScript, ...project.data.scriptsBin] });
    };

    const handleDeleteScript = (id: string) => {
        updateProjectData({ scriptsBin: project.data.scriptsBin.filter(s => s.id !== id) });
    };

    const coreAgents = getAnimAgentsTeam();
    const allAgents = [...coreAgents, ...project.data.agents];
    const directorAgent = allAgents.find(a => a.id === 'agent-dop') || coreAgents[5];

    const handleAgentUpdate = (id: string, updates: Partial<Agent>) => {
        if (id.startsWith('agent-')) {
            return;
        }
        const updatedAgents = project.data.agents.map(a => a.id === id ? { ...a, ...updates } : a);
        updateProjectData({ agents: updatedAgents });
    };

    const handleNavigate = (view: ActiveView, agentId?: string) => {
        setActiveView(view);
        if (agentId) setActiveAgentId(agentId);
    };

    const renderContent = () => {
        switch (activeView) {
            case 'dashboard':
                return <DashboardStudio 
                    project={project} 
                    onUpdateProject={updateProject} 
                    images={project.data.images} 
                    stats={{
                        storyboardFrames: project.data.storyboard.length,
                        agents: project.data.agents.length,
                        loreEntries: project.data.lore.length,
                        inspirationImages: project.data.inspirationImages.length,
                        dynamicPromptLists: project.data.dynamicPromptLists.length,
                        promptTemplates: getPromptTemplates().length,
                        imagesGenerated: project.data.images.length,
                        totalProjects: 1
                    }}
                    onNavigate={handleNavigate}
                />;
            case 'projects':
                return <ProjectsStudio 
                    projects={[project]} 
                    activeProjectId={project.id} 
                    onSelectProject={() => {}} 
                    onCreateProject={(p) => setProject({ ...DEFAULT_PROJECT, ...p, id: generateId() })} 
                    onRenameProject={(id, name) => updateProject({ name })} 
                    onDeleteProject={() => setProject(DEFAULT_PROJECT)} 
                />;
            case 'team':
                return <TeamStudio 
                    team={allAgents} 
                    onUpdateAgent={handleAgentUpdate} 
                    onNavigate={handleNavigate} 
                    onCallAgent={(agent) => { setActiveAgentId(agent.id); setActiveView('agent-chat'); }} 
                />;
            case 'core': return <CoreStudio agent={allAgents.find(a => a.id === 'agent-core')!} onNavigate={handleNavigate} onCallAgent={(a) => { setActiveAgentId(a.id); setActiveView('agent-chat'); }} />;
            case 'ideation': return <IdeationStudio agent={allAgents.find(a => a.id === 'agent-ideation')!} onNavigate={handleNavigate} onCallAgent={(a) => { setActiveAgentId(a.id); setActiveView('agent-chat'); }} />;
            case 'scripting': 
                return <ScriptingStudio 
                    agent={allAgents.find(a => a.id === 'agent-scripting')!} 
                    onNavigate={handleNavigate} 
                    onCallAgent={(a) => { setActiveAgentId(a.id); setActiveView('agent-chat'); }}
                    scriptText={project.data.scriptText}
                    scriptsBin={project.data.scriptsBin}
                    onDeleteScript={handleDeleteScript}
                    onScriptUpload={(file) => {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            const text = e.target?.result as string;
                            updateProjectData({ scriptText: text });
                        };
                        reader.readAsText(file);
                    }}
                />;
            case 'design': return <DesignStudio agent={allAgents.find(a => a.id === 'agent-design')!} onNavigate={handleNavigate} onCallAgent={(a) => { setActiveAgentId(a.id); setActiveView('agent-chat'); }} />;
            case 'art': return <ArtStudio agent={allAgents.find(a => a.id === 'agent-art')!} onNavigate={handleNavigate} onCallAgent={(a) => { setActiveAgentId(a.id); setActiveView('agent-chat'); }} />;
            case 'director': return <DirectorStudio onNavigate={handleNavigate} />;
            
            case 'agent-workspace': {
                const workspaceAgent = allAgents.find(a => a.id === activeAgentId);
                if (!workspaceAgent) return <div className="p-10">Agent not found</div>;
                return <GenericAgentStudio agent={workspaceAgent} onNavigate={handleNavigate} onCallAgent={(a) => { setActiveAgentId(a.id); setActiveView('agent-chat'); }} />;
            }

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
                            promptTemplates={getPromptTemplates()}
                            onAddAssetToGrid={handleAddAssetToGrid}
                            onAddToStoryboard={(base64) => updateProjectData({ storyboard: [...project.data.storyboard, { id: generateId(), base64Image: base64, notes: '', prompt: '' }] })}
                            onAddToInspiration={(base64) => updateProjectData({ inspirationImages: [...project.data.inspirationImages, { id: generateId(), base64Image: base64 }] })}
                        />
                    </div>
                );
            case 'image-generator':
                return <ImageGeneratorStudio 
                    hfToken={hfApiKey} 
                    promptTemplates={getPromptTemplates()} 
                    dynamicPromptLists={project.data.dynamicPromptLists}
                    agents={project.data.agents}
                    onAddAssetToGrid={handleAddAssetToGrid}
                    onAddToStoryboard={(base64) => updateProjectData({ storyboard: [...project.data.storyboard, { id: generateId(), base64Image: base64, notes: '', prompt: '' }] })}
                    onAddToInspiration={(base64) => updateProjectData({ inspirationImages: [...project.data.inspirationImages, { id: generateId(), base64Image: base64 }] })}
                />;
            case 'script-writer':
                return <ScriptWriterStudio 
                    onSendToScriptsBin={handleAddScriptToBin} 
                    onNavigate={handleNavigate} 
                    promptTemplates={getPromptTemplates()}
                    dynamicPromptLists={project.data.dynamicPromptLists}
                />;
            case 'scripts-bin':
                return <ScriptingStudio 
                    agent={allAgents.find(a => a.id === 'agent-scripting')!} 
                    onNavigate={handleNavigate} 
                    onCallAgent={(a) => { setActiveAgentId(a.id); setActiveView('agent-chat'); }}
                    scriptText={project.data.scriptText}
                    scriptsBin={project.data.scriptsBin}
                    onDeleteScript={handleDeleteScript}
                    onScriptUpload={(file) => {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            const text = e.target?.result as string;
                            updateProjectData({ scriptText: text });
                        };
                        reader.readAsText(file);
                    }}
                    defaultTab="bin"
                />;
            case 'generative-video':
                return <GenerativeVideoStudio 
                    apiKey={getApiKey() || ''} 
                    hfToken={hfApiKey}
                    videoState={project.data.generativeVideoState}
                    onStateUpdate={(s) => updateProjectData({ generativeVideoState: s })}
                    onAddImageToGrid={(base64) => handleAddAssetToGrid({ type: 'image', base64 })}
                    onAddToStoryboard={(base64) => updateProjectData({ storyboard: [...project.data.storyboard, { id: generateId(), base64Image: base64, notes: '', prompt: '' }] })}
                    onAddAssetToGrid={handleAddAssetToGrid}
                />;
            case 'blender':
                return <BlenderStudio 
                    sourceImages={project.data.blenderImages}
                    resultImage={project.data.blenderResult}
                    isLoading={false} error={null}
                    onUpload={(files: FileList) => {
                        Array.from(files).forEach(file => {
                            const reader = new FileReader();
                            reader.onload = (e) => {
                                const base64 = (e.target?.result as string).split(',')[1];
                                updateProjectData({ blenderImages: [...project.data.blenderImages, { id: generateId(), base64 }] });
                            };
                            reader.readAsDataURL(file);
                        });
                    }}
                    onRemoveImage={(id) => updateProjectData({ blenderImages: project.data.blenderImages.filter(i => i.id !== id) })}
                    onGenerate={() => {}}
                    onAddToStoryboard={(base64) => updateProjectData({ storyboard: [...project.data.storyboard, { id: generateId(), base64Image: base64, notes: '', prompt: '' }] })}
                    onAddToInspiration={(base64) => updateProjectData({ inspirationImages: [...project.data.inspirationImages, { id: generateId(), base64Image: base64 }] })}
                    hfToken={hfApiKey}
                />;
            case 'scene-compositor':
                return <SceneCompositorStudio 
                    sceneState={project.data.sceneCompositorState}
                    isLoading={false} error={null}
                    onUpload={(type, file: File) => {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            const base64 = (e.target?.result as string).split(',')[1];
                            const mimeType = file.type;
                            updateProjectData({ sceneCompositorState: { ...project.data.sceneCompositorState, [type]: { base64, mimeType } } });
                        };
                        reader.readAsDataURL(file);
                    }}
                    onRemoveImage={(type) => updateProjectData({ sceneCompositorState: { ...project.data.sceneCompositorState, [type]: null } })}
                    onGenerate={() => {}}
                    onAddToStoryboard={(base64) => updateProjectData({ storyboard: [...project.data.storyboard, { id: generateId(), base64Image: base64, notes: '', prompt: '' }] })}
                    onAddToInspiration={(base64) => updateProjectData({ inspirationImages: [...project.data.inspirationImages, { id: generateId(), base64Image: base64 }] })}
                    hfToken={hfApiKey}
                    onUpdateImage={(type, base64, mimeType) => updateProjectData({ sceneCompositorState: { ...project.data.sceneCompositorState, [type]: { base64, mimeType } } })}
                />;
            case 'composite':
                return <CompositeStudio 
                    state={project.data.compositeState}
                    onStateUpdate={(s) => updateProjectData({ compositeState: s })}
                    onAddAssetToGrid={handleAddAssetToGrid}
                    onAddToStoryboard={(base64) => updateProjectData({ storyboard: [...project.data.storyboard, { id: generateId(), base64Image: base64, notes: '', prompt: '' }] })}
                    onAddToInspiration={(base64) => updateProjectData({ inspirationImages: [...project.data.inspirationImages, { id: generateId(), base64Image: base64 }] })}
                    hfToken={hfApiKey}
                />;
            case 'face-swap':
                return <FaceSwapStudio 
                    faceSwapState={project.data.faceSwapState}
                    isLoading={false} error={null}
                    onUpload={(type, file: File) => {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            const base64 = (e.target?.result as string).split(',')[1];
                            const mimeType = file.type;
                            updateProjectData({ faceSwapState: { ...project.data.faceSwapState, [type]: { base64, mimeType } } });
                        };
                        reader.readAsDataURL(file);
                    }}
                    onRemoveImage={(type) => updateProjectData({ faceSwapState: { ...project.data.faceSwapState, [type]: null } })}
                    onGenerate={() => {}}
                    onAddToStoryboard={(base64) => updateProjectData({ storyboard: [...project.data.storyboard, { id: generateId(), base64Image: base64, notes: '', prompt: '' }] })}
                    onAddToInspiration={(base64) => updateProjectData({ inspirationImages: [...project.data.inspirationImages, { id: generateId(), base64Image: base64 }] })}
                    hfToken={hfApiKey}
                />;
            case 'face-repair':
                return <FaceRepairStudio 
                    faceRepairState={project.data.faceRepairState}
                    isLoading={false} error={null}
                    onUpload={(file: File) => {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            const base64 = (e.target?.result as string).split(',')[1];
                            const mimeType = file.type;
                            updateProjectData({ faceRepairState: { ...project.data.faceRepairState, source: { base64, mimeType } } });
                        };
                        reader.readAsDataURL(file);
                    }}
                    onRemoveImage={() => updateProjectData({ faceRepairState: { ...project.data.faceRepairState, source: null } })}
                    onGenerate={() => {}}
                    onAddToStoryboard={(base64) => updateProjectData({ storyboard: [...project.data.storyboard, { id: generateId(), base64Image: base64, notes: '', prompt: '' }] })}
                    onAddToInspiration={(base64) => updateProjectData({ inspirationImages: [...project.data.inspirationImages, { id: generateId(), base64Image: base64 }] })}
                    hfToken={hfApiKey}
                />;
            case 'photorealism':
                return <PhotorealismStudio 
                    photorealismState={project.data.photorealismState}
                    isLoading={false} error={null}
                    onUpload={(file: File) => {}}
                    onRemoveImage={() => {}}
                    onGenerate={() => {}}
                    onAddToStoryboard={(base64) => updateProjectData({ storyboard: [...project.data.storyboard, { id: generateId(), base64Image: base64, notes: '', prompt: '' }] })}
                    onAddToInspiration={(base64) => updateProjectData({ inspirationImages: [...project.data.inspirationImages, { id: generateId(), base64Image: base64 }] })}
                    onPromptChange={(p, n) => updateProjectData({ photorealismState: { ...project.data.photorealismState, prompt: p, negativePrompt: n } })}
                    hfToken={hfApiKey}
                    onAddAssetToGrid={handleAddAssetToGrid}
                />;
            case 'resize':
                return <ResizeStudio 
                    state={project.data.resizeState}
                    onStateUpdate={(s) => updateProjectData({ resizeState: s })}
                    onAddAssetToGrid={handleAddAssetToGrid}
                    onAddToStoryboard={(base64) => updateProjectData({ storyboard: [...project.data.storyboard, { id: generateId(), base64Image: base64, notes: '', prompt: '' }] })}
                    onAddToInspiration={(base64) => updateProjectData({ inspirationImages: [...project.data.inspirationImages, { id: generateId(), base64Image: base64 }] })}
                    hfToken={hfApiKey}
                />;
            case 'green-screen':
                return <GreenScreenStudio 
                    greenScreenState={project.data.greenScreenState}
                    isLoading={false} error={null}
                    onStateUpdate={(s) => updateProjectData({ greenScreenState: s })}
                    onAddToStoryboard={(base64) => updateProjectData({ storyboard: [...project.data.storyboard, { id: generateId(), base64Image: base64, notes: '', prompt: '' }] })}
                    onAddAssetToGrid={handleAddAssetToGrid}
                    hfToken={hfApiKey}
                />;
            case 'topaz':
                return <TopazStudio 
                    topazState={project.data.topazState}
                    isLoading={false} error={null}
                    onStateUpdate={(s) => updateProjectData({ topazState: s })}
                    onGenerate={() => {}}
                    onAddToStoryboard={(base64) => updateProjectData({ storyboard: [...project.data.storyboard, { id: generateId(), base64Image: base64, notes: '', prompt: '' }] })}
                    onAddToInspiration={(base64) => updateProjectData({ inspirationImages: [...project.data.inspirationImages, { id: generateId(), base64Image: base64 }] })}
                    onAddAssetToGrid={handleAddAssetToGrid}
                    progress=""
                />;
            case 'grid':
                return <ImageGrid 
                    images={project.data.images} 
                    isLoading={false} error={null}
                    onViewImage={setSelectedImage}
                    gridOverlay={gridOverlay}
                    onGridOverlayChange={setGridOverlay}
                    onEditImage={(base64) => { }}
                    onAddToStoryboard={(base64) => updateProjectData({ storyboard: [...project.data.storyboard, { id: generateId(), base64Image: base64, notes: '', prompt: '' }] })}
                    onAddToInspiration={(base64) => updateProjectData({ inspirationImages: [...project.data.inspirationImages, { id: generateId(), base64Image: base64 }] })}
                    onUpscaleImage={() => {}}
                    agents={allAgents}
                    onAssignAgentToImage={(imgId, agentId) => {
                        const updatedImages = project.data.images.map(img => img.id === imgId ? { ...img, agentId: agentId || undefined } : img);
                        updateProjectData({ images: updatedImages });
                    }}
                    onCreateAgent={(name) => {
                        const newAgent: Agent = { ...coreAgents[0], id: generateId(), name, narrativeRole: 'Cast Member' };
                        updateProjectData({ agents: [...project.data.agents, newAgent] });
                        return newAgent;
                    }}
                    agentFilter={agentFilter}
                    onAgentFilterChange={setAgentFilter}
                    awaitingExternalGeneration={false}
                />;
            case 'story':
                return <Storyboard 
                    frames={project.data.storyboard} 
                    onUpdateNote={(id, notes) => updateProjectData({ storyboard: project.data.storyboard.map(f => f.id === id ? { ...f, notes } : f) })} 
                    onRemove={(id) => updateProjectData({ storyboard: project.data.storyboard.filter(f => f.id !== id) })} 
                    onReorder={(start, end) => {
                        const newFrames = [...project.data.storyboard];
                        const [moved] = newFrames.splice(start, 1);
                        newFrames.splice(end, 0, moved);
                        updateProjectData({ storyboard: newFrames });
                    }} 
                />;
            case 'inspiration':
                return <InspirationBoard 
                    images={project.data.inspirationImages} 
                    onUpload={(file) => {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            const base64 = (e.target?.result as string).split(',')[1];
                            updateProjectData({ inspirationImages: [...project.data.inspirationImages, { id: generateId(), base64Image: base64 }] });
                        };
                        reader.readAsDataURL(file);
                    }} 
                    onRemove={(id) => updateProjectData({ inspirationImages: project.data.inspirationImages.filter(i => i.id !== id) })} 
                    onUseAsGuide={() => {}} 
                />;
            case 'agents':
                return <AgentsStudio 
                    agents={project.data.agents} 
                    images={project.data.images}
                    onCreateAgent={(name) => {
                        const newAgent: Agent = { ...coreAgents[0], id: generateId(), name, narrativeRole: 'Cast Member' };
                        updateProjectData({ agents: [...project.data.agents, newAgent] });
                        return newAgent;
                    }}
                    onViewImage={setSelectedImage}
                    onUpdateAgent={handleAgentUpdate}
                    onDeleteAgent={(id) => updateProjectData({ agents: project.data.agents.filter(a => a.id !== id) })}
                    onImageUpload={(agentId, file) => {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            const resultStr = e.target?.result as string;
                            const base64 = resultStr.split(',')[1];
                            const newImage: ImageState = {
                                id: generateId(),
                                type: 'image',
                                base64,
                                mimeType: file.type,
                                isUpscaling: false,
                                agentId: agentId
                            };
                            setProject(prev => {
                                const agent = prev.data.agents.find(a => a.id === agentId);
                                let updatedAgents = prev.data.agents;
                                if (agent && !agent.avatar) {
                                    updatedAgents = prev.data.agents.map(a => a.id === agentId ? { ...a, avatar: resultStr } : a);
                                }
                                return {
                                    ...prev,
                                    data: {
                                        ...prev.data,
                                        images: [newImage, ...prev.data.images],
                                        agents: updatedAgents
                                    }
                                };
                            });
                        };
                        reader.readAsDataURL(file);
                    }}
                    onCallAgent={(agent) => { setActiveAgentId(agent.id); setActiveView('agent-chat'); }}
                />;
            case 'lore':
                return <LoreStudio 
                    lore={project.data.lore} 
                    onCreate={(title, content) => updateProjectData({ lore: [...project.data.lore, { id: generateId(), title, content }] })} 
                    onUpdate={(id, title, content) => updateProjectData({ lore: project.data.lore.map(l => l.id === id ? { ...l, title, content } : l) })} 
                    onDelete={(id) => updateProjectData({ lore: project.data.lore.filter(l => l.id !== id) })} 
                />;
            case 'prompt-library':
                return <PromptLibraryStudio 
                    templates={getPromptTemplates()} 
                    onCreate={(name, p, n) => savePromptTemplate({ name, positivePrompt: p, negativePrompt: n })} 
                    onUpdate={(id, name, p, n) => savePromptTemplate({ id, name, positivePrompt: p, negativePrompt: n })} 
                    onDelete={deletePromptTemplate} 
                />;
            case 'dynamic-prompts':
                return <DynamicPromptsStudio 
                    lists={project.data.dynamicPromptLists} 
                    onCreate={(name, items) => updateProjectData({ dynamicPromptLists: [...project.data.dynamicPromptLists, { id: generateId(), name, items }] })} 
                    onUpdate={(id, name, items) => updateProjectData({ dynamicPromptLists: project.data.dynamicPromptLists.map(l => l.id === id ? { ...l, name, items } : l) })} 
                    onDelete={(id) => updateProjectData({ dynamicPromptLists: project.data.dynamicPromptLists.filter(l => l.id !== id) })} 
                />;
            case 'agent-chat':
                const chatAgent = allAgents.find(a => a.id === activeAgentId) || allAgents[0];
                return <div className="flex flex-col h-full bg-primary">
                    <StudioHeader 
                        breadcrumbs={[{ label: 'Team', onClick: () => setActiveView('team') }, { label: chatAgent.name }]}
                        agent={chatAgent}
                        onCallAgent={() => {}}
                    />
                    <div className="flex-grow overflow-hidden">
                        <AgentChatView agent={chatAgent} />
                    </div>
                </div>;
            case 'knowledge':
                return <KnowledgeView 
                    agents={allAgents} 
                    onUpdateAgent={handleAgentUpdate} 
                />;
            case 'automation':
                return <AutomationStudio 
                    config={project.data.automationConfig} 
                    onSave={(cfg) => updateProjectData({ automationConfig: cfg })} 
                    onTestWebhook={async () => true} 
                />;
            default:
                return <div className="p-10 text-center text-neutral-500">View not implemented: {activeView}</div>;
        }
    };

    return (
        <div className="flex h-screen bg-primary text-text-primary font-sans overflow-hidden">
            <Sidebar 
                activeView={activeView} 
                onNavigate={handleNavigate} 
                isCollapsed={isSidebarCollapsed} 
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
                onOpenSettings={() => setIsSettingsOpen(true)}
                isOnline={navigator.onLine}
                stats={{
                    storyboard: project.data.storyboard.length,
                    inspiration: project.data.inspirationImages.length,
                    agents: project.data.agents.length,
                    lore: project.data.lore.length,
                    dynamicPrompts: project.data.dynamicPromptLists.length,
                    promptLibrary: getPromptTemplates().length
                }}
            />
            
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                {renderContent()}
            </div>

            <SettingsModal 
                isOpen={isSettingsOpen} 
                onClose={() => setIsSettingsOpen(false)} 
                onSave={(topaz, hf) => {
                    saveTopazApiKey(topaz); setTopazApiKey(topaz);
                    saveHfApiKey(hf); setHfApiKey(hf);
                    setIsSettingsOpen(false);
                }}
                currentTopazApiKey={topazApiKey}
                currentHfApiKey={hfApiKey}
            />

            <ImageModal 
                image={selectedImage} 
                onClose={() => setSelectedImage(null)} 
                onEdit={() => {}} 
                onAddToStoryboard={(base64) => updateProjectData({ storyboard: [...project.data.storyboard, { id: generateId(), base64Image: base64, notes: '', prompt: '' }] })}
                onAddToInspiration={(base64) => updateProjectData({ inspirationImages: [...project.data.inspirationImages, { id: generateId(), base64Image: base64 }] })}
                agents={allAgents}
                onAssignAgentToImage={(imgId, agentId) => {
                    const updatedImages = project.data.images.map(img => img.id === imgId ? { ...img, agentId: agentId || undefined } : img);
                    updateProjectData({ images: updatedImages });
                    if(selectedImage) setSelectedImage({ ...selectedImage, agentId: agentId || undefined });
                }}
                onCreateAgent={(name) => {
                    const newAgent: Agent = { ...coreAgents[0], id: generateId(), name, narrativeRole: 'Cast Member' };
                    updateProjectData({ agents: [...project.data.agents, newAgent] });
                    return newAgent;
                }}
            />
        </div>
    );
};
