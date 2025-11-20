import React, { useState, useEffect } from 'react';
import { DynamicPromptList } from '../types';
import { ShuffleIcon } from './icons';

interface DynamicPromptsStudioProps {
    lists: DynamicPromptList[];
    onCreate: (name: string, items: string[]) => void;
    onUpdate: (id: string, name: string, items: string[]) => void;
    onDelete: (id: string) => void;
}

const ListEditor: React.FC<{
    list: DynamicPromptList;
    onUpdate: (id: string, name: string, items: string[]) => void;
    onDelete: (id: string) => void;
    onCancel: () => void;
}> = ({ list, onUpdate, onDelete, onCancel }) => {
    const [name, setName] = useState(list.name);
    const [items, setItems] = useState(list.items.join('\n'));

    const handleSave = () => {
        const itemsArray = items.split('\n').map(item => item.trim()).filter(Boolean);
        if (name.trim() && itemsArray.length > 0) {
            onUpdate(list.id, name, itemsArray);
            onCancel();
        }
    };

    return (
        <div className="bg-neutral-800/60 p-4 border border-neutral-700 space-y-3 animate-fade-in">
             <style>{`.animate-fade-in { animation: fadeIn 0.3s ease-out; } @keyframes fadeIn { 0% { opacity: 0; transform: translateY(-10px); } 100% { opacity: 1; transform: translateY(0); } }`}</style>
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="List Name (e.g., character, location)"
                className="w-full bg-neutral-900 border border-neutral-600 p-2 text-lg font-bold focus:ring-2 focus:ring-neutral-500 outline-none"
            />
            <textarea
                value={items}
                onChange={(e) => setItems(e.target.value)}
                placeholder="Add items, one per line..."
                className="w-full h-48 bg-neutral-900 border border-neutral-600 p-2 text-sm resize-y focus:ring-2 focus:ring-neutral-500 outline-none font-mono"
            />
            <div className="flex justify-end gap-3">
                <button onClick={() => onDelete(list.id)} className="px-4 py-2 text-sm font-medium text-red-400 bg-neutral-900 hover:bg-red-900/50 transition">Delete List</button>
                <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-neutral-300 bg-neutral-700 hover:bg-neutral-600 transition">Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-neutral-600 hover:bg-neutral-500 transition">Save Changes</button>
            </div>
        </div>
    );
};

export const DynamicPromptsStudio: React.FC<DynamicPromptsStudioProps> = ({ lists, onCreate, onUpdate, onDelete }) => {
    const [newListName, setNewListName] = useState('');
    const [newListItems, setNewListItems] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        const itemsArray = newListItems.split('\n').map(item => item.trim()).filter(Boolean);
        if (newListName.trim() && itemsArray.length > 0) {
            onCreate(newListName, itemsArray);
            setNewListName('');
            setNewListItems('');
            setIsCreating(false);
        }
    };
    
    useEffect(() => {
        // If all lists are deleted, show the create form
        if (lists.length === 0) {
            setIsCreating(true);
        }
    }, [lists.length]);

    return (
        <div className="bg-neutral-900/50 p-6 border border-neutral-800 space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-neutral-300 mb-2">Dynamic Prompts Studio</h2>
                <p className="text-sm text-neutral-400 mb-6">Create reusable lists of items to generate randomized prompts. Use <code className="bg-neutral-700/50 text-neutral-300 px-1.5 py-0.5">[listName]</code> in your prompt to insert a random item from a list.</p>
                
                {!isCreating && (
                    <button 
                        onClick={() => setIsCreating(true)}
                        className="w-full bg-neutral-700 text-white font-semibold py-2.5 px-4 hover:bg-neutral-600 transition duration-300"
                    >
                        + Create New List
                    </button>
                )}

                {isCreating && (
                    <form onSubmit={handleCreate} className="bg-neutral-800/50 p-4 border border-neutral-700 space-y-3 animate-fade-in">
                         <h3 className="text-lg font-semibold text-neutral-300">Create New Dynamic List</h3>
                        <input
                            type="text"
                            value={newListName}
                            onChange={(e) => setNewListName(e.target.value.replace(/\s/g, ''))}
                            placeholder="List Name (no spaces, e.g., 'characters')"
                            className="w-full bg-neutral-900 border border-neutral-600 p-2 focus:ring-2 focus:ring-neutral-500 outline-none"
                        />
                        <textarea
                            value={newListItems}
                            onChange={(e) => setNewListItems(e.target.value)}
                            placeholder={"Add items, one per line...\nA brave knight\nA cunning rogue\nA wise wizard"}
                            className="w-full h-32 bg-neutral-900 border border-neutral-600 p-2 resize-y focus:ring-2 focus:ring-neutral-500 outline-none font-mono"
                        />
                        <div className="flex justify-end gap-3">
                             <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-sm font-medium text-neutral-300 bg-neutral-700 hover:bg-neutral-600 transition">Cancel</button>
                            <button
                                type="submit"
                                disabled={!newListName.trim() || !newListItems.trim()}
                                className="px-4 py-2 text-sm font-medium text-white bg-neutral-600 hover:bg-neutral-500 transition disabled:opacity-50"
                            >
                                Create List
                            </button>
                        </div>
                    </form>
                )}
            </div>
            
            <div className="space-y-4">
                {lists.length > 0 ? (
                    lists.map(list => (
                        <div key={list.id}>
                            {editingId === list.id ? (
                                <ListEditor
                                    list={list}
                                    onUpdate={onUpdate}
                                    onDelete={onDelete}
                                    onCancel={() => setEditingId(null)}
                                />
                            ) : (
                                <div className="bg-neutral-800/50 p-4 border border-neutral-700 group">
                                    <div className="flex justify-between items-start">
                                        <h4 className="text-lg font-bold text-neutral-200">[{list.name}]</h4>
                                        <button 
                                            onClick={() => setEditingId(list.id)} 
                                            className="text-sm text-neutral-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            Edit
                                        </button>
                                    </div>
                                    <p className="text-sm text-neutral-400 mt-2">Contains {list.items.length} items.</p>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    !isCreating && (
                        <div className="flex flex-col items-center justify-center h-full min-h-[30vh] bg-neutral-900/50 border-2 border-dashed border-neutral-800 p-8 text-center">
                            <div className="w-16 h-16 text-neutral-700"><ShuffleIcon /></div>
                            <h3 className="mt-4 text-xl font-semibold text-neutral-400">No Dynamic Prompt Lists</h3>
                            <p className="mt-1 text-neutral-500">Create a list to start generating randomized prompts.</p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};