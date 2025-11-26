import React, { useState, useCallback, useEffect } from 'react';
import { InputPanel } from './components/InputPanel.tsx';
import { ImageGrid } from './components/ImageGrid.tsx';
import { generateImagesFromApi, upscaleImage, generateVideoFromApi, generateCompositeImage, generateFaceSwapFromApi, generateSceneCompositeFromApi, generateFaceRepairFromApi, generatePhotorealisticImageFromApi, chatWithAgentFromApi } from './services/geminiService.ts';
import * as ragService from './services/ragService.ts';
import { GenerationOptions, GridOverlayType, StoryboardFrame, ActiveView, InspirationImage, ImageState, BlenderImage, FaceSwapState, SceneCompositorState, FaceRepairState, PhotorealismState, Agent, LoreEntry, DynamicPromptList, ChatMessage, WebhookPayload, FunctionCall, AutomationConfig, PromptTemplate, Project, ProjectData } from './types.ts';
import { SettingsModal } from './components/SettingsModal.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { Storyboard } from './components/Storyboard.tsx';
import { ScriptViewer } from './components/ScriptViewer.tsx';
import { InspirationBoard } from './components/InspirationBoard.tsx';
import { ImageModal } from './components/ImageModal.tsx';
import { VideoGenerator } from './components/VideoGenerator.tsx';
import { BlenderStudio } from './components/BlenderStudio.tsx';
import { FaceSwapStudio } from './components/FaceSwapStudio.tsx';
import { SceneCompositorStudio } from './components/SceneCompositorStudio.tsx';
import { FaceRepairStudio } from './components/FaceRepairStudio.tsx';
import { PhotorealismStudio } from './components/PhotorealismStudio.tsx';
import { AgentsStudio } from './components/AgentsStudio.tsx';
import { LoreStudio } from './components/LoreStudio.tsx';
import { DynamicPromptsStudio } from './components/DynamicPromptsStudio.tsx';
import { PromptLibraryStudio } from './components/PromptLibraryStudio.tsx';
import { AgentChatStudio } from './components/AgentChatStudio.tsx';
import { DashboardStudio } from './components/DashboardStudio.tsx';
import { AutomationStudio } from './components/AutomationStudio.tsx';
import { ProjectsStudio } from './components/ProjectsStudio.tsx';

// ... [Keep imports and utility functions same as before]
const defaultPhotorealismPrompt = "real photograph, photorealistic, glamorous, aesthetic, 4k, 8k, real human, realistic lighting, Real photograph, Real Picture taken with a camera, Real camera quality photo, natural soft lighting and shadows, professional photography, ((Aesthetic 11)), real photograph, photorealistic, 4k, 8k, real human, realistic lighting, Real photograph, Real Picture taken with a camera, Real camera quality photo, natural soft lighting and shadows, professional photography";

const fileToBase64 = (file: File): Promise<{ base64: string, mimeType: string }> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const mimeType = result.split(',')[0].split(':')[1].split(';')[0];
      const base64 = result.split(',')[1];
      resolve({ base64, mimeType });
    };
    reader.onerror = (error) => reject(error);
  });

const applyLetterbox = (base64Image: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);

      const targetContentHeight = canvas.width / 2.39;
      const barHeight = (canvas.height - targetContentHeight) / 2;

      if (barHeight > 0) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, barHeight);
        ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);
      }
      
      resolve(canvas.toDataURL('image/jpeg').split(',')[1]);
    };
    img.onerror = (err) => {
      reject(err);
    };
    img.src = `data:image/jpeg;base64,${base64Image}`;
  });
};

const createNewProjectData = (): ProjectData => ({
    images: [],
    storyboard: [],
    scriptText: '',
    inspirationImages: [],
    blenderImages: [],
    blenderResult: null,
    sceneCompositorState: { background: null, character: null, result: null },
    faceSwapState: { source: null, face: null, result: null },
    faceRepairState: { source: null, result: null },
    photorealismState: { source: null, result: null, prompt: defaultPhotorealismPrompt, negativePrompt: '' },
    agents: [],
    lore: [],
    dynamicPromptLists: [],
    promptTemplates: [],
    automationConfig: {
        ragEnabled: false,
        ragProvider: 'cloud',
        ragApiKey: 'a3dba152-ee01-482e-889a-445782c5327b',
        ragBaseUrl: 'https://aws-us-east-2-1.rag.progress.cloud/api/v1',
        ragKnowledgeBoxId: '459e3fc9-21cd-4ee8-8c93-e8dfa42675b2',
        ragLocalhostUrl: 'http://localhost:8000/api/v1/kb/your-kb-id/documents',
        webhookUrls: ['https://webhooks.tasklet.ai/v1/public/webhook?token=8eac32e6d0692b212ec5fa5305bcea55']
    },
});

