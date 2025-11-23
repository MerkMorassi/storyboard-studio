import React, { useState, useEffect } from 'react';
import { DynamicPromptList } from '../types.ts';
import { ShuffleIcon } from './icons.tsx';

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
                <button onClick={() => onDelete(list.id)} className="px-4 py-2 text-sm font-medium text-red-400 bg-neutral-900 hover:bg-red-900/50 transition">Delete</button>
                <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-neutral-300 bg-neutral-700 hover:bg-neutral-600 transition">Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-neutral-600 hover:bg-neutral-500 transition">Save Changes</button>
            </div>
        </div>
    );
};

const CreateListForm: React.FC<{
    onCreate: (name: string, items: string[]) => void;
}> = ({ onCreate }) => {
    const [name, setName] = useState('');
    const [items, setItems] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        const itemsArray = items.split('\n').map(item => item.trim()).filter(Boolean);
        if (name.trim() && itemsArray.length > 0) {
            onCreate(name.trim(), itemsArray);
            setName('');
            setItems('');
            setIsExpanded(false);
        }
    };

    if (!isExpanded) {
        return (
            <button 
                onClick={() => setIsExpanded(true)}
                className="w-full py-3 border-2 border-dashed border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-300 transition flex items-center justify-center gap-2"
            >
                <span className="text-xl">+</span> Create New Prompt List
            </button>
        )
    }

    return (
        <form onSubmit={handleCreate} className="bg-neutral-800/50 p-4 border border-neutral-700 space-y-3 animate-fade-in">
            <h3 className="text-lg font-semibold text-neutral-300">New Dynamic List</h3>
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="List Name (e.g., colors, moods)"
                className="w-full bg-neutral-900 border border-neutral-600 p-2 focus:ring-2 focus:ring-neutral-500 outline-none"
            />
            <textarea
                value={items}
                onChange={(e) => setItems(e.target.value)}
                placeholder="List items here, one per line..."
                className="w-full h-28 bg-neutral-900 border border-neutral-600 p-2 resize-y focus:ring-2 focus:ring-neutral-500 outline-none font-mono"
            />
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => setIsExpanded(false)}
                    className="flex-1 bg-neutral-800 text-neutral-300 font-semibold py-2 px-4 hover:bg-neutral-700 transition duration-300"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={!name.trim() || !items.trim()}
                    className="flex-1 bg-neutral-700 text-white font-semibold py-2 px-4 hover:bg-neutral-600 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Create List
                </button>
            </div>
        </form>
    );
};

export const DynamicPromptsStudio: React.FC<DynamicPromptsStudioProps> = ({ lists, onCreate, onUpdate, onDelete }) => {
    const [editingId, setEditingId] = useState<string | null>(null);

    return (
        <div className="bg-neutral-900/50 p-6 border border-neutral-800 space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-neutral-300 mb-2">Dynamic Prompts</h2>
                <p className="text-sm text-neutral-400 mb-6">Create lists of variables (like [character], [location]) to inject randomness into your prompts. Use these in the Grid input panel like: "A photo of [character] in [location]".</p>
                
                <CreateListForm onCreate={onCreate} />
            </div>
            
            <div className="space-y-4">
                {lists.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {lists.map(list => (
                            <div key={list.id}>
                                {editingId === list.id ? (
                                    <ListEditor
                                        list={list}
                                        onUpdate={onUpdate}
                                        onDelete={onDelete}
                                        onCancel={() => setEditingId(null)}
                                    />
                                ) : (
                                    <div className="bg-neutral-800/50 p-4 border border-neutral-700 group hover:border-neutral-600 transition-all">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="text-lg font-bold text-neutral-200 flex items-center gap-2">
                                                [{list.name}]
                                            </h4>
                                            <button 
                                                onClick={() => setEditingId(list.id)} 
                                                className="text-sm text-neutral-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                        <div className="bg-neutral-900/50 p-2 rounded text-xs text-neutral-400 font-mono h-24 overflow-y-auto border border-neutral-800">
                                            {list.items.map((item, i) => (
                                                <div key={i} className="truncate">• {item}</div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-neutral-500 mt-2 text-right">{list.items.length} items</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full min-h-[30vh] bg-neutral-900/50 border-2 border-dashed border-neutral-800 p-8 text-center">
                        <div className="w-16 h-16 text-neutral-700"><ShuffleIcon /></div>
                        <h3 className="mt-4 text-xl font-semibold text-neutral-400">No Lists Created</h3>
                        <p className="mt-1 text-neutral-500">Create a list to start using dynamic variables in your prompts.</p>
                    </div>
                )}
            </div>
        </div>
    );
};