

import React, { useState, useCallback, useEffect } from 'react';
import { InputPanel } from './components/InputPanel';
import { ImageGrid } from './components/ImageGrid';
import { generateImagesFromApi, upscaleImage, generateVideoFromApi, generateCompositeImage, generateFaceSwapFromApi, generateSceneCompositeFromApi, generateFaceRepairFromApi, generatePhotorealisticImageFromApi, chatWithAgentFromApi } from './services/geminiService';
import * as ragService from './services/ragService';
import { GenerationOptions, GridOverlayType, StoryboardFrame, ActiveView, InspirationImage, ImageState, BlenderImage, FaceSwapState, SceneCompositorState, FaceRepairState, PhotorealismState, Agent, LoreEntry, DynamicPromptList, ChatMessage, WebhookPayload, FunctionCall, AutomationConfig } from './types';
import { SettingsModal } from './components/SettingsModal';
import { Sidebar } from './components/Sidebar';
import { Storyboard } from './components/Storyboard';
import { ScriptViewer } from './components/ScriptViewer';
import { InspirationBoard } from './components/InspirationBoard';
import { ImageModal } from './components/ImageModal';
import { VideoGenerator } from './components/VideoGenerator';
import { BlenderStudio } from './components/BlenderStudio';
import { FaceSwapStudio } from './components/FaceSwapStudio';
import { SceneCompositorStudio } from './components/SceneCompositorStudio';
import { FaceRepairStudio } from './components/FaceRepairStudio';
import { PhotorealismStudio } from './components/PhotorealismStudio';
import { AgentsStudio } from './components/AgentsStudio';
import { LoreStudio } from './components/LoreStudio';
import { DynamicPromptsStudio } from './components/DynamicPromptsStudio';
import { AgentChatStudio } from './components/AgentChatStudio';
import { DashboardStudio } from './components/DashboardStudio';
import { AutomationStudio } from './components/AutomationStudio';

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


function App() {
  const [images, setImages] = useState<ImageState[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [editingImage, setEditingImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [viewingImage, setViewingImage] = useState<ImageState | null>(null);
  const [gridOverlay, setGridOverlay] = useState<GridOverlayType>('none');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('gemini-api-key') || '');
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [lastGenerationOptions, setLastGenerationOptions] = useState<GenerationOptions | null>(null);
  const [lastUsedSeed, setLastUsedSeed] = useState<string>('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [agentFilter, setAgentFilter] = useState<string>('');
  const [awaitingExternalGeneration, setAwaitingExternalGeneration] = useState<boolean>(false);
  const [preparedOptions, setPreparedOptions] = useState<Partial<GenerationOptions> | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Video Generation State
  const [isVideoLoading, setIsVideoLoading] = useState<boolean>(false);
  const [videoGenerationError, setVideoGenerationError] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [videoGenerationProgress, setVideoGenerationProgress] = useState<string>('');

  // Blender Studio State
  const [blenderImages, setBlenderImages] = useState<BlenderImage[]>([]);
  const [blenderResult, setBlenderResult] = useState<string | null>(null);
  const [isBlenderLoading, setIsBlenderLoading] = useState<boolean>(false);
  const [blenderError, setBlenderError] = useState<string | null>(null);
  
  // Scene Compositor State
  const [sceneCompositorState, setSceneCompositorState] = useState<SceneCompositorState>({ background: null, character: null, result: null });
  const [isSceneCompositorLoading, setIsSceneCompositorLoading] = useState<boolean>(false);
  const [sceneCompositorError, setSceneCompositorError] = useState<string | null>(null);

  // Face Swap Studio State
  const [faceSwapState, setFaceSwapState] = useState<FaceSwapState>({ source: null, face: null, result: null });
  const [isFaceSwapLoading, setIsFaceSwapLoading] = useState<boolean>(false);
  const [faceSwapError, setFaceSwapError] = useState<string | null>(null);

  // Face Repair Studio State
  const [faceRepairState, setFaceRepairState] = useState<FaceRepairState>({ source: null, result: null });
  const [isFaceRepairLoading, setIsFaceRepairLoading] = useState<boolean>(false);
  const [faceRepairError, setFaceRepairError] = useState<string | null>(null);

  // Photorealism Studio State
  const [photorealismState, setPhotorealismState] = useState<PhotorealismState>({ source: null, result: null, prompt: defaultPhotorealismPrompt, negativePrompt: '' });
  const [isPhotorealismLoading, setIsPhotorealismLoading] = useState<boolean>(false);
  const [photorealismError, setPhotorealismError] = useState<string | null>(null);

  // Agent State (Local)
  const [agents, setAgents] = useState<Agent[]>(() => {
    const savedAgents = localStorage.getItem('agents');
    return savedAgents ? JSON.parse(savedAgents) : [];
  });
  
  // Lore State (Remote)
  const [lore, setLore] = useState<LoreEntry[]>([]);
  
  // Dynamic Prompts State
  const [dynamicPromptLists, setDynamicPromptLists] = useState<DynamicPromptList[]>(() => {
    const savedLists = localStorage.getItem('dynamicPromptLists');
    return savedLists ? JSON.parse(savedLists) : [];
  });

  // Agent Chat State
  const [isAgentResponding, setIsAgentResponding] = useState<boolean>(false);
  const [agentChatError, setAgentChatError] = useState<string | null>(null);

  const [storyboard, setStoryboard] = useState<StoryboardFrame[]>(() => {
    const savedStoryboard = localStorage.getItem('storyboard');
    return savedStoryboard ? JSON.parse(savedStoryboard) : [];
  });

  const [scriptText, setScriptText] = useState<string>(() => {
    return localStorage.getItem('scriptText') || '';
  });
  const [scriptLocations, setScriptLocations] = useState<string[]>([]);
  
  const [inspirationImages, setInspirationImages] = useState<InspirationImage[]>(() => {
    const savedInspiration = localStorage.getItem('inspirationImages');
    return savedInspiration ? JSON.parse(savedInspiration) : [];
  });

  // Automation State
  const [automationConfig, setAutomationConfig] = useState<AutomationConfig>(() => {
    const saved = localStorage.getItem('automationConfig');
    const defaultConfig: AutomationConfig = {
        ragEnabled: false,
        ragApiKey: 'a3dba152-ee01-482e-889a-445782c5327b',
        ragBaseUrl: 'https://aws-us-east-2-1.rag.progress.cloud/api/v1',
        ragKnowledgeBoxId: '459e3fc9-21cd-4ee8-8c93-e8dfa42675b2',
        webhookUrls: ['https://webhooks.tasklet.ai/v1/public/webhook?token=8eac32e6d0692b212ec5fa5305bcea55']
    };
    if (saved) {
        return { ...defaultConfig, ...JSON.parse(saved) };
    }
    return defaultConfig;
  });

  // Load remote lore data only if RAG is enabled
  useEffect(() => {
    const loadRemoteData = async () => {
        if (!automationConfig.ragEnabled) {
            setLore([]); // Clear lore if RAG is disabled
            setError(null);
            return;
        }

        if (!automationConfig.ragApiKey || !automationConfig.ragBaseUrl || !automationConfig.ragKnowledgeBoxId) {
            setError("RAG service is enabled but not fully configured. Please check your settings in the Automation Studio.");
            return;
        }
        setError(null);
        try {
            const initialLore = await ragService.getLore(automationConfig);
            setLore(initialLore);
        } catch (err) {
            console.error("Failed to load lore data from RAG service:", err);
            setError("Could not connect to the Lore service. Please check your RAG settings and CORS configuration.");
        }
    };
    loadRemoteData();
  }, [automationConfig]);

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
    if (apiKey) {
      localStorage.setItem('gemini-api-key', apiKey);
    } else {
      localStorage.removeItem('gemini-api-key');
    }
  }, [apiKey]);
  
  useEffect(() => {
    localStorage.setItem('automationConfig', JSON.stringify(automationConfig));
  }, [automationConfig]);

  useEffect(() => {
    localStorage.setItem('agents', JSON.stringify(agents));
  }, [agents]);

  useEffect(() => {
    localStorage.setItem('storyboard', JSON.stringify(storyboard));
  }, [storyboard]);
  
  useEffect(() => {
    localStorage.setItem('dynamicPromptLists', JSON.stringify(dynamicPromptLists));
  }, [dynamicPromptLists]);

  useEffect(() => {
    localStorage.setItem('scriptText', scriptText);
  }, [scriptText]);
  
  useEffect(() => {
    if (!scriptText) {
      setScriptLocations([]);
      return;
    }
    // Regex to find locations like "INT. LOCATION - DAY"
    const locationRegex = /^\s*(?:INT|EXT)\.\s*([^-–\n]+)/gim;
    const matches = [...scriptText.matchAll(locationRegex)];
    const locations = matches.map(match => match[1].trim().toUpperCase());
    const uniqueLocations = [...new Set(locations)];
    setScriptLocations(uniqueLocations);
  }, [scriptText]);

  useEffect(() => {
    localStorage.setItem('inspirationImages', JSON.stringify(inspirationImages));
  }, [inspirationImages]);

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
    if (automationConfig.webhookUrls.length === 0) return;
    console.log('Triggering webhooks for event:', payload.eventType);

    const requests = automationConfig.webhookUrls.map(url => {
        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(response => {
            if (!response.ok) {
                console.error(`Webhook to ${url} failed with status: ${response.status}`);
            } else {
                console.log(`Webhook to ${url} triggered successfully.`);
            }
        }).catch(error => {
            console.error(`Failed to trigger webhook to ${url}:`, error);
        });
    });
    await Promise.allSettled(requests);
  }, [automationConfig.webhookUrls]);

  const handleGenerate = useCallback(async (options: GenerationOptions) => {
    if (!checkApiPrerequisites()) return;

    if (options.engine === 'external') {
        setIsLoading(true);
        setError(null);
        setImages([]);
        setAwaitingExternalGeneration(true);
        const payload: WebhookPayload = {
            eventType: 'GENERATION_REQUEST',
            timestamp: new Date().toISOString(),
            generationOptions: options,
        };
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
    const promptTemplate = options.prompt;
    const isDynamicPrompt = promptTemplate.includes('[') && promptTemplate.includes(']');
    
    setIsLoading(true);
    setError(null);
    setImages([]);
    setEditingImage(null);

    try {
        let generatedImages: string[];
        let usedSeed = '';
        let finalOptionsForWebhook: GenerationOptions;

        if (isDynamicPrompt) {
            // --- DYNAMIC PROMPT LOGIC ---
            const generationPromises = Array.from({ length: options.numImages }).map(() => {
                let resolvedPrompt = promptTemplate;
                const placeholders: string[] = resolvedPrompt.match(/\[(.*?)\]/g) || [];

                placeholders.forEach(placeholder => {
                    const listName = placeholder.substring(1, placeholder.length - 1).trim();
                    const list = dynamicPromptLists.find(l => l.name.toLowerCase() === listName.toLowerCase());
                    if (list && list.items.length > 0) {
                        const randomIndex = Math.floor(Math.random() * list.items.length);
                        const randomItem = list.items[randomIndex];
                        resolvedPrompt = resolvedPrompt.replace(placeholder, randomItem);
                    }
                });

                const singleImageOptions = { ...options, prompt: resolvedPrompt, numImages: 1, seed: '' };

                let loreContext = '';
                if (lore.length > 0) {
                    const loreString = lore.map(entry => `--- LORE: "${entry.title}" ---\n${entry.content}`).join('\n\n');
                    loreContext = `IMPORTANT LORE CONTEXT (Adhere to this strictly):\n${loreString}\n\n--- END LORE CONTEXT ---\n\n`;
                }
                singleImageOptions.prompt = `${loreContext}${singleImageOptions.prompt}`;
                
                return generateImagesFromApi(apiKey, singleImageOptions);
            });
            
            const results = await Promise.all(generationPromises);
            generatedImages = results.flatMap(res => res.images);
            finalOptionsForWebhook = { ...options, seed: '' }; // No single seed to save
            setLastGenerationOptions(finalOptionsForWebhook);

        } else {
            // --- STATIC PROMPT LOGIC ---
            let compositionalPrompt = options.prompt;
            const gridPrompts: Record<GridOverlayType, string> = {
                'none': '', 'basic': 'shot composed with the rule of thirds,', 'triadic': 'dynamic shot composed with strong diagonal lines and triangular shapes,',
                'golden-basic': 'shot composed with the golden ratio,', 'golden-triadic': 'dynamic shot composed with the golden spiral and harmonic triangles,',
            };
            
            if (gridOverlay !== 'none' && gridPrompts[gridOverlay]) {
                compositionalPrompt = `${gridPrompts[gridOverlay]} ${options.prompt}`;
            }
            
            let loreContext = '';
            if (lore.length > 0) {
                const loreString = lore.map(entry => `--- LORE: "${entry.title}" ---\n${entry.content}`).join('\n\n');
                loreContext = `IMPORTANT LORE CONTEXT (Adhere to this strictly):\n${loreString}\n\n--- END LORE CONTEXT ---\n\n`;
            }
            const promptWithLore = `${loreContext}${compositionalPrompt}`;
            const finalOptions = { ...options, prompt: promptWithLore };
            
            const result = await generateImagesFromApi(apiKey, finalOptions);
            generatedImages = result.images;
            usedSeed = result.seed;

            finalOptionsForWebhook = { ...options, prompt: compositionalPrompt, seed: usedSeed };
            setLastGenerationOptions(finalOptionsForWebhook);
            setLastUsedSeed(usedSeed);
        }

        let finalImages = generatedImages;
        if (options.addLetterbox) {
            finalImages = await Promise.all(generatedImages.map(img => applyLetterbox(img)));
        }
        
        setImages(finalImages.map(base64 => ({ id: crypto.randomUUID(), base64, isUpscaling: false })));
        
        const payload: WebhookPayload = {
            eventType: 'GENERATION_COMPLETE',
            timestamp: new Date().toISOString(),
            generationOptions: finalOptionsForWebhook,
            imageCount: finalImages.length,
            previewImage: finalImages[0] || undefined
        };
        await triggerWebhooks(payload);

        setActiveView('grid');

    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      if (errorMessage.toLowerCase().includes('api key')) {
        setIsSettingsOpen(true);
      }
    } finally {
      setIsLoading(false);
    }
}, [apiKey, gridOverlay, checkApiPrerequisites, lore, dynamicPromptLists, triggerWebhooks]);

  const handleEditImage = useCallback((base64Image: string) => {
    setEditingImage({ base64: base64Image, mimeType: 'image/jpeg' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveView('grid');
  }, []);

  const handleUpscaleImage = useCallback(async (id: string) => {
    if (!checkApiPrerequisites()) return;

    const imageToUpscale = images.find(img => img.id === id);
    if (!imageToUpscale) return;

    setImages(prev => prev.map(img => img.id === id ? { ...img, isUpscaling: true } : img));
    setError(null);

    try {
        const upscaledBase64 = await upscaleImage(apiKey, imageToUpscale.base64);
        setImages(prev => prev.map(img => img.id === id ? { ...img, base64: upscaledBase64, isUpscaling: false } : img));
    } catch (err) {
        console.error("Upscaling failed:", err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during upscaling.';
        setError(errorMessage);
        setImages(prev => prev.map(img => img.id === id ? { ...img, isUpscaling: false } : img));
    }
  }, [apiKey, images, checkApiPrerequisites]);
  
  const handleSaveSettings = (newApiKey: string) => {
    setApiKey(newApiKey);
    setIsSettingsOpen(false);
    if (error && error.toLowerCase().includes('api key')) {
        setError(null);
    }
  };

  const handleSaveAutomationConfig = (newConfig: AutomationConfig) => {
    setAutomationConfig(newConfig);
  };

  const handleAddToStoryboard = useCallback((base64Image: string) => {
    const prompt = lastGenerationOptions?.prompt || 'Generated image';
    setStoryboard(prev => [...prev, { id: crypto.randomUUID(), base64Image, notes: '', prompt }]);
  }, [lastGenerationOptions]);

  const handleRemoveFromStoryboard = useCallback((id: string) => {
    setStoryboard(prev => prev.filter(frame => frame.id !== id));
  }, []);

  const handleUpdateStoryboardNote = useCallback((id: string, notes: string) => {
    setStoryboard(prev => prev.map(frame => frame.id === id ? { ...frame, notes } : frame));
  }, []);
  
  const handleReorderStoryboard = useCallback((startIndex: number, endIndex: number) => {
    setStoryboard(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  }, []);

  const handleScriptUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        setScriptText(e.target?.result as string || '');
    };
    reader.readAsText(file);
  };

  const handleAddToInspiration = useCallback((base64Image: string) => {
    setInspirationImages(prev => [...prev, { id: crypto.randomUUID(), base64Image }]);
  }, []);
  
  const handleRemoveFromInspiration = useCallback((id: string) => {
    setInspirationImages(prev => prev.filter(img => img.id !== id));
  }, []);

  const handleUseInspirationAsGuide = useCallback((base64Image: string) => {
    setEditingImage({ base64: base64Image, mimeType: 'image/jpeg' });
    setActiveView('grid');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleInspirationUpload = async (file: File) => {
    const { base64 } = await fileToBase64(file);
    handleAddToInspiration(base64);
  };
  
  const handleEditFromModal = useCallback((base64Image: string) => {
    handleEditImage(base64Image);
    setViewingImage(null);
  }, [handleEditImage]);

  const handleGenerateVideo = useCallback(async (frame: StoryboardFrame) => {
    if (!checkApiPrerequisites()) return;

    setIsVideoLoading(true);
    setVideoGenerationError(null);
    setGeneratedVideoUrl(null);
    setVideoGenerationProgress('Initializing video generation...');

    try {
        const videoPrompt = `Animate this image. ${frame.notes}. The original scene is: ${frame.prompt}`;
        const url = await generateVideoFromApi(
            apiKey,
            frame.base64Image,
            videoPrompt,
            (progressMessage) => setVideoGenerationProgress(progressMessage)
        );
        setGeneratedVideoUrl(url);
    } catch (err) {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during video generation.';
        setVideoGenerationError(errorMessage);
    } finally {
        setIsVideoLoading(false);
    }
  }, [apiKey, checkApiPrerequisites]);

  const handleCreateAgent = useCallback((name: string) => {
    const newAgent: Agent = { id: crypto.randomUUID(), name: name.trim(), lore: '', chatHistory: [] };
    setAgents(prev => [...prev, newAgent]);
    return newAgent;
  }, []);
  
  const handleUpdateAgent = useCallback((agentId: string, newName: string) => {
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, name: newName } : a));
  }, []);
  
  const handleDeleteAgent = useCallback((agentId: string) => {
    if (window.confirm('Are you sure you want to delete this agent? This will also unassign them from all images.')) {
      setAgents(prev => prev.filter(a => a.id !== agentId));
      setImages(prevImages =>
        prevImages.map(image =>
          image.agentId === agentId ? { ...image, agentId: undefined } : image
        )
      );
    }
  }, []);

  const handleImageUploadForAgent = useCallback(async (agentId: string, file: File) => {
    const { base64 } = await fileToBase64(file);
    const newImage: ImageState = {
        id: crypto.randomUUID(),
        base64,
        isUpscaling: false,
        agentId: agentId,
    };
    setImages(prev => [newImage, ...prev]);
  }, []);

  const handleAssignAgentToImage = useCallback((imageId: string, agentId: string | null) => {
    setImages(prevImages =>
      prevImages.map(image =>
        image.id === imageId ? { ...image, agentId: agentId ?? undefined } : image
      )
    );
    setViewingImage(prev => (prev?.id === imageId ? { ...prev, agentId: agentId ?? undefined } : prev));
  }, []);
  
  const handleCreateLoreEntry = useCallback(async (title: string, content: string) => {
      if (!automationConfig.ragEnabled) {
          alert("RAG Service is disabled. Please enable it in the Automation Studio to manage lore.");
          return;
      }
      const newEntry = await ragService.createLoreEntry(automationConfig, title.trim(), content.trim());
      setLore(prev => [...prev, newEntry]);
  }, [automationConfig]);

  const handleUpdateLoreEntry = useCallback(async (id: string, title: string, content: string) => {
      if (!automationConfig.ragEnabled) {
          alert("RAG Service is disabled. Please enable it in the Automation Studio to manage lore.");
          return;
      }
      const entryToUpdate = lore.find(l => l.id === id);
      if (!entryToUpdate) return;
      
      const updatedEntryData = { ...entryToUpdate, title: title.trim(), content: content.trim() };
      await ragService.updateLoreEntry(automationConfig, updatedEntryData);
      setLore(prev => prev.map(entry => entry.id === id ? updatedEntryData : entry));
  }, [automationConfig, lore]);

  const handleDeleteLoreEntry = useCallback(async (id: string) => {
      if (!automationConfig.ragEnabled) {
          alert("RAG Service is disabled. Please enable it in the Automation Studio to manage lore.");
          return;
      }
      if (window.confirm('Are you sure you want to delete this lore entry?')) {
        const entryToDelete = lore.find(l => l.id === id);
        if (!entryToDelete) return;
        await ragService.deleteLoreEntry(automationConfig, entryToDelete);
        setLore(prev => prev.filter(entry => entry.id !== id));
      }
  }, [automationConfig, lore]);

  const handleCreateDynamicPromptList = useCallback((name: string, items: string[]) => {
    const newList: DynamicPromptList = {
        id: crypto.randomUUID(),
        name: name.trim(),
        items: items
    };
    setDynamicPromptLists(prev => [...prev, newList]);
  }, []);

  const handleUpdateDynamicPromptList = useCallback((id: string, name: string, items: string[]) => {
    setDynamicPromptLists(prev => prev.map(list =>
        list.id === id ? { ...list, name: name.trim(), items } : list
    ));
  }, []);

  const handleDeleteDynamicPromptList = useCallback((id: string) => {
      if (window.confirm(`Are you sure you want to delete this dynamic prompt list?`)) {
          setDynamicPromptLists(prev => prev.filter(list => list.id !== id));
      }
  }, []);

  const handleUploadAgentLore = useCallback((agentId: string, loreText: string) => {
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, lore: loreText } : a));
  }, []);

  const handlePrepareGenerationFromAgent = (functionCall: FunctionCall) => {
    const { args } = functionCall;
    const optionsToPrepare: Partial<GenerationOptions & { sceneType: string, location: string, timeOfDay: string }> = {
        prompt: args.prompt || '',
        negativePrompt: args.negativePrompt || '',
        cameraAngle: args.cameraAngle || '',
        sceneType: args.sceneType || 'INT',
        location: args.location || '',
        timeOfDay: args.timeOfDay || 'DAY',
    };
    setPreparedOptions(optionsToPrepare);
    setActiveView('grid');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSendMessageToAgent = useCallback(async (agentId: string, message: string) => {
      if (!checkApiPrerequisites()) return;
      
      const agent = agents.find(c => c.id === agentId);
      if (!agent) {
          setAgentChatError("Agent not found.");
          return;
      }

      setIsAgentResponding(true);
      setAgentChatError(null);

      const userMessage: ChatMessage = { role: 'user', text: message };
      const currentHistory = agent.chatHistory || [];
      const updatedHistory = [...currentHistory, userMessage];
      const agentWithUserMessage = { ...agent, chatHistory: updatedHistory };
      
      setAgents(prev => prev.map(a => a.id === agentId ? agentWithUserMessage : a));

      try {
          const response = await chatWithAgentFromApi(apiKey, automationConfig, agent, message);
          
          let finalHistory: ChatMessage[] = [...updatedHistory];
          
          if (response.text) {
              const modelMessage: ChatMessage = { role: 'model', text: response.text, functionCalls: response.functionCalls };
              finalHistory.push(modelMessage);
          }

          if (response.functionCalls && response.functionCalls.length > 0) {
              for (const fc of response.functionCalls) {
                  handlePrepareGenerationFromAgent(fc);
                  const toolMessage: ChatMessage = {
                      role: 'tool_code',
                      toolCode: { id: fc.id, functionCall: fc }
                  };
                  finalHistory.push(toolMessage);
              }
          }
          
          const agentWithFullResponse = { ...agent, chatHistory: finalHistory };
          setAgents(prev => prev.map(a => a.id === agentId ? agentWithFullResponse : a));

      } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during chat.';
          setAgentChatError(errorMessage);
           // Revert to history before user message if API fails
          const agentReverted = { ...agent, chatHistory: currentHistory };
          setAgents(prev => prev.map(a => a.id === agentId ? agentReverted : a));
      } finally {
          setIsAgentResponding(false);
      }
  }, [apiKey, agents, automationConfig, checkApiPrerequisites]);

  const handleTestWebhook = useCallback(async (url: string) => {
    const payload: WebhookPayload = {
      eventType: 'TEST_MESSAGE',
      timestamp: new Date().toISOString(),
      message: 'This is a test message from Storyboard Studio AI.'
    };
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return response.ok;
    } catch (error) {
      console.error(`Test webhook to ${url} failed:`, error);
      return false;
    }
  }, []);

  const handleBlenderUpload = async (files: FileList) => {
    const newImages = await Promise.all(
        Array.from(files).map(async (file) => {
            const { base64 } = await fileToBase64(file);
            return { id: crypto.randomUUID(), base64 };
        })
    );
    setBlenderImages(prev => [...prev, ...newImages]);
  };

  const handleGenerateBlender = async () => {
    if (!checkApiPrerequisites() || blenderImages.length < 2) return;
    setIsBlenderLoading(true);
    setBlenderError(null);
    setBlenderResult(null);
    try {
      const resultBase64 = await generateCompositeImage(apiKey, blenderImages.map(img => img.base64));
      setBlenderResult(resultBase64);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setBlenderError(errorMessage);
    } finally {
      setIsBlenderLoading(false);
    }
  };

  const handleSceneCompositorUpload = async (type: 'background' | 'character', file: File) => {
    const { base64, mimeType } = await fileToBase64(file);
    setSceneCompositorState(prev => ({ ...prev, [type]: { base64, mimeType } }));
  };

  const handleGenerateSceneComposite = async () => {
    if (!checkApiPrerequisites() || !sceneCompositorState.background || !sceneCompositorState.character) return;
    setIsSceneCompositorLoading(true);
    setSceneCompositorError(null);
    setSceneCompositorState(prev => ({ ...prev, result: null }));
    try {
      const resultBase64 = await generateSceneCompositeFromApi(apiKey, sceneCompositorState.background.base64, sceneCompositorState.character.base64);
      setSceneCompositorState(prev => ({ ...prev, result: resultBase64 }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setSceneCompositorError(errorMessage);
    } finally {
      setIsSceneCompositorLoading(false);
    }
  };

  const handleFaceSwapUpload = async (type: 'source' | 'face', file: File) => {
    const { base64, mimeType } = await fileToBase64(file);
    setFaceSwapState(prev => ({ ...prev, [type]: { base64, mimeType } }));
  };

  const handleGenerateFaceSwap = async () => {
    if (!checkApiPrerequisites() || !faceSwapState.source || !faceSwapState.face) return;
    setIsFaceSwapLoading(true);
    setFaceSwapError(null);
    setFaceSwapState(prev => ({ ...prev, result: null }));
    try {
      const resultBase64 = await generateFaceSwapFromApi(apiKey, faceSwapState.source.base64, faceSwapState.face.base64);
      setFaceSwapState(prev => ({ ...prev, result: resultBase64 }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setFaceSwapError(errorMessage);
    } finally {
      setIsFaceSwapLoading(false);
    }
  };

  const handleFaceRepairUpload = async (file: File) => {
    const { base64, mimeType } = await fileToBase64(file);
    setFaceRepairState({ source: { base64, mimeType }, result: null });
  };

  const handleGenerateFaceRepair = async () => {
    if (!checkApiPrerequisites() || !faceRepairState.source) return;
    setIsFaceRepairLoading(true);
    setFaceRepairError(null);
    setFaceRepairState(prev => ({ ...prev, result: null }));
    try {
      const resultBase64 = await generateFaceRepairFromApi(apiKey, faceRepairState.source.base64);
      setFaceRepairState(prev => ({ ...prev, result: resultBase64 }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setFaceRepairError(errorMessage);
    } finally {
      setIsFaceRepairLoading(false);
    }
  };

  const handlePhotorealismUpload = async (file: File) => {
    const { base64, mimeType } = await fileToBase64(file);
    setPhotorealismState(prev => ({ ...prev, source: { base64, mimeType }, result: null }));
  };
  
  const handlePhotorealismPromptChange = (prompt: string, negativePrompt: string) => {
      setPhotorealismState(prev => ({ ...prev, prompt, negativePrompt }));
  };

  const handleGeneratePhotorealism = async () => {
    if (!checkApiPrerequisites() || !photorealismState.source) return;
    setIsPhotorealismLoading(true);
    setPhotorealismError(null);
    setPhotorealismState(prev => ({ ...prev, result: null }));
    try {
      const { source, prompt, negativePrompt } = photorealismState;
      if (!source) return;
      const resultBase64 = await generatePhotorealisticImageFromApi(apiKey, source.base64, prompt, negativePrompt);
      setPhotorealismState(prev => ({ ...prev, result: resultBase64 }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setPhotorealismError(errorMessage);
    } finally {
      setIsPhotorealismLoading(false);
    }
  };


  const filteredImages = React.useMemo(() => {
    if (!agentFilter.trim()) {
      return images;
    }
    const lowercasedFilter = agentFilter.trim().toLowerCase();
    return images.filter(image => {
      if (!image.agentId) return false;
      const agent = agents.find(c => c.id === image.agentId);
      return agent?.name.toLowerCase().includes(lowercasedFilter);
    });
  }, [images, agents, agentFilter]);

  const renderActiveView = () => {
    switch (activeView) {
        case 'dashboard':
            return <DashboardStudio
                stats={{
                    storyboardFrames: storyboard.length,
                    agents: agents.length,
                    loreEntries: lore.length,
                    inspirationImages: inspirationImages.length,
                    dynamicPromptLists: dynamicPromptLists.length,
                    imagesGenerated: images.length,
                }}
                onNavigate={setActiveView}
            />;
        case 'story':
            return <Storyboard 
                frames={storyboard}
                onUpdateNote={handleUpdateStoryboardNote}
                onRemove={handleRemoveFromStoryboard}
                onReorder={handleReorderStoryboard}
            />;
        case 'agent-chat':
            return <AgentChatStudio
                agents={agents}
                onUploadLore={handleUploadAgentLore}
                onSendMessage={handleSendMessageToAgent}
                isResponding={isAgentResponding}
                error={agentChatError}
            />;
        case 'dynamic-prompts':
            return <DynamicPromptsStudio
                lists={dynamicPromptLists}
                onCreate={handleCreateDynamicPromptList}
                onUpdate={handleUpdateDynamicPromptList}
                onDelete={handleDeleteDynamicPromptList}
            />;
        case 'lore':
            return <LoreStudio
                lore={lore}
                onCreate={handleCreateLoreEntry}
                onUpdate={handleUpdateLoreEntry}
                onDelete={handleDeleteLoreEntry}
            />;
        case 'agents':
            return <AgentsStudio 
                agents={agents}
                images={images}
                onCreateAgent={handleCreateAgent}
                onViewImage={setViewingImage}
                onUpdateAgent={handleUpdateAgent}
                onDeleteAgent={handleDeleteAgent}
                onImageUpload={handleImageUploadForAgent}
            />;
        case 'video':
            return <VideoGenerator
                storyboard={storyboard}
                onGenerateVideo={handleGenerateVideo}
                isLoading={isVideoLoading}
                videoUrl={generatedVideoUrl}
                error={videoGenerationError}
                progress={videoGenerationProgress}
            />;
        case 'blender':
            return <BlenderStudio
                sourceImages={blenderImages}
                resultImage={blenderResult}
                isLoading={isBlenderLoading}
                error={blenderError}
                onUpload={handleBlenderUpload}
                onRemoveImage={(id) => setBlenderImages(prev => prev.filter(img => img.id !== id))}
                onGenerate={handleGenerateBlender}
                onAddToStoryboard={handleAddToStoryboard}
                onAddToInspiration={handleAddToInspiration}
            />;
        case 'scene-compositor':
            return <SceneCompositorStudio
                sceneState={sceneCompositorState}
                isLoading={isSceneCompositorLoading}
                error={sceneCompositorError}
                onUpload={handleSceneCompositorUpload}
                onRemoveImage={(type) => setSceneCompositorState(prev => ({ ...prev, [type]: null, result: null }))}
                onGenerate={handleGenerateSceneComposite}
                onAddToStoryboard={handleAddToStoryboard}
                onAddToInspiration={handleAddToInspiration}
            />;
        case 'face-swap':
            return <FaceSwapStudio
                faceSwapState={faceSwapState}
                isLoading={isFaceSwapLoading}
                error={faceSwapError}
                onUpload={handleFaceSwapUpload}
                onRemoveImage={(type) => setFaceSwapState(prev => ({ ...prev, [type]: null, result: null }))}
                onGenerate={handleGenerateFaceSwap}
                onAddToStoryboard={handleAddToStoryboard}
                onAddToInspiration={handleAddToInspiration}
            />;
        case 'face-repair':
            return <FaceRepairStudio
                faceRepairState={faceRepairState}
                isLoading={isFaceRepairLoading}
                error={faceRepairError}
                onUpload={handleFaceRepairUpload}
                onRemoveImage={() => setFaceRepairState({ source: null, result: null })}
                onGenerate={handleGenerateFaceRepair}
                onAddToStoryboard={handleAddToStoryboard}
                onAddToInspiration={handleAddToInspiration}
            />;
        case 'photorealism':
            return <PhotorealismStudio
                photorealismState={photorealismState}
                isLoading={isPhotorealismLoading}
                error={photorealismError}
                onUpload={handlePhotorealismUpload}
                onRemoveImage={() => setPhotorealismState(prev => ({...prev, source: null, result: null}))}
                onGenerate={handleGeneratePhotorealism}
                onAddToStoryboard={handleAddToStoryboard}
                onAddToInspiration={handleAddToInspiration}
                onPromptChange={handlePhotorealismPromptChange}
            />;
        case 'script':
            return <ScriptViewer scriptText={scriptText} onUpload={handleScriptUpload} />;
        case 'inspiration':
            return <InspirationBoard
                images={inspirationImages}
                onUpload={handleInspirationUpload}
                onRemove={handleRemoveFromInspiration}
                onUseAsGuide={handleUseInspirationAsGuide}
            />;
        case 'automation':
            return <AutomationStudio
                config={automationConfig}
                onSave={handleSaveAutomationConfig}
                onTestWebhook={handleTestWebhook}
            />;
        default:
             return <DashboardStudio
                stats={{
                    storyboardFrames: storyboard.length,
                    agents: agents.length,
                    loreEntries: lore.length,
                    inspirationImages: inspirationImages.length,
                    dynamicPromptLists: dynamicPromptLists.length,
                    imagesGenerated: images.length,
                }}
                onNavigate={setActiveView}
            />;
    }
  };

  return (
    <div className="flex h-screen bg-[#202020] text-neutral-100 font-sans">
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        stats={{
          storyboard: storyboard.length,
          inspiration: inspirationImages.length,
          agents: agents.length,
          lore: lore.length,
          dynamicPrompts: dynamicPromptLists.length,
        }}
        isOnline={isOnline}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(v => !v)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-neutral-900/50 backdrop-blur-sm p-4 border-b border-neutral-800 flex-shrink-0">
            <h1 className="text-2xl font-bold text-center text-neutral-100">
                Storyboard Studio AI
            </h1>
        </header>
        <main className="flex-1 bg-[#202020] overflow-y-auto">
            {activeView === 'grid' ? (
                <div className="flex flex-col">
                    <div className="p-4 lg:p-6">
                        <InputPanel 
                          onGenerate={handleGenerate} 
                          isLoading={isLoading} 
                          editingImage={editingImage}
                          lastUsedSeed={lastUsedSeed}
                          scriptLocations={scriptLocations}
                          preparedOptions={preparedOptions}
                          onPreparationComplete={() => setPreparedOptions(null)}
                        />
                    </div>
                    <div className="p-4 lg:p-6">
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
                            agents={agents}
                            onAssignAgentToImage={handleAssignAgentToImage}
                            onCreateAgent={handleCreateAgent}
                            agentFilter={agentFilter}
                            onAgentFilterChange={setAgentFilter}
                            awaitingExternalGeneration={awaitingExternalGeneration}
                        />
                    </div>
                </div>
            ) : (
                <div className="p-4 lg:p-6 h-full">
                    {renderActiveView()}
                </div>
            )}
        </main>
      </div>
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
        currentApiKey={apiKey}
      />
      <ImageModal
        image={viewingImage}
        onClose={() => setViewingImage(null)}
        onEdit={handleEditFromModal}
        onAddToStoryboard={handleAddToStoryboard}
        onAddToInspiration={handleAddToInspiration}
        agents={agents}
        onAssignAgentToImage={handleAssignAgentToImage}
        onCreateAgent={handleCreateAgent}
      />
    </div>
  );
}

export default App;