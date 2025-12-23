
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { DashboardStudio } from './components/DashboardStudio';
import { ImageGrid } from './components/ImageGrid';
import { Storyboard } from './components/Storyboard';
import { DirectorStudio } from './modules/director/DirectorStudio';
import { AgentsStudio } from './components/AgentsStudio';
import { TeamStudio } from './components/TeamStudio';
import { LoreStudio } from './components/LoreStudio';
import { PromptLibraryStudio } from './components/PromptLibraryStudio';
import { DynamicPromptsStudio } from './components/DynamicPromptsStudio';
import { ScriptViewer } from './components/ScriptViewer';
import { InspirationBoard } from './components/InspirationBoard';
import { VideoGenerator } from './components/VideoGenerator';
import { GenerativeVideoStudio } from './components/GenerativeVideoStudio';
import { BlenderStudio } from './components/BlenderStudio';
import { SceneCompositorStudio } from './components/SceneCompositorStudio';
import { CompositeStudio } from './components/CompositeStudio';
import { FaceSwapStudio } from './components/FaceSwapStudio';
import { FaceRepairStudio } from './components/FaceRepairStudio';
import { PhotorealismStudio } from './components/PhotorealismStudio';
import { GreenScreenStudio } from './components/GreenScreenStudio';
import { TopazStudio } from './components/TopazStudio';
import { ResizeStudio } from './components/ResizeStudio';
import { AutomationStudio } from './components/AutomationStudio';
import { ProjectsStudio } from './components/ProjectsStudio';
import { KnowledgeView } from './components/KnowledgeView';
import { SettingsModal } from './components/SettingsModal';
import { InputPanel } from './components/InputPanel';
import { ImageGeneratorStudio } from './components/ImageGeneratorStudio';
import { MythosCinematicStudio } from './components/MythosCinematicStudio';
import { AgentChatStudio } from './components/AgentChatStudio';
import { StudioHeader } from './components/StudioHeader';
import { GenericAgentStudio } from './components/GenericAgentStudio';
import { CoreStudio } from './components/CoreStudio';
import { IdeationStudio } from './components/IdeationStudio';
import { ScriptingStudio } from './components/ScriptingStudio';
import { DesignStudio } from './components/DesignStudio';
import { ArtStudio } from './components/ArtStudio';
import { getApiKey, saveApiKey, getTopazApiKey, saveTopazApiKey, getHfApiKey, saveHfApiKey } from './services/apiKeyService';
import { processImage, processVideo } from './services/topazService';
import { ActiveView, Project, ImageState, Agent, LoreEntry, PromptTemplate, DynamicPromptList, StoryboardFrame, InspirationImage, BlenderImage, SceneCompositorState, CompositeState, FaceSwapState, FaceRepairState, PhotorealismState, GreenScreenState, TopazState, GenerativeVideoState, ResizeState, AutomationConfig } from './types';
import { getAgent, saveAgent, getAnimAgentsTeam } from './services/agentService';
import { useLiveChat } from './hooks/useLiveChat';
import { MicIcon, MicOffIcon, PhoneIcon } from './components/icons';

// Mock Data Generators for Initial State (Simplification for restoration)
const generateId = () => Math.random().toString(36).substr(2, 9);

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });

