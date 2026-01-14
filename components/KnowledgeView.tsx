
import React, { useState, useEffect, useRef } from 'react';
import { vectorDb } from '../services/vectorDbService';
import { chunkText, generateEmbeddingsForChunks } from '../services/embeddingService';
import { fetchModels, generateText } from '../services/geminiService';
import { Agent } from '../services/agentService';
import { UploadIcon } from './icons/UploadIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PhoneIcon, CheckIcon, DatabaseIcon, LoadingSpinner } from './icons.tsx';

interface KnowledgeViewProps {
    agents: Agent[];
    onUpdateAgent: (id: string, updates: Partial<Agent>) => void;
    onCallAgent?: (agent: Agent) => void;
}

type SyncStatus = 'idle' | 'syncing' | 'complete' | 'error';

export const KnowledgeView: React.FC<KnowledgeViewProps> = ({ agents, onUpdateAgent, onCallAgent }) => {
    const [selectedAgentId, setSelectedAgentId] = useState<string>(agents.length > 0 ? agents[0].id : '');
    const selectedAgent = agents.find(a => a.id === selectedAgentId) || agents[0];

    const [vectorCount, setVectorCount] = useState<number>(0);
    const [isIngesting, setIsIngesting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [sources, setSources] = useState<string[]>([]);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (selectedAgent) {
            refreshStats(selectedAgent.id);
        }
    }, [selectedAgent]);

    const refreshStats = async (agentId: string) => {
        try {
            const agentVectors = await vectorDb.getVectorsByAgent(agentId);
            setVectorCount(agentVectors.length);
            const uniqueSources = Array.from(new Set(agentVectors.map(v => v.source)));
            setSources(uniqueSources);
        } catch (e) {
            console.error("Failed to load vector stats", e);
        }
    };

    const handleIngest = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !selectedAgentId) return;
        
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;
        const files: File[] = Array.from(e.target.files);
        
        setIsIngesting(true);
        setProgress(0);
        setStatusMessage(`Ingesting memories for ${selectedAgent.name}...`);
        
        try {
            for (const file of files) {
                if (signal.aborted) break;
                const text = await file.text();
                const isLorepack = file.name.toLowerCase().includes('lorepack') || file.name.endsWith('.jsonl');

                if (isLorepack) {
                    // Optimized path for pre-embedded packs
                    let nodes = text.split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
                    const batch = nodes.map(n => ({ ...n, agentId: selectedAgentId }));
                    await vectorDb.addVectors(batch);
                } else {
                    const chunks = chunkText(text);
                    for (let i = 0; i < chunks.length; i++) {
                        if (signal.aborted) break;
                        const embedded = await generateEmbeddingsForChunks([chunks[i]]);
                        if (embedded.length > 0) {
                            await vectorDb.addVectors([{
                                id: crypto.randomUUID(),
                                text: embedded[0].text,
                                vector: embedded[0].vector,
                                source: file.name,
                                timestamp: Date.now(),
                                agentId: selectedAgentId
                            }]);
                        }
                        setProgress(((i + 1) / chunks.length) * 100);
                    }
                }
            }
            await refreshStats(selectedAgentId);
            setStatusMessage('Sync Complete');
            setTimeout(() => setIsIngesting(false), 2000);
        } catch (error) {
            setStatusMessage('Sync Error');
            setIsIngesting(false);
        }
    };

    const handleExport = async () => {
        const vectors = await vectorDb.getVectorsByAgent(selectedAgentId);
        if (vectors.length === 0) return alert("Memory Buffer Empty.");
        const blob = new Blob([vectors.map(v => JSON.stringify(v)).join('\n')], { type: 'application/jsonl' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `LOREPACK_${selectedAgent.name}_${Date.now()}.jsonl`;
        a.click();
    };

    return (
        <div className="flex flex-col h-full bg-primary overflow-hidden">
            <div className="p-8 pb-4 border-b border-accent bg-neutral-900/50">
                <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">LorePack Forge</h1>
                <p className="text-neutral-500 text-sm mb-6">Hydrate your agent's perspective with specialized COREPACKS or field LOREPACKS.</p>
                
                <div className="flex flex-col md:flex-row gap-6 mb-2">
                    {/* Agent Identity Selector */}
                    <div className="flex-1 space-y-2">
                        <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest px-1">Selected Entity</label>
                        <select 
                            value={selectedAgentId} 
                            onChange={(e) => setSelectedAgentId(e.target.value)}
                            className="w-full bg-black text-white font-bold border border-accent rounded-xl p-4 outline-none focus:border-blue-500 appearance-none shadow-inner"
                        >
                            {agents.map(a => <option key={a.id} value={a.id}>{a.name.toUpperCase()} — {a.narrativeRole || 'EXPERT'}</option>)}
                        </select>
                    </div>

                    {/* Stats Box */}
                    <div className="bg-blue-600/10 border border-blue-500/30 p-4 rounded-xl flex items-center gap-6 shadow-xl">
                        <div className="p-3 bg-blue-600/20 rounded-full">
                            <DatabaseIcon className="w-8 h-8 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-3xl font-black text-white leading-none">{vectorCount.toLocaleString()}</p>
                            <p className="text-[10px] uppercase text-blue-400 font-black tracking-widest mt-1">Active Experience Nodes</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto p-8 space-y-10 custom-scrollbar">
                {/* PERSPECTIVE SYNC SECTION */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h2 className="text-xs font-black text-neutral-500 uppercase tracking-[0.3em] mb-4">Ingestion Flow</h2>
                        <input type="file" ref={fileInputRef} multiple accept=".txt,.json,.jsonl,.md" className="hidden" onChange={handleIngest} />
                        
                        <div 
                            onClick={() => !isIngesting && fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all cursor-pointer group ${isIngesting ? 'bg-blue-600/5 border-blue-500' : 'bg-neutral-900/50 border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800'}`}
                        >
                            {isIngesting ? (
                                <div className="text-center">
                                    <LoadingSpinner className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                                    <p className="text-blue-400 font-black uppercase text-xs animate-pulse tracking-widest">{statusMessage}</p>
                                    <div className="w-48 h-1 bg-black rounded-full mt-4 overflow-hidden border border-blue-500/20 mx-auto">
                                        <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <UploadIcon className="w-12 h-12 text-neutral-600 group-hover:text-blue-500 mb-4 transition-colors" />
                                    <span className="font-black text-neutral-300 group-hover:text-white uppercase text-sm tracking-widest">Hydrate Mind</span>
                                    <p className="text-[10px] text-neutral-500 mt-2 uppercase font-bold text-center">Load .txt sources or .jsonl LorePacks</p>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-xs font-black text-neutral-500 uppercase tracking-[0.3em] mb-4">Lived Experience Sync</h2>
                        <div className="grid grid-cols-1 gap-3">
                            <button onClick={handleExport} className="w-full flex items-center justify-between p-4 bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 rounded-xl transition-all group">
                                <div className="text-left">
                                    <span className="block font-black text-white uppercase text-xs tracking-wider">Export LOREPACK</span>
                                    <span className="text-[10px] text-neutral-500 font-bold uppercase">Ready for Field Tablet / Laptop</span>
                                </div>
                                <span className="text-neutral-600 group-hover:text-white">↓</span>
                            </button>
                            
                            <button className="w-full flex items-center justify-between p-4 bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 rounded-xl transition-all group opacity-50 cursor-not-allowed">
                                <div className="text-left">
                                    <span className="block font-black text-white uppercase text-xs tracking-wider">Cloud Sync (G-Drive)</span>
                                    <span className="text-[10px] text-neutral-500 font-bold uppercase">Sync with NotebookLM Pro Cold Storage</span>
                                </div>
                                <span className="text-neutral-600 group-hover:text-blue-400">☁</span>
                            </button>

                            <button onClick={async () => { if(confirm("Vaporize entire memory vault for this agent?")) { await vectorDb.clearVectors(selectedAgentId); refreshStats(selectedAgentId); } }} className="w-full flex items-center justify-between p-4 bg-red-900/10 border border-red-500/20 hover:bg-red-900/30 rounded-xl transition-all group">
                                <div className="text-left">
                                    <span className="block font-black text-red-400 uppercase text-xs tracking-wider">Purge Memory Buffer</span>
                                    <span className="text-[10px] text-neutral-600 font-bold uppercase">Irreversible Vaporization</span>
                                </div>
                                <TrashIcon className="w-4 h-4 text-red-500" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* SOURCE REGISTRY */}
                <div className="bg-neutral-900/30 border border-accent rounded-2xl p-8 shadow-inner">
                    <h2 className="text-xs font-black text-neutral-500 uppercase tracking-[0.3em] mb-6">Source Registry</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sources.map(s => (
                            <div key={s} className="bg-black/40 border border-neutral-800 px-4 py-3 rounded-lg flex items-center justify-between group hover:border-blue-500/50 transition-colors">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                    <span className="text-xs font-bold text-neutral-300 truncate uppercase tracking-tighter">{s}</span>
                                </div>
                                <button className="text-neutral-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                            </div>
                        ))}
                        {sources.length === 0 && (
                            <div className="col-span-full py-10 text-center border border-dashed border-neutral-800 rounded-xl">
                                <p className="text-neutral-600 text-xs font-bold uppercase tracking-widest">No Lived Experience Registered</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
