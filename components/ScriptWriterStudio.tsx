
import React, { useState, useEffect, useRef } from 'react';
import { 
    EditIcon, 
    ScriptIcon, 
    DownloadIcon, 
    ShuffleIcon, 
    AutomationIcon, 
    ChevronDownIcon, 
    LoadingSpinner 
} from './icons.tsx';
import { DuplicateIcon } from './icons/DuplicateIcon';
import { WandIcon } from './icons/WandIcon';
import { BookmarkIcon } from './icons/BookmarkIcon';
import { runScribeAgent, runScribeOutlineAgent, ScribeOutlineOutput } from '../services/geminiService';
import { generateRandomConfig } from '../services/scribeRandomizer';
import { ScriptFile, ActiveView, PromptTemplate, DynamicPromptList } from '../types';
import { MythosData } from '../services/mythosData';

const cleanLiteralNewlines = (text: string): string => {
    if (!text) return '';
    return text.replace(/\\n/g, '\n');
};

const formatToWBStandard = (text: string): string => {
    const cleaned = cleanLiteralNewlines(text);
    return cleaned.split('\n').map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '';

        if (trimmed.startsWith('INT.') || trimmed.startsWith('EXT.')) {
            return ' '.repeat(15) + trimmed.toUpperCase();
        }

        if (trimmed === trimmed.toUpperCase() && trimmed.endsWith(':')) {
            return ' '.repeat(55) + trimmed;
        }

        if (trimmed === trimmed.toUpperCase() && trimmed.length < 30 && !trimmed.includes('.') && !trimmed.includes(':')) {
            return ' '.repeat(35) + trimmed;
        }
        
        if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
            return ' '.repeat(30) + trimmed;
        }

        if (trimmed !== trimmed.toUpperCase() && !trimmed.startsWith('(')) {
             return ' '.repeat(25) + trimmed;
        }

        return ' '.repeat(15) + trimmed;
    }).join('\n');
};

/**
 * A specialized textarea that automatically adjusts its height 
 * to fit the content exactly, avoiding scrollbars and empty space.
 */
const AutoExpandingTextarea: React.FC<{
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    className?: string;
}> = ({ value, onChange, placeholder, className }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            // Force browser to recalculate height to fit scrollable content exactly
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    };

    useEffect(() => {
        // Adjust whenever value changes (e.g. user typing or AI updating)
        adjustHeight();
    }, [value]);

    return (
        <textarea
            ref={textareaRef}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`resize-none overflow-hidden block w-full transition-all duration-200 ${className}`}
            rows={1}
        />
    );
};

interface ScriptWriterStudioProps {
    onSendToScriptsBin: (script: Omit<ScriptFile, 'id' | 'date'>) => void;
    onNavigate: (view: ActiveView) => void;
    promptTemplates: PromptTemplate[];
    dynamicPromptLists: DynamicPromptList[];
}

