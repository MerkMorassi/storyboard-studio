
import React, { useState, useEffect, useRef } from 'react';
import { GenerationOptions } from '../types';
import { DiceIcon, ClearIcon, ChevronDownIcon } from './icons';

interface InputPanelProps {
  onGenerate: (options: GenerationOptions) => void;
  isLoading: boolean;
  editingImage?: { base64: string; mimeType: string } | null;
  lastUsedSeed?: string;
  scriptLocations?: string[];
  preparedOptions: Partial<GenerationOptions & { sceneType: string, location: string, timeOfDay: string }> | null;
  onPreparationComplete: () => void;
}

interface SelectOption {
    label: string;
    value: string | number;
}

type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
type Model = 'imagen-4.0-generate-001' | 'gemini-2.5-flash-image';
type Engine = 'internal' | 'external';

const numImagesOptions: SelectOption[] = [
    { label: "6 (Default)", value: 6 }, { label: "1", value: 1 }, { label: "2", value: 2 },
    { label: "3", value: 3 }, { label: "9", value: 9 }, { label: "12", value: 12 },
    { label: "15", value: 15 }, { label: "18", value: 18 }, { label: "21", value: 21 },
    { label: "24", value: 24 }
];

const shapeOptions: {label: string; value: string}[] = [
    { label: "Cinematic Film (2.39:1)", value: '2.39:1' },
    { label: "Landscape (16:9)", value: '16:9' },
    { label: "Portrait (9:16)", value: '9:16' },
    { label: "Square (1:1)", value: '1:1' },
    { label: "Widescreen (4:3)", value: '4:3' },
    { label: "Tall (3:4)", value: '3:4' },
    { label: "Custom Ratio", value: 'custom' },
];

const modelOptions: {label: string, value: Model}[] = [
    { label: 'Imagen 4 (High Quality)', value: 'imagen-4.0-generate-001' },
    { label: 'Gemini Flash Image (Fast)', value: 'gemini-2.5-flash-image' },
];

const engineOptions: {label: string, value: Engine}[] = [
    { label: 'Internal (Gemini)', value: 'internal' },
    { label: 'External (Tasklet/Perchance)', value: 'external' },
];

const cameraAngleOptions: SelectOption[] = [
    { label: "Default", value: "" },
    { label: "Close-up Shot", value: "Close-up shot" },
    { label: "Wide Angle Shot", value: "Wide angle shot" },
    { label: "Dutch Angle", value: "Dutch angle shot" },
    { label: "Eye-level Shot", value: "Eye-level shot" },
    { label: "Low-angle Shot", value: "Low-angle shot" },
    { label: "High-angle Shot", value: "High-angle shot" },
    { label: "Point-of-view (POV)", value: "Point-of-view shot" },
    { label: "Over-the-shoulder Shot", value: "Over-the-shoulder shot" }
];

const gScaleOptions: SelectOption[] = Array.from({ length: 30 }, (_, i) => ({ label: `${i + 1}`, value: i + 1 }));

const positivePromptPresets: {label: string, value: string}[] = [
    {
        label: "Cinematic Film Noir",
        value: "black and white, high contrast, dramatic shadows, film grain, mysterious atmosphere"
    },
    {
        label: "Sci-Fi Blockbuster",
        value: "cool blues and oranges, high-tech, realistic science fiction, cinematic, epic scale, slightly desaturated"
    },
    {
        label: "Golden Hour Magic",
        value: "shot during golden hour, warm, soft, long shadows, lens flare, magical realism"
    },
    {
        label: "Pastel Symmetry (Anderson)",
        value: "symmetrical composition, pastel color palette, flat space, quirky, detailed props, cinematic"
    },
    {
        label: "Cyberpunk Neon",
        value: "cyberpunk aesthetic, neon lighting, futuristic city, rain-slicked streets, high-tech details"
    },
    {
        label: "Grindhouse Retro",
        value: "70s grindhouse film look, gritty, high contrast, film grain, saturated colors, retro aesthetic"
    },
    {
        label: "Horror",
        value: "horror movie style, dark and gritty, unsettling atmosphere, deep shadows, creepy, suspenseful"
    },
    {
        label: "Epic Fantasy",
        value: "fantasy art, epic scale, dramatic lighting, detailed armor and landscapes, magical glow"
    },
    {
        label: "Vibrant Anime",
        value: "anime style, vibrant colors, cel shading, dynamic lines, detailed background"
    },
    {
        label: "Vintage Sepia",
        value: "sepia tone, vintage photograph, faded colors, nostalgic feel, scratches and dust"
    },
    {
        label: "Photorealistic Portrait",
        value: "photorealistic, 8k, detailed skin texture, soft natural lighting, sharp focus, professional portrait photography"
    }
];

