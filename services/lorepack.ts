import { vectorDb, VectorRecord } from './vectorDbService';
import { GraphNode, GraphEdge, TripletEdge } from '../types';
import { getEmbeddings, extractTripletsFromText } from './geminiService';

class FactoryService {

    // --- UTILITIES ---
    
    genSigil(t: string): string {
        return (t || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 50);
    }

    chunk(text: string, maxChars = 2000): string[] {
        const raw = (text || '')
          .replace(/\r/g, '')
          .replace(/([.?!])\s+(?=[A-Z0-9@])/g, '$1|')
          .split('|')
          .map(s => s.trim())
          .filter(Boolean);
    
        const out: string[] = [];
        let buf = '';
        for (const s of raw) {
          if (!buf) {
            buf = s;
            continue;
          }
          if ((buf.length + 1 + s.length) > maxChars) {
            out.push(buf);
            buf = s;
          } else {
            buf += ' ' + s;
          }
        }
        if (buf) out.push(buf);
        return out;
    }

    async getStats(agentId: string) {
        const vectors = await vectorDb.getVectorsByAgent(agentId);
        const edges = await vectorDb.getTripletEdgesByAgent(agentId);
        return { totalNodes: vectors.length, totalEdges: edges.length };
    }

    // --- INGESTION ---

    async ingestBatches(batches: { text: string, source: string }[], opts: {
        agentId: string,
        onProgress: (progress: { processed: number, written: number, total: number }) => void,
        signal?: AbortSignal
    }) {
        const { agentId, onProgress, signal } = opts;
        const BATCH_SIZE = 40; // How many chunks to embed in one API call
        const CONCURRENCY = 5; // How many API calls to have in flight at once
        
        let processed = 0;
        let written = 0;

        const groups: { text: string, source: string }[][] = [];
        for (let i = 0; i < batches.length; i += BATCH_SIZE) {
            groups.push(batches.slice(i, i + BATCH_SIZE));
        }

        const runOne = async (chunkGroup: { text: string, source: string }[]) => {
            if (signal?.aborted) throw new Error('Aborted');
            
            const embeddingPromises = chunkGroup.map(c => getEmbeddings(c.text));
            const vectors = await Promise.all(embeddingPromises);

            const nowISO = new Date().toISOString();
            const nodes: VectorRecord[] = chunkGroup.map((x, i) => ({
                id: crypto.randomUUID(),
                agentId,
                text: x.text,
                vector: vectors[i]!,
                numMarkId: this.genSigil(x.text),
                source: x.source || 'UNKNOWN',
                timestamp: Date.now(),
                metadata: { timestamp: nowISO }
            })).filter(n => n.vector);

            await vectorDb.addVectors(nodes);
            written += nodes.length;
            processed += chunkGroup.length;
            if (onProgress) onProgress({ processed, written, total: batches.length });
        };
        
        const inFlight = new Set();
        let idx = 0;
        while (idx < groups.length) {
            if (signal?.aborted) throw new Error('Aborted');
            while(inFlight.size < CONCURRENCY && idx < groups.length) {
                const group = groups[idx++];
                const promise = runOne(group).finally(() => inFlight.delete(promise));
                inFlight.add(promise);
            }
            if (inFlight.size > 0) await Promise.race(Array.from(inFlight));
        }
        await Promise.all(Array.from(inFlight));
        return { ingested: written };
    }

    // --- GRAPH GENERATION ---
    async buildGraphLite(agentId: string, onProgress: (current: number, total: number, created: number) => void) {
        const nodes = await vectorDb.getVectorsByAgent(agentId);
        let created = 0;
        const BATCH_SIZE = 5;
        let idx = 0;

        while (idx < nodes.length) {
          if (idx + BATCH_SIZE > nodes.length) {
            await new Promise(r => setTimeout(r, 200));
          }
          const batch = nodes.slice(idx, idx + BATCH_SIZE);
          const promises = batch.map(async (node) => {
            try {
              const triplets = await extractTripletsFromText(node.text);
              if (Array.isArray(triplets) && triplets.length > 0) {
                const edges: TripletEdge[] = triplets.map(t => ({
                  id: crypto.randomUUID(),
                  type: 'edge',
                  agentId: agentId.toUpperCase(),
                  sourceId: node.id as string,
                  s: t.s,
                  r: t.r,
                  o: t.o,
                  timestamp: new Date().toISOString()
                }));
                await vectorDb.addTripletEdges(edges);
                return edges.length;
              }
            } catch (e) { console.error("Triplet extraction failed for a node:", e) }
            return 0;
          });
    
          const results = await Promise.all(promises);
          created += results.reduce((a, b) => a + b, 0);
          idx += BATCH_SIZE;
          if (onProgress) onProgress(Math.min(idx, nodes.length), nodes.length, created);
        }
        return created;
    }

