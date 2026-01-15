import React, { useState, useEffect, useRef } from 'react';
import { vectorDb, VectorRecord } from '../services/vectorDbService';
import { chunkText, generateEmbeddingsForChunks } from '../services/embeddingService';
import { Agent } from '../services/agentService';
import { UploadIcon } from './icons/UploadIcon';
import { TrashIcon } from './icons/TrashIcon';
import { DatabaseIcon, LoadingSpinner, PlusIcon } from './icons.tsx'; 
import { lorepackService } from '../services/lorepack';
import { GraphNode, GraphEdge } from '../types.ts';

interface KnowledgeViewProps {
    agents: Agent[];
    onUpdateAgent: (id: string, updates: Partial<Agent>) => void;
    onCallAgent?: (agent: Agent) => void;
}

type StudioTab = 'overview' | 'vectors' | 'graph' | 'forge';

export const KnowledgeView: React.FC<KnowledgeViewProps> = ({ agents }) => {
    const [selectedAgentId, setSelectedAgentId] = useState<string>(agents.length > 0 ? agents[0].id : '');
    const selectedAgent = agents.find(a => a.id === selectedAgentId) || agents[0];
    const [activeTab, setActiveTab] = useState<StudioTab>('overview');

    // Stats / Data
    const [vectorCount, setVectorCount] = useState<number>(0);
    const [graphNodeCount, setGraphNodeCount] = useState<number>(0);
    const [graphEdgeCount, setGraphEdgeCount] = useState<number>(0);
    const [vectors, setVectors] = useState<VectorRecord[]>([]);
    const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
    const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
    const [sources, setSources] = useState<string[]>([]);

    // Operation State
    const [isIngesting, setIsIngesting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    
    // Forge State
    const [newNodeLabel, setNewNodeLabel] = useState('');
    const [newNodeDesc, setNewNodeDesc] = useState('');
    const [newEdgeSource, setNewEdgeSource] = useState('');
    const [newEdgeTarget, setNewEdgeTarget] = useState('');
    const [newEdgeLabel, setNewEdgeLabel] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (selectedAgentId) {
            refreshData(selectedAgentId);
        }
    }, [selectedAgentId]);

    const refreshData = async (agentId: string) => {
        try {
            const v = await vectorDb.getVectorsByAgent(agentId);
            const n = await vectorDb.getGraphNodesByAgent(agentId);
            const e = await vectorDb.getGraphEdgesByAgent(agentId);

            setVectors(v);
            setGraphNodes(n);
            setGraphEdges(e);
            
            setVectorCount(v.length);
            setGraphNodeCount(n.length);
            setGraphEdgeCount(e.length);

            const uniqueSources = Array.from(new Set(v.map(item => item.source)));
            setSources(uniqueSources);
        } catch (e) {
            console.error("Failed to load LorePack data", e);
        }
    };

    const handleIngest = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !selectedAgentId) return;
        
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;
        const files: File[] = Array.from(e.target.files);
        
        setIsIngesting(true);
        setProgress(0);
        setStatusMessage(`Initializing Factory for ${selectedAgent.name}...`);
        
        try {
            for (const file of files) {
                if (signal.aborted) break;
                
                if (file.name.endsWith('.gz')) {
                    setStatusMessage(`Unpacking LOREPACK GZIP: ${file.name}...`);
                    await lorepackService.importGzip(file, selectedAgentId, (p) => setProgress(p));
                    continue;
                }

                const text = await file.text();
                // Check if it's a JSON/JSONL Lorepack
                const isJson = file.name.toLowerCase().endsWith('.json');
                const isJsonl = file.name.toLowerCase().endsWith('.jsonl');
                
                if (isJson || isJsonl) {
                    setStatusMessage(`Parsing LOREPACK Structure: ${file.name}...`);
                    // Attempt to parse as LorePack first
                    try {
                        await lorepackService.importContent(text, selectedAgentId, (p) => setProgress(p));
                        continue; // Success, move to next file
                    } catch (err) {
                        console.warn("File was not a valid LorePack structure, attempting raw text embedding...", err);
                        // Fallthrough to raw text embedding if LorePack parse fails
                    }
                }

                // Fallback: Raw Text Embedding
                setStatusMessage(`Embedding Raw Text: ${file.name}...`);
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
                            agentId: selectedAgentId,
                            agent: selectedAgentId
                        }]);
                    }
                    setProgress(((i + 1) / chunks.length) * 100);
                }
            }
            await refreshData(selectedAgentId);
            setStatusMessage('LorePack Integration Complete');
            setTimeout(() => setIsIngesting(false), 2000);
        } catch (error: any) {
            console.error(error);
            setStatusMessage(`Critical Error: ${error.message}`);
            // Keep error visible for a bit
            setTimeout(() => setIsIngesting(false), 5000);
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleExport = async () => {
        if (vectors.length === 0 && graphNodes.length === 0) return alert("Memory Buffer Empty.");
        
        const payload = {
            schema: "MYTHOS.LOREPACK.v1",
            agentId: selectedAgentId,
            timestamp: Date.now(),
            sacred_archive: vectors,
            graph: {
                nodes: graphNodes,
                edges: graphEdges
            }
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `LOREPACK_${selectedAgent.name.replace(/\s+/g, '_')}_${Date.now()}.json`;
        a.click();
    };

    const handleAddNode = async () => {
        if (!newNodeLabel.trim()) return;
        const nodeId = crypto.randomUUID();
        const node: GraphNode = {
            id: nodeId,
            label: newNodeLabel,
            description: newNodeDesc,
            agentId: selectedAgentId,
            name: newNodeLabel // Ensure name matches label for simple display
        };
        await vectorDb.addGraphNodes([node]);
        setNewNodeLabel('');
        setNewNodeDesc('');
        await refreshData(selectedAgentId);
    };

    const handleAddEdge = async () => {
        if (!newEdgeSource || !newEdgeTarget || !newEdgeLabel.trim()) return;
        const edge: GraphEdge = {
            source: newEdgeSource,
            target: newEdgeTarget,
            label: newEdgeLabel,
            agentId: selectedAgentId
        };
        await vectorDb.addGraphEdges([edge]);
        setNewEdgeLabel('');
        await refreshData(selectedAgentId);
    };

    const handlePurge = async () => {
        if(confirm("DANGER: Vaporize entire memory vault and graph for this agent? This cannot be undone.")) { 
            await vectorDb.clearVectors(selectedAgentId); 
            await vectorDb.deleteGraphForAgent(selectedAgentId); 
            await refreshData(selectedAgentId);
        }
    };

    return (
        <div className="flex flex-col h-full bg-primary overflow-hidden">
            {/* STUDIO HEADER */}
            <div className="flex-shrink-0 p-6 border-b border-accent bg-neutral-900/90 backdrop-blur-md z-10">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                            <DatabaseIcon className="w-8 h-8 text-blue-500" />
                            LorePack Studio & Factory
                        </h1>
                        <p className="text-neutral-500 text-xs font-mono mt-1">
                            VECTOR ARCHIVE & GRAPH FACTORY • {selectedAgent.name.toUpperCase()}
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <select 
                            value={selectedAgentId} 
                            onChange={(e) => setSelectedAgentId(e.target.value)}
                            className="bg-black text-white font-bold border border-accent rounded-lg px-4 py-2 outline-none text-sm hover:border-blue-500 transition-colors"
                        >
                            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                        <button onClick={handleExport} className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors border border-neutral-700">
                            Export LorePack
                        </button>
                    </div>
                </div>

                {/* TABS */}
                <div className="flex gap-1 bg-black/40 p-1 rounded-xl border border-neutral-800 w-fit">
                    {[
                        { id: 'overview', label: 'Factory Dashboard' },
                        { id: 'vectors', label: 'Sacred Archive' },
                        { id: 'graph', label: 'Neural Graph' },
                        { id: 'forge', label: 'Graph Forge' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as StudioTab)}
                            className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                                activeTab === tab.id 
                                    ? 'bg-blue-600 text-white shadow-lg' 
                                    : 'text-neutral-500 hover:text-white hover:bg-neutral-800'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className="flex-grow overflow-y-auto p-8 custom-scrollbar bg-[url('https://transparenttextures.com/patterns/cubes.png')] bg-fixed">
                
                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div className="space-y-8 max-w-5xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center group hover:border-blue-500/50 transition-all">
                                <span className="text-4xl font-black text-white mb-2">{vectorCount}</span>
                                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Vector Embeddings</span>
                            </div>
                            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center group hover:border-green-500/50 transition-all">
                                <span className="text-4xl font-black text-white mb-2">{graphNodeCount}</span>
                                <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest">Knowledge Nodes</span>
                            </div>
                            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center group hover:border-purple-500/50 transition-all">
                                <span className="text-4xl font-black text-white mb-2">{graphEdgeCount}</span>
                                <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">Synaptic Edges</span>
                            </div>
                        </div>

                        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-8 backdrop-blur-md">
                            <h2 className="text-sm font-black text-white uppercase tracking-widest mb-6 border-b border-neutral-800 pb-4">LorePack Ingestion Engine</h2>
                            <input type="file" ref={fileInputRef} multiple accept=".txt,.json,.jsonl,.md,.gz" className="hidden" onChange={handleIngest} />
                            
                            <div 
                                onClick={() => !isIngesting && fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center transition-all cursor-pointer group ${
                                    isIngesting ? 'bg-blue-900/10 border-blue-500' : 'bg-black/20 border-neutral-700 hover:border-blue-500 hover:bg-neutral-800'
                                }`}
                            >
                                {isIngesting ? (
                                    <div className="text-center w-full max-w-md">
                                        <LoadingSpinner className="w-10 h-10 text-blue-500 mx-auto mb-4" />
                                        <p className="text-blue-400 font-bold uppercase text-xs animate-pulse tracking-widest mb-4">{statusMessage}</p>
                                        <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <UploadIcon className="w-10 h-10 text-neutral-500 group-hover:text-blue-400 mb-4 transition-colors" />
                                        <span className="font-bold text-neutral-300 group-hover:text-white uppercase text-sm tracking-widest">Click to Hydrate Knowledge</span>
                                        <p className="text-[10px] text-neutral-500 mt-2 uppercase font-bold">Supported: JSONL, TXT, LOREPACK.GZ</p>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button onClick={handlePurge} className="flex items-center gap-2 text-xs font-bold text-red-500 hover:text-red-400 uppercase tracking-widest px-4 py-2 hover:bg-red-900/20 rounded-lg transition-colors border border-red-900/30">
                                <TrashIcon className="w-4 h-4" /> Purge Agent Memory
                            </button>
                        </div>
                    </div>
                )}

                {/* VECTORS TAB */}
                {activeTab === 'vectors' && (
                    <div className="max-w-6xl mx-auto space-y-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-black text-neutral-400 uppercase tracking-widest">Source Registry</h3>
                            <span className="text-xs text-neutral-500 font-mono">{sources.length} Sources</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            {sources.map(s => (
                                <div key={s} className="bg-neutral-900 border border-neutral-800 px-3 py-2 rounded text-xs text-neutral-300 truncate flex justify-between items-center group">
                                    <span className="truncate flex-grow" title={s}>{s}</span>
                                    <button 
                                        onClick={async () => { if(confirm("Remove source?")) { await vectorDb.deleteVectorsBySource(s, selectedAgentId); refreshData(selectedAgentId); } }}
                                        className="ml-2 text-neutral-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-sm font-black text-neutral-400 uppercase tracking-widest mb-4">Vector Stream ({vectors.length})</h3>
                            {vectors.slice(0, 50).map(v => (
                                <div key={v.id} className="bg-neutral-900/80 border border-neutral-800 p-4 rounded-lg hover:border-blue-500/30 transition-colors">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">{v.source}</span>
                                        <span className="text-[10px] text-neutral-600 font-mono">{String(v.id).substring(0,8)}</span>
                                    </div>
                                    <p className="text-xs text-neutral-300 font-mono line-clamp-2">{v.text}</p>
                                </div>
                            ))}
                            {vectors.length > 50 && <p className="text-center text-xs text-neutral-500 italic py-4">... {vectors.length - 50} more vectors hidden ...</p>}
                        </div>
                    </div>
                )}

                {/* GRAPH VISUALIZATION TAB */}
                {activeTab === 'graph' && (
                    <div className="h-full flex flex-col">
                        <div className="flex-shrink-0 flex justify-between items-center mb-4 px-4">
                            <h3 className="text-sm font-black text-neutral-400 uppercase tracking-widest">Neural Graph Topology</h3>
                            <div className="text-xs text-neutral-500 space-x-4">
                                <span>{graphNodes.length} Nodes</span>
                                <span>{graphEdges.length} Connections</span>
                            </div>
                        </div>
                        <div className="flex-grow bg-black/60 rounded-2xl border border-neutral-800 overflow-hidden relative">
                            {graphNodes.length === 0 ? (
                                <div className="absolute inset-0 flex items-center justify-center text-neutral-600 font-bold uppercase tracking-widest text-sm">
                                    Graph Empty - Use Forge to Create
                                </div>
                            ) : (
                                <svg width="100%" height="100%" className="w-full h-full">
                                    {/* Simple Random Layout for Visualization */}
                                    {graphEdges.map((edge, i) => {
                                        // Fake coordinates for demo - in real app use d3-force
                                        const x1 = Math.random() * 800 + 50;
                                        const y1 = Math.random() * 500 + 50;
                                        const x2 = Math.random() * 800 + 50;
                                        const y2 = Math.random() * 500 + 50;
                                        return (
                                            <line key={i} x1={`${(i*13)%100}%`} y1={`${(i*7)%100}%`} x2={`${(i*23)%100}%`} y2={`${(i*17)%100}%`} stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.3" />
                                        )
                                    })}
                                    {graphNodes.map((node, i) => (
                                        <g key={node.id} transform={`translate(${Math.random() * 800},${Math.random() * 500})`}>
                                            <circle r="4" fill="#3b82f6" fillOpacity="0.8" />
                                            <text y="-8" fontSize="10" fill="#60a5fa" textAnchor="middle">{node.label}</text>
                                        </g>
                                    ))}
                                    <text x="50%" y="50%" textAnchor="middle" fill="#404040" fontSize="12" className="pointer-events-none">
                                        (Visualization Placeholder: {graphNodes.length} Nodes Loaded)
                                    </text>
                                </svg>
                            )}
                        </div>
                    </div>
                )}

                {/* GRAPH FORGE TAB */}
                {activeTab === 'forge' && (
                    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Node Creator */}
                        <div className="bg-neutral-900/90 border border-neutral-800 p-6 rounded-2xl shadow-xl">
                            <h3 className="text-sm font-black text-green-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <PlusIcon className="w-4 h-4" /> Create Node
                            </h3>
                            <div className="space-y-4">
                                <input 
                                    type="text" 
                                    value={newNodeLabel} 
                                    onChange={e => setNewNodeLabel(e.target.value)}
                                    placeholder="Label / Entity Name"
                                    className="w-full bg-black border border-neutral-700 rounded-lg p-3 text-sm text-white focus:border-green-500 outline-none"
                                />
                                <textarea 
                                    value={newNodeDesc}
                                    onChange={e => setNewNodeDesc(e.target.value)}
                                    placeholder="Description / Context..."
                                    className="w-full bg-black border border-neutral-700 rounded-lg p-3 text-sm text-white focus:border-green-500 outline-none h-24 resize-none"
                                />
                                <button 
                                    onClick={handleAddNode}
                                    disabled={!newNodeLabel}
                                    className="w-full py-3 bg-green-700 hover:bg-green-600 text-white font-bold rounded-lg uppercase text-xs tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Forge Node
                                </button>
                            </div>
                            
                            <div className="mt-8 border-t border-neutral-800 pt-4">
                                <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Recent Nodes</h4>
                                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                                    {graphNodes.slice(-5).reverse().map(n => (
                                        <div key={n.id} className="flex justify-between items-center text-xs text-neutral-300 bg-neutral-800 px-3 py-2 rounded">
                                            <span>{n.label}</span>
                                            <span className="text-neutral-600 font-mono text-[10px]">{String(n.id).substring(0,6)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Edge Creator */}
                        <div className="bg-neutral-900/90 border border-neutral-800 p-6 rounded-2xl shadow-xl">
                            <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <DatabaseIcon className="w-4 h-4" /> Link Nodes (Edge)
                            </h3>
                            <div className="space-y-4">
                                <select 
                                    value={newEdgeSource}
                                    onChange={e => setNewEdgeSource(e.target.value)}
                                    className="w-full bg-black border border-neutral-700 rounded-lg p-3 text-sm text-white focus:border-blue-500 outline-none"
                                >
                                    <option value="">Select Source Node...</option>
                                    {graphNodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                                </select>
                                
                                <div className="flex justify-center text-neutral-600">↓</div>

                                <select 
                                    value={newEdgeTarget}
                                    onChange={e => setNewEdgeTarget(e.target.value)}
                                    className="w-full bg-black border border-neutral-700 rounded-lg p-3 text-sm text-white focus:border-blue-500 outline-none"
                                >
                                    <option value="">Select Target Node...</option>
                                    {graphNodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                                </select>

                                <input 
                                    type="text" 
                                    value={newEdgeLabel} 
                                    onChange={e => setNewEdgeLabel(e.target.value)}
                                    placeholder="Relationship Label (e.g. 'owns', 'knows')"
                                    className="w-full bg-black border border-neutral-700 rounded-lg p-3 text-sm text-white focus:border-blue-500 outline-none"
                                />

                                <button 
                                    onClick={handleAddEdge}
                                    disabled={!newEdgeSource || !newEdgeTarget || !newEdgeLabel}
                                    className="w-full py-3 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded-lg uppercase text-xs tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Forge Link
                                </button>
                            </div>

                            <div className="mt-8 border-t border-neutral-800 pt-4">
                                <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Recent Edges</h4>
                                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                                    {graphEdges.slice(-5).reverse().map((e, i) => (
                                        <div key={i} className="text-xs text-neutral-400 bg-neutral-800 px-3 py-2 rounded flex items-center gap-2">
                                            <span className="text-white">{graphNodes.find(n => n.id === e.source)?.label || '???'}</span>
                                            <span className="text-blue-500">--[{e.label}]--></span>
                                            <span className="text-white">{graphNodes.find(n => n.id === e.target)?.label || '???'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};