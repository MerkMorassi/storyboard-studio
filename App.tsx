
import React, { useState, useEffect } from 'react';
import { ActiveView, Project, Agent, ImageState, ScriptFile, LoreEntry, Character } from './types.ts';
import { Sidebar } from './components/Sidebar.tsx';
import { DashboardStudio } from './components/DashboardStudio.tsx';
import { ProjectsStudio } from './components/ProjectsStudio.tsx';
import { TeamStudio } from './components/TeamStudio.tsx';
import { CoreStudio } from './components/CoreStudio.tsx';
import { IdeationStudio } from './components/IdeationStudio.tsx';
import { ScriptingStudio } from './components/ScriptingStudio.tsx';
import { DesignStudio } from './components/DesignStudio.tsx';
import { ArtStudio } from './components/ArtStudio.tsx';
import { DirectorStudio } from './modules/director/DirectorStudio.tsx';
import { ScriptWriterStudio } from './components/ScriptWriterStudio.tsx';
import { MythosCinematicStudio } from './components/MythosCinematicStudio.tsx';
import { ImageGeneratorStudio } from './components/ImageGeneratorStudio.tsx';
import { GenerativeVideoStudio } from './components/GenerativeVideoStudio.tsx';
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
import { ImageGrid } from './components/ImageGrid.tsx';
import { Storyboard } from './components/Storyboard.tsx';
import { InspirationBoard } from './components/InspirationBoard.tsx';
import { RosterStudio } from './components/RosterStudio.tsx';
import { CharactersStudio } from './components/CharactersStudio.tsx';
import { LoreStudio } from './components/LoreStudio.tsx';
import { PromptLibraryStudio } from './components/PromptLibraryStudio.tsx';
import { DynamicPromptsStudio } from './components/DynamicPromptsStudio.tsx';
import { AgentChatStudio } from './components/AgentChatStudio.tsx';
import { KnowledgeView } from './components/KnowledgeView.tsx';
import { AutomationStudio } from './components/AutomationStudio.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { ImageModal } from './components/ImageModal.tsx';
import { GenericAgentStudio } from './components/GenericAgentStudio.tsx';

import { getAnimAgentsTeam } from './services/agentService.ts';
import { getTopazApiKey, saveTopazApiKey, getHfApiKey, saveHfApiKey } from './services/apiKeyService.ts';
import { getPromptTemplates, savePromptTemplate, deletePromptTemplate } from './services/promptTemplateService.ts';
import { generateImageSDXL } from './services/huggingFaceService.ts';
import { blobToBase64 } from './utils/imageUtils.ts';
import { vectorDb } from './services/vectorDbService';