export const ScriptWriterStudio: React.FC<ScriptWriterStudioProps> = ({ 
    onSendToScriptsBin, 
    onNavigate,
    promptTemplates,
    dynamicPromptLists
}) => {
    const [isStandardsOpen, setIsStandardsOpen] = useState(true);
    const [isBlueprintOpen, setIsBlueprintOpen] = useState(true);

    // Studio & Rating Standards
    const [positiveConstraints, setPositiveConstraints] = useState('');
    const [negativeConstraints, setNegativeConstraints] = useState('');
    
    // Blueprint Inputs
    const [initialTitle, setInitialTitle] = useState('PROJ_ABSURDIST_784');
    const [genre, setGenre] = useState('EXPERIMENTAL');
    const [theme, setTheme] = useState('identity_crisis');
    const [setting, setSetting] = useState('Static TV Screen');
    const [tone, setTone] = useState('EXPERIMENTAL // ABSURDIST');
    const [cast, setCast] = useState('ROLE: PROTAGONIST\nARCHETYPE: The Hero\nNOTE: Must embody the traits of the ABSURDIST sub-genre.');
    const [beatSheet, setBeatSheet] = useState('## GENRE PROTOCOL: ABSURDIST\nCharacters experience situations suggesting no central purpose to life.\n\n## THEMATIC ANCHOR\n"Does the mask eventually become the face?"');
    
    // Outline Outputs
    const [workingTitle, setWorkingTitle] = useState('');
    const [logline, setLogline] = useState('');
    const [treatment, setTreatment] = useState('');
    const [fundamentalStoryQuestions, setFundamentalStoryQuestions] = useState<string[]>([]);

    // Generation States
    const [generatedOutline, setGeneratedOutline] = useState<ScribeOutlineOutput | null>(null);
    const [generatedScreenplay, setGeneratedScreenplay] = useState<string>('');
    const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
    const [isGeneratingScreenplay, setIsGeneratingScreenplay] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeOutputTab, setActiveOutputTab] = useState<'outline' | 'screenplay'>('outline');
    const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

    const genresData = MythosData.genres;

    useEffect(() => {
        if (!genre && Object.keys(genresData).length > 0) {
            setGenre(Object.keys(genresData)[0]);
        }
    }, [genre, genresData]);

    const showCopyFeedback = (msg: string) => {
        setCopyFeedback(msg);
        setTimeout(() => setCopyFeedback(null), 2000);
    };

    const handleApplyStudioStandard = (templateId: string) => {
        const template = promptTemplates.find(t => t.id === templateId);
        if (template) {
            setPositiveConstraints(template.positivePrompt);
            setNegativeConstraints(template.negativePrompt);
            showCopyFeedback(`${template.name} Protocol Active`);
        }
    };

    const handleRandomize = async () => {
        try {
            setError(null);
            setGeneratedScreenplay('');
            setGeneratedOutline(null);
            
            const config = await generateRandomConfig();
            setInitialTitle(config.title);
            setGenre(config.genre);
            setTheme(config.theme);
            setSetting(config.setting);
            setTone(config.tone);
            setCast(config.cast);
            setBeatSheet(config.beatSheet);
            setWorkingTitle(config.workingTitle);
            setLogline(config.logline);
            setTreatment(config.treatment);
            setFundamentalStoryQuestions(config.fundamentalStoryQuestions.split('\n'));
            showCopyFeedback("Lattice Re-Rolled");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to randomize configuration.");
        }
    };

    const handleExecuteOutlineProtocol = async () => {
        if (!initialTitle.trim() || !genre.trim() || !theme.trim() || !beatSheet.trim() || !cast.trim()) {
            setError("Title, Genre, Theme, Cast, and Beats are required.");
            return;
        }
        setIsGeneratingOutline(true);
        setError(null);
        try {
            const result = await runScribeOutlineAgent({ 
                title: initialTitle, 
                genre, 
                theme, 
                setting, 
                tone, 
                cast, 
                beatSheet,
                positiveConstraints: positiveConstraints.trim() || undefined,
                negativeConstraints: negativeConstraints.trim() || undefined,
                dynamicLists: dynamicPromptLists
            });
            setGeneratedOutline(result);
            setWorkingTitle(result.workingTitle);
            setLogline(result.logline);
            setTreatment(result.treatment);
            setFundamentalStoryQuestions(result.fundamentalStoryQuestions);
            setActiveOutputTab('outline');
            setTimeout(() => {
                document.getElementById('outline-results-view')?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Outline generation failed.");
        } finally {
            setIsGeneratingOutline(false);
        }
    };

    const handleGenerateScreenplay = async () => {
        if (!workingTitle.trim() || !isOutlineReady) {
            setError("Please execute Outline Protocol first.");
            return;
        }
        setIsGeneratingScreenplay(true);
        setError(null);
        try {
            const result = await runScribeAgent({ 
                workingTitle, 
                genre, 
                theme, 
                setting, 
                tone, 
                cast, 
                beatSheet, 
                logline, 
                treatment, 
                fundamentalStoryQuestions: fundamentalStoryQuestions.join('\n'), 
                archetypalCharacters: generatedOutline?.archetypalCharacters.join('\n') || '', 
                sceneGenerationQuestions: generatedOutline?.sceneGenerationQuestions.join('\n') || '',
                positiveConstraints: positiveConstraints.trim() || undefined,
                negativeConstraints: negativeConstraints.trim() || undefined,
                dynamicLists: dynamicPromptLists
            });
            setGeneratedScreenplay(result);
            setActiveOutputTab('screenplay');
            setTimeout(() => {
                document.getElementById('production-report-section')?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Screenplay generation failed.");
        } finally {
            setIsGeneratingScreenplay(false);
        }
    };

    const handleCopyContent = () => {
        let content = '';
        if (activeOutputTab === 'outline' && generatedOutline) {
            content = `TITLE: ${generatedOutline.workingTitle}\nLOGLINE: ${generatedOutline.logline}\n\nTREATMENT:\n${generatedOutline.treatment}\n\nQUESTIONS:\n${generatedOutline.fundamentalStoryQuestions.join('\n')}`;
        } else if (activeOutputTab === 'screenplay' && generatedScreenplay) {
            content = formatToWBStandard(generatedScreenplay);
        }
        navigator.clipboard.writeText(cleanLiteralNewlines(content));
        showCopyFeedback("Copied to Clipboard");
    };

    const handleDownload = () => {
        let content = '';
        let filename = '';
        if (activeOutputTab === 'outline' && generatedOutline) {
            content = `OUTLINE: ${generatedOutline.workingTitle}\n\nLOGLINE: ${generatedOutline.logline}\n\nTREATMENT:\n${generatedOutline.treatment}\n\nQUESTIONS:\n${generatedOutline.fundamentalStoryQuestions.join('\n')}`;
            filename = `${generatedOutline.workingTitle.replace(/ /g, '_')}_Outline.txt`;
        } else if (activeOutputTab === 'screenplay' && generatedScreenplay) {
            content = formatToWBStandard(generatedScreenplay);
            filename = `${workingTitle.replace(/ /g, '_')}_Draft.txt`;
        }
        const blob = new Blob([cleanLiteralNewlines(content)], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleCopyBlueprint = () => {
        const content = `TITLE: ${initialTitle}\nGENRE: ${genre}\nTHEME: ${theme}\nSETTING: ${setting}\n\nCAST:\n${cast}\n\nBEAT SHEET:\n${beatSheet}`;
        navigator.clipboard.writeText(content);
        showCopyFeedback("Blueprint Copied");
    };

    const handleSendToBin = () => {
        if (!generatedScreenplay) return;
        onSendToScriptsBin({
            title: workingTitle || initialTitle,
            content: formatToWBStandard(generatedScreenplay),
            type: 'screenplay'
        });
        showCopyFeedback("Sent to Scripts Bin");
    };

    const isOutlineReady = workingTitle.trim() && logline.trim() && treatment.trim() && fundamentalStoryQuestions.length > 0;

    return (
        <div className="flex flex-col h-full bg-primary overflow-hidden">
            {/* Header - Stays at top */}
            <div className="flex-shrink-0 flex justify-between items-center h-16 px-6 border-b border-neutral-800 bg-neutral-900/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand/20 rounded-lg text-brand">
                        <EditIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Script Writer Studio</h2>
                        <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest leading-none">MythOS Scribe / Version 4.2</p>
                    </div>
                </div>
                {copyFeedback && (
                    <div className="bg-green-600/20 text-green-400 px-4 py-1.5 rounded-full text-xs font-black border border-green-500/30 animate-fade-in shadow-xl">
                        {copyFeedback}
                    </div>
                )}
            </div>

            {/* Main Scrollable Workflow Container */}
            <div className="flex-grow overflow-y-auto custom-scrollbar p-6 space-y-8 pb-40">
                
                {/* STEP 1: STUDIO PROTOCOL & RATING STANDARDS */}
                <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden shadow-2xl">
                    <button 
                        onClick={() => setIsStandardsOpen(!isStandardsOpen)}
                        className="w-full flex items-center justify-between px-6 py-4 bg-brand/5 hover:bg-brand/10 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <BookmarkIcon className="w-5 h-5 text-brand" />
                            <h3 className="text-sm font-black text-white uppercase tracking-[0.25em]">STEP 1: STUDIO PROTOCOL & RATING STANDARDS</h3>
                        </div>
                        <ChevronDownIcon className={`w-6 h-6 text-brand transition-transform duration-300 ${isStandardsOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {isStandardsOpen && (
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 bg-black/40 border-t border-neutral-800 animate-fade-in">
                            <div className="md:col-span-2">
                                <label className="text-[10px] font-black text-neutral-500 uppercase mb-2 block tracking-widest">Apply Global Production Standard</label>
                                <div className="relative">
                                    <select 
                                        onChange={(e) => handleApplyStudioStandard(e.target.value)}
                                        className="w-full bg-neutral-800 border border-neutral-700 p-3.5 rounded-lg text-sm text-brand font-black outline-none focus:ring-2 focus:ring-brand appearance-none pr-10 cursor-pointer shadow-inner hover:bg-neutral-700/50 transition-colors"
                                        defaultValue=""
                                    >
                                        <option value="" disabled>Select Studio Standard (e.g. Rated R, PG-13)...</option>
                                        {promptTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                    <ChevronDownIcon className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500" />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-green-500 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                    Positive Constraints (Must Include)
                                </label>
                                <textarea 
                                    value={positiveConstraints} 
                                    onChange={(e) => setPositiveConstraints(e.target.value)}
                                    placeholder="Force specific elements, styles, or requirements..."
                                    className="w-full h-32 bg-neutral-800/30 border border-neutral-700 rounded-lg text-sm text-neutral-100 focus:ring-2 focus:ring-brand outline-none resize-none font-mono placeholder-neutral-600 transition-all hover:bg-neutral-800 shadow-inner"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                                    Negative Constraints (Forbidden)
                                </label>
                                <textarea 
                                    value={negativeConstraints} 
                                    onChange={(e) => setNegativeConstraints(e.target.value)}
                                    placeholder="Explicitly exclude themes, actions, or styles..."
                                    className="w-full h-32 bg-neutral-800/30 border border-neutral-700 rounded-lg text-sm text-neutral-100 focus:ring-2 focus:ring-brand outline-none resize-none font-mono placeholder-neutral-600 transition-all hover:bg-neutral-800 shadow-inner"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* STEP 2: PRODUCTION BLUEPRINT - COLLAPSIBLE */}
                <div className="bg-secondary/10 rounded-xl border border-neutral-800 shadow-2xl overflow-hidden ring-1 ring-white/5">
                    <button 
                        onClick={() => setIsBlueprintOpen(!isBlueprintOpen)}
                        className="w-full flex items-center justify-between px-6 py-4 bg-neutral-800/30 hover:bg-neutral-800/50 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <ScriptIcon className="w-6 h-6 text-blue-400" />
                            <h3 className="text-sm font-black text-white uppercase tracking-[0.25em]">STEP 2: PRODUCTION BLUEPRINT</h3>
                        </div>
                        <div className="flex items-center gap-4">
                             <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                <button onClick={handleCopyBlueprint} className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 transition-all rounded-lg flex items-center gap-2 border border-neutral-700 shadow-sm font-black uppercase text-[9px] tracking-widest active:scale-95" title="Copy Blueprint Data">
                                    <DuplicateIcon className="w-3.5 h-3.5" />
                                    <span>Lattice</span>
                                </button>
                                <button onClick={handleRandomize} className="px-3 py-1.5 bg-brand/10 hover:bg-brand text-brand hover:text-white transition-all rounded-lg flex items-center gap-2 border border-brand/20 shadow-sm font-black uppercase text-[9px] tracking-widest active:scale-95 group" title="Re-Roll Configuration">
                                    <ShuffleIcon className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
                                    <span>Re-Roll</span>
                                </button>
                            </div>
                            <ChevronDownIcon className={`w-6 h-6 text-blue-400 transition-transform duration-300 ${isBlueprintOpen ? 'rotate-180' : ''}`} />
                        </div>
                    </button>

                    {isBlueprintOpen && (
                        <div className="p-8 space-y-10 animate-fade-in border-t border-neutral-800">
                            {/* Meta Config Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-neutral-500 uppercase tracking-widest block pl-1">Project Title</label>
                                    <input type="text" value={initialTitle} onChange={(e) => setInitialTitle(e.target.value)} className="w-full bg-black border border-neutral-700 p-4 rounded-lg text-base text-white focus:ring-2 focus:ring-brand outline-none font-black tracking-tight shadow-inner" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-neutral-500 uppercase tracking-widest block pl-1">Genre Lattice</label>
                                    <select value={genre} onChange={(e) => setGenre(e.target.value)} className="w-full bg-black border border-neutral-700 p-4 rounded-lg text-base text-white focus:ring-2 focus:ring-brand outline-none cursor-pointer font-bold shadow-inner">
                                        {Object.keys(genresData).length > 0 ? Object.keys(genresData).map(g => (
                                            <option key={g} value={g}>{g.replace(/_/g, ' ').toUpperCase()}</option>
                                        )) : <option>Loading...</option>}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-neutral-500 uppercase tracking-widest block pl-1">Philosophical Core</label>
                                    <input type="text" value={theme} onChange={(e) => setTheme(e.target.value)} className="w-full bg-black border border-neutral-700 p-4 rounded-lg text-base text-white focus:ring-2 focus:ring-brand outline-none font-bold shadow-inner" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-neutral-500 uppercase tracking-widest block pl-1">Primary Setting</label>
                                    <input type="text" value={setting} onChange={(e) => setSetting(e.target.value)} className="w-full bg-black border border-neutral-700 p-4 rounded-lg text-base text-white focus:ring-2 focus:ring-brand outline-none font-bold shadow-inner" />
                                </div>
                            </div>

                            {/* Large Text Workspace */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-neutral-400 uppercase tracking-[0.25em] flex items-center gap-2 pl-1">
                                        Character Manifest <span className="text-neutral-600 font-normal tracking-normal">(Dramatis Personae)</span>
                                    </label>
                                    <textarea value={cast} onChange={(e) => setCast(e.target.value)} className="w-full h-64 bg-black border border-neutral-700 p-6 rounded-xl text-sm text-neutral-300 focus:ring-2 focus:ring-brand outline-none resize-none font-mono leading-relaxed shadow-inner" />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-neutral-400 uppercase tracking-[0.25em] flex items-center gap-2 pl-1">
                                        Production Beats <span className="text-neutral-600 font-normal tracking-normal">(The Story Lattice)</span>
                                    </label>
                                    <textarea value={beatSheet} onChange={(e) => setBeatSheet(e.target.value)} className="w-full h-64 bg-black border border-neutral-700 p-6 rounded-xl text-sm text-neutral-300 focus:ring-2 focus:ring-brand outline-none resize-none font-mono leading-relaxed shadow-inner" />
                                </div>
                            </div>

                            {/* Execution Trigger */}
                            <div className="pt-8 flex flex-col md:flex-row gap-6 items-center justify-center border-t border-neutral-800">
                                <button 
                                    onClick={handleExecuteOutlineProtocol} 
                                    disabled={isGeneratingOutline} 
                                    className="w-full md:w-auto px-16 py-6 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-xs tracking-[0.5em] rounded-xl transition-all flex items-center justify-center gap-4 shadow-2xl shadow-blue-900/40 active:scale-95 disabled:opacity-50"
                                >
                                    {isGeneratingOutline ? <LoadingSpinner className="w-6 h-6 text-white" /> : <><WandIcon className="w-6 h-6" /> Execute Outline Protocol</>}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* STEP 3: AI SYNTHESIZED OUTLINE (Intermediary - Fluid Single Column with Flex-Height Containers) */}
                {(generatedOutline || isGeneratingOutline) && (
                    <div id="outline-results-view" className="bg-neutral-900 border border-neutral-700 rounded-xl p-8 shadow-2xl space-y-8 animate-fade-in ring-1 ring-white/5">
                        <div className="flex items-center gap-4 border-b border-neutral-800 pb-6">
                            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                            <h3 className="text-xs font-black text-white uppercase tracking-[0.4em]">STEP 3: AI SYNTHESIZED OUTLINE</h3>
                        </div>
                        
                        {isGeneratingOutline ? (
                            <div className="py-24 flex flex-col items-center justify-center gap-6 text-neutral-500">
                                <LoadingSpinner className="w-12 h-12" />
                                <p className="font-black uppercase tracking-[0.6em] text-xs animate-pulse">Calculating Story Dynamics...</p>
                            </div>
                        ) : (
                            <div className="space-y-8 flex flex-col items-stretch">
                                {/* Working Title - Dedicated Input */}
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-neutral-500 uppercase tracking-widest pl-1">Working Title</label>
                                    <input 
                                        type="text" 
                                        value={workingTitle} 
                                        onChange={(e) => setWorkingTitle(e.target.value)} 
                                        className="w-full bg-black border border-neutral-800 p-5 rounded-lg text-2xl text-blue-400 font-black shadow-inner outline-none focus:ring-1 focus:ring-brand" 
                                    />
                                </div>

                                {/* Story Logline - Flex Container (Auto-Expanding Height) */}
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-neutral-500 uppercase tracking-widest pl-1">Story Logline</label>
                                    <AutoExpandingTextarea 
                                        value={logline} 
                                        onChange={(e) => setLogline(e.target.value)} 
                                        className="bg-black border border-neutral-800 p-5 rounded-lg text-base text-neutral-200 italic shadow-inner outline-none focus:ring-1 focus:ring-brand leading-relaxed font-sans" 
                                        placeholder="Generating Logline..."
                                    />
                                </div>
                                
                                {/* Narrative Treatment - Flex Container (Auto-Expanding Height) */}
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-neutral-500 uppercase tracking-widest pl-1">Narrative Treatment (AI Draft)</label>
                                    <AutoExpandingTextarea 
                                        value={treatment} 
                                        onChange={(e) => setTreatment(e.target.value)} 
                                        className="bg-black border border-neutral-800 p-6 rounded-lg text-sm text-neutral-400 leading-relaxed shadow-inner outline-none focus:ring-1 focus:ring-brand font-mono" 
                                        placeholder="Generating Narrative Treatment..."
                                    />
                                </div>

                                <div className="pt-8 flex justify-center border-t border-neutral-800">
                                    <button 
                                        onClick={handleGenerateScreenplay} 
                                        disabled={isGeneratingScreenplay || !isOutlineReady} 
                                        className="w-full md:w-auto px-20 py-6 bg-brand hover:bg-brand-hover text-white font-black uppercase text-xs tracking-[0.5em] rounded-xl transition-all flex items-center justify-center gap-4 shadow-2xl shadow-brand/40 active:scale-95 disabled:opacity-50"
                                    >
                                        {isGeneratingScreenplay ? <LoadingSpinner className="w-6 h-6 text-white" /> : <><ScriptIcon className="w-6 h-6" /> Generate Full First Draft</>}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 4: FINAL PRODUCTION REPORT */}
                <div id="production-report-section" className="flex flex-col bg-secondary/20 rounded-xl border border-neutral-800 shadow-2xl overflow-hidden min-h-[800px] ring-1 ring-white/5">
                    <div className="px-10 py-6 border-b border-neutral-800 bg-neutral-900/60 backdrop-blur-md flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-3.5 h-3.5 rounded-full ${generatedScreenplay ? 'bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-neutral-800'}`}></div>
                            <h3 className="text-sm font-black text-white uppercase tracking-[0.4em]">STEP 4: FINAL PRODUCTION REPORT</h3>
                        </div>
                        <div className="flex gap-5">
                            <button onClick={handleCopyContent} disabled={!generatedOutline && !generatedScreenplay} className="text-[11px] font-black text-neutral-400 hover:text-white px-5 py-2.5 border border-neutral-800 hover:border-neutral-600 rounded-lg uppercase tracking-widest transition-all active:scale-95">Copy Content</button>
                            <button onClick={handleDownload} disabled={!generatedOutline && !generatedScreenplay} className="text-[11px] font-black text-brand hover:text-brand-hover px-5 py-2.5 flex items-center gap-2 border border-brand/20 hover:border-brand/50 rounded-lg transition-all uppercase tracking-widest active:scale-95"><DownloadIcon className="w-4 h-4" /> Export .txt</button>
                            {activeOutputTab === 'screenplay' && generatedScreenplay && (
                                <button onClick={handleSendToBin} className="text-[11px] font-black text-emerald-400 hover:text-emerald-300 px-5 py-2.5 bg-emerald-900/20 border border-emerald-900/50 rounded-lg uppercase tracking-widest transition-all hover:bg-emerald-900/30 active:scale-95">Send to Bin</button>
                            )}
                        </div>
                    </div>
                    
                    <div className="p-2.5 bg-black/50 border-b border-neutral-800 flex gap-2.5">
                        <button onClick={() => setActiveOutputTab('outline')} className={`flex-1 py-5 text-[11px] font-black uppercase tracking-[0.3em] rounded-lg transition-all ${activeOutputTab === 'outline' ? 'bg-neutral-800 text-white shadow-xl ring-1 ring-white/10' : 'text-neutral-500 hover:text-neutral-300'}`}>Outline Analysis</button>
                        <button onClick={() => setActiveOutputTab('screenplay')} className={`flex-1 py-5 text-[11px] font-black uppercase tracking-[0.3em] rounded-lg transition-all ${activeOutputTab === 'screenplay' ? 'bg-neutral-800 text-white shadow-xl ring-1 ring-white/10' : 'text-neutral-500 hover:text-neutral-300'}`}>First Draft</button>
                    </div>

                    <div className="flex-grow bg-black/60 p-16 font-mono text-sm leading-loose whitespace-pre-wrap break-words overflow-y-auto">
                        {activeOutputTab === 'outline' ? (
                            generatedOutline ? (
                                <div className="text-neutral-300 animate-fade-in space-y-16 max-w-5xl mx-auto">
                                    <div className="text-center border-b border-neutral-800 pb-12">
                                        <h3 className="text-5xl font-black text-blue-400 mb-4 tracking-tighter">{cleanLiteralNewlines(generatedOutline.workingTitle).toUpperCase()}</h3>
                                        <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-[0.8em]">Technical Story Matrix / Final Review</p>
                                    </div>
                                    {/* Forced Single Column for maximum readability */}
                                    <div className="flex flex-col gap-16">
                                        <div className="space-y-12">
                                            <div>
                                                <label className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.5em] block mb-6 border-l-4 border-blue-500 pl-4">Logline Premise</label>
                                                <p className="text-xl italic leading-relaxed font-serif text-neutral-100">"{cleanLiteralNewlines(generatedOutline.logline)}"</p>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.5em] block mb-6 border-l-4 border-blue-500 pl-4">Treatment Breakdown</label>
                                                <p className="leading-loose text-neutral-400 text-base">{cleanLiteralNewlines(generatedOutline.treatment)}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-12">
                                            <div>
                                                <label className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.5em] block mb-6 border-l-4 border-blue-500 pl-4">Archetypal Characters</label>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {generatedOutline.archetypalCharacters.map((char, i) => (
                                                        <div key={i} className="flex gap-5 p-5 bg-neutral-900/50 border border-neutral-800 rounded-xl hover:border-blue-500/30 transition-colors">
                                                            <span className="text-blue-600 font-black text-lg">0{i+1}</span>
                                                            <p className="text-neutral-400 text-sm leading-relaxed">{cleanLiteralNewlines(char)}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.5em] block mb-6 border-l-4 border-blue-500 pl-4">Fundamental Story Questions</label>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {generatedOutline.fundamentalStoryQuestions.map((q, i) => (
                                                        <div key={i} className="flex gap-5 p-5 bg-neutral-900/50 border border-neutral-800 rounded-xl hover:border-blue-500/30 transition-colors">
                                                            <span className="text-blue-600 font-black text-lg">?</span>
                                                            <p className="text-neutral-400 text-sm leading-relaxed">{cleanLiteralNewlines(q)}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-neutral-700 italic gap-8 opacity-30">
                                    <AutomationIcon className="w-24 h-24" />
                                    <span className="uppercase tracking-[1em] text-xs font-black">Awaiting Synthesis Sequence...</span>
                                </div>
                            )
                        ) : (
                            generatedScreenplay ? (
                                <div className="text-white animate-fade-in max-w-4xl mx-auto" style={{ fontFamily: 'Courier, "Courier New", monospace' }}>
                                    <div className="mb-28 text-center opacity-30 text-[11px] font-black border-y border-white/10 py-8 tracking-[1.5em]">--- SCRIBE FIRST DRAFT ---</div>
                                    <div className="px-12 text-base">
                                        {formatToWBStandard(generatedScreenplay)}
                                    </div>
                                    <div className="mt-56 text-center opacity-30 text-[11px] tracking-[1em] font-black">FADE OUT.</div>
                                </div>
                            ) : (
                                <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-neutral-700 italic gap-8 opacity-30">
                                    <ScriptIcon className="w-24 h-24" />
                                    <span className="uppercase tracking-[1em] text-xs font-black">Awaiting Draft Compilation...</span>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>

            {/* Float Errors */}
            {error && (
                <div className="fixed bottom-10 right-10 p-6 bg-red-900/90 border-2 border-red-500 text-white rounded-xl text-xs font-black tracking-[0.2em] shadow-[0_0_40px_rgba(239,68,68,0.4)] backdrop-blur-2xl animate-slide-in-up z-[200]">
                    {error}
                </div>
            )}
            
            <style>{`
                @keyframes slide-in-up {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-slide-in-up { animation: slide-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
            `}</style>
        </div>
    );
};
