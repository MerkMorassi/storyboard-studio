
import { Agent, ImageState } from '../types.ts';

export interface VectorRecord {
  id: number | string;
  text: string;
  vector: number[];
  source: string;
  timestamp: number;
  agentId?: string;
}

export interface ChatLogRecord {
    id: string; // This will now be the agentId
    history: {
        id: string;
        role: 'user' | 'model';
        parts: {
          text?: string;
          inlineData?: {
            mimeType: string;
            data: string;
            fileName?: string;
          };
        }[];
    }[];
}

const DB_NAME = 'mythos_vault';
const DB_VERSION = 5; 
const STORE_VECTORS = 'vectors';
const STORE_AGENT_CHAT = 'agentChatLogs';
const STORE_AGENTS = 'agents';
const STORE_PLAYERS = 'players';
const STORE_IMAGES = 'images';

class VectorDbService {
  private db: IDBDatabase | null = null;

  async open(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        
        let vectorStore: IDBObjectStore;
        if (!db.objectStoreNames.contains(STORE_VECTORS)) {
          vectorStore = db.createObjectStore(STORE_VECTORS, { keyPath: 'id' });
        } else {
          vectorStore = (e.target as IDBOpenDBRequest).transaction!.objectStore(STORE_VECTORS);
        }

        if (!vectorStore.indexNames.contains('source')) {
            vectorStore.createIndex('source', 'source', { unique: false });
        }
        if (!vectorStore.indexNames.contains('agentId')) {
            vectorStore.createIndex('agentId', 'agentId', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORE_AGENT_CHAT)) {
          db.createObjectStore(STORE_AGENT_CHAT, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORE_AGENTS)) {
            db.createObjectStore(STORE_AGENTS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORE_PLAYERS)) {
            db.createObjectStore(STORE_PLAYERS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORE_IMAGES)) {
            db.createObjectStore(STORE_IMAGES, { keyPath: 'id' });
        }
      };

      request.onsuccess = (e) => {
        this.db = (e.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = (e) => {
        reject((e.target as IDBOpenDBRequest).error);
      };
    });
  }

  async saveItems<T>(storeName: string, items: T[]): Promise<void> {
      const db = await this.open();
      return new Promise((resolve, reject) => {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          store.clear();
          items.forEach(item => store.put(item));
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
      });
  }

  async getAllItems<T>(storeName: string): Promise<T[]> {
      const db = await this.open();
      return new Promise((resolve, reject) => {
          const tx = db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
      });
  }

  async addVectors(vectors: VectorRecord[]): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_VECTORS, 'readwrite');
      const store = tx.objectStore(STORE_VECTORS);
      vectors.forEach(v => {
          // Robust structure check for LOREPACK import
          if (v.vector && Array.isArray(v.vector)) {
            store.put(v);
          }
      });
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(tx.error);
    });
  }

  async getAllVectors(): Promise<VectorRecord[]> {
    return this.getAllItems<VectorRecord>(STORE_VECTORS);
  }

  async getVectorsByAgent(agentId: string): Promise<VectorRecord[]> {
      const db = await this.open();
      return new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_VECTORS, 'readonly');
          const store = tx.objectStore(STORE_VECTORS);
          const index = store.index('agentId');
          const request = index.getAll(agentId);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
      });
  }

  async deleteVectorsBySource(source: string, agentId?: string): Promise<void> {
      const db = await this.open();
      return new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_VECTORS, 'readwrite');
          const store = tx.objectStore(STORE_VECTORS);
          const index = store.index('source');
          const request = index.openCursor(IDBKeyRange.only(source));

          request.onsuccess = (event) => {
              const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
              if (cursor) {
                  if (!agentId || cursor.value.agentId === agentId) {
                      cursor.delete();
                  }
                  cursor.continue();
              }
          };

          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
      });
  }

  async clearVectors(agentId?: string): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_VECTORS, 'readwrite');
      const store = tx.objectStore(STORE_VECTORS);
      
      if (agentId) {
          const index = store.index('agentId');
          const request = index.openCursor(IDBKeyRange.only(agentId));
          request.onsuccess = (event) => {
              const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
              if (cursor) {
                  cursor.delete();
                  cursor.continue();
              }
          };
          tx.oncomplete = () => resolve();
      } else {
          const request = store.clear();
          request.onsuccess = () => resolve();
      }
      
      tx.onerror = () => reject(tx.error);
    });
  }
  
  async saveAgentChat(agentId: string, history: any[]): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_AGENT_CHAT, 'readwrite');
        const store = tx.objectStore(STORE_AGENT_CHAT);
        store.put({ id: agentId, history: history });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
  }

  async getAgentChat(agentId: string): Promise<any[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_AGENT_CHAT, 'readonly');
        const store = tx.objectStore(STORE_AGENT_CHAT);
        const request = store.get(agentId);
        
        request.onsuccess = () => {
            const result = request.result as ChatLogRecord;
            resolve(result ? result.history : []);
        };
        request.onerror = () => reject(request.error);
    });
  }

  async deleteAgentChat(agentId: string): Promise<void> {
      const db = await this.open();
      return new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_AGENT_CHAT, 'readwrite');
          const store = tx.objectStore(STORE_AGENT_CHAT);
          store.delete(agentId);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
      });
  }

  async saveAgents(agents: Agent[]): Promise<void> {
      return this.saveItems(STORE_AGENTS, agents);
  }
  async getAgents(): Promise<Agent[]> {
      return this.getAllItems<Agent>(STORE_AGENTS);
  }

  async savePlayers(players: Agent[]): Promise<void> {
      return this.saveItems(STORE_PLAYERS, players);
  }
  async getPlayers(): Promise<Agent[]> {
      return this.getAllItems<Agent>(STORE_PLAYERS);
  }

  async saveImages(images: ImageState[]): Promise<void> {
      return this.saveItems(STORE_IMAGES, images);
  }
  async getImages(): Promise<ImageState[]> {
      return this.getAllItems<ImageState>(STORE_IMAGES);
  }
}

export const vectorDb = new VectorDbService();