export const App = () => {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeAgentId, setActiveAgentId] = useState<string>('agent-core');
  const [selectedImage, setSelectedImage] = useState<ImageState | null>(null);
  const [gridOverlay, setGridOverlay] = useState<any>('none');
  const [agentFilter, setAgentFilter] = useState('');

  const [project, setProject] = useState<Project>({
      id: 'proj_001',
      name: 'Untitled Project',
      tagline: 'A MythOS Production',
      brief: '',
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
          compositeState: { refImage1: null, refImage2: null, task1: 'ip', task2: 'style', prompt: '', negativePrompt: '', width: 1024, height: 1024, seed: 0, randomizeSeed: true, resultImage: null, resultVideoUrl: null },
          faceSwapState: { source: null, face: null, result: null },
          faceRepairState: { source: null, result: null },
          photorealismState: { source: null, result: null, prompt: '', negativePrompt: '' },
          resizeState: { source: null, result: null, width: 1024, height: 1024, prompt: '', alignment: 'Middle', overlap: 50, steps: 20, directions: { left: false, right: false, top: false, bottom: false } },
          greenScreenState: { source: null, resultUrl: null },
          backgroundRemovalState: { source: null, result: null },
          qwenImageEditState: { 
              images: [null, null, null, null, null, null], // 6 slots
              result: null, 
              prompt: '',
              negativePrompt: '',
              cfgScale: 4.0,
              seed: 0,
              randomizeSeed: true,
              width: 1024,
              height: 1024,
              steps: 25
          },
          generativeVideoState: { prompt: '', negativePrompt: '', image: null, lastImage: null, resultUrl: null, engine: 'external', externalUrl: '', steps: 25, duration: 4, guidanceScale: 7.5, guidanceScale2: 1.0, scheduler: 'UniPCMultistep', fps: 16, seed: 42, randomizeSeed: true },
          topazState: { activeMediaType: 'image', source: null, result: null, resultUrl: null, operation: 'enhance', parameters: { scale: 2, strength: 50 }, faceRecovery: true },
          directorState: { referenceImage: null, analysis: null, chatHistory: [], generatedPreview: null },
          agents: getAnimAgentsTeam(), // Default initialization
          studioPlayers: [],
          characters: [],
          lore: [],
          dynamicPromptLists: [],
          promptTemplates: getPromptTemplates(),
          automationConfig: { ragEnabled: false, ragProvider: 'browser', ragApiKey: '', ragBaseUrl: '', ragKnowledgeBoxId: '', ragLocalhostUrl: '', webhookUrls: [] }
      }
  });

  // Load persistent data from IndexedDB on startup
  useEffect(() => {
      const loadPersistentData = async () => {
          try {
              const [savedAgents, savedPlayers, savedImages] = await Promise.all([
                  vectorDb.getAgents(),
                  vectorDb.getPlayers(),
                  vectorDb.getImages()
              ]);

              updateProjectData({
                  // If we have saved agents, use them. Otherwise, keep the default team.
                  agents: savedAgents.length > 0 ? savedAgents : getAnimAgentsTeam(),
                  studioPlayers: savedPlayers,
                  images: savedImages
              });
          } catch (e) {
              console.error("Failed to load persistent data:", e);
          }
      };
      loadPersistentData();
  }, []);

  // Persist Agents whenever they change
  useEffect(() => {
      vectorDb.saveAgents(project.data.agents).catch(e => console.error("Failed to save agents", e));
  }, [project.data.agents]);

  // Persist Players whenever they change
  useEffect(() => {
      vectorDb.savePlayers(project.data.studioPlayers).catch(e => console.error("Failed to save players", e));
  }, [project.data.studioPlayers]);

  // Persist Images whenever they change
  useEffect(() => {
      vectorDb.saveImages(project.data.images).catch(e => console.error("Failed to save images", e));
  }, [project.data.images]);


  const updateProjectData = (updates: Partial<typeof project.data>) => {
      setProject(prev => ({ ...prev, data: { ...prev.data, ...updates } }));
  };

  const createEntity = (data: Partial<Agent>): Agent => ({
      id: `agent_${Date.now()}`,
      name: data.name || 'New Entity',
      systemPrompt: data.systemPrompt || 'You are a helpful assistant.',
      voice: data.voice || 'Kore',
      tags: [],
      speakingRate: 1.0,
      autoPlayAudio: false,
      ...data,
  });

  // AI Agent Handlers
  const handleCreateAgent = (data: Partial<Agent>): Agent => {
      const newAgent = createEntity(data);
      updateProjectData({ agents: [...project.data.agents, newAgent] });
      return newAgent;
  };
  
  // Destructive Delete - Cleans up Chat Logs and Vectors
  const handleDeleteAgent = async (agentId: string) => {
      if (window.confirm("WARNING: This is a destructive action.\n\nDeleting this agent will PERMANENTLY remove their specific Chat Logs and Knowledge Base vectors from the database.\n\nAre you sure you want to proceed?")) {
          // Remove from state first to update UI
          updateProjectData({ agents: project.data.agents.filter(a => a.id !== agentId) });
          
          // Deep clean DB
          try {
              await vectorDb.deleteAgentChat(agentId); // Clean chat
              await vectorDb.clearVectors(agentId); // Clean RAG data
              console.log(`Deep cleaned agent data for: ${agentId}`);
          } catch(e) {
              console.error("Error during agent cleanup:", e);
          }
      }
  };
  
  const handleUpdateAgent = (id: string, u: Partial<Agent>) => updateProjectData({ agents: project.data.agents.map(a => a.id === id ? { ...a, ...u } : a) });

  // Studio Player Handlers
  const handleCreatePlayer = (data: Partial<Agent>): Agent => {
      const newPlayer = createEntity(data);
      updateProjectData({ studioPlayers: [...project.data.studioPlayers, newPlayer] });
      return newPlayer;
  };
  const handleDeletePlayer = (playerId: string) => updateProjectData({ studioPlayers: project.data.studioPlayers.filter(p => p.id !== playerId) });
  const handleUpdatePlayer = (id: string, u: Partial<Agent>) => updateProjectData({ studioPlayers: project.data.studioPlayers.map(p => p.id === id ? { ...p, ...u } : p) });
  
  // Character Handlers
  const handleCreateCharacter = (data: Partial<Character>): Character => {
      const newChar: Character = {
          id: `char_${Date.now()}`,
          name: data.name || 'New Character',
          archetype: data.archetype || 'Unknown',
          description: data.description || '',
          ...data
      };
      updateProjectData({ characters: [...project.data.characters, newChar] });
      return newChar;
  };
  const handleDeleteCharacter = (id: string) => updateProjectData({ characters: project.data.characters.filter(c => c.id !== id) });
  const handleUpdateCharacter = (id: string, u: Partial<Character>) => updateProjectData({ characters: project.data.characters.map(c => c.id === id ? { ...c, ...u } : c) });


  const handleAddAssetToGrid = (asset: any) => {
      const newImage: ImageState = {
          id: `img_${Date.now()}`,
          ...asset,
          isUpscaling: false,
          agentId: activeAgentId
      };
      updateProjectData({ images: [newImage, ...project.data.images] });
  };

  const handleAddToStoryboard = (base64Image: string) => {
      // Implementation placeholder
  };
  
  const handleAddToInspiration = (base64Image: string) => {
      // Implementation placeholder
  };

  // Lore Handlers
  const handleCreateLore = (title: string, content: string, projectId: string) => {
      const newEntry: LoreEntry = {
          id: `lore_${Date.now()}`,
          projectId,
          title,
          content
      };
      updateProjectData({ lore: [newEntry, ...project.data.lore] });
  };

  const handleUpdateLore = (id: string, title: string, content: string) => {
      updateProjectData({ lore: project.data.lore.map(l => l.id === id ? { ...l, title, content } : l) });
  };

  const handleDeleteLore = (id: string) => {
      updateProjectData({ lore: project.data.lore.filter(l => l.id !== id) });
  };

  const handleCallTool = async (name: string, args: any): Promise<{ textResult: string; resultData?: any; }> => {
    try {
        switch (name) {
            case 'prepareMythosImageGeneration': {
                updateProjectData({ mythosPrompt: args.prompt });
                setActiveView('mythos-cinematic-engine');
                return {
                    textResult: "OK, I've prepared the MythOS Cinematic Studio. The user has been navigated there.",
                    resultData: { text: args.prompt } // Pass prompt back to bubble for display
                };
            }
            case 'generateMythosImage': {
                const hfToken = getHfApiKey();
                if (!hfToken) {
                    throw new Error("Cannot generate image: Hugging Face Token is missing. Please configure it in Settings.");
                }
                const blob = await generateImageSDXL({ prompt: args.prompt, useSuperiorEngine: true }, hfToken);
                const base64 = await blobToBase64(blob);
                const imageData = { base64, mimeType: blob.type };
                
                handleAddAssetToGrid({ type: 'image', ...imageData, metadata: { engine: 'MythOS/Agent', prompt: args.prompt } });

                return {
                    textResult: "Image generation complete. The image has been displayed to the user and saved to their main project gallery.",
                    resultData: { image: imageData }
                };
            }
            default:
                return { textResult: `Unknown tool: ${name}` };
        }
    } catch (error) {
        console.error(`[Tool Call Error] ${name}:`, error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { 
            textResult: `The tool execution failed with the following error: ${errorMessage}`,
            resultData: { error: errorMessage } 
        };
    }
  };

  const getAgentById = (id: string) => project.data.agents.find(a => a.id === id) || project.data.agents[0];
  
  const scribe = getAgentById('agent-scripting');

  const renderView = () => {
      switch(activeView) {
          case 'dashboard': 
            return <DashboardStudio 
                project={project} 
                onUpdateProject={updates => setProject(prev => ({ ...prev, ...updates }))} 
                images={project.data.images} 
                stats={{
                    storyboardFrames: project.data.storyboard.length,
                    agents: project.data.agents.length,
                    loreEntries: project.data.lore.length,
                    inspirationImages: project.data.inspirationImages.length,
                    dynamicPromptLists: project.data.dynamicPromptLists.length,
                    promptTemplates: project.data.promptTemplates.length,
                    imagesGenerated: project.data.images.length,
                    totalProjects: 1,
                    scriptsCount: project.data.scriptsBin.length
                }} 
                onNavigate={setActiveView} 
            />;
          case 'projects': return <ProjectsStudio projects={[project]} activeProjectId={project.id} onSelectProject={() => {}} onCreateProject={() => {}} onRenameProject={() => {}} onDeleteProject={() => {}} />;
          case 'team': return <TeamStudio team={project.data.agents} onUpdateAgent={handleUpdateAgent} onNavigate={(v, id) => { setActiveView(v); if(id) setActiveAgentId(id); }} onCallAgent={() => {}} />;
          case 'core': return <CoreStudio agent={getAgentById('agent-core')} onNavigate={setActiveView} onCallAgent={() => {}} />;
          case 'ideation': return <IdeationStudio agent={getAgentById('agent-ideation')} onNavigate={setActiveView} onCallAgent={() => {}} />;
          case 'scripting': return <ScriptingStudio agent={scribe} scriptText={project.data.scriptText} scriptsBin={project.data.scriptsBin} onScriptUpload={() => {}} onDeleteScript={() => {}} onNavigate={setActiveView} onCallAgent={() => {}} />;
          case 'design': return <DesignStudio agent={getAgentById('agent-design')} onNavigate={setActiveView} onCallAgent={() => {}} />;
          case 'art': return <ArtStudio agent={getAgentById('agent-art')} onNavigate={setActiveView} onCallAgent={() => {}} />;
          case 'director': return <DirectorStudio onNavigate={setActiveView} />;
          case 'mythos-cinematic-engine': return <MythosCinematicStudio hfToken={getHfApiKey() || ''} promptTemplates={project.data.promptTemplates} dynamicPromptLists={project.data.dynamicPromptLists} onAddAssetToGrid={handleAddAssetToGrid} onAddToStoryboard={() => {}} onAddToInspiration={() => {}} initialPrompt={project.data.mythosPrompt} onClearInitialPrompt={() => updateProjectData({ mythosPrompt: undefined })} />;
          case 'image-generator': return <ImageGeneratorStudio hfToken={getHfApiKey() || ''} promptTemplates={project.data.promptTemplates} dynamicPromptLists={project.data.dynamicPromptLists} agents={project.data.agents} onAddAssetToGrid={handleAddAssetToGrid} onAddToStoryboard={() => {}} onAddToInspiration={() => {}} />;
          case 'generative-video': return <GenerativeVideoStudio apiKey={''} hfToken={getHfApiKey() || ''} videoState={project.data.generativeVideoState} onStateUpdate={s => updateProjectData({ generativeVideoState: s })} onAddImageToGrid={() => {}} onAddToStoryboard={() => {}} onAddAssetToGrid={handleAddAssetToGrid} />;
          case 'blender': return <BlenderStudio sourceImages={project.data.blenderImages} resultImage={project.data.blenderResult} isLoading={false} error={null} onUpload={() => {}} onRemoveImage={() => {}} onGenerate={() => {}} onAddToStoryboard={() => {}} onAddToInspiration={() => {}} hfToken={getHfApiKey() || ''} />;
          case 'scene-compositor': return <SceneCompositorStudio sceneState={project.data.sceneCompositorState} isLoading={false} error={null} onUpload={() => {}} onRemoveImage={() => {}} onGenerate={() => {}} onAddToStoryboard={() => {}} onAddToInspiration={() => {}} hfToken={getHfApiKey() || ''} onUpdateImage={() => {}} />;
          case 'composite': return <CompositeStudio state={project.data.compositeState} onStateUpdate={s => updateProjectData({ compositeState: s })} onAddAssetToGrid={handleAddAssetToGrid} onAddToStoryboard={() => {}} onAddToInspiration={() => {}} hfToken={getHfApiKey() || ''} />;
          case 'face-swap': return <FaceSwapStudio faceSwapState={project.data.faceSwapState} isLoading={false} error={null} onUpload={() => {}} onRemoveImage={() => {}} onGenerate={() => {}} onAddToStoryboard={() => {}} onAddToInspiration={() => {}} hfToken={getHfApiKey() || ''} />;
          case 'face-repair': return <FaceRepairStudio faceRepairState={project.data.faceRepairState} isLoading={false} error={null} onUpload={() => {}} onRemoveImage={() => {}} onGenerate={() => {}} onAddToStoryboard={() => {}} onAddToInspiration={() => {}} hfToken={getHfApiKey() || ''} />;
          case 'photorealism': return <PhotorealismStudio photorealismState={project.data.photorealismState} isLoading={false} error={null} onUpload={() => {}} onRemoveImage={() => {}} onGenerate={() => {}} onAddToStoryboard={() => {}} onAddToInspiration={() => {}} onPromptChange={() => {}} hfToken={getHfApiKey() || ''} onAddAssetToGrid={handleAddAssetToGrid} />;
          case 'resize': return <ResizeStudio state={project.data.resizeState} onStateUpdate={s => updateProjectData({ resizeState: s })} onAddAssetToGrid={handleAddAssetToGrid} onAddToStoryboard={() => {}} onAddToInspiration={() => {}} hfToken={getHfApiKey() || ''} />;
          case 'green-screen': return <GreenScreenStudio greenScreenState={project.data.greenScreenState} isLoading={false} error={null} onStateUpdate={s => updateProjectData({ greenScreenState: s })} onAddToStoryboard={() => {}} onAddAssetToGrid={handleAddAssetToGrid} hfToken={getHfApiKey() || ''} />;
          case 'background-removal': return <BackgroundRemovalStudio state={project.data.backgroundRemovalState} onStateUpdate={s => updateProjectData({ backgroundRemovalState: s })} onAddToStoryboard={() => {}} onAddToInspiration={() => {}} onAddAssetToGrid={handleAddAssetToGrid} hfToken={getHfApiKey() || ''} />;
          case 'qwen-image-edit': return <QwenImageEditStudio state={project.data.qwenImageEditState} onStateUpdate={s => updateProjectData({ qwenImageEditState: s })} onAddToStoryboard={() => {}} onAddToInspiration={() => {}} onAddAssetToGrid={handleAddAssetToGrid} hfToken={getHfApiKey() || ''} />;
          case 'topaz': return <TopazStudio topazState={project.data.topazState} isLoading={false} error={null} onStateUpdate={s => updateProjectData({ topazState: s })} onGenerate={() => {}} onAddToStoryboard={() => {}} onAddToInspiration={() => {}} onAddAssetToGrid={handleAddAssetToGrid} progress="" />;
          case 'grid': return <ImageGrid images={project.data.images} isLoading={false} error={null} onViewImage={setSelectedImage} gridOverlay={gridOverlay} onGridOverlayChange={setGridOverlay} onEditImage={() => {}} onAddToStoryboard={() => {}} onAddToInspiration={() => {}} onUpscaleImage={() => {}} agents={project.data.agents} onAssignAgentToImage={() => {}} onCreateAgent={handleCreateAgent} agentFilter={agentFilter} onAgentFilterChange={setAgentFilter} awaitingExternalGeneration={false} />;
          case 'story': return <Storyboard frames={project.data.storyboard} onUpdateNote={() => {}} onRemove={() => {}} onReorder={() => {}} />;
          case 'inspiration': return <InspirationBoard images={project.data.inspirationImages} onUpload={() => {}} onRemove={() => {}} onUseAsGuide={() => {}} />;
          case 'scripts-bin': return <ScriptingStudio agent={scribe} scriptText={project.data.scriptText} scriptsBin={project.data.scriptsBin} onScriptUpload={(file) => { const reader = new FileReader(); reader.onload = (e) => updateProjectData({ scriptText: e.target?.result as string }); reader.readAsText(file); }} onDeleteScript={(id) => updateProjectData({ scriptsBin: project.data.scriptsBin.filter(s => s.id !== id) })} onNavigate={setActiveView} onCallAgent={() => { setActiveAgentId(scribe.id); setActiveView('agent-chat'); }} defaultTab='bin' />;
          case 'script-writer': return <ScriptWriterStudio onSendToScriptsBin={(s) => updateProjectData({ scriptsBin: [...project.data.scriptsBin, { ...s, id: `script_${Date.now()}`, date: new Date().toLocaleDateString() }] })} onNavigate={setActiveView} promptTemplates={project.data.promptTemplates} dynamicPromptLists={project.data.dynamicPromptLists} />;
          case 'agents': return <RosterStudio rosterType="ai" agents={project.data.agents} images={project.data.images} onCreateEntity={handleCreateAgent} onViewImage={setSelectedImage} onUpdateEntity={handleUpdateAgent} onDeleteEntity={handleDeleteAgent} onImageUpload={() => {}} onCallEntity={() => {}} />;
          case 'studio-players': return <RosterStudio rosterType="player" agents={project.data.studioPlayers} images={project.data.studioPlayers} onCreateEntity={handleCreatePlayer} onViewImage={setSelectedImage} onUpdateEntity={handleUpdatePlayer} onDeleteEntity={handleDeletePlayer} onImageUpload={() => {}} onCallEntity={() => {}} />;
          case 'characters': return <CharactersStudio characters={project.data.characters} onCreate={handleCreateCharacter} onUpdate={handleUpdateCharacter} onDelete={handleDeleteCharacter} />;
          case 'lore': return <LoreStudio lore={project.data.lore} projects={[{ id: project.id, name: project.name }]} onCreate={handleCreateLore} onUpdate={handleUpdateLore} onDelete={handleDeleteLore} />;
          case 'prompt-library': return <PromptLibraryStudio templates={project.data.promptTemplates} onCreate={() => {}} onUpdate={() => {}} onDelete={() => {}} />;
          case 'dynamic-prompts': return <DynamicPromptsStudio lists={project.data.dynamicPromptLists} onCreate={() => {}} onUpdate={() => {}} onDelete={() => {}} />;
          case 'agent-chat': return <AgentChatStudio agents={project.data.agents} onUploadLore={() => {}} onCallTool={handleCallTool} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} onAddAssetToGrid={handleAddAssetToGrid} />;
          case 'knowledge': return <KnowledgeView agents={project.data.agents} onUpdateAgent={handleUpdateAgent} onCallAgent={(agent) => { setActiveAgentId(agent.id); setActiveView('agent-chat'); }} />;
          case 'automation': return <AutomationStudio config={project.data.automationConfig} onSave={() => {}} onTestWebhook={async () => true} />;
          case 'agent-workspace': return <GenericAgentStudio agent={getAgentById(activeAgentId)} onNavigate={setActiveView} onCallAgent={() => {}} />;
          default: return <div className="text-white p-10">View not found</div>;
      }
  };

  return (
      <div className="flex h-screen w-screen bg-neutral-950 text-white overflow-hidden font-sans">
          <Sidebar activeView={activeView} onNavigate={setActiveView} isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} onOpenSettings={() => setIsSettingsOpen(true)} isOnline={true} stats={{ storyboard: project.data.storyboard.length, inspiration: project.data.inspirationImages.length, agents: project.data.agents.length, lore: project.data.lore.length, dynamicPrompts: project.data.dynamicPromptLists.length, promptLibrary: project.data.promptTemplates.length }} />
          <div className="flex-grow h-full overflow-hidden bg-neutral-900 relative">
              {renderView()}
          </div>
          <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onSave={(t, h) => { saveTopazApiKey(t); saveHfApiKey(h); setIsSettingsOpen(false); }} currentTopazApiKey={getTopazApiKey() || ''} currentHfApiKey={getHfApiKey() || ''} />
          <ImageModal image={selectedImage} onClose={() => setSelectedImage(null)} onEdit={() => {}} onAddToStoryboard={() => {}} onAddToInspiration={() => {}} agents={project.data.agents} onAssignAgentToImage={() => {}} onCreateAgent={handleCreateAgent} />
      </div>
  );
};
