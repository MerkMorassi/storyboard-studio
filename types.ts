
export type RAGProvider = 'cloud' | 'localhost' | 'browser';

export interface ScriptFile {
  id: string;
  title: string;
  content: string;
  type: 'outline' | 'screenplay' | 'blueprint';
  date: string;
}

export interface ProjectData {
  images: ImageState[];
  storyboard: StoryboardFrame[];
  scriptText: string;
  scriptsBin: ScriptFile[]; // Added scripts bin for storing generated drafts
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
  backgroundRemovalState: BackgroundRemovalState;
  qwenImageEditState: QwenImageEditState;
  generativeVideoState: GenerativeVideoState;
  topazState: TopazState;
  directorState: DirectorState;
  agents: Agent[];
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
  brief?: string;
  progress?: number;
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
  isDefault?: boolean;
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

export type ActiveView = 'projects' | 'dashboard' | 'team' | 'core' | 'ideation' | 'scripting' | 'design' | 'art' | 'director' | 'mythos-cinematic-engine' | 'image-generator' | 'grid' | 'story' | 'inspiration' | 'video' | 'generative-video' | 'blender' | 'scene-compositor' | 'composite' | 'face-swap' | 'face-repair' | 'photorealism' | 'resize' | 'green-screen' | 'background-removal' | 'qwen-image-edit' | 'topaz' | 'agents' | 'lore' | 'dynamic-prompts' | 'agent-chat' | 'knowledge' | 'automation' | 'prompt-library' | 'agent-workspace' | 'script-writer' | 'scripts-bin';

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
  bio?: string;
  narrativeRole?: string;
  actorName?: string;
  actorContact?: string;
}

export interface LoreEntry {
  id: string;
  projectId?: string;
  ragDocumentId?: string;
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
  type: 'image' | 'video';
  url?: string;
  base64?: string;
  mimeType?: string;
  isUpscaling: boolean;
  agentId?: string;
  metadata?: any;
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

export interface BackgroundRemovalState {
    source: { base64: string; mimeType: string } | null;
    result: { base64: string; mimeType: string } | null;
}

export interface QwenImageEditState {
    images: ({ base64: string; mimeType: string } | null)[]; // 6 Slots for Multi-Image Composition
    result: { base64: string; mimeType: string } | null;
    prompt: string;
    negativePrompt: string;
    cfgScale: number;
    seed: number;
    randomizeSeed: boolean;
    width: number;
    height: number;
    steps: number;
}

export interface TopazState {
    activeMediaType: 'image' | 'video';
    source: { base64: string; mimeType: string } | null;
    result: { base64: string; mimeType: string } | null;
    resultUrl?: string | null;
    operation: 'enhance' | 'sharpen' | 'denoise' | 'restore' | 'lighting';
    parameters: {
        scale: number;
        strength: number;
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
    steps: number;
    duration: number;
    guidanceScale: number;
    guidanceScale2: number;
    scheduler: string; 
    fps: number;
    seed: number;
    randomizeSeed: boolean;
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