// --- Live Chat Overlay Component ---
const LiveChatOverlay: React.FC<{ agent: Agent; onClose: () => void }> = ({ agent, onClose }) => {
    const { isLive, connectionState, liveTranscript, startLiveChat, stopLiveChat } = useLiveChat(agent);

    useEffect(() => {
        startLiveChat();
        return () => { stopLiveChat(); };
    }, []);

    return (
        <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center backdrop-blur-md animate-fade-in">
            <div className="bg-neutral-900 border border-neutral-700 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-green-500 animate-pulse"></div>
                <div className="mb-6">
                    <img src={agent.avatar || "https://ui-avatars.com/api/?name=" + agent.name} className="w-24 h-24 rounded-full mx-auto border-4 border-neutral-800 shadow-lg" alt={agent.name} />
                    <h3 className="text-2xl font-bold text-white mt-4">{agent.name}</h3>
                    <p className="text-green-400 text-sm font-bold uppercase tracking-wider mt-1">{connectionState === 'connected' ? 'Live Call Active' : connectionState}</p>
                </div>
                
                <div className="bg-neutral-800/50 rounded-xl p-4 min-h-[120px] mb-6 text-left border border-neutral-700/50">
                    <div className="mb-2">
                        <span className="text-[10px] text-neutral-500 font-bold uppercase">You</span>
                        <p className="text-sm text-neutral-300">{liveTranscript.user || "Listening..."}</p>
                    </div>
                    <div>
                        <span className="text-[10px] text-blue-500 font-bold uppercase">{agent.name}</span>
                        <p className="text-sm text-white">{liveTranscript.model || "..."}</p>
                    </div>
                </div>

                <button onClick={onClose} className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-red-500/20 transition-all transform active:scale-95 flex items-center justify-center gap-2 mx-auto">
                    <PhoneIcon className="w-5 h-5 rotate-135" />
                    End Call
                </button>
            </div>
        </div>
    );
};

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Global API Key State
  const [apiKey, setApiKey] = useState(getApiKey() || '');
  const [topazApiKey, setTopazKey] = useState(getTopazApiKey() || '');
  const [hfApiKey, setHfApiKey] = useState(getHfApiKey() || '');

  // --- Application State ---
  const [images, setImages] = useState<ImageState[]>([]);
  const [storyboard, setStoryboard] = useState<StoryboardFrame[]>([]);
  
  // SEPARATED AGENTS: Cast vs Team
  const [castMembers, setCastMembers] = useState<Agent[]>([]); // Fictional Characters
  const [animAgents, setAnimAgents] = useState<Agent[]>(getAnimAgentsTeam()); // The Production Team (Nexus, etc.)

  const [lore, setLore] = useState<LoreEntry[]>([]);
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [dynamicPrompts, setDynamicPrompts] = useState<DynamicPromptList[]>([]);
  const [inspiration, setInspiration] = useState<InspirationImage[]>([]);
  const [scriptText, setScriptText] = useState('');
  
  // Specific Studio States
  const [blenderState, setBlenderState] = useState<{ source: BlenderImage[], result: string | null }>({ source: [], result: null });
  const [sceneState, setSceneState] = useState<SceneCompositorState>({ background: null, character: null, result: null });
  const [compositeState, setCompositeState] = useState<CompositeState>({ 
      refImage1: null, refImage2: null, task1: 'ip', task2: 'ip', 
      prompt: 'a person playing guitar in the street', negativePrompt: '', 
      width: 1024, height: 1024, seed: -1, randomizeSeed: true, 
      resultImage: null, resultVideoUrl: null 
  });
  const [faceSwapState, setFaceSwapState] = useState<FaceSwapState>({ source: null, face: null, result: null });
  const [faceRepairState, setFaceRepairState] = useState<FaceRepairState>({ source: null, result: null });
  const [photorealismState, setPhotorealismState] = useState<PhotorealismState>({ source: null, result: null, prompt: '', negativePrompt: '' });
  const [greenScreenState, setGreenScreenState] = useState<GreenScreenState>({ source: null, resultUrl: null });
  const [resizeState, setResizeState] = useState<ResizeState>({ 
      source: null, result: null, 
      width: 1280, height: 720, 
      prompt: '', alignment: 'Middle', overlap: 10, steps: 8, 
      directions: { left: true, right: true, top: true, bottom: true } 
  });
  
  // Topaz State with LocalStorage Persistence
  const [topazState, setTopazState] = useState<TopazState>(() => {
      const defaultState: TopazState = { 
          activeMediaType: 'image', 
          source: null, 
          result: null, 
          resultUrl: null, 
          operation: 'enhance', 
          parameters: { scale: 2, strength: 50 }, 
          faceRecovery: true 
      };
      try {
          const saved = localStorage.getItem('topaz_settings_v1');
          if (saved) {
              const parsed = JSON.parse(saved);
              return { 
                  ...defaultState, 
                  operation: parsed.operation || defaultState.operation,
                  parameters: { ...defaultState.parameters, ...parsed.parameters },
                  faceRecovery: parsed.faceRecovery ?? defaultState.faceRecovery
              };
          }
      } catch (e) {
          console.error("Failed to load Topaz settings:", e);
      }
      return defaultState;
  });

  // Persist Topaz settings
  useEffect(() => {
      const settingsToSave = {
          operation: topazState.operation,
          parameters: topazState.parameters,
          faceRecovery: topazState.faceRecovery
      };
      localStorage.setItem('topaz_settings_v1', JSON.stringify(settingsToSave));
  }, [topazState.operation, topazState.parameters, topazState.faceRecovery]);
  
  // Updated defaults for Wan 2.2
  const [genVideoState, setGenVideoState] = useState<GenerativeVideoState>({ 
      prompt: '', 
      negativePrompt: '', 
      image: null, 
      lastImage: null, 
      resultUrl: null, 
      engine: 'external', 
      externalUrl: '', 
      steps: 6, 
      duration: 3.5, 
      guidanceScale: 5, 
      guidanceScale2: 1, 
      quality: 6, 
      flowShift: 3, 
      seed: 42, 
      randomizeSeed: true, 
      scheduler: 'UniPCMultistep', 
      fps: 16 
  });
  
  const [automationConfig, setAutomationConfig] = useState<AutomationConfig>({ ragEnabled: false, ragProvider: 'browser', ragApiKey: '', ragBaseUrl: '', ragKnowledgeBoxId: '', ragLocalhostUrl: '', webhookUrls: [] });

  // Topaz Studio Local State
  const [topazLoading, setTopazLoading] = useState(false);
  const [topazError, setTopazError] = useState<string | null>(null);
  const [topazProgress, setTopazProgress] = useState('');
  const [topazPercent, setTopazPercent] = useState<number | undefined>(undefined);

  // Projects State
  const [projects, setProjects] = useState<Project[]>([{ id: 'default', name: 'Untitled Project', tagline: 'A new creative journey.', data: {} as any }]);
  const [activeProjectId, setActiveProjectId] = useState('default');

  // Director Agent State
  const [directorAgent, setDirectorAgent] = useState<Agent>(getAgent());
  
  // Active Agent for Calling (Live Chat)
  const [activeCallAgent, setActiveCallAgent] = useState<Agent | null>(null);
  
  // State for tracking which generic agent workspace is open
  const [activeAgentWorkspaceId, setActiveAgentWorkspaceId] = useState<string | null>(null);

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];

  const handleUpdateActiveProject = (updates: Partial<Project>) => {
      setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, ...updates } : p));
  };

  const handleSaveSettings = (newApiKey: string, newTopazKey: string, newHfKey: string) => {
      saveApiKey(newApiKey);
      saveTopazApiKey(newTopazKey);
      saveHfApiKey(newHfKey);
      
      setApiKey(newApiKey);
      setTopazKey(newTopazKey);
      setHfApiKey(newHfKey);
      
      setIsSettingsOpen(false);
  };

  const handleNavigate = (view: ActiveView, agentId?: string) => {
      setActiveView(view);
      if (view === 'agent-workspace' && agentId) {
          setActiveAgentWorkspaceId(agentId);
      }
  };

  // --- Unified Asset Management ---
  const handleAddAssetToGrid = (asset: { type: 'image' | 'video'; base64?: string; url?: string; mimeType?: string; metadata?: any }) => {
      const newImage: ImageState = {
          id: generateId(),
          type: asset.type,
          base64: asset.base64,
          url: asset.url,
          mimeType: asset.mimeType,
          isUpscaling: false,
          metadata: asset.metadata
      };
      setImages(prev => [newImage, ...prev]);
  };

  // --- Cast of Characters Management ---
  const handleCreateCastMember = (name: string) => {
      const newAgent: Agent = {
          id: generateId(),
          name: name,
          systemPrompt: `You are ${name}, a character in the story.`,
          voice: 'Kore' // Default voice
      };
      setCastMembers(prev => [...prev, newAgent]);
      return newAgent;
  };

  const handleUpdateCastMember = (agentId: string, updates: Partial<Agent> | string) => {
      setCastMembers(prev => prev.map(a => {
          if (a.id === agentId) {
              if (typeof updates === 'string') {
                  return { ...a, name: updates };
              }
              return { ...a, ...updates };
          }
          return a;
      }));
  };

  const handleDeleteCastMember = (agentId: string) => {
      setCastMembers(prev => prev.filter(a => a.id !== agentId));
      setImages(prev => prev.map(img => img.agentId === agentId ? { ...img, agentId: undefined } : img));
  };

  const handleCastImageUpload = async (agentId: string, file: File) => {
      try {
          const base64 = await fileToBase64(file);
          const mimeType = file.type || 'image/jpeg';
          
          const newImage: ImageState = {
              id: generateId(),
              type: 'image',
              base64: base64,
              mimeType: mimeType,
              isUpscaling: false,
              agentId: agentId
          };
          
          setImages(prev => [newImage, ...prev]);
      } catch (e) {
          console.error("Failed to upload cast image", e);
      }
  };

  // --- AnimAgents Team Management ---
  const handleUpdateTeamAgent = (agentId: string, updates: Partial<Agent>) => {
      setAnimAgents(prev => prev.map(a => a.id === agentId ? { ...a, ...updates } : a));
  };

  // --- Project Management ---
  const handleCreateProject = (projectData: { name: string, tagline?: string, thumbnail?: string }) => {
      const newProject: Project = {
          id: generateId(),
          name: projectData.name,
          tagline: projectData.tagline,
          thumbnail: projectData.thumbnail,
          brief: '',
          progress: 0,
          data: {} as any
      };
      setProjects(prev => [...prev, newProject]);
  };

  const handleRenameProject = (id: string, newName: string) => {
      setProjects(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p));
  };

  const handleDeleteProject = (id: string) => {
      if (projects.length <= 1) {
          alert("Cannot delete the last project.");
          return;
      }
      const newProjects = projects.filter(p => p.id !== id);
      setProjects(newProjects);
      if (activeProjectId === id) {
          setActiveProjectId(newProjects[0].id);
      }
  };

  // --- Actions ---
  const handleTopazGenerate = async () => {
    if (!topazApiKey) {
        setTopazError("Topaz API Key is missing. Please configure it in Settings.");
        return;
    }
    setTopazLoading(true);
    setTopazError(null);
    setTopazProgress("Initializing...");
    setTopazPercent(undefined);

    const onProgress = (status: string, percent?: number) => {
        setTopazProgress(status);
        setTopazPercent(percent);
    };

    try {
        if (topazState.activeMediaType === 'video') {
            const resultUrl = await processVideo(topazApiKey, topazState, onProgress);
            setTopazState(prev => ({
                ...prev,
                resultUrl: resultUrl,
                result: null
            }));
        } else {
            const resultBase64 = await processImage(topazApiKey, topazState, onProgress);
            setTopazState(prev => ({
                ...prev,
                result: { base64: resultBase64, mimeType: 'image/jpeg' },
                resultUrl: null
            }));
        }
    } catch (e) {
        console.error("Topaz error:", e);
        setTopazError(e instanceof Error ? e.message : "Topaz processing failed");
    } finally {
        setTopazLoading(false);
        setTopazProgress("");
        setTopazPercent(undefined);
    }
  };

  const handleUpscaleImage = async (imageId: string) => {
      // 1. Set Loading State
      setImages(prev => prev.map(img => img.id === imageId ? { ...img, isUpscaling: true } : img));
      
      const img = images.find(i => i.id === imageId);
      if (img) {
          try {
              const isVideo = img.type === 'video';
              let base64 = img.base64;
              let mimeType = img.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg');

              if (!base64 && img.url) {
                  const response = await fetch(img.url);
                  const blob = await response.blob();
                  mimeType = blob.type;
                  base64 = await new Promise<string>((resolve, reject) => {
                      const reader = new FileReader();
                      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                      reader.onerror = reject;
                      reader.readAsDataURL(blob);
                  });
              }

              if (base64) {
                  setTopazState(prev => ({
                      ...prev,
                      activeMediaType: isVideo ? 'video' : 'image',
                      source: { base64: base64!, mimeType },
                      result: null,
                      resultUrl: null,
                      operation: isVideo ? 'enhance' : prev.operation
                  }));
                  setActiveView('topaz');
              }
          } catch (e) {
              console.error("Failed to prepare asset for upscaling:", e);
              alert("Failed to load asset. Please check your connection.");
          } finally {
              // 2. Clear Loading State
              setImages(prev => prev.map(img => img.id === imageId ? { ...img, isUpscaling: false } : img));
          }
      } else {
           setImages(prev => prev.map(img => img.id === imageId ? { ...img, isUpscaling: false } : img));
      }
  };

  const handleSaveDirectorAgent = (updatedAgentData: Partial<Agent>) => {
     const newAgentData: Agent = {
         ...directorAgent,
         ...updatedAgentData,
     };
     saveAgent(newAgentData);
     setDirectorAgent(newAgentData);
  };

  // --- Scene Compositor Handlers ---
  const handleSceneUpload = async (type: 'background' | 'character', file: File) => {
      try {
          const base64 = await fileToBase64(file);
          const mimeType = file.type || 'image/jpeg';
          setSceneState(prev => ({ ...prev, [type]: { base64, mimeType } }));
      } catch (e) {
          console.error("Failed to upload scene asset", e);
      }
  };

  const handleSceneUpdate = (type: 'background' | 'character', base64: string, mimeType: string) => {
      setSceneState(prev => ({ ...prev, [type]: { base64, mimeType } }));
  };

  const handleSceneRemove = (type: 'background' | 'character') => {
      setSceneState(prev => ({ ...prev, [type]: null }));
  };

  // --- Render Content Based on Active View ---
  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardStudio 
            project={activeProject}
            onUpdateProject={handleUpdateActiveProject}
            images={images}
            stats={{
                storyboardFrames: storyboard.length,
                agents: castMembers.length,
                loreEntries: lore.length,
                inspirationImages: inspiration.length,
                dynamicPromptLists: dynamicPrompts.length,
                promptTemplates: promptTemplates.length,
                imagesGenerated: images.length,
                totalProjects: projects.length
            }}
            onNavigate={handleNavigate}
        />;
      
      // --- Department Studios ---
      case 'core':
        return <CoreStudio agent={animAgents.find(a => a.id === 'agent-core')!} onNavigate={handleNavigate} onCallAgent={setActiveCallAgent} />;
      case 'ideation':
        return <IdeationStudio agent={animAgents.find(a => a.id === 'agent-ideation')!} onNavigate={handleNavigate} onCallAgent={setActiveCallAgent} />;
      case 'scripting':
        return <ScriptingStudio agent={animAgents.find(a => a.id === 'agent-scripting')!} onNavigate={handleNavigate} onCallAgent={setActiveCallAgent} />;
      case 'design':
        return <DesignStudio agent={animAgents.find(a => a.id === 'agent-design')!} onNavigate={handleNavigate} onCallAgent={setActiveCallAgent} />;
      case 'art':
        return <ArtStudio agent={animAgents.find(a => a.id === 'agent-art')!} onNavigate={handleNavigate} onCallAgent={setActiveCallAgent} />;
      case 'agent-dop':
        // Kine's Workspace is the DirectorStudio (Analyzer)
        return <DirectorStudio onNavigate={handleNavigate} />;
      case 'team':
        return <TeamStudio 
            team={animAgents}
            onUpdateAgent={handleUpdateTeamAgent}
            onNavigate={handleNavigate}
            onCallAgent={setActiveCallAgent}
        />;
      case 'director':
        return <DirectorStudio onNavigate={handleNavigate} />;
      case 'agent-workspace':
        const agent = animAgents.find(a => a.id === activeAgentWorkspaceId) || castMembers.find(a => a.id === activeAgentWorkspaceId);
        if (!agent) return <div className="p-10 text-center text-neutral-500">Agent not found</div>;
        
        // Special routing for AnimAgents Team studios (fallback if routed via ID)
        switch (agent.id) {
            case 'agent-core':
                return <CoreStudio agent={agent} onNavigate={handleNavigate} onCallAgent={setActiveCallAgent} />;
            case 'agent-ideation':
                return <IdeationStudio agent={agent} onNavigate={handleNavigate} onCallAgent={setActiveCallAgent} />;
            case 'agent-scripting':
                return <ScriptingStudio agent={agent} onNavigate={handleNavigate} onCallAgent={setActiveCallAgent} />;
            case 'agent-design':
                return <DesignStudio agent={agent} onNavigate={handleNavigate} onCallAgent={setActiveCallAgent} />;
            case 'agent-art':
                return <ArtStudio agent={agent} onNavigate={handleNavigate} onCallAgent={setActiveCallAgent} />;
            case 'agent-dop':
                // Kine's Workspace is the DirectorStudio (Analyzer)
                return <DirectorStudio onNavigate={handleNavigate} />;
            default:
                return <GenericAgentStudio 
                    agent={agent} 
                    onNavigate={handleNavigate}
                    onCallAgent={setActiveCallAgent}
                />;
        }
      case 'image-generator':
        return (
            <div className="flex flex-col h-full">
                <StudioHeader 
                    breadcrumbs={[{ label: 'Art Department', onClick: () => setActiveView('director') }, { label: 'Image Studio' }]} 
                    agent={directorAgent}
                    onCallAgent={() => setActiveCallAgent(directorAgent)}
                />
                <ImageGeneratorStudio 
                    hfToken={hfApiKey} 
                    promptTemplates={promptTemplates}
                    dynamicPromptLists={dynamicPrompts}
                    agents={castMembers} // Pass Cast for character selection in prompt builder
                    onAddAssetToGrid={handleAddAssetToGrid}
                    onAddToStoryboard={(base64) => setStoryboard([...storyboard, { id: generateId(), base64Image: base64, notes: '', prompt: '' }])} 
                    onAddToInspiration={(base64) => setInspiration([...inspiration, { id: generateId(), base64Image: base64 }])} 
                />
            </div>
        );
      case 'mythos-cinematic-engine':
        return (
            <div className="flex flex-col h-full">
                <StudioHeader 
                    breadcrumbs={[{ label: 'Art Department', onClick: () => setActiveView('director') }, { label: 'MythOS Cinematic Engine' }]} 
                    agent={directorAgent}
                    onCallAgent={() => setActiveCallAgent(directorAgent)}
                />
                <MythosCinematicStudio 
                    hfToken={hfApiKey} 
                    onAddAssetToGrid={handleAddAssetToGrid}
                    onAddToStoryboard={(base64) => setStoryboard([...storyboard, { id: generateId(), base64Image: base64, notes: '', prompt: '' }])} 
                    onAddToInspiration={(base64) => setInspiration([...inspiration, { id: generateId(), base64Image: base64 }])} 
                />
            </div>
        );
      case 'grid':
        return (
            <div className="flex flex-col h-full">
                <StudioHeader 
                    breadcrumbs={[{ label: 'Art Department', onClick: () => setActiveView('director') }, { label: 'Asset Gallery' }]} 
                    agent={directorAgent}
                    onCallAgent={() => setActiveCallAgent(directorAgent)}
                />
                <div className="flex-grow p-4 overflow-y-auto">
                    <div className="w-full">
                        <ImageGrid 
                            images={images}
                            isLoading={false}
                            error={null}
                            onViewImage={(img) => console.log('View', img)}
                            gridOverlay="none"
                            onGridOverlayChange={() => {}}
                            onEditImage={() => {}}
                            onAddToStoryboard={() => {}}
                            onAddToInspiration={() => {}}
                            onUpscaleImage={handleUpscaleImage}
                            agents={castMembers} // Assign images to Cast Members
                            onAssignAgentToImage={(imageId, agentId) => {
                                setImages(prev => prev.map(img => img.id === imageId ? { ...img, agentId: agentId || undefined } : img));
                            }}
                            onCreateAgent={handleCreateCastMember}
                            agentFilter=""
                            onAgentFilterChange={() => {}}
                            awaitingExternalGeneration={false}
                        />
                    </div>
                </div>
            </div>
        );
      case 'story':
        return <Storyboard frames={storyboard} onUpdateNote={() => {}} onRemove={() => {}} onReorder={() => {}} />;
      case 'agents':
        return <AgentsStudio 
            agents={castMembers} 
            images={images} 
            onCreateAgent={handleCreateCastMember} 
            onViewImage={() => {}} 
            onUpdateAgent={handleUpdateCastMember} 
            onDeleteAgent={handleDeleteCastMember} 
            onImageUpload={handleCastImageUpload} 
        />;
      case 'agent-chat':
        // NOTE: Agent Chat now interfaces with the AnimAgents TEAM for production help
        return <AgentChatStudio 
            agents={animAgents} 
            onUploadLore={() => {}} 
            onSendMessage={() => {}} 
            isResponding={false} 
            error={null} 
        />;
      case 'knowledge':
        return (
            <div className="flex-1 h-full overflow-y-auto bg-primary">
                <div className="max-w-5xl mx-auto p-8 pb-20">
                    <KnowledgeView 
                        agent={directorAgent} 
                        onSaveSettings={handleSaveDirectorAgent} 
                        onApiKeyUpdate={() => setApiKey(getApiKey() || '')} 
                        hasApiKey={!!apiKey} 
                    />
                </div>
            </div>
        );
      case 'lore':
        return <LoreStudio lore={lore} onCreate={() => {}} onUpdate={() => {}} onDelete={() => {}} />;
      case 'prompt-library':
        return <PromptLibraryStudio templates={promptTemplates} onCreate={() => {}} onUpdate={() => {}} onDelete={() => {}} />;
      case 'dynamic-prompts':
        return <DynamicPromptsStudio lists={dynamicPrompts} onCreate={() => {}} onUpdate={() => {}} onDelete={() => {}} />;
      case 'script':
        return <ScriptViewer scriptText={scriptText} onUpload={() => {}} />;
      case 'inspiration':
        return <InspirationBoard images={inspiration} onUpload={() => {}} onRemove={() => {}} onUseAsGuide={() => {}} />;
      case 'video':
        return (
            <div className="flex flex-col h-full">
                <StudioHeader 
                    breadcrumbs={[{ label: 'Art Department', onClick: () => setActiveView('director') }, { label: 'Animatic Studio' }]} 
                    agent={directorAgent}
                    onCallAgent={() => setActiveCallAgent(directorAgent)}
                />
                <VideoGenerator storyboard={storyboard} onGenerateVideo={() => {}} isLoading={false} videoUrl={null} error={null} progress="" />
            </div>
        );
      case 'generative-video':
        return (
            <div className="flex flex-col h-full">
                <StudioHeader 
                    breadcrumbs={[{ label: 'Art Department', onClick: () => setActiveView('director') }, { label: 'Video Creator' }]} 
                    agent={directorAgent}
                    onCallAgent={() => setActiveCallAgent(directorAgent)}
                />
                <GenerativeVideoStudio 
                    apiKey={apiKey} 
                    hfToken={hfApiKey} 
                    videoState={genVideoState} 
                    onStateUpdate={setGenVideoState} 
                    onAddImageToGrid={() => {}} 
                    onAddToStoryboard={() => {}} 
                    onAddAssetToGrid={handleAddAssetToGrid}
                />
            </div>
        );
      case 'blender':
        return (
            <div className="flex flex-col h-full">
                <StudioHeader 
                    breadcrumbs={[{ label: 'Art Department', onClick: () => setActiveView('director') }, { label: 'Blender Studio' }]} 
                    agent={directorAgent}
                    onCallAgent={() => setActiveCallAgent(directorAgent)}
                />
                <BlenderStudio sourceImages={blenderState.source} resultImage={blenderState.result} isLoading={false} error={null} onUpload={() => {}} onRemoveImage={() => {}} onGenerate={() => {}} onAddToStoryboard={() => {}} onAddToInspiration={() => {}} />
            </div>
        );
      case 'scene-compositor':
        return (
            <div className="flex flex-col h-full">
                <StudioHeader 
                    breadcrumbs={[{ label: 'Art Department', onClick: () => setActiveView('director') }, { label: 'Compositor' }]} 
                    agent={directorAgent}
                    onCallAgent={() => setActiveCallAgent(directorAgent)}
                />
                <SceneCompositorStudio 
                    sceneState={sceneState} 
                    isLoading={false} 
                    error={null} 
                    onUpload={handleSceneUpload} 
                    onRemoveImage={handleSceneRemove} 
                    onGenerate={() => {}} 
                    onAddToStoryboard={(base64) => setStoryboard([...storyboard, { id: generateId(), base64Image: base64, notes: '', prompt: '' }])} 
                    onAddToInspiration={(base64) => setInspiration([...inspiration, { id: generateId(), base64Image: base64 }])} 
                    hfToken={hfApiKey}
                    onUpdateImage={handleSceneUpdate}
                />
            </div>
        );
      case 'composite':
        return (
            <div className="flex flex-col h-full">
                <StudioHeader 
                    breadcrumbs={[{ label: 'Art Department', onClick: () => setActiveView('director') }, { label: 'Composite Studio' }]} 
                    agent={directorAgent}
                    onCallAgent={() => setActiveCallAgent(directorAgent)}
                />
                <CompositeStudio 
                    state={compositeState} 
                    onStateUpdate={setCompositeState}
                    onAddAssetToGrid={handleAddAssetToGrid}
                    onAddToStoryboard={(base64) => setStoryboard([...storyboard, { id: generateId(), base64Image: base64, notes: '', prompt: '' }])} 
                    onAddToInspiration={(base64) => setInspiration([...inspiration, { id: generateId(), base64Image: base64 }])} 
                    hfToken={hfApiKey}
                />
            </div>
        );
      case 'face-swap':
        return <FaceSwapStudio faceSwapState={faceSwapState} isLoading={false} error={null} onUpload={() => {}} onRemoveImage={() => {}} onGenerate={() => {}} onAddToStoryboard={() => {}} onAddToInspiration={() => {}} />;
      case 'face-repair':
        return <FaceRepairStudio faceRepairState={faceRepairState} isLoading={false} error={null} onUpload={() => {}} onRemoveImage={() => {}} onGenerate={() => {}} onAddToStoryboard={() => {}} onAddToInspiration={() => {}} />;
      case 'photorealism':
        return (
            <div className="flex flex-col h-full">
                <StudioHeader 
                    breadcrumbs={[{ label: 'Art Department', onClick: () => setActiveView('director') }, { label: 'UHD Generator' }]} 
                    agent={directorAgent}
                    onCallAgent={() => setActiveCallAgent(directorAgent)}
                />
                <PhotorealismStudio photorealismState={photorealismState} isLoading={false} error={null} onUpload={() => {}} onRemoveImage={() => {}} onGenerate={() => {}} onAddToStoryboard={() => {}} onAddToInspiration={() => {}} onPromptChange={() => {}} />
            </div>
        );
      case 'resize':
        return (
            <div className="flex flex-col h-full">
                <StudioHeader 
                    breadcrumbs={[{ label: 'Art Department', onClick: () => setActiveView('director') }, { label: 'Resize Studio' }]} 
                    agent={directorAgent}
                    onCallAgent={() => setActiveCallAgent(directorAgent)}
                />
                <ResizeStudio 
                    state={resizeState} 
                    onStateUpdate={setResizeState}
                    onAddAssetToGrid={handleAddAssetToGrid}
                    onAddToStoryboard={(base64) => setStoryboard([...storyboard, { id: generateId(), base64Image: base64, notes: '', prompt: '' }])} 
                    onAddToInspiration={(base64) => setInspiration([...inspiration, { id: generateId(), base64Image: base64 }])} 
                    hfToken={hfApiKey}
                />
            </div>
        );
      case 'green-screen':
        return (
            <div className="flex flex-col h-full">
                <StudioHeader 
                    breadcrumbs={[{ label: 'Art Department', onClick: () => setActiveView('director') }, { label: 'Green Screen' }]} 
                    agent={directorAgent}
                    onCallAgent={() => setActiveCallAgent(directorAgent)}
                />
                <GreenScreenStudio 
                    greenScreenState={greenScreenState} 
                    isLoading={false} 
                    error={null} 
                    onStateUpdate={setGreenScreenState}
                    onAddToStoryboard={() => {}} 
                    onAddAssetToGrid={handleAddAssetToGrid}
                    hfToken={hfApiKey}
                />
            </div>
        );
      case 'topaz':
        return (
            <div className="flex flex-col h-full">
                <StudioHeader 
                    breadcrumbs={[{ label: 'Art Department', onClick: () => setActiveView('director') }, { label: 'Enhance Studio' }]} 
                    agent={directorAgent}
                    onCallAgent={() => setActiveCallAgent(directorAgent)}
                />
                <TopazStudio 
                    topazState={topazState} 
                    isLoading={topazLoading} 
                    error={topazError} 
                    onStateUpdate={setTopazState} 
                    onGenerate={handleTopazGenerate} 
                    onAddToStoryboard={(base64) => setStoryboard([...storyboard, { id: generateId(), base64Image: base64, notes: '', prompt: '' }])} 
                    onAddToInspiration={(base64) => setInspiration([...inspiration, { id: generateId(), base64Image: base64 }])} 
                    onAddAssetToGrid={handleAddAssetToGrid}
                    progress={topazProgress} 
                    progressPercent={topazPercent}
                />
            </div>
        );
      case 'automation':
        return <AutomationStudio config={automationConfig} onSave={setAutomationConfig} onTestWebhook={async () => true} />;
      case 'projects':
        return <ProjectsStudio 
            projects={projects} 
            activeProjectId={activeProjectId} 
            onSelectProject={setActiveProjectId} 
            onCreateProject={handleCreateProject} 
            onRenameProject={handleRenameProject} 
            onDeleteProject={handleDeleteProject} 
        />;
      default:
        return <div className="p-10 text-center text-text-secondary">Select a studio from the sidebar.</div>;
    }
  };

  return (
    <div className="flex h-screen bg-primary text-text-primary font-sans overflow-hidden">
      <Sidebar 
        activeView={activeView as ActiveView} 
        onNavigate={(view) => handleNavigate(view)} 
        isCollapsed={isSidebarCollapsed} 
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isOnline={navigator.onLine}
        stats={{
            storyboard: storyboard.length,
            inspiration: inspiration.length,
            agents: castMembers.length,
            lore: lore.length,
            dynamicPrompts: dynamicPrompts.length,
            promptLibrary: promptTemplates.length
        }}
      />
      
      <main className="flex-1 flex flex-col min-w-0 bg-primary relative overflow-hidden">
        {renderContent()}
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        onSave={handleSaveSettings}
        currentApiKey={apiKey}
        currentTopazApiKey={topazApiKey}
        currentHfApiKey={hfApiKey}
      />
      
      {activeCallAgent && (
          <LiveChatOverlay 
              agent={activeCallAgent} 
              onClose={() => setActiveCallAgent(null)} 
          />
      )}
    </div>
  );
}