const negativePromptPresets: {label: string, value: string}[] = [
    {
        label: "General Quality Boost",
        value: "(low quality, worst quality, normal quality:1.2), lowres, blurry, jpeg artifacts, ugly, duplicate, morbid, mutilated, error, monochrome, sketch, cartoon, cg, 3d, anime, manga, disney, animation, render, fake, artwork, drawing, painting, grainy, pixelated, out of focus, overexposed, underexposed, distorted, poor quality lighting"
    },
    {
        label: "Fix Human Anatomy",
        value: "(bad anatomy, bad proportions:1.3), (mutation, malformed, deformed, disfigured:1.2), gross proportions, unrealistic flesh, extra limbs, missing limbs, amputation, disconnected limbs, floating limbs, extra arms, extra legs, long neck"
    },
    {
        label: "Fix Faces & Heads",
        value: "(poorly drawn face, bad face, fused face, cloned face:1.2), extra eyes, deformed iris, deformed pupils, bad teeth, crooked teeth, Double headed, multiple heads"
    },
    {
        label: "Fix Hands & Fingers",
        value: "(bad hands, poorly drawn hands, malformed hands:1.3), (fused fingers, extra fingers, mutated fingers, missing fingers:1.2)"
    },
    {
        label: "Remove Text & Watermarks",
        value: "watermark, text, username, signature, logo, banner, graphics"
    },
    {
        label: "Composition Control",
        value: "(((Close-up shot))), (((zoomed in face shot))), ((Close up image of a face)), out of frame, multiple subjects, multiple people, multiple views, ((multiple perspectives, split-screen effect, simultaneous viewpoints, duplicated subject from different angles, cubist composition, multi-angle portrait, reflections showing alternate angles, time-lapse sequence, collage of perspectives, compound viewpoints))"
    },
    {
        label: "Safe Content Filter",
        value: "(((scrotum, testes, testicles, balls, nuts))), deformed vagina, deformed pussy, deformed cock, (child, children), nsfw"
    }
];

const InputGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex flex-wrap gap-4">{children}</div>
);

const FormField: React.FC<{ label: string; children: React.ReactNode, className?: string, disabled?: boolean }> = ({ label, children, className = '', disabled=false }) => (
    <div className={`flex flex-col gap-2 ${className} ${disabled ? 'opacity-50' : ''}`}>
        <label className="text-sm font-semibold text-neutral-400" dangerouslySetInnerHTML={{ __html: label }} />
        {children}
    </div>
);

const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> =>
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

