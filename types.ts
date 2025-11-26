
export type RAGProvider = 'cloud' | 'localhost';

export interface ProjectData {
  images: ImageState[];
  storyboard: StoryboardFrame[];
  scriptText: string;
  inspirationImages: InspirationImage[];
  blenderImages: BlenderImage[];
  blenderResult: string | null;
  sceneCompositorState: SceneCompositorState;
  faceSwapState: FaceSwapState;
  faceRepairState: FaceRepairState;
  photorealismState: PhotorealismState;
  agents: Agent[];
  lore: LoreEntry[];
  dynamicPromptLists: DynamicPromptList[];
  promptTemplates: PromptTemplate[];
  automationConfig: AutomationConfig;
}

export interface Project {
  id: string;
  name: string;
  data: ProjectData;
}

export interface GenerationOptions {
  prompt: string;
  negativePrompt: string;
  numImages: number;
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  guidanceScale: number;
  seed: string;
  cameraAngle: string;
  base64Image?: string;
  mimeType?: string;
  maskBase64?: string;
  addLetterbox?: boolean;
  model: 'imagen-4.0-generate-001' | 'gemini-2.5-flash-image';
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

export type ActiveView = 'projects' | 'dashboard' | 'grid' | 'story' | 'script' | 'inspiration' | 'video' | 'blender' | 'face-swap' | 'scene-compositor' | 'face-repair' | 'photorealism' | 'agents' | 'lore' | 'dynamic-prompts' | 'agent-chat' | 'automation' | 'prompt-library';

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
  id:string;
  name: string;
  lore?: string;
  chatHistory?: ChatMessage[];
}

export interface LoreEntry {
  id: string;
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
  base64: string;
  isUpscaling: boolean;
  agentId?: string;
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