
export type RAGProvider = 'cloud' | 'localhost' | 'browser';
export type ModelEngine = 'gemini' | 'dolphin';
export type ActiveView = 'dashboard' | 'projects' | 'team' | 'core' | 'ideation' | 'scripting' | 'design' | 'art' | 'director' | 'mythos-cinematic-engine' | 'one-shot-cinematic' | 'image-generator' | 'generative-video' | 'transition-studio' | 'camera-movement' | 'blender' | 'scene-compositor' | 'composite' | 'face-swap' | 'face-repair' | 'photorealism' | 'resize' | 'green-screen' | 'background-removal' | 'qwen-image-edit' | 'topaz' | 'grid' | 'story' | 'inspiration' | 'scripts-bin' | 'script-writer' | 'agents' | 'studio-players' | 'characters' | 'lore' | 'prompt-library' | 'dynamic-prompts' | 'agent-chat' | 'knowledge' | 'automation' | 'agent-workspace';

export type GridOverlayType = 'none' | 'basic' | 'triadic' | 'golden-basic' | 'golden-triadic';

export interface ChatMessage {
  role: 'user' | 'model' | 'tool_code';
  text: string;
}

export interface ImageState {
  id: string;
  type: 'image' | 'video';
  base64?: string;
  url?: string;
  mimeType?: string;
  isUpscaling?: boolean;
  agentId?: string;
  metadata?: any;
}

export interface Character {
  id: string;
  name: string;
  archetype: string;
  description: string;
  avatar?: string;
}

export interface LoreEntry {
  id: string;
  projectId: string;
  title: string;
  content: string;
  ragDocumentId?: string;
}

export interface ScriptFile {
  id: string;
  title: string;
  content: string;
  date: string;
  type: 'screenplay' | 'script';
}

export interface StoryboardFrame {
  id: string;
  base64Image: string;
  notes: string;
  prompt?: string;
}

export interface InspirationImage {
  id: string;
  base64Image: string;
}

export interface BlenderImage {
  id: string;
  base64: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  positivePrompt: string;
  negativePrompt: string;
  isDefault?: boolean;
}

export interface DynamicPromptList {
  id: string;
  name: string;
  items: string[];
}

export interface GenerationOptions {
  prompt: string;
  negativePrompt: string;
  numImages: number;
  aspectRatio: '16:9' | '9:16' | '1:1' | '2.39:1';
  guidanceScale: number;
  seed: string;
  cameraAngle: string;
  addLetterbox: boolean;
  model: 'gemini-2.5-flash-image' | 'imagen-4.0-generate-001';
  engine: 'internal' | 'external';
  base64Image?: string;
  mimeType?: string;
  strength?: number;
  maskBase64?: string;
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

export interface Project {
  id: string;
  name: string;
  tagline?: string;
  brief?: string;
  progress?: number;
  thumbnail?: string;
  data: {
    images: ImageState[];
    storyboard: StoryboardFrame[];
    scriptText: string;
    scriptsBin: ScriptFile[];
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
    cameraMovementState: CameraMovementState;
    transitionState: TransitionState;
    topazState: TopazState;
    directorState: any;
    agents: Agent[];
    studioPlayers: Agent[];
    characters: Character[];
    lore: LoreEntry[];
    dynamicPromptLists: DynamicPromptList[];
    promptTemplates: PromptTemplate[];
    automationConfig: AutomationConfig;
    mythosPrompt?: string;
  };
}

export interface SceneCompositorState {
  background: { base64: string; mimeType: string } | null;
  character: { base64: string; mimeType: string } | null;
  result: string | null;
}

export interface CompositeState {
  refImage1: { base64: string; mimeType: string } | null;
  refImage2: { base64: string; mimeType: string } | null;
  task1: string;
  task2: string;
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  seed: number;
  randomizeSeed: boolean;
  resultImage: { base64: string; mimeType: string } | null;
  resultVideoUrl: string | null;
}

export interface FaceSwapState {
  source: { base64: string; mimeType: string } | null;
  face: { base64: string; mimeType: string } | null;
  result: string | null;
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
  directions: { left: boolean; right: boolean; top: boolean; bottom: boolean };
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
  images: ({ base64: string; mimeType: string } | null)[];
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

export interface GenerativeVideoState {
  prompt: string;
  negativePrompt: string;
  image: { base64: string; mimeType: string } | null;
  lastImage: { base64: string; mimeType: string } | null;
  resultUrl: string | null;
  engine: string;
  externalUrl: string;
  steps: number;
  duration: number;
  guidanceScale: number;
  guidanceScale2: number;
  scheduler: string;
  fps: number;
  seed: number;
  randomizeSeed: boolean;
}

export interface CameraMovementState {
  source: { base64: string; mimeType: string } | null;
  prompt: string;
  negativePrompt: string;
  movementType: string;
  steps: number;
  guidanceScale: number;
  seed: number;
  randomizeSeed: boolean;
  resultUrl: string | null;
}

export interface TransitionState {
  startImage: { base64: string; mimeType: string } | null;
  endImage: { base64: string; mimeType: string } | null;
  prompt: string;
  negativePrompt: string;
  duration: number;
  steps: number;
  guidanceScale: number;
  guidanceScale2: number;
  seed: number;
  randomizeSeed: boolean;
  resultUrl: string | null;
}

export interface TopazState {
  activeMediaType: 'image' | 'video';
  source: { base64: string; mimeType: string } | null;
  result: { base64: string; mimeType: string } | null;
  resultUrl: string | null;
  operation: 'enhance' | 'sharpen' | 'denoise' | 'restore' | 'lighting';
  parameters: { scale: number; strength: number };
  faceRecovery: boolean;
}

export interface FunctionCall {
  name: string;
  args: any;
  id: string;
}

export interface ToolCode {
  code: string;
}

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
  preferredEngine?: ModelEngine;
}