const AccordionSection: React.FC<{
    title: string;
    children: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
}> = ({ title, children, isOpen, onToggle }) => {
    return (
        <div className="border border-neutral-800 bg-neutral-900/60">
            <button
                type="button"
                onClick={onToggle}
                className="w-full flex justify-between items-center p-3 bg-neutral-800/50 hover:bg-neutral-800 transition-colors"
            >
                <h3 className="text-md font-bold text-neutral-200" dangerouslySetInnerHTML={{ __html: title }} />
                <ChevronDownIcon className={`h-5 w-5 text-neutral-400 transition-transform duration-300 ${isOpen ? 'transform rotate-180' : ''}`} />
            </button>
            <div className={`grid transition-all duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                    <div className="p-4 space-y-6">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};


export const InputPanel: React.FC<InputPanelProps> = ({ onGenerate, isLoading, editingImage, lastUsedSeed, scriptLocations = [], preparedOptions, onPreparationComplete }) => {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [numImages, setNumImages] = useState(6);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [selectedShape, setSelectedShape] = useState<string>('2.39:1');
  const [customWidth, setCustomWidth] = useState('1920');
  const [customHeight, setCustomHeight] = useState('802');
  const [ratioMessage, setRatioMessage] = useState('');
  const [guidanceScale, setGuidanceScale] = useState(7);
  const [seed, setSeed] = useState('');
  const [isNegativeFolded, setIsNegativeFolded] = useState(false);
  const [imageData, setImageData] = useState<{ preview: string; base64: string; mimeType: string; } | null>(null);
  const [cameraAngle, setCameraAngle] = useState('');
  const [addLetterbox, setAddLetterbox] = useState(true);
  const [model, setModel] = useState<Model>('imagen-4.0-generate-001');
  const [engine, setEngine] = useState<Engine>('internal');
  const [copyButtonText, setCopyButtonText] = useState('Copy');
  const [strength, setStrength] = useState(0.5);
  const [isInpainting, setIsInpainting] = useState(false);

  // Scene Heading State
  const [sceneType, setSceneType] = useState<'INT' | 'EXT'>('INT');
  const [location, setLocation] = useState('');
  const [timeOfDay, setTimeOfDay] = useState<'DAY' | 'NIGHT'>('DAY');

  // Inpainting state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(40);
  
  // Accordion State
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['prompt']));

  const toggleSection = (section: string) => {
    setOpenSections(prev => {
        const newSet = new Set(prev);
        if (newSet.has(section)) {
            newSet.delete(section);
        } else {
            newSet.add(section);
        }
        return newSet;
    });
  };
  
  const handleApplyCinematicRatio = () => {
    setAspectRatio('16:9'); // Closest supported ratio
    setRatioMessage(`Using 2.39:1 preset. The model will use the closest supported ratio: 16:9.`);
  };
  
  const clearMask = () => {
    const canvas = canvasRef.current;
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = e.target.value as Model;
    setModel(newModel);

    // When switching to Gemini, clear unsupported Imagen-only parameters
    // to prevent API errors.
    if (newModel === 'gemini-2.5-flash-image') {
        setNegativePrompt('');
        setSeed('');
        setGuidanceScale(7);
    }
  };

  useEffect(() => {
    if (editingImage) {
      const preview = `data:${editingImage.mimeType};base64,${editingImage.base64}`;
      setImageData({ preview, ...editingImage });
      // When we start editing, force the model to Imagen for inpainting
      setModel('imagen-4.0-generate-001');
      setPrompt(''); // Clear prompt for inpainting instruction
      setIsInpainting(true);
    } else {
        setImageData(null); // Clear image data if we are no longer editing
        setIsInpainting(false);
    }
  }, [editingImage]);

  useEffect(() => {
    if (lastUsedSeed) {
        setSeed(lastUsedSeed);
    }
  }, [lastUsedSeed]);

  useEffect(() => {
    if (preparedOptions) {
        setPrompt(preparedOptions.prompt || '');
        setNegativePrompt(preparedOptions.negativePrompt || '');
        setCameraAngle(preparedOptions.cameraAngle || '');
        setSceneType(preparedOptions.sceneType as 'INT' | 'EXT' || 'INT');
        setLocation(preparedOptions.location || '');
        setTimeOfDay(preparedOptions.timeOfDay as 'DAY' | 'NIGHT' || 'DAY');
        setOpenSections(new Set(['prompt'])); // Ensure prompt section is open
        onPreparationComplete();
    }
  }, [preparedOptions, onPreparationComplete]);

  useEffect(() => {
    // Set initial state for the default "Cinematic Film" ratio
    if (selectedShape === '2.39:1') {
        handleApplyCinematicRatio();
        setAddLetterbox(true);
    }
  // This effect should run only once on mount to set the default.
  // The dependency array is intentionally empty.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect to resize canvas when inpainting is toggled
  useEffect(() => {
    if (isInpainting && canvasRef.current && imageRef.current) {
        // Use natural dimensions to ensure mask matches image resolution for API
        const img = imageRef.current;
        const canvas = canvasRef.current;
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
    }
  }, [isInpainting, imageData]);

  const isImageMode = !!imageData;
  const isImagenModel = model === 'imagen-4.0-generate-001';
  const isInpaintingMode = isInpainting;
  const isImageToImageMode = isImageMode && !isInpaintingMode && isImagenModel;

  const supportedShapesForLetterbox = ['2.39:1', '16:9', '4:3'];
  const isLetterboxSupportedShape = supportedShapesForLetterbox.includes(selectedShape) && isImagenModel && !isImageMode;


  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
        const { base64, mimeType } = await fileToBase64(file);
        const preview = URL.createObjectURL(file);
        setImageData({ preview, base64, mimeType });
        // When a guiding image is uploaded, force the model to Imagen for best results.
        setModel('imagen-4.0-generate-001');
        setIsInpainting(false); // Default to false (Guiding Image), user can toggle
    }
    event.target.value = ''; // Reset input to allow re-uploading the same file
  };

  const removeImage = () => {
      if (imageData) {
          if (imageData.preview.startsWith('blob:')) {
            URL.revokeObjectURL(imageData.preview);
          }
          setImageData(null);
          clearMask();
          setIsInpainting(false);
      }
  };
  
  const findClosestAspectRatio = (width: number, height: number): AspectRatio => {
      if (height === 0) return '16:9';
      const targetRatio = width / height;

      const supportedRatios: { key: AspectRatio; value: number }[] = [
          { key: '16:9', value: 16 / 9 },
          { key: '9:16', value: 9 / 16 },
          { key: '1:1', value: 1 },
          { key: '4:3', value: 4 / 3 },
          { key: '3:4', value: 3 / 4 },
      ];

      let closest = supportedRatios[0];
      let minDiff = Math.abs(targetRatio - closest.value);

      for (let i = 1; i < supportedRatios.length; i++) {
          const diff = Math.abs(targetRatio - supportedRatios[i].value);
          if (diff < minDiff) {
              minDiff = diff;
              closest = supportedRatios[i];
          }
      }
      return closest.key;
  };

  const handleApplyCustomRatio = () => {
      const width = parseInt(customWidth, 10);
      const height = parseInt(customHeight, 10);

      if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
          setRatioMessage('Please enter valid, positive numbers for width and height.');
          return;
      }

      const closestRatio = findClosestAspectRatio(width, height);
      setAspectRatio(closestRatio);

      setRatioMessage(`Applied ${width}x${height}. The model does not support custom dimensions. Using closest ratio: ${closestRatio}.`);
  };

  const handleShapeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      setSelectedShape(value);
      setRatioMessage('');
      setAddLetterbox(value === '2.39:1'); // Default logic: on for cinematic, off for others.

      if (value === '2.39:1') {
          handleApplyCinematicRatio();
      } else if (value !== 'custom') {
          setAspectRatio(value as AspectRatio);
      }
  };

  const handleRandomSeed = () => {
    const randomSeed = Math.floor(Math.random() * 1_000_000_000);
    setSeed(String(randomSeed));
  };

  const handleCopySeed = () => {
    if (seed) {
        navigator.clipboard.writeText(seed);
        setCopyButtonText('Copied!');
        setTimeout(() => setCopyButtonText('Copy'), 2000);
    }
  };

  const handleNegativePresetSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    if (!selectedValue) return;

    setNegativePrompt(prev => {
        const trimmedPrev = prev.trim();
        if (trimmedPrev === '') return selectedValue;
        if (trimmedPrev.endsWith(',')) return `${trimmedPrev} ${selectedValue}`;
        return `${trimmedPrev}, ${selectedValue}`;
    });
    
    e.target.value = '';
  };

  const handlePositivePresetSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    if (!selectedValue) return;

    setPrompt(prev => {
        const trimmedPrev = prev.trim();
        if (trimmedPrev === '') return selectedValue;
        if (trimmedPrev.endsWith(',')) return `${trimmedPrev} ${selectedValue}`;
        return `${trimmedPrev}, ${selectedValue}`;
    });
    
    e.target.value = '';
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() || isInpaintingMode || (isImageMode && engine === 'external')) {
      
      let sceneHeading = '';
      if (location.trim()) {
        sceneHeading = `${sceneType}. ${location.trim().toUpperCase()} - ${timeOfDay}`;
      }
      
      let assembledPrompt = prompt;
      if (sceneHeading) {
        assembledPrompt = `${sceneHeading} - ${assembledPrompt}`;
      }
      
      let finalPrompt = assembledPrompt;
      if (cameraAngle) {
        finalPrompt = `${cameraAngle}, ${finalPrompt}`;
      }
      
      let options: GenerationOptions = { 
        prompt: finalPrompt, 
        negativePrompt, 
        numImages, 
        aspectRatio, 
        guidanceScale, 
        seed, 
        cameraAngle, 
        addLetterbox, 
        model, 
        strength,
        engine
      };

      if (isInpaintingMode && imageData) {
        const canvas = canvasRef.current;
        if (canvas) {
            const maskBase64 = canvas.toDataURL('image/png').split(',')[1];
            options = { ...options, base64Image: imageData.base64, mimeType: imageData.mimeType, maskBase64 };
        }
      } else if (imageData) {
        options = { ...options, base64Image: imageData.base64, mimeType: imageData.mimeType };
      }
      onGenerate(options);
    }
  };

  // --- Inpainting canvas logic ---
  const handleImageLoad = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (canvas && image) {
        // Match canvas dimensions to the image's natural dimensions
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
    }
  };

  const getMousePos = (canvas: HTMLCanvasElement, evt: React.MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
        x: (evt.clientX - rect.left) * scaleX,
        y: (evt.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    setIsDrawing(true);
    const pos = getMousePos(canvas, e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    
    // Calculate scale for brush size so visual size matches paint size
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;

    ctx.lineWidth = brushSize * scaleX;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(255, 255, 255, 1)'; // White for transparency mask in API (opaque = edit)
    ctx.stroke();
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getMousePos(canvas, e);
    
    // Calculate scale for brush size
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;

    ctx.lineTo(pos.x, pos.y);
    ctx.lineWidth = brushSize * scaleX;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
    ctx.stroke();
  };

  const stopDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.closePath();
    }
    setIsDrawing(false);
  };

  const baseInputClasses = "w-full bg-neutral-900 border border-neutral-700 p-2 focus:ring-2 focus:ring-neutral-500 focus:border-neutral-500 transition duration-200 outline-none disabled:bg-neutral-800/50 disabled:cursor-not-allowed";

  const SceneToggleButton: React.FC<{
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }> = ({ active, onClick, children }) => (
    <button
      type="button"
      onClick={onClick}
      className={`w-full py-2 text-sm font-bold transition-colors ${
        active
          ? 'bg-neutral-700 text-white'
          : 'bg-neutral-800/60 text-neutral-400 hover:bg-neutral-700/80'
      }`}
    >
      {children}
    </button>
  );

  return (
    <form onSubmit={handleSubmit} className="bg-neutral-900/60 p-4 border border-neutral-800 shadow-lg space-y-4 h-full flex flex-col">
      <div className="w-full">
        <label className="text-sm font-semibold text-neutral-400 mb-2 block" dangerouslySetInnerHTML={{ __html: `<b>${isInpaintingMode ? 'Editing Image / Inpainting' : 'Guiding Image (Optional)'}</b>` }} />
        {imageData ? (
          <div className="space-y-3">
             <div className="relative group w-full max-h-64 flex justify-center bg-black/20">
                <img ref={imageRef} src={imageData.preview} alt="Preview" className="object-contain max-h-64" onLoad={handleImageLoad} />
                {isInpaintingMode && (
                     <canvas
                        ref={canvasRef}
                        className="absolute top-0 left-0 w-full h-full cursor-crosshair"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                     />
                )}
                <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 bg-black/50 text-white p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove image"
                >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                </button>
            </div>
            
            <div className="flex items-center justify-between bg-neutral-800/50 p-2 rounded border border-neutral-700">
                <label className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer select-none w-full">
                    <input 
                        type="checkbox" 
                        checked={isInpainting} 
                        onChange={(e) => setIsInpainting(e.target.checked)}
                        className="w-4 h-4 text-neutral-500 bg-neutral-700 border-neutral-600 rounded focus:ring-neutral-500"
                    />
                    <span>Enable Inpainting (Draw Mask)</span>
                </label>
            </div>

            {isImageToImageMode && (
                <div className="bg-neutral-800/50 p-3 space-y-3">
                    <p className="text-xs text-center text-neutral-400">Lower values adhere more to the original image. Higher values give the AI more creative freedom.</p>
                    <FormField label="Creative Freedom" className="w-full">
                        <div className="flex items-center gap-3">
                            <input 
                                type="range" 
                                min="0" 
                                max="1" 
                                step="0.01"
                                value={strength} 
                                onChange={(e) => setStrength(Number(e.target.value))} 
                                className="w-full h-2 bg-neutral-700 appearance-none cursor-pointer accent-neutral-500" 
                            />
                            <input
                                type="number"
                                min="0"
                                max="1"
                                step="0.01"
                                value={strength}
                                onChange={(e) => {
                                    const value = Number(e.target.value);
                                    if (!isNaN(value)) {
                                       setStrength(Math.max(0, Math.min(1, value)));
                                    }
                                }}
                                className="w-20 bg-neutral-900 border border-neutral-700 p-2 text-center focus:ring-2 focus:ring-neutral-500 focus:border-neutral-500 transition duration-200 outline-none"
                            />
                        </div>
                    </FormField>
                </div>
            )}
            {isInpaintingMode && (
                 <div className="bg-neutral-800/50 p-3 space-y-3">
                    <p className="text-xs text-center text-neutral-400">Draw over the area you want to regenerate. The white brush indicates the mask.</p>
                    <FormField label="Brush Size" className="w-full">
                        <div className="flex items-center gap-3">
                            <input 
                                type="range" 
                                min="10" 
                                max="100" 
                                value={brushSize} 
                                onChange={(e) => setBrushSize(Number(e.target.value))} 
                                className="w-full h-2 bg-neutral-700 appearance-none cursor-pointer accent-neutral-500" 
                            />
                            <input
                                type="number"
                                min="10"
                                max="100"
                                value={brushSize}
                                onChange={(e) => {
                                    const value = Number(e.target.value);
                                    if (!isNaN(value)) {
                                       setBrushSize(Math.max(10, Math.min(100, value)));
                                    }
                                }}
                                className="w-20 bg-neutral-900 border border-neutral-700 p-2 text-center focus:ring-2 focus:ring-neutral-500 focus:border-neutral-500 transition duration-200 outline-none"
                            />
                        </div>
                    </FormField>
                    <button type="button" onClick={clearMask} className="w-full bg-neutral-800/70 text-white text-sm py-1.5 hover:bg-neutral-700/80 transition flex items-center justify-center">
                        <ClearIcon />
                        Clear Mask
                    </button>
                 </div>
            )}
          </div>
        ) : (
          <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-neutral-700 border-dashed cursor-pointer bg-neutral-900/50 hover:bg-neutral-800/50 transition">
            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-neutral-400">
              <svg className="w-8 h-8 mb-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
              </svg>
              <p className="mb-2 text-sm">Click to upload or drag and drop</p>
            </div>
            <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/*"/>
          </label>
        )}
      </div>
      
      <div className="space-y-2">
        <AccordionSection title="<b>1. Prompt & Scene</b>" isOpen={openSections.has('prompt')} onToggle={() => toggleSection('prompt')}>
            <div className="space-y-2 bg-neutral-800/50 p-3">
                <label className="text-sm font-semibold text-neutral-400 mb-2 block" dangerouslySetInnerHTML={{ __html: '<b>Scene Heading</b>' }} />
                <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1 flex gap-px">
                        <SceneToggleButton active={sceneType === 'INT'} onClick={() => setSceneType('INT')}>INT.</SceneToggleButton>
                        <SceneToggleButton active={sceneType === 'EXT'} onClick={() => setSceneType('EXT')}>EXT.</SceneToggleButton>
                    </div>
                    <div className="col-span-2">
                        <input
                            type="text"
                            list="script-locations"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="LOCATION"
                            className={`${baseInputClasses} uppercase`}
                        />
                        <datalist id="script-locations">
                            {scriptLocations.map((loc) => (
                                <option key={loc} value={loc} />
                            ))}
                        </datalist>
                    </div>
                    <div className="col-span-3 flex gap-px">
                        <SceneToggleButton active={timeOfDay === 'DAY'} onClick={() => setTimeOfDay('DAY')}>DAY</SceneToggleButton>
                        <SceneToggleButton active={timeOfDay === 'NIGHT'} onClick={() => setTimeOfDay('NIGHT')}>NIGHT</SceneToggleButton>
                    </div>
                </div>
            </div>

            <div>
                <div className="flex justify-between items-center w-full text-sm font-semibold text-neutral-400 mb-2">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                            <span dangerouslySetInnerHTML={{ __html: '<b>Positive Prompt</b>' }} />
                            <div className="relative group">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-neutral-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-neutral-800 text-neutral-200 text-xs p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                    Use <b>[listName]</b> to insert a random item from a list you created in the "Dynamic Prompts" studio. Each generated image will use a different random item.
                                </div>
                            </div>
                        </div>
                        <select 
                            onChange={handlePositivePresetSelect}
                            className="text-xs bg-neutral-800 text-neutral-300 border border-neutral-700 p-1 focus:ring-neutral-500 focus:border-neutral-500 outline-none"
                            aria-label="Positive prompt presets"
                        >
                            <option value="">Add preset...</option>
                            {positivePromptPresets.map(p => <option key={p.label} value={p.value}>{p.label}</option>)}
                        </select>
                    </div>
                </div>
                <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={isInpaintingMode ? "Describe what to generate in the masked area..." : "Describe the action, characters, and details of the scene..."}
                className={`${baseInputClasses} h-36 resize-y`}
                />
            </div>

            <div className={`w-full ${!isImagenModel && engine === 'internal' ? 'opacity-50' : ''}`}>
                <div className="flex justify-between items-center w-full text-sm font-semibold text-neutral-400 mb-2">
                    <div className="flex items-center gap-2">
                        <span dangerouslySetInnerHTML={{ __html: '<b>Negative Prompt</b>' }} />
                        <select 
                            onChange={handleNegativePresetSelect} 
                            disabled={!isImagenModel && engine === 'internal'} 
                            className="text-xs bg-neutral-800 text-neutral-300 border border-neutral-700 p-1 focus:ring-neutral-500 focus:border-neutral-500 outline-none disabled:bg-neutral-800/50 disabled:cursor-not-allowed"
                            aria-label="Negative prompt presets"
                        >
                            <option value="">Add preset...</option>
                            {negativePromptPresets.map(p => <option key={p.label} value={p.value}>{p.label}</option>)}
                        </select>
                    </div>
                    <button type="button" onClick={() => (!isImagenModel && engine === 'internal') ? undefined : setIsNegativeFolded(!isNegativeFolded)} className="disabled:cursor-not-allowed" disabled={!isImagenModel && engine === 'internal'}>
                        {isNegativeFolded ? 'Show' : 'Hide'}
                    </button>
                </div>
                {!isNegativeFolded && (
                    <FormField label="" className="w-full">
                        <textarea
                            value={negativePrompt}
                            onChange={(e) => setNegativePrompt(e.target.value)}
                            placeholder="e.g., blurry, cartoon, watermark, extra limbs"
                            className={`${baseInputClasses} h-24 resize-y`}
                            disabled={!isImagenModel && engine === 'internal'}
                        />
                    </FormField>
                )}
            </div>
        </AccordionSection>

        <AccordionSection title="<b>2. Image Settings</b>" isOpen={openSections.has('image')} onToggle={() => toggleSection('image')}>
            <InputGroup>
                <FormField label="Number of Generations" className="flex-1 min-w-[120px]">
                    <select value={numImages} onChange={(e) => setNumImages(Number(e.target.value))} className={baseInputClasses}>
                        {numImagesOptions.map(opt => <option key={opt.label} value={opt.value}>{opt.label}</option>)}
                    </select>
                </FormField>
                <FormField label="Camera Angle" className="flex-[2] min-w-[150px]">
                    <select value={cameraAngle} onChange={(e) => setCameraAngle(e.target.value)} className={baseInputClasses}>
                        {cameraAngleOptions.map(opt => <option key={opt.label} value={opt.value}>{opt.label}</option>)}
                    </select>
                </FormField>
            </InputGroup>
            <FormField label="Image Dimensions" className="flex-1 min-w-[150px]" disabled={isImageMode || (!isImagenModel && engine === 'internal')}>
                <select value={selectedShape} onChange={handleShapeChange} className={baseInputClasses} disabled={isImageMode || (!isImagenModel && engine === 'internal')}>
                    {shapeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                {selectedShape === 'custom' && !isImageMode && isImagenModel && (
                    <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2">
                            <input type="text" value={customWidth} onChange={e => setCustomWidth(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Width" className={`${baseInputClasses} text-center`} />
                            <span className="text-neutral-400">x</span>
                            <input type="text" value={customHeight} onChange={e => setCustomHeight(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Height" className={`${baseInputClasses} text-center`} />
                        </div>
                        <button type="button" onClick={handleApplyCustomRatio} className="w-full bg-neutral-700 text-white text-sm py-1.5 hover:bg-neutral-600 transition">Apply Ratio</button>
                    </div>
                )}
                {ratioMessage && <p className="text-xs text-neutral-300 mt-2">{ratioMessage}</p>}
            </FormField>
            {isLetterboxSupportedShape && (
                <div className="flex items-center gap-3 p-2 bg-neutral-900/40">
                    <input
                        type="checkbox"
                        id="letterbox-checkbox"
                        checked={addLetterbox}
                        onChange={(e) => setAddLetterbox(e.target.checked)}
                        className="w-4 h-4 text-neutral-500 bg-neutral-800 border-neutral-700 focus:ring-neutral-500 focus:ring-offset-neutral-900"
                    />
                    <label htmlFor="letterbox-checkbox" className="text-sm font-semibold text-neutral-300 select-none cursor-pointer">
                        Add Cinematic Letterbox (2.39:1)
                    </label>
                </div>
            )}
        </AccordionSection>

        <AccordionSection title="<b>3. Advanced Settings</b>" isOpen={openSections.has('advanced')} onToggle={() => toggleSection('advanced')}>
            <FormField label="<b>Generation Engine</b>" className="w-full">
                <select value={engine} onChange={(e) => setEngine(e.target.value as Engine)} className={baseInputClasses}>
                    {engineOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
            </FormField>
            <div className={`${engine === 'external' ? 'opacity-50' : ''}`}>
                <FormField label="<b>Generation Model</b>" className="w-full" disabled={isInpaintingMode || isImageMode || engine === 'external'}>
                    <select value={model} onChange={handleModelChange} className={baseInputClasses} disabled={isInpaintingMode || isImageMode || engine === 'external'}>
                        {modelOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    {(isInpaintingMode || isImageMode) && <p className="text-xs text-neutral-300 mt-2">Imagen 4 is used for image editing.</p>}
                </FormField>
            </div>
             <InputGroup>
                <FormField label="Guidance Scale" className="flex-1 min-w-[120px]" disabled={!isImagenModel && engine === 'internal'}>
                    <select value={guidanceScale} onChange={(e) => setGuidanceScale(Number(e.target.value))} className={baseInputClasses} disabled={!isImagenModel && engine === 'internal'}>
                        {gScaleOptions.map(opt => <option key={opt.label} value={opt.value} selected={opt.value === 7}>{opt.label}</option>)}
                    </select>
                </FormField>
                <FormField label="Image Seed" className="flex-1 min-w-[120px]" disabled={!isImagenModel && engine === 'internal'}>
                    <div className="relative flex items-center">
                        <input
                            type="text"
                            value={seed}
                            onChange={(e) => setSeed(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="Random"
                            className={`${baseInputClasses} pr-28`}
                            disabled={!isImagenModel && engine === 'internal'}
                        />
                        <div className="absolute right-0 top-0 h-full flex items-center">
                            <button
                                type="button"
                                onClick={handleCopySeed}
                                className="h-full px-3 text-neutral-400 hover:text-white text-sm transition-colors disabled:cursor-not-allowed disabled:text-neutral-600 focus:outline-none w-[70px]"
                                disabled={!isImagenModel || !seed}
                                aria-label="Copy seed"
                            >
                                {copyButtonText}
                            </button>
                            <div className="h-2/3 border-l border-neutral-700"></div>
                            <button
                                type="button"
                                onClick={handleRandomSeed}
                                className="h-full px-3 text-neutral-400 hover:text-white transition-colors disabled:cursor-not-allowed disabled:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                                disabled={!isImagenModel && engine === 'internal'}
                                aria-label="Generate random seed"
                                title="Generate random seed"
                            >
                                <DiceIcon />
                            </button>
                        </div>
                    </div>
                </FormField>
            </InputGroup>
        </AccordionSection>
      </div>

      <button
        type="submit"
        disabled={isLoading || (!prompt.trim() && !isInpaintingMode && !(isImageMode && engine === 'external'))}
        className="w-full bg-neutral-700 text-white font-bold py-3 px-4 hover:bg-neutral-600 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-auto"
      >
        {isLoading ? 'Generating...' : 'Generate'}
      </button>
    </form>
  );
};
