
import React, { useState, useEffect } from 'react';
import { LoreEntry } from '../types.ts';
import { LoreIcon, FolderIcon } from './icons.tsx';

interface ProjectSummary {
    id: string;
    name: string;
}

interface LoreStudioProps {
    lore: LoreEntry[];
    projects: ProjectSummary[];
    onCreate: (title: string, content: string, projectId: string) => void;
    onUpdate: (id: string, title: string, content: string) => void;
    onDelete: (id: string) => void;
}

const LoreEntryEditor: React.FC<{
    entry: LoreEntry;
    onUpdate: (id: string, title: string, content: string) => void;
    onDelete: (id: string) => void;
    onCancel: () => void;
}> = ({ entry, onUpdate, onDelete, onCancel }) => {
    const [title, setTitle] = useState(entry.title);
    const [content, setContent] = useState(entry.content);

    const handleSave = () => {
        if (title.trim() && content.trim()) {
            onUpdate(entry.id, title, content);
            onCancel(); // Close editor
        }
    };

    return (
        <div className="bg-neutral-800/60 p-4 border border-neutral-700 space-y-3 rounded-lg">
            <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Lore Title"
                className="w-full bg-black border border-neutral-800 p-2 text-lg font-bold text-white focus:ring-2 focus:ring-brand outline-none rounded-lg"
            />
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Describe the lore..."
                className="w-full h-40 bg-black border border-neutral-800 p-3 text-sm text-neutral-200 resize-y focus:ring-2 focus:ring-brand outline-none rounded-lg"
            />
            <div className="flex justify-end gap-3">
                <button onClick={() => onDelete(entry.id)} className="px-4 py-2 text-sm font-medium text-red-400 bg-neutral-900 hover:bg-red-900/50 transition rounded-lg">Delete</button>
                <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-neutral-300 bg-neutral-700 hover:bg-neutral-600 transition rounded-lg">Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 transition rounded-lg">Save Changes</button>
            </div>
        </div>
    );
};

export const LoreStudio: React.FC<LoreStudioProps> = ({ lore, projects, onCreate, onUpdate, onDelete }) => {
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        if (projects.length > 0 && !selectedProjectId) {
            setSelectedProjectId(projects[0].id);
        }
    }, [projects, selectedProjectId]);

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTitle.trim() && newContent.trim() && selectedProjectId) {
            onCreate(newTitle, newContent, selectedProjectId);
            setNewTitle('');
            setNewContent('');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto w-full space-y-8 h-full overflow-y-auto">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-neutral-200 mb-2">Lore Studio</h2>
                <p className="text-neutral-400 mb-6">Define the elements of your story universe. This lore will be used as context to guide every AI image generation, ensuring consistency.</p>
                
                <form onSubmit={handleCreate} className="bg-neutral-800/50 p-6 border border-neutral-700 space-y-4 rounded-xl shadow-xl">
                     <h3 className="text-lg font-semibold text-neutral-300">Add New Lore Entry</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <select
                                value={selectedProjectId}
                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                className="w-full bg-black border border-neutral-800 p-3 rounded-lg text-white font-bold focus:ring-2 focus:ring-brand outline-none appearance-none cursor-pointer"
                            >
                                <option value="" disabled>Select Project...</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                                <FolderIcon className="w-4 h-4" />
                            </div>
                        </div>
                        
                        <input
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="Lore Title (e.g., The Sunstone of Arath)"
                            className="w-full bg-black border border-neutral-800 p-3 rounded-lg text-white font-bold focus:ring-2 focus:ring-brand outline-none"
                        />
                    </div>

                    <textarea
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        placeholder="Describe the lore in detail. What it looks like, its history, its function..."
                        className="w-full h-28 bg-black border border-neutral-800 p-3 rounded-lg text-neutral-200 resize-y focus:ring-2 focus:ring-brand outline-none"
                    />
                    <button
                        type="submit"
                        disabled={!newTitle.trim() || !newContent.trim() || !selectedProjectId}
                        className="w-full bg-blue-600 text-white font-bold py-3 px-4 hover:bg-blue-500 transition duration-300 disabled:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-lg"
                    >
                        Add to Lore Bible
                    </button>
                </form>
            </div>
            
            <div className="space-y-4">
                {lore.length > 0 ? (
                    lore.map(entry => (
                        <div key={entry.id}>
                            {editingId === entry.id ? (
                                <LoreEntryEditor
                                    entry={entry}
                                    onUpdate={onUpdate}
                                    onDelete={onDelete}
                                    onCancel={() => setEditingId(null)}
                                />
                            ) : (
                                <div className="bg-neutral-800/50 p-4 border border-neutral-700 group rounded-lg hover:border-neutral-500 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                                                    {projects.find(p => p.id === entry.projectId)?.name || 'Unknown Project'}
                                                </span>
                                            </div>
                                            <h4 className="text-lg font-bold text-neutral-200">{entry.title}</h4>
                                        </div>
                                        <button 
                                            onClick={() => setEditingId(entry.id)} 
                                            className="text-sm text-neutral-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            Edit
                                        </button>
                                    </div>
                                    <p className="text-sm text-neutral-300 mt-2 whitespace-pre-wrap">{entry.content}</p>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center h-[50vh] border-2 border-dashed border-neutral-800 rounded-xl bg-neutral-900/30 text-center p-8">
                        <div className="w-16 h-16 text-neutral-700 mb-4"><LoreIcon /></div>
                        <h3 className="text-xl font-semibold text-neutral-300 mb-2">Your Lore Bible is Empty</h3>
                        <p className="text-neutral-500">Add entries above to start building your story's universe.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
