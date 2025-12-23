
export type RAGProvider = 'cloud' | 'localhost' | 'browser'; // Added 'browser'

export interface ProjectData {
  images: ImageState[];
  storyboard: StoryboardFrame[];
  scriptText: string;
  inspirationImages: InspirationImage[];
  blenderImages: BlenderImage[];
  blenderResult: string | null;
  sceneCompositorState: SceneCompositorState;
  compositeState: CompositeState;
  faceSwapState: FaceSwapState;
  faceRepairState: FaceRepairState;
  photorealismState: PhotorealismState;
  resizeState: ResizeState;
  greenScreenState: GreenScreenState;
  generativeVideoState: GenerativeVideoState;
  topazState: TopazState;
  directorState: DirectorState;
  agents: Agent[]; // This now refers to CAST (Characters)
  lore: LoreEntry[];
  dynamicPromptLists: DynamicPromptList[];
  promptTemplates: PromptTemplate[];
  automationConfig: AutomationConfig;
}

export interface Project {
  id: string;
  name: string;
  tagline?: string;
  thumbnail?: string;
  brief?: string; // Full page editable project brief
  progress?: number; // 0-100 percentage
  data: ProjectData;
}

export interface GenerationOptions {
  prompt: string;
  negativePrompt: string;
  numImages: number;
  aspectRatio: '1:1' | '16:9' | '9:16' | '2.39:1';
  guidanceScale: number;
  seed: string;
  cameraAngle: string;
  base64Image?: string;
  mimeType?: string;
  maskBase64?: string;
  addLetterbox?: boolean;
  model: 'imagen-4.0-generate-001' | 'gemini-2.5-flash-image' | 'stable-diffusion-xl';
  strength?: number;
  engine?: 'internal' | 'external';
}

export interface PromptTemplate {
  id: string;
  name: string;
  positivePrompt: string;
  negativePrompt: string;
}

export interface GenerationResult {
  images: string[];
  seed: string;
}

export type GridOverlayType = 'none' | 'basic' | 'triadic' | 'golden-basic' | 'golden-triadic';

export interface StoryboardFrame {
  id: string;
  base64Image: string;
  notes: string;
  prompt: string;
}

export type ActiveView = 'projects' | 'dashboard' | 'team' | 'core' | 'ideation' | 'scripting' | 'design' | 'art' | 'agent-dop' | 'image-generator' | 'grid' | 'story' | 'script' | 'inspiration' | 'video' | 'generative-video' | 'blender' | 'scene-compositor' | 'composite' | 'face-swap' | 'face-repair' | 'photorealism' | 'resize' | 'green-screen' | 'topaz' | 'director' | 'agents' | 'lore' | 'dynamic-prompts' | 'agent-chat' | 'knowledge' | 'automation' | 'prompt-library' | 'agent-workspace' | 'mythos-cinematic-engine';

export interface InspirationImage {
  id: string;
  base64Image: string;
}

export interface AIGeneratedPrompt {
  scene: string;
  prompt: string;
}

export interface FunctionCall {
    name: string;
    args: any;
    id: string;
}

export interface ToolCode {
    id: string;
    functionCall: FunctionCall;
}

export type ChatMessage = 
    | { role: 'user'; text: string; }
    | { role: 'model'; text: string; functionCalls?: FunctionCall[]; }
    | { role: 'tool_code', toolCode: ToolCode };

export interface Agent {
  id: string;
  name: string;
  lore?: string;
  chatHistory?: ChatMessage[];
  systemPrompt: string;
  voice: string;
  avatar?: string;
  tags?: string[];
  speakingRate?: number;
  autoPlayAudio?: boolean;
  knowledgeBaseUrl?: string;
  enableLocalRag?: boolean;
  protectedWords?: string;
  // New Character Sheet Fields
  bio?: string;
  narrativeRole?: string;
  actorName?: string;
  actorContact?: string;
}

export interface LoreEntry {
  id: string;
  projectId?: string; // Added to support local RAG deletion/filtering by project
  ragDocumentId?: string; // Only for external RAG to track external ID
  title: string;
  content: string;
}