    // --- EXPORT ---
    async *yieldExportBatches(agentId: string, batchSize = 1000) {
        const nodes = await vectorDb.getVectorsByAgent(agentId);
        for (let i = 0; i < nodes.length; i += batchSize) {
          yield nodes.slice(i, i + batchSize).map(o => ({
            v: 2, type: 'vector',
            a: o.agentId, h: o.agentHandle || '', t: o.text, vec: o.vector,
            m: o.numMarkId, d: o.metadata || {}
          }));
        }

        const edges = await vectorDb.getTripletEdgesByAgent(agentId);
        for (let i = 0; i < edges.length; i += batchSize) {
          yield edges.slice(i, i + batchSize).map(e => ({
            v: 2, type: 'edge',
            id: e.id, aid: e.agentId, src: e.sourceId,
            s: e.s, r: e.r, o: e.o
          }));
        }
    }

    // --- IMPORT ---
    async importLorepack(file: File, agentId: string, onProgress: (progress: { processed: number; vectors: number; edges: number }) => void) {
        let stream = file.stream();
        if (file.name.endsWith('.gz')) {
            stream = stream.pipeThrough(new DecompressionStream('gzip'));
        }
        const reader = stream.pipeThrough(new TextDecoderStream()).getReader();

        let buffer = '';
        let vectorBatch: VectorRecord[] = [];
        let edgeBatch: TripletEdge[] = [];
        const BATCH_WRITE = 500;

        let totalVectors = 0;
        let totalEdges = 0;

        const writeBatches = async () => {
            if (vectorBatch.length) await vectorDb.addVectors(vectorBatch);
            if (edgeBatch.length) await vectorDb.addTripletEdges(edgeBatch);
            
            totalVectors += vectorBatch.length;
            totalEdges += edgeBatch.length;
            const count = totalVectors + totalEdges;

            vectorBatch = [];
            edgeBatch = [];
            if (onProgress) onProgress({ processed: count, vectors: totalVectors, edges: totalEdges });
        };
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += value;
                const lines = buffer.split(/\r?\n/);
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const n = JSON.parse(line);
                        if (n.type === 'edge') {
                            edgeBatch.push({
                                id: n.id || crypto.randomUUID(), type: 'edge', 
                                agentId: agentId, // OVERRIDE agentId
                                sourceId: n.src,
                                s: n.s, r: n.r, o: n.o, timestamp: new Date().toISOString()
                            });
                        } else if (n.t && n.vec) { // Assume it's a vector if it has text and vector
                             const vNode: VectorRecord = {
                                id: n.id || crypto.randomUUID(),
                                agentId: agentId, // OVERRIDE agentId
                                text: n.t || n.text,
                                vector: n.vec || n.vector,
                                source: file.name || n.source || n.d?.source || 'Imported',
                                timestamp: n.timestamp || Date.now(),
                                metadata: n.metadata || n.d || {},
                                numMarkId: n.m,
                                agentHandle: n.h || ''
                            };
                            vectorBatch.push(vNode);
                        }
                    } catch(e) { console.warn("Skipping malformed line in JSONL", e); }
                    if (vectorBatch.length + edgeBatch.length >= BATCH_WRITE) await writeBatches();
                }
            }
        } catch (error) {
            console.error("Error reading from import stream:", error);
            await writeBatches();
            throw error; // Re-throw so the UI can catch it
        }

        if (buffer.trim()) {
            try { 
                const n = JSON.parse(buffer.trim());
                if (n.type === 'edge') {
                    edgeBatch.push({
                        id: n.id || crypto.randomUUID(), type: 'edge', 
                        agentId: agentId, // OVERRIDE agentId
                        sourceId: n.src,
                        s: n.s, r: n.r, o: n.o, timestamp: new Date().toISOString()
                    });
                } else if (n.t && n.vec) {
                    const vNode: VectorRecord = {
                        id: n.id || crypto.randomUUID(),
                        agentId: agentId, // OVERRIDE agentId
                        text: n.t || n.text,
                        vector: n.vec || n.vector,
                        source: file.name || n.source || n.d?.source || 'Imported',
                        timestamp: n.timestamp || Date.now(),
                        metadata: n.metadata || n.d || {},
                        numMarkId: n.m,
                        agentHandle: n.h || ''
                    };
                    vectorBatch.push(vNode);
                }
            } catch(e) {
                console.warn("Skipping malformed final line in JSONL", e);
            }
        }

        await writeBatches();
        return { success: true, importedVectors: totalVectors, importedEdges: totalEdges };
    }
}

export const factoryService = new FactoryService();