function App() {
  // --- Core State ---
  const [projects, setProjects] = useState<Project[]>(() => {
      const saved = localStorage.getItem('projects');
      return saved ? JSON.parse(saved) : [];
  });
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => localStorage.getItem('activeProjectId'));
  const [activeView, setActiveView] = useState<ActiveView>('projects');
  
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('gemini-api-key') || '');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // --- UI State ---
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [editingImage, setEditingImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [viewingImage, setViewingImage] = useState<ImageState | null>(null);
  const [gridOverlay, setGridOverlay] = useState<GridOverlayType>('none');
  const [lastGenerationOptions, setLastGenerationOptions] = useState<GenerationOptions | null>(null);
  const [lastUsedSeed, setLastUsedSeed] = useState<string>('');
  const [agentFilter, setAgentFilter] = useState<string>('');
  const [awaitingExternalGeneration, setAwaitingExternalGeneration] = useState<boolean>(false);
  const [preparedOptions, setPreparedOptions] = useState<Partial<GenerationOptions & { sceneType: string, location: string, timeOfDay: string, characters: string }> | null>(null);
  
  // Studio-specific loading/error states
  const [isVideoLoading, setIsVideoLoading] = useState<boolean>(false);
  const [videoGenerationError, setVideoGenerationError] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [videoGenerationProgress, setVideoGenerationProgress] = useState<string>('');
  const [isBlenderLoading, setIsBlenderLoading] = useState<boolean>(false);
  const [blenderError, setBlenderError] = useState<string | null>(null);
  const [isSceneCompositorLoading, setIsSceneCompositorLoading] = useState<boolean>(false);
  const [sceneCompositorError, setSceneCompositorError] = useState<string | null>(null);
  const [isFaceSwapLoading, setIsFaceSwapLoading] = useState<boolean>(false);
  const [faceSwapError, setFaceSwapError] = useState<string | null>(null);
  const [isFaceRepairLoading, setIsFaceRepairLoading] = useState<boolean>(false);
  const [faceRepairError, setFaceRepairError] = useState<string | null>(null);
  const [isPhotorealismLoading, setIsPhotorealismLoading] = useState<boolean>(false);
  const [photorealismError, setPhotorealismError] = useState<string | null>(null);
  const [isAgentResponding, setIsAgentResponding] = useState<boolean>(false);
  const [agentChatError, setAgentChatError] = useState<string | null>(null);

  // --- Derived State ---
  const activeProject = projects.find(p => p.id === activeProjectId);
  const activeProjectData = activeProject?.data;
  
  // --- Effects ---
  useEffect(() => {
      if (activeProjectId && projects.find(p => p.id === activeProjectId)) {
          localStorage.setItem('activeProjectId', activeProjectId);
          if (activeView === 'projects') {
            setActiveView('dashboard');
          }
      } else {
          localStorage.removeItem('activeProjectId');
          setActiveView('projects');
      }
  }, [activeProjectId, projects, activeView]);

  useEffect(() => {
      localStorage.setItem('projects', JSON.stringify(projects));
  }, [projects]);
  
  const updateActiveProjectData = useCallback((updater: (data: ProjectData) => ProjectData) => {
    if (!activeProjectId) return;
    setProjects(prevProjects =>
      prevProjects.map(p =>
        p.id === activeProjectId ? { ...p, data: updater(p.data) } : p
      )
    );
  }, [activeProjectId]);
  
  useEffect(() => {
    const loadRemoteData = async () => {
        if (!activeProjectData) return;
        const { automationConfig } = activeProjectData;

        if (!automationConfig.ragEnabled) {
            updateActiveProjectData(data => ({ ...data, lore: [] }));
            setError(null);
            return;
        }

        if (automationConfig.ragProvider === 'cloud' && (!automationConfig.ragApiKey || !automationConfig.ragBaseUrl || !automationConfig.ragKnowledgeBoxId)) {
            setError("Cloud RAG service is enabled but not fully configured. Please check your settings in the Automation Studio.");
            return;
        }
         if (automationConfig.ragProvider === 'localhost' && !automationConfig.ragLocalhostUrl) {
            setError("Localhost RAG service is enabled but the URL is not configured. Please check your settings in the Automation Studio.");
            return;
        }
        setError(null);
        try {
            const initialLore = await ragService.getLore(automationConfig, activeProjectId!);
            updateActiveProjectData(data => ({ ...data, lore: initialLore }));
        } catch (err) {
            console.error("Failed to load lore data from RAG service:", err);
            setError("Could not connect to the Lore service. Please check your RAG settings and CORS configuration.");
        }
    };
    if (activeProjectId) {
      loadRemoteData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId, activeProjectData?.automationConfig.ragEnabled, activeProjectData?.automationConfig.ragProvider]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (apiKey) localStorage.setItem('gemini-api-key', apiKey);
    else localStorage.removeItem('gemini-api-key');
  }, [apiKey]);
  
  const scriptLocations = React.useMemo(() => {
      const scriptText = activeProjectData?.scriptText;
      if (!scriptText) return [];
      const locationRegex = /^\s*(?:INT|EXT)\.\s*([^-–\n]+)/gim;
      const matches = [...scriptText.matchAll(locationRegex)];
      const locations = matches.map(match => match[1].trim().toUpperCase());
      return [...new Set(locations)];
  }, [activeProjectData?.scriptText]);

  // --- Handlers ---
  const checkApiPrerequisites = useCallback(() => {
    if (!navigator.onLine) {
        setError("You are offline. Please connect to the internet to generate images.");
        return false;
    }
    if (!apiKey) {
      setError("Please set your Google API Key in the settings before generating images.");
      setIsSettingsOpen(true);
      return false;
    }
    return true;
  }, [apiKey]);

  const triggerWebhooks = useCallback(async (payload: WebhookPayload) => {
    const webhookUrls = activeProjectData?.automationConfig.webhookUrls;
    if (!webhookUrls || webhookUrls.length === 0) return;
    
    console.log('Triggering webhooks for event:', payload.eventType);
    const requests = webhookUrls.map(url => {
        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(error => console.error(`Failed to trigger webhook to ${url}:`, error));
    });
    await Promise.allSettled(requests);
  }, [activeProjectData?.automationConfig.webhookUrls]);

  const handleGenerate = useCallback(async (options: GenerationOptions) => {
    if (!checkApiPrerequisites() || !activeProjectData) return;
    const { lore, dynamicPromptLists } = activeProjectData;
    
    if (options.engine === 'external') {
        setIsLoading(true);
        setError(null);
        updateActiveProjectData(d => ({ ...d, images: [] }));
        setAwaitingExternalGeneration(true);
        const payload: WebhookPayload = { eventType: 'GENERATION_REQUEST', timestamp: new Date().toISOString(), generationOptions: options };
        try {
            await triggerWebhooks(payload);
            setActiveView('grid');
        } catch (err) {
            setError('Failed to send generation request to external service.');
            setAwaitingExternalGeneration(false);
        } finally {
            setIsLoading(false);
        }
        return;
    }

    setAwaitingExternalGeneration(false);
    setIsLoading(true);
    setError(null);
    updateActiveProjectData(d => ({ ...d, images: [] }));
    setEditingImage(null);

    try {
        let generatedImages: string[];
        let usedSeed = '';
        const isDynamicPrompt = options.prompt.includes('[') && options.prompt.includes(']');
        
        if (isDynamicPrompt) {
            const generationPromises = Array.from({ length: options.numImages }).map(() => {
                let resolvedPrompt = options.prompt;
                const placeholders: string[] = resolvedPrompt.match(/\[(.*?)\]/g) || [];
                placeholders.forEach(placeholder => {
                    const listName = placeholder.substring(1, placeholder.length - 1).trim();
                    const list = dynamicPromptLists.find(l => l.name.toLowerCase() === listName.toLowerCase());
                    if (list && list.items.length > 0) {
                        const randomIndex = Math.floor(Math.random() * list.items.length);
                        resolvedPrompt = resolvedPrompt.replace(placeholder, list.items[randomIndex]);
                    }
                });
                let loreContext = lore.length > 0 ? `IMPORTANT LORE CONTEXT (Adhere to this strictly):\n${lore.map(e => `--- LORE: "${e.title}" ---\n${e.content}`).join('\n\n')}\n\n` : '';
                return generateImagesFromApi(apiKey, { ...options, prompt: `${loreContext}${resolvedPrompt}`, numImages: 1, seed: '' });
            });
            const results = await Promise.all(generationPromises);
            generatedImages = results.flatMap(res => res.images);
            setLastGenerationOptions({ ...options, seed: '' });
        } else {
            let compositionalPrompt = options.prompt;
            const gridPrompts: Record<GridOverlayType, string> = { 'none': '', 'basic': 'shot composed with the rule of thirds,', 'triadic': 'dynamic shot composed with strong diagonal lines and triangular shapes,', 'golden-basic': 'shot composed with the golden ratio,', 'golden-triadic': 'dynamic shot composed with the golden spiral and harmonic triangles,' };
            if (gridOverlay !== 'none') compositionalPrompt = `${gridPrompts[gridOverlay]} ${options.prompt}`;
            
            let loreContext = lore.length > 0 ? `IMPORTANT LORE CONTEXT (Adhere to this strictly):\n${lore.map(e => `--- LORE: "${e.title}" ---\n${e.content}`).join('\n\n')}\n\n` : '';
            const finalOptions = { ...options, prompt: `${loreContext}${compositionalPrompt}` };
            
            const result = await generateImagesFromApi(apiKey, finalOptions);
            generatedImages = result.images;
            usedSeed = result.seed;
            setLastGenerationOptions({ ...options, prompt: compositionalPrompt, seed: usedSeed });
            setLastUsedSeed(usedSeed);
        }

        let finalImages = options.addLetterbox ? await Promise.all(generatedImages.map(img => applyLetterbox(img))) : generatedImages;
        updateActiveProjectData(d => ({ ...d, images: finalImages.map(base64 => ({ id: crypto.randomUUID(), base64, isUpscaling: false })) }));
        
        await triggerWebhooks({ eventType: 'GENERATION_COMPLETE', timestamp: new Date().toISOString(), generationOptions: lastGenerationOptions!, imageCount: finalImages.length, previewImage: finalImages[0] });
        setActiveView('grid');
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
}, [checkApiPrerequisites, activeProjectData, triggerWebhooks, gridOverlay, apiKey, updateActiveProjectData]);

  // ... [Rest of handlers remain the same]
  const handleEditImage = useCallback((base64Image: string) => {
    setEditingImage({ base64: base64Image, mimeType: 'image/jpeg' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveView('grid');
  }, []);

  const handleUpscaleImage = useCallback(async (id: string) => {
    if (!checkApiPrerequisites() || !activeProjectData) return;
    const imageToUpscale = activeProjectData.images.find(img => img.id === id);
    if (!imageToUpscale) return;

    updateActiveProjectData(d => ({ ...d, images: d.images.map(img => img.id === id ? { ...img, isUpscaling: true } : img) }));
    setError(null);

    try {
        const upscaledBase64 = await upscaleImage(apiKey, imageToUpscale.base64);
        updateActiveProjectData(d => ({ ...d, images: d.images.map(img => img.id === id ? { ...img, base64: upscaledBase64, isUpscaling: false } : img) }));
    } catch (err) {
        console.error("Upscaling failed:", err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred during upscaling.');
        updateActiveProjectData(d => ({ ...d, images: d.images.map(img => img.id === id ? { ...img, isUpscaling: false } : img) }));
    }
  }, [apiKey, activeProjectData, checkApiPrerequisites, updateActiveProjectData]);
  
    const handleCreateProject = (name: string) => {
        const newProject: Project = { id: crypto.randomUUID(), name, data: createNewProjectData() };
        setProjects(prev => [...prev, newProject]);
        setActiveProjectId(newProject.id);
        setActiveView('dashboard');
    };
    const handleSelectProject = (id: string) => setActiveProjectId(id);
    const handleRenameProject = (id: string, newName: string) => setProjects(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p));
    const handleDeleteProject = (id: string) => {
        if (window.confirm("Are you sure you want to delete this project and all its data? This cannot be undone.")) {
            setProjects(prev => prev.filter(p => p.id !== id));
            if (activeProjectId === id) setActiveProjectId(null);
        }
    };

  const handleSaveSettings = (newApiKey: string) => { setApiKey(newApiKey); setIsSettingsOpen(false); };
  const handleSaveAutomationConfig = (newConfig: AutomationConfig) => updateActiveProjectData(d => ({ ...d, automationConfig: newConfig }));
  const handleAddToStoryboard = useCallback((base64Image: string) => updateActiveProjectData(d => ({ ...d, storyboard: [...d.storyboard, { id: crypto.randomUUID(), base64Image, notes: '', prompt: lastGenerationOptions?.prompt || 'Generated image' }] })), [lastGenerationOptions, updateActiveProjectData]);
  const handleRemoveFromStoryboard = useCallback((id: string) => updateActiveProjectData(d => ({ ...d, storyboard: d.storyboard.filter(frame => frame.id !== id) })), [updateActiveProjectData]);
  const handleUpdateStoryboardNote = useCallback((id: string, notes: string) => updateActiveProjectData(d => ({ ...d, storyboard: d.storyboard.map(f => f.id === id ? { ...f, notes } : f) })), [updateActiveProjectData]);
  const handleReorderStoryboard = useCallback((startIndex: number, endIndex: number) => updateActiveProjectData(d => { const r = Array.from(d.storyboard); const [rm] = r.splice(startIndex, 1); r.splice(endIndex, 0, rm); return { ...d, storyboard: r }; }), [updateActiveProjectData]);
  const handleScriptUpload = (file: File) => { const reader = new FileReader(); reader.onload = (e) => updateActiveProjectData(d => ({ ...d, scriptText: e.target?.result as string || '' })); reader.readAsText(file); };
  const handleAddToInspiration = useCallback((base64Image: string) => updateActiveProjectData(d => ({ ...d, inspirationImages: [...d.inspirationImages, { id: crypto.randomUUID(), base64Image }] })), [updateActiveProjectData]);
  const handleRemoveFromInspiration = useCallback((id: string) => updateActiveProjectData(d => ({ ...d, inspirationImages: d.inspirationImages.filter(img => img.id !== id) })), [updateActiveProjectData]);
  const handleUseInspirationAsGuide = useCallback((base64Image: string) => { setEditingImage({ base64: base64Image, mimeType: 'image/jpeg' }); setActiveView('grid'); window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);
  const handleInspirationUpload = async (file: File) => { const { base64 } = await fileToBase64(file); handleAddToInspiration(base64); };
  const handleEditFromModal = useCallback((base64Image: string) => { handleEditImage(base64Image); setViewingImage(null); }, [handleEditImage]);
  const handleGenerateVideo = useCallback(async (frame: StoryboardFrame) => { if (!checkApiPrerequisites()) return; setIsVideoLoading(true); setVideoGenerationError(null); setGeneratedVideoUrl(null); setVideoGenerationProgress('Initializing...'); try { const url = await generateVideoFromApi(apiKey, frame.base64Image, `Animate this image. ${frame.notes}. The original scene is: ${frame.prompt}`, setVideoGenerationProgress); setGeneratedVideoUrl(url); } catch (err) { setVideoGenerationError(err instanceof Error ? err.message : 'An unknown error occurred.'); } finally { setIsVideoLoading(false); } }, [apiKey, checkApiPrerequisites]);
  const handleCreateAgent = useCallback((name: string) => { const newAgent: Agent = { id: crypto.randomUUID(), name: name.trim(), lore: '', chatHistory: [] }; updateActiveProjectData(d => ({ ...d, agents: [...d.agents, newAgent] })); return newAgent; }, [updateActiveProjectData]);
  const handleUpdateAgent = useCallback((agentId: string, newName: string) => updateActiveProjectData(d => ({ ...d, agents: d.agents.map(a => a.id === agentId ? { ...a, name: newName } : a) })), [updateActiveProjectData]);
  const handleDeleteAgent = useCallback((agentId: string) => { if (window.confirm('Are you sure you want to delete this agent?')) { updateActiveProjectData(d => ({ ...d, agents: d.agents.filter(a => a.id !== agentId), images: d.images.map(i => i.agentId === agentId ? { ...i, agentId: undefined } : i) })); } }, [updateActiveProjectData]);
  const handleImageUploadForAgent = useCallback(async (agentId: string, file: File) => { const { base64 } = await fileToBase64(file); updateActiveProjectData(d => ({ ...d, images: [{ id: crypto.randomUUID(), base64, isUpscaling: false, agentId }, ...d.images] })); }, [updateActiveProjectData]);
  const handleAssignAgentToImage = useCallback((imageId: string, agentId: string | null) => { updateActiveProjectData(d => ({ ...d, images: d.images.map(i => i.id === imageId ? { ...i, agentId: agentId ?? undefined } : i) })); setViewingImage(prev => (prev?.id === imageId ? { ...prev, agentId: agentId ?? undefined } : prev)); }, [updateActiveProjectData]);
  const handleCreateLoreEntry = useCallback(async (title: string, content: string) => { if (!activeProjectData?.automationConfig.ragEnabled) { alert("RAG Service is disabled. Please enable it in the Automation Studio."); return; } const newEntry = await ragService.createLoreEntry(activeProjectData.automationConfig, activeProjectId!, title, content); updateActiveProjectData(d => ({ ...d, lore: [...d.lore, newEntry] })); }, [activeProjectData?.automationConfig, activeProjectId, updateActiveProjectData]);
  const handleUpdateLoreEntry = useCallback(async (id: string, title: string, content: string) => { if (!activeProjectData?.automationConfig.ragEnabled) { alert("RAG Service is disabled. Please enable it in the Automation Studio."); return; } const entry = activeProjectData.lore.find(l => l.id === id); if (!entry) return; const updated = { ...entry, title, content }; await ragService.updateLoreEntry(activeProjectData.automationConfig, activeProjectId!, updated); updateActiveProjectData(d => ({ ...d, lore: d.lore.map(e => e.id === id ? updated : e) })); }, [activeProjectData, activeProjectId, updateActiveProjectData]);
  const handleDeleteLoreEntry = useCallback(async (id: string) => { if (!activeProjectData?.automationConfig.ragEnabled) { alert("RAG Service is disabled. Please enable it in the Automation Studio."); return; } if (window.confirm('Are you sure?')) { const entry = activeProjectData.lore.find(l => l.id === id); if (!entry) return; await ragService.deleteLoreEntry(activeProjectData.automationConfig, entry); updateActiveProjectData(d => ({ ...d, lore: d.lore.filter(e => e.id !== id) })); } }, [activeProjectData, updateActiveProjectData]);
  const handleCreateDynamicPromptList = useCallback((name: string, items: string[]) => updateActiveProjectData(d => ({ ...d, dynamicPromptLists: [...d.dynamicPromptLists, { id: crypto.randomUUID(), name, items }] })), [updateActiveProjectData]);
  const handleUpdateDynamicPromptList = useCallback((id: string, name: string, items: string[]) => updateActiveProjectData(d => ({ ...d, dynamicPromptLists: d.dynamicPromptLists.map(l => l.id === id ? { ...l, name, items } : l) })), [updateActiveProjectData]);
  const handleDeleteDynamicPromptList = useCallback((id: string) => { if (window.confirm('Are you sure?')) updateActiveProjectData(d => ({ ...d, dynamicPromptLists: d.dynamicPromptLists.filter(l => l.id !== id) })); }, [updateActiveProjectData]);
  const handleCreatePromptTemplate = useCallback((name: string, p: string, n: string) => updateActiveProjectData(d => ({ ...d, promptTemplates: [...d.promptTemplates, { id: crypto.randomUUID(), name, positivePrompt: p, negativePrompt: n }] })), [updateActiveProjectData]);
  const handleUpdatePromptTemplate = useCallback((id: string, name: string, p: string, n: string) => updateActiveProjectData(d => ({ ...d, promptTemplates: d.promptTemplates.map(t => t.id === id ? { ...t, name, positivePrompt: p, negativePrompt: n } : t) })), [updateActiveProjectData]);
  const handleDeletePromptTemplate = useCallback((id: string) => { if (window.confirm('Are you sure?')) updateActiveProjectData(d => ({ ...d, promptTemplates: d.promptTemplates.filter(t => t.id !== id) })); }, [updateActiveProjectData]);
  const handleUploadAgentLore = useCallback((agentId: string, loreText: string) => updateActiveProjectData(d => ({ ...d, agents: d.agents.map(a => a.id === agentId ? { ...a, lore: loreText } : a) })), [updateActiveProjectData]);
  const handlePrepareGenerationFromAgent = (fc: FunctionCall) => { setPreparedOptions({ prompt: fc.args.prompt, negativePrompt: fc.args.negativePrompt, cameraAngle: fc.args.cameraAngle, sceneType: fc.args.sceneType, location: fc.args.location, characters: fc.args.characters, timeOfDay: fc.args.timeOfDay }); setActiveView('grid'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleSendMessageToAgent = useCallback(async (agentId: string, message: string) => { if (!checkApiPrerequisites() || !activeProjectData) return; const agent = activeProjectData.agents.find(c => c.id === agentId); if (!agent) { setAgentChatError("Agent not found."); return; } setIsAgentResponding(true); setAgentChatError(null); const userMsg: ChatMessage = { role: 'user', text: message }; const history = [...(agent.chatHistory || []), userMsg]; updateActiveProjectData(d => ({ ...d, agents: d.agents.map(a => a.id === agentId ? { ...a, chatHistory: history } : a) })); try { const response = await chatWithAgentFromApi(apiKey, activeProjectData.automationConfig, activeProjectId!, agent, message); let finalHistory = [...history]; if (response.text) finalHistory.push({ role: 'model', text: response.text, functionCalls: response.functionCalls }); if (response.functionCalls) { for (const fc of response.functionCalls) { handlePrepareGenerationFromAgent(fc); finalHistory.push({ role: 'tool_code', toolCode: { id: fc.id, functionCall: fc } }); } } updateActiveProjectData(d => ({ ...d, agents: d.agents.map(a => a.id === agentId ? { ...a, chatHistory: finalHistory } : a) })); } catch (err) { setAgentChatError(err instanceof Error ? err.message : 'Unknown chat error.'); updateActiveProjectData(d => ({ ...d, agents: d.agents.map(a => a.id === agentId ? { ...a, chatHistory: agent.chatHistory || [] } : a) })); } finally { setIsAgentResponding(false); } }, [apiKey, activeProjectData, checkApiPrerequisites, updateActiveProjectData, activeProjectId]);
  const handleTestWebhook = useCallback(async (url: string) => { try { const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventType: 'TEST_MESSAGE', timestamp: new Date().toISOString(), message: 'Test from Storyboard Studio AI.' }) }); return res.ok; } catch { return false; } }, []);
  const handleBlenderUpload = async (files: FileList) => { const newImgs = await Promise.all(Array.from(files).map(async f => ({ id: crypto.randomUUID(), base64: (await fileToBase64(f)).base64 }))); updateActiveProjectData(d => ({ ...d, blenderImages: [...d.blenderImages, ...newImgs] })); };
  const handleGenerateBlender = async () => { if (!checkApiPrerequisites() || !activeProjectData || activeProjectData.blenderImages.length < 2) return; setIsBlenderLoading(true); setBlenderError(null); updateActiveProjectData(d => ({ ...d, blenderResult: null })); try { const res = await generateCompositeImage(apiKey, activeProjectData.blenderImages.map(i => i.base64)); updateActiveProjectData(d => ({ ...d, blenderResult: res })); } catch (err) { setBlenderError(err instanceof Error ? err.message : 'Unknown error.'); } finally { setIsBlenderLoading(false); } };
  const handleSceneCompositorUpload = async (type: 'background' | 'character', file: File) => { const { base64, mimeType } = await fileToBase64(file); updateActiveProjectData(d => ({ ...d, sceneCompositorState: { ...d.sceneCompositorState, [type]: { base64, mimeType } } })); };
  const handleGenerateSceneComposite = async () => { if (!checkApiPrerequisites() || !activeProjectData?.sceneCompositorState.background || !activeProjectData.sceneCompositorState.character) return; setIsSceneCompositorLoading(true); setSceneCompositorError(null); updateActiveProjectData(d => ({ ...d, sceneCompositorState: { ...d.sceneCompositorState, result: null }})); try { const res = await generateSceneCompositeFromApi(apiKey, activeProjectData.sceneCompositorState.background.base64, activeProjectData.sceneCompositorState.character.base64); updateActiveProjectData(d => ({ ...d, sceneCompositorState: { ...d.sceneCompositorState, result: res }})); } catch (err) { setSceneCompositorError(err instanceof Error ? err.message : 'Unknown error.'); } finally { setIsSceneCompositorLoading(false); } };
  const handleFaceSwapUpload = async (type: 'source' | 'face', file: File) => { const { base64, mimeType } = await fileToBase64(file); updateActiveProjectData(d => ({ ...d, faceSwapState: { ...d.faceSwapState, [type]: { base64, mimeType } } })); };
  const handleGenerateFaceSwap = async () => { if (!checkApiPrerequisites() || !activeProjectData?.faceSwapState.source || !activeProjectData.faceSwapState.face) return; setIsFaceSwapLoading(true); setFaceSwapError(null); updateActiveProjectData(d => ({ ...d, faceSwapState: { ...d.faceSwapState, result: null }})); try { const res = await generateFaceSwapFromApi(apiKey, activeProjectData.faceSwapState.source.base64, activeProjectData.faceSwapState.face.base64); updateActiveProjectData(d => ({ ...d, faceSwapState: { ...d.faceSwapState, result: res }})); } catch (err) { setFaceSwapError(err instanceof Error ? err.message : 'Unknown error.'); } finally { setIsFaceSwapLoading(false); } };
  const handleFaceRepairUpload = async (file: File) => { const { base64, mimeType } = await fileToBase64(file); updateActiveProjectData(d => ({ ...d, faceRepairState: { source: { base64, mimeType }, result: null } })); };
  const handleGenerateFaceRepair = async () => { if (!checkApiPrerequisites() || !activeProjectData?.faceRepairState.source) return; setIsFaceRepairLoading(true); setFaceRepairError(null); updateActiveProjectData(d => ({ ...d, faceRepairState: { ...d.faceRepairState, result: null }})); try { const res = await generateFaceRepairFromApi(apiKey, activeProjectData.faceRepairState.source.base64); updateActiveProjectData(d => ({ ...d, faceRepairState: { ...d.faceRepairState, result: res }})); } catch (err) { setFaceRepairError(err instanceof Error ? err.message : 'Unknown error.'); } finally { setIsFaceRepairLoading(false); } };
  const handlePhotorealismUpload = async (file: File) => { const { base64, mimeType } = await fileToBase64(file); updateActiveProjectData(d => ({ ...d, photorealismState: { ...d.photorealismState, source: { base64, mimeType }, result: null } })); };
  const handlePhotorealismPromptChange = (p: string, n: string) => updateActiveProjectData(d => ({ ...d, photorealismState: { ...d.photorealismState, prompt: p, negativePrompt: n } }));
  const handleGeneratePhotorealism = async () => { if (!checkApiPrerequisites() || !activeProjectData?.photorealismState.source) return; setIsPhotorealismLoading(true); setPhotorealismError(null); updateActiveProjectData(d => ({ ...d, photorealismState: { ...d.photorealismState, result: null }})); try { const { source, prompt, negativePrompt } = activeProjectData.photorealismState; if (!source) return; const res = await generatePhotorealisticImageFromApi(apiKey, source.base64, prompt, negativePrompt); updateActiveProjectData(d => ({ ...d, photorealismState: { ...d.photorealismState, result: res }})); } catch (err) { setPhotorealismError(err instanceof Error ? err.message : 'Unknown error.'); } finally { setIsPhotorealismLoading(false); } };

  const filteredImages = React.useMemo(() => {
    if (!activeProjectData) return [];
    if (!agentFilter.trim()) return activeProjectData.images;
    const lowerFilter = agentFilter.trim().toLowerCase();
    return activeProjectData.images.filter(i => {
      if (!i.agentId) return false;
      const agent = activeProjectData.agents.find(c => c.id === i.agentId);
      return agent?.name.toLowerCase().includes(lowerFilter);
    });
  }, [activeProjectData, agentFilter]);

  const renderActiveView = () => {
    if (!activeProjectData || activeView === 'projects') {
        return <ProjectsStudio 
            projects={projects}
            activeProjectId={activeProjectId}
            onSelectProject={handleSelectProject}
            onCreateProject={handleCreateProject}
            onRenameProject={handleRenameProject}
            onDeleteProject={handleDeleteProject}
        />
    }

    switch (activeView) {
        case 'dashboard': return <DashboardStudio stats={{
                storyboardFrames: activeProjectData.storyboard.length,
                agents: activeProjectData.agents.length,
                loreEntries: activeProjectData.lore.length,
                inspirationImages: activeProjectData.inspirationImages.length,
                dynamicPromptLists: activeProjectData.dynamicPromptLists.length,
                promptTemplates: activeProjectData.promptTemplates.length,
                imagesGenerated: activeProjectData.images.length
            }} onNavigate={setActiveView} />;
        case 'story': return <Storyboard frames={activeProjectData.storyboard} onUpdateNote={handleUpdateStoryboardNote} onRemove={handleRemoveFromStoryboard} onReorder={handleReorderStoryboard} />;
        case 'agent-chat': return <AgentChatStudio agents={activeProjectData.agents} onUploadLore={handleUploadAgentLore} onSendMessage={handleSendMessageToAgent} isResponding={isAgentResponding} error={agentChatError} />;
        case 'prompt-library': return <PromptLibraryStudio templates={activeProjectData.promptTemplates} onCreate={handleCreatePromptTemplate} onUpdate={handleUpdatePromptTemplate} onDelete={handleDeletePromptTemplate} />;
        case 'dynamic-prompts': return <DynamicPromptsStudio lists={activeProjectData.dynamicPromptLists} onCreate={handleCreateDynamicPromptList} onUpdate={handleUpdateDynamicPromptList} onDelete={handleDeleteDynamicPromptList} />;
        case 'lore': return <LoreStudio lore={activeProjectData.lore} onCreate={handleCreateLoreEntry} onUpdate={handleUpdateLoreEntry} onDelete={handleDeleteLoreEntry} />;
        case 'agents': return <AgentsStudio agents={activeProjectData.agents} images={activeProjectData.images} onCreateAgent={handleCreateAgent} onViewImage={setViewingImage} onUpdateAgent={handleUpdateAgent} onDeleteAgent={handleDeleteAgent} onImageUpload={handleImageUploadForAgent} />;
        case 'video': return <VideoGenerator storyboard={activeProjectData.storyboard} onGenerateVideo={handleGenerateVideo} isLoading={isVideoLoading} videoUrl={generatedVideoUrl} error={videoGenerationError} progress={videoGenerationProgress} />;
        case 'blender': return <BlenderStudio sourceImages={activeProjectData.blenderImages} resultImage={activeProjectData.blenderResult} isLoading={isBlenderLoading} error={blenderError} onUpload={handleBlenderUpload} onRemoveImage={(id) => updateActiveProjectData(d => ({ ...d, blenderImages: d.blenderImages.filter(i => i.id !== id) }))} onGenerate={handleGenerateBlender} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} />;
        case 'scene-compositor': return <SceneCompositorStudio sceneState={activeProjectData.sceneCompositorState} isLoading={isSceneCompositorLoading} error={sceneCompositorError} onUpload={handleSceneCompositorUpload} onRemoveImage={(type) => updateActiveProjectData(d => ({ ...d, sceneCompositorState: { ...d.sceneCompositorState, [type]: null, result: null } }))} onGenerate={handleGenerateSceneComposite} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} />;
        case 'face-swap': return <FaceSwapStudio faceSwapState={activeProjectData.faceSwapState} isLoading={isFaceSwapLoading} error={faceSwapError} onUpload={handleFaceSwapUpload} onRemoveImage={(type) => updateActiveProjectData(d => ({ ...d, faceSwapState: { ...d.faceSwapState, [type]: null, result: null } }))} onGenerate={handleGenerateFaceSwap} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} />;
        case 'face-repair': return <FaceRepairStudio faceRepairState={activeProjectData.faceRepairState} isLoading={isFaceRepairLoading} error={faceRepairError} onUpload={handleFaceRepairUpload} onRemoveImage={() => updateActiveProjectData(d => ({ ...d, faceRepairState: { source: null, result: null } }))} onGenerate={handleGenerateFaceRepair} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} />;
        case 'photorealism': return <PhotorealismStudio photorealismState={activeProjectData.photorealismState} isLoading={isPhotorealismLoading} error={photorealismError} onUpload={handlePhotorealismUpload} onRemoveImage={() => updateActiveProjectData(d => ({ ...d, photorealismState: { ...d.photorealismState, source: null, result: null } }))} onGenerate={handleGeneratePhotorealism} onAddToStoryboard={handleAddToStoryboard} onAddToInspiration={handleAddToInspiration} onPromptChange={handlePhotorealismPromptChange} />;
        case 'script': return <ScriptViewer scriptText={activeProjectData.scriptText} onUpload={handleScriptUpload} />;
        case 'inspiration': return <InspirationBoard images={activeProjectData.inspirationImages} onUpload={handleInspirationUpload} onRemove={handleRemoveFromInspiration} onUseAsGuide={handleUseInspirationAsGuide} />;
        case 'automation': return <AutomationStudio config={activeProjectData.automationConfig} onSave={handleSaveAutomationConfig} onTestWebhook={handleTestWebhook} />;
        default: return <ProjectsStudio projects={projects} activeProjectId={activeProjectId} onSelectProject={handleSelectProject} onCreateProject={handleCreateProject} onRenameProject={handleRenameProject} onDeleteProject={handleDeleteProject} />;
    }
  };

  return (
    <div id="app" className="flex h-screen w-full bg-neutral-900 text-neutral-200 overflow-hidden">
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        stats={activeProjectData ? {
          storyboard: activeProjectData.storyboard.length,
          inspiration: activeProjectData.inspirationImages.length,
          agents: activeProjectData.agents.length,
          lore: activeProjectData.lore.length,
          dynamicPrompts: activeProjectData.dynamicPromptLists.length,
          promptLibrary: activeProjectData.promptTemplates.length,
        } : { storyboard: 0, inspiration: 0, agents: 0, lore: 0, dynamicPrompts: 0, promptLibrary: 0 }}
        isOnline={isOnline}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(v => !v)}
      />
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-900 text-neutral-200">
        <header className="p-4 border-b border-neutral-800 flex-shrink-0 bg-neutral-900">
            <h1 className="text-xl font-bold text-center text-neutral-100 uppercase tracking-wider">
                {activeProject ? activeProject.name : "Storyboard Studio AI"}
            </h1>
        </header>
        <main className="flex-1 overflow-y-auto">
            {activeView === 'grid' && activeProjectData ? (
                <div className="p-6 max-w-7xl mx-auto w-full">
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-neutral-200 mb-2">Image Generation Grid</h2>
                        <p className="text-neutral-400">Create, edit, and manage your assets in a unified workspace.</p>
                    </div>
                    <div className="space-y-6">
                        <InputPanel 
                          onGenerate={handleGenerate} 
                          isLoading={isLoading} 
                          editingImage={editingImage}
                          lastUsedSeed={lastUsedSeed}
                          scriptLocations={scriptLocations}
                          preparedOptions={preparedOptions}
                          onPreparationComplete={() => setPreparedOptions(null)}
                          promptTemplates={activeProjectData.promptTemplates}
                          dynamicPromptLists={activeProjectData.dynamicPromptLists}
                        />
                        <ImageGrid 
                            images={filteredImages} 
                            isLoading={isLoading} 
                            error={error} 
                            onViewImage={setViewingImage}
                            gridOverlay={gridOverlay}
                            onGridOverlayChange={setGridOverlay}
                            onEditImage={handleEditImage}
                            onAddToStoryboard={handleAddToStoryboard}
                            onAddToInspiration={handleAddToInspiration}
                            onUpscaleImage={handleUpscaleImage}
                            agents={activeProjectData.agents}
                            onAssignAgentToImage={handleAssignAgentToImage}
                            onCreateAgent={handleCreateAgent}
                            agentFilter={agentFilter}
                            onAgentFilterChange={setAgentFilter}
                            awaitingExternalGeneration={awaitingExternalGeneration}
                        />
                    </div>
                </div>
            ) : (
                renderActiveView()
            )}
        </main>
      </div>
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
        currentApiKey={apiKey}
      />
      {activeProjectData && (
        <ImageModal
          image={viewingImage}
          onClose={() => setViewingImage(null)}
          onEdit={handleEditFromModal}
          onAddToStoryboard={handleAddToStoryboard}
          onAddToInspiration={handleAddToInspiration}
          agents={activeProjectData.agents}
          onAssignAgentToImage={handleAssignAgentToImage}
          onCreateAgent={handleCreateAgent}
        />
      )}
    </div>
  );
}

export default App;