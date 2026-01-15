import { vectorDb, VectorRecord } from './vectorDbService';
import { GraphNode, GraphEdge } from '../types';

export class LorepackService {
    
    /**
     * Imports a compressed Lorepack (.gz)
     */
    async importGzip(file: File, targetAgentId: string, onProgress?: (percent: number) => void): Promise<number> {
        try {
            console.log(`[LorePack] Starting GZIP import for ${file.name}`);
            const text = await this.ungzip(file);
            console.log(`[LorePack] Decompressed ${text.length} bytes.`);
            return await this.importContent(text, targetAgentId, onProgress);
        } catch (e: any) {
            console.error("LorePack Gzip Import Error:", e);
            throw new Error(`Failed to unpack LorePack: ${e.message}.`);
        }
    }

    /**
     * Decompress gzip content using the browser's DecompressionStream API
     */
    async ungzip(file: File): Promise<string> {
        if (!('DecompressionStream' in window)) {
            // Fallback for environments without DecompressionStream (less likely in modern browsers but possible)
            throw new Error("Browser doesn't support DecompressionStream.");
        }
        
        try {
            const ds = new DecompressionStream('gzip');
            const stream = file.stream().pipeThrough(ds);
            return await new Response(stream).text();
        } catch (e) {
            console.warn("GZIP Decompression failed, attempting text read...", e);
            // Fallback: maybe it wasn't gzipped?
            try {
                return await file.text();
            } catch (err) {
                throw new Error("Decompression failed and text read failed.");
            }
        }
    }

    /**
     * Import content text (JSON or JSONL) into the vector DB
     */
    async importContent(text: string, agentId: string, onProgress?: (percent: number) => void): Promise<number> {
        let data: any = null;
        try {
            data = JSON.parse(text);
        } catch (e) {
            // Try JSONL (Line-delimited JSON)
            try {
                data = text.trim().split('\n')
                    .filter(line => line.trim())
                    .map(line => JSON.parse(line));
            } catch (e2) {
                console.error("JSON Parse Error:", e);
                throw new Error("File content is not valid JSON or JSONL.");
            }
        }

        const foundVectors: any[] = [];
        const foundNodes: any[] = [];
        const foundEdges: any[] = [];

        // Normalize data to an array for processing
        const candidates = Array.isArray(data) ? data : [data];

        // 1. Explicit Top-Level Checks (Standard Formats)
        for (const c of candidates) {
            if (c.sacred_archive && Array.isArray(c.sacred_archive)) foundVectors.push(...c.sacred_archive);
            if (c.vectors && Array.isArray(c.vectors)) foundVectors.push(...c.vectors);
            if (c.nodes && Array.isArray(c.nodes)) foundNodes.push(...c.nodes); 
            if (c.edges && Array.isArray(c.edges)) foundEdges.push(...c.edges); 
            
            if (c.graph) {
                if (c.graph.nodes && Array.isArray(c.graph.nodes)) foundNodes.push(...c.graph.nodes);
                if (c.graph.edges && Array.isArray(c.graph.edges)) foundEdges.push(...c.graph.edges);
            }
        }

        // 2. Deep Scan (If explicit structures yielded little)
        if (foundVectors.length === 0 && foundNodes.length === 0) {
            console.log("[LorePack] Explicit structure missing, performing deep scan...");
            this.scanItems(candidates, foundVectors, foundNodes, foundEdges);
        }

        // 3. Validation
        if (foundVectors.length === 0 && foundNodes.length === 0 && foundEdges.length === 0) {
            throw new Error("Import Failed: Parsed valid JSON but found no 'vectors' (arrays of numbers), 'nodes', or 'edges'. Check file structure.");
        }

        if (onProgress) onProgress(10); // Parsed

        // 4. Normalization & Hydration
        const finalVectors: VectorRecord[] = foundVectors
            .filter(v => this.isValidVectorLike(v))
            .map(v => ({
                id: v.id || crypto.randomUUID(),
                text: v.text || v.content || v.pageContent || v.data || "", 
                vector: v.vector || v.embedding || v.values || [],
                source: v.source || "Imported Lore",
                agentId: agentId, 
                agent: v.agent || agentId,
                timestamp: v.timestamp || Date.now(),
            }));

        const finalGraphNodes: GraphNode[] = foundNodes.map(n => ({
            id: n.id || crypto.randomUUID(),
            name: n.name || n.label || "Unknown Node",
            label: n.label || n.name || "Node",
            description: n.description || "",
            agentId: agentId
        }));

        const finalGraphEdges: GraphEdge[] = foundEdges.map(e => ({
            source: e.source,
            target: e.target,
            label: e.label || "relates_to",
            agentId: agentId
        }));

        // 5. Batch Insert
        const BATCH_SIZE = 500;
        
        // Vectors
        for (let i = 0; i < finalVectors.length; i += BATCH_SIZE) {
            const batch = finalVectors.slice(i, i + BATCH_SIZE);
            await vectorDb.addVectors(batch);
            if (onProgress) onProgress(10 + (i / finalVectors.length) * 40);
        }

        // Graph
        if (finalGraphNodes.length > 0) await vectorDb.addGraphNodes(finalGraphNodes);
        if (finalGraphEdges.length > 0) await vectorDb.addGraphEdges(finalGraphEdges);

        console.log(`[LorePack] Import Complete. Vectors: ${finalVectors.length}, Nodes: ${finalGraphNodes.length}, Edges: ${finalGraphEdges.length}`);
        if (onProgress) onProgress(100);
        
        return finalVectors.length + finalGraphNodes.length;
    }

    private scanItems(items: any[], vectors: any[], nodes: any[], edges: any[]) {
        for (const item of items) {
            this.deepScan(item, vectors, nodes, edges, 0);
        }
    }

    private deepScan(obj: any, vectors: any[], nodes: any[], edges: any[], depth: number) {
        if (!obj || typeof obj !== 'object' || depth > 12) return;

        if (Array.isArray(obj)) {
            obj.forEach(i => this.deepScan(i, vectors, nodes, edges, depth + 1));
            return;
        }

        // Heuristics
        if (this.isValidVectorLike(obj)) {
            vectors.push(obj);
            return; 
        }
        if (this.isEdge(obj)) {
            edges.push(obj);
            return;
        }
        if (this.isNode(obj)) {
            nodes.push(obj);
            return;
        }

        // Recurse properties
        Object.values(obj).forEach(val => this.deepScan(val, vectors, nodes, edges, depth + 1));
    }

    private isValidVectorLike(obj: any): boolean {
        // Check for vector array presence
        const vec = obj.vector || obj.embedding || obj.values;
        // Must be array, must have length, must contain numbers
        if (!Array.isArray(vec) || vec.length === 0 || typeof vec[0] !== 'number') return false;
        return true;
    }

    private isNode(obj: any): boolean {
        // Node usually has ID and Label/Name, but NOT a vector
        return (obj.id && (obj.label || obj.name || obj.title)) && !this.isValidVectorLike(obj) && !this.isEdge(obj);
    }

    private isEdge(obj: any): boolean {
        // Edges link source to target
        return obj.source && obj.target;
    }
}

export const lorepackService = new LorepackService();