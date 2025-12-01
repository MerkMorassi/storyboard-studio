
import { GoogleGenAI } from '@google/genai';
import { LoreEntry } from '../types.ts';

// MYTHOS Local RAG Implementation
// Uses IndexedDB for storage and Gemini text-embedding-004 for vectors.

const DB_NAME = 'mythos_vectordb';
const DB_VERSION = 1; // Increment this if you change store structure
const STORE_NAME = 'vectors';
const SETTINGS_STORE_NAME = 'settings'; // For model selection etc.

interface VectorDocument {
    id: string; // Unique ID for the chunk itself
    loreEntryId: string; // The ID of the original LoreEntry this chunk belongs to
    projectId: string;
    title: string;
    content: string; // The chunked text
    embedding: number[];
    timestamp: number;
}

// --- IndexedDB Helpers ---

class SimpleDB {
    private db: IDBDatabase | null = null;
    private dbName: string;
    private dbVersion: number;

    constructor(dbName: string, dbVersion: number) {
        this.dbName = dbName;
        this.dbVersion = dbVersion;
    }

    async open(): Promise<IDBDatabase> {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    store.createIndex('projectId', 'projectId', { unique: false });
                    store.createIndex('loreEntryId', 'loreEntryId', { unique: false });
                }
                if (!db.objectStoreNames.contains(SETTINGS_STORE_NAME)) {
                    db.createObjectStore(SETTINGS_STORE_NAME, { keyPath: 'key' });
                }
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onerror = () => reject(request.error);
        });
    }

    async close(): Promise<void> {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }

    async tx<T>(storeName: string, mode: IDBTransactionMode, callback: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
        await this.open();
        return new Promise((resolve, reject) => {
            if (!this.db) {
                return reject(new Error('IndexedDB not open.'));
            }
            const tx = this.db.transaction(storeName, mode);
            const store = tx.objectStore(storeName);
            const request = callback(store);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(new Error('Transaction aborted.'));
        });
    }

    async add(storeName: string, item: any): Promise<void> {
        await this.tx(storeName, 'readwrite', store => store.put(item));
    }

    async addBulk(storeName: string, items: any[]): Promise<void> {
        await this.open();
        return new Promise((resolve, reject) => {
            if (!this.db) {
                return reject(new Error('IndexedDB not open.'));
            }
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            
            for (const item of items) {
                store.put(item);
            }

            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(new Error('Transaction aborted.'));
        });
    }

    async delete(storeName: string, id: IDBValidKey): Promise<void> {
        await this.tx(storeName, 'readwrite', store => store.delete(id));
    }

    async clear(storeName: string): Promise<void> {
        await this.tx(storeName, 'readwrite', store => store.clear());
    }

    async getAll<T>(storeName: string, indexName?: string, query?: IDBValidKey | IDBKeyRange): Promise<T[]> {
        return await this.tx(storeName, 'readonly', store => {
            if (indexName && query) {
                return store.index(indexName).getAll(query);
            }
            return store.getAll();
        });
    }
}

const db = new SimpleDB(DB_NAME, DB_VERSION);

// --- Embedding Logic ---

const getEmbedding = async (text: string, apiKey: string): Promise<number[]> => {
    if (!apiKey) throw new Error("Google API Key required for local embeddings (text-embedding-004). Please set it in Settings.");
    
    // Ensure text is not too long for embedding model
    const MAX_EMBEDDING_TEXT_LENGTH = 10000; // Common limit for text embedding models
    const trimmedText = text.length > MAX_EMBEDDING_TEXT_LENGTH ? text.substring(0, MAX_EMBEDDING_TEXT_LENGTH) : text;

    const ai = new GoogleGenAI({ apiKey });
    
    // Using the text-embedding-004 model for high quality
    const response = await ai.models.embedContent({
        model: 'text-embedding-004',
        content: { parts: [{ text: trimmedText }] }
    });

    if (!response.embedding?.values) {
        throw new Error("Failed to generate embedding from Gemini API.");
    }
    return response.embedding.values;
};

// --- Vector Math ---

const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    // Check for empty or non-matching length vectors
    if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
        return 0; // Or throw an error, depending on desired behavior
    }

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
};

// --- Semantic Chunking (from MYTHOS Vault) ---
function chunkText(text: string, targetSize = 600, overlap = 50): string[] {
    const chunks: string[] = [];
    let index = 0;

    // Simple preprocessing to ensure consistent newlines
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    while (index < text.length) {
        let currentChunkEnd = Math.min(index + targetSize, text.length);
        
        // If we're near the end of the text, just take the rest
        if (currentChunkEnd >= text.length) {
            chunks.push(text.slice(index).trim());
            break;
        }

        let splitIndex = -1;
        const searchStart = Math.max(index, currentChunkEnd - overlap); // Look back from target end

        // Strategy 1: Find a newline character
        splitIndex = text.lastIndexOf('\n', currentChunkEnd);
        if (splitIndex !== -1 && splitIndex > searchStart) {
            // Found a good newline within the lookback window
            // Make sure the chunk is not too small (e.g., just a single char) if we chop at a newline
            if (splitIndex - index > targetSize / 2 || currentChunkEnd === text.length) {
                const chunk = text.slice(index, splitIndex).trim();
                if (chunk.length > 0) chunks.push(chunk);
                index = splitIndex + 1; // Start after the newline
                continue;
            }
        }
        
        // Strategy 2: Find a sentence boundary (. ! ?)
        splitIndex = -1;
        const sentenceBreaks = text.slice(searchStart, currentChunkEnd).matchAll(/[.!?](?=\s|$)/g);
        let bestSentenceBreak = -1;
        for (const match of sentenceBreaks) {
            if (match.index !== undefined) {
                const absoluteIndex = searchStart + match.index + 1; // +1 to include the punctuation
                if (absoluteIndex > index + (targetSize / 2) && absoluteIndex <= currentChunkEnd) {
                    bestSentenceBreak = absoluteIndex;
                }
            }
        }
        if (bestSentenceBreak !== -1) {
            splitIndex = bestSentenceBreak;
            const chunk = text.slice(index, splitIndex).trim();
            if (chunk.length > 0) chunks.push(chunk);
            index = splitIndex;
            continue;
        }

        // Strategy 3: Find a space character
        splitIndex = text.lastIndexOf(' ', currentChunkEnd);
        if (splitIndex !== -1 && splitIndex > searchStart) {
            const chunk = text.slice(index, currentChunkEnd).trim();
            if (chunk.length > 0) chunks.push(chunk);
            index = splitIndex + 1;
            continue;
        }

        // Strategy 4: If no good split found, hard break at currentChunkEnd
        const chunk = text.slice(index, currentChunkEnd).trim();
        if (chunk.length > 0) chunks.push(chunk);
        index = currentChunkEnd;
    }
    
    // Filter out any empty chunks that might result from trimming or consecutive newlines
    return chunks.filter(chunk => chunk.length > 0);
}

// --- Public API ---

export const initLocalRAG = async (): Promise<void> => {
    try {
        await db.open();
        console.log("MYTHOS Local VectorDB Initialized (IndexedDB)");
    } catch (e) {
        console.error("Failed to init IndexedDB", e);
        throw new Error("Failed to initialize local RAG database.");
    }
};

export const addDocument = async (apiKey: string, projectId: string, entry: LoreEntry): Promise<void> => {
    if (!apiKey) throw new Error("Google API Key required for local RAG embeddings.");

    // Chunk the content before embedding and storing
    const chunks = chunkText(entry.content);
    const documentsToAdd: VectorDocument[] = [];

    for (const chunk of chunks) {
        const embedding = await getEmbedding(chunk, apiKey);
        documentsToAdd.push({
            id: crypto.randomUUID(), // Each chunk gets a unique ID
            loreEntryId: entry.id, // Store original LoreEntry ID
            projectId,
            title: entry.title,
            content: chunk,
            embedding,
            timestamp: Date.now()
        });
    }

    if (documentsToAdd.length > 0) {
        await db.addBulk(STORE_NAME, documentsToAdd);
    }
};

// Deletes all chunks associated with a specific LoreEntry ID within a project
export const deleteDocumentsByLoreEntryId = async (loreEntryId: string, projectId: string): Promise<void> => {
    // Get all relevant docs first, then delete them one by one
    const allDocsInProject = await db.getAll<VectorDocument>(STORE_NAME, 'projectId', projectId);
    const docsToDelete = allDocsInProject.filter(doc => doc.loreEntryId === loreEntryId);
    
    for (const doc of docsToDelete) {
        await db.delete(STORE_NAME, doc.id);
    }
};

// Deletes all documents for a given project
export const clearProjectDocuments = async (projectId: string): Promise<void> => {
    const allDocsInProject = await db.getAll<VectorDocument>(STORE_NAME, 'projectId', projectId);
    for (const doc of allDocsInProject) {
        await db.delete(STORE_NAME, doc.id);
    }
};

export const searchDocuments = async (apiKey: string, projectId: string, query: string, limit: number = 5): Promise<LoreEntry[]> => {
    if (!apiKey) throw new Error("Google API Key required for local RAG search.");

    const queryEmbedding = await getEmbedding(query, apiKey);
    const allDocsInProject = await db.getAll<VectorDocument>(STORE_NAME, 'projectId', projectId);

    const scoredDocs = allDocsInProject.map(doc => ({
        ...doc,
        score: cosineSimilarity(queryEmbedding, doc.embedding)
    }));

    // Filter by a minimum relevance score (e.g., 0.6, adjustable)
    const RELEVANCE_THRESHOLD = 0.6;
    const filteredAndSortedDocs = scoredDocs
        .filter(doc => doc.score > RELEVANCE_THRESHOLD)
        .sort((a, b) => b.score - a.score);

    // Return top K, ensure unique titles if preferred for context
    const uniqueTitles = new Set<string>();
    const results: LoreEntry[] = [];
    for (const doc of filteredAndSortedDocs) {
        // Here, we return the chunk as a LoreEntry, but its ID is the chunk ID
        // The original LoreEntry ID is stored in loreEntryId if needed to group
        if (!uniqueTitles.has(doc.title)) { // Only add one chunk per original LoreEntry title for conciseness
            results.push({
                id: doc.loreEntryId, // Use the original LoreEntry ID
                projectId: doc.projectId, // Pass projectId
                title: doc.title,
                content: doc.content,
                ragDocumentId: doc.id // Store the specific chunk ID in ragDocumentId
            });
            uniqueTitles.add(doc.title);
            if (results.length >= limit) break;
        }
    }
    
    return results;
};

// For UI display, we need to reconstruct original LoreEntry from chunks
export const getAllDocuments = async (projectId: string): Promise<LoreEntry[]> => {
    const allDocs = await db.getAll<VectorDocument>(STORE_NAME, 'projectId', projectId);
    
    // Group chunks by their original loreEntryId to reconstruct the full LoreEntry
    const loreMap = new Map<string, { id: string, projectId: string, title: string, contentChunks: string[], ragDocumentIds: string[] }>();

    for (const doc of allDocs) {
        const originalLoreId = doc.loreEntryId;
        if (!loreMap.has(originalLoreId)) {
            loreMap.set(originalLoreId, { 
                id: originalLoreId,
                projectId: doc.projectId, // Pass projectId
                title: doc.title, 
                contentChunks: [], 
                ragDocumentIds: [] 
            });
        }
        loreMap.get(originalLoreId)?.contentChunks.push(doc.content);
        loreMap.get(originalLoreId)?.ragDocumentIds.push(doc.id);
    }

    return Array.from(loreMap.values()).map(entry => ({
        id: entry.id, 
        projectId: entry.projectId, // Pass projectId
        title: entry.title,
        content: entry.contentChunks.join('\n\n'), // Rejoin chunks to form original content
        ragDocumentId: entry.ragDocumentIds.join(',') // Store all chunk IDs if needed, or null if only one
    }));
};

export const clearAllLocalRAG = async (): Promise<void> => {
    if (confirm("Are you sure you want to completely purge the local RAG knowledge base across all projects? This cannot be undone.")) {
        await db.clear(STORE_NAME);
        console.log("Local RAG Knowledge Base Purged.");
    }
};