export interface DynamicPromptList {
  id: string;
  name: string;
  items: string[];
}

export interface ImageState {
  id: string;
  type: 'image' | 'video'; // Supports both media types
  url?: string; // For videos or remote assets
  base64?: string; // For local images
  mimeType?: string; // e.g. 'image/jpeg' or 'video/mp4'
  isUpscaling: boolean;
  agentId?: string;
  metadata?: any; // Stores generation parameters (seed, prompt, etc.)
}

export interface BlenderImage {
    id: string;
    base64: string;
}

export interface FaceSwapState {
    source: { base64: string; mimeType: string } | null;
    face: { base64: string; mimeType: string } | null;
    result: string | null;
}

export interface SceneCompositorState {
    background: { base64: string; mimeType: string } | null;
    character: { base64: string; mimeType: string } | null;
    result: string | null;
}

export interface CompositeState {
    refImage1: { base64: string; mimeType: string } | null;
    refImage2: { base64: string; mimeType: string } | null;
    task1: 'ip' | 'id' | 'style' | 'structure' | 'face';
    task2: 'ip' | 'id' | 'style' | 'structure' | 'face';
    prompt: string;
    negativePrompt: string;
    width: number;
    height: number;
    seed: number;
    randomizeSeed: boolean;
    resultImage: { base64: string; mimeType: string } | null;
    resultVideoUrl: string | null;
}

export interface FaceRepairState {
    source: { base64: string; mimeType: string } | null;
    result: string | null;
}

export interface PhotorealismState {
    source: { base64: string; mimeType: string } | null;
    result: string | null;
    prompt: string;
    negativePrompt: string;
}

export interface ResizeState {
    source: { base64: string; mimeType: string } | null;
    result: { base64: string; mimeType: string } | null;
    width: number;
    height: number;
    prompt: string;
    alignment: 'Middle' | 'Left' | 'Right' | 'Top' | 'Bottom';
    overlap: number;
    steps: number;
    directions: {
        left: boolean;
        right: boolean;
        top: boolean;
        bottom: boolean;
    };
}

export interface GreenScreenState {
    source: { base64: string; mimeType: string } | null;
    resultUrl: string | null;
}

export interface TopazState {
    activeMediaType: 'image' | 'video';
    source: { base64: string; mimeType: string } | null;
    result: { base64: string; mimeType: string } | null;
    resultUrl?: string | null; // For video results
    operation: 'enhance' | 'sharpen' | 'denoise' | 'restore' | 'lighting';
    parameters: {
        scale: number; // 1, 2, 4
        strength: number; // 0-100
    };
    faceRecovery: boolean;
}

export interface DirectorState {
    referenceImage: { base64: string; mimeType: string } | null;
    analysis: {
        subject: string;
        lighting: string;
        camera: string;
        color: string;
        composition: string;
        extractedPrompt: string;
    } | null;
    chatHistory: ChatMessage[];
    generatedPreview: string | null;
}

export interface GenerativeVideoState {
    prompt: string;
    negativePrompt: string;
    image: { base64: string; mimeType: string } | null;
    lastImage: { base64: string; mimeType: string } | null;
    resultUrl: string | null;
    engine: 'external';
    externalUrl: string;
    externalApiKey?: string;
    // Wan parameters
    steps: number;
    duration: number;
    guidanceScale: number; // High noise stage
    guidanceScale2: number; // Low noise stage
    scheduler: string;
    quality: number;
    flowShift: number;
    seed: number;
    randomizeSeed: boolean;
    fps: number; // Video Fluidity
}

export interface WebhookPayload {
  eventType: 'GENERATION_COMPLETE' | 'TEST_MESSAGE' | 'GENERATION_REQUEST';
  timestamp: string;
  generationOptions?: GenerationOptions;
  imageCount?: number;
  previewImage?: string;
  message?: string;
}

export interface AutomationConfig {
    ragEnabled: boolean;
    ragProvider: RAGProvider;
    ragApiKey: string;
    ragBaseUrl: string;
    ragKnowledgeBoxId: string;
    ragLocalhostUrl: string;
    webhookUrls: string[];
}
