import React, { useState, useRef } from 'react';
import { Character } from '../types.ts';
// FIX: Corrected icon imports to use their individual files and added missing EditIcon.
import { PencilIcon, EditIcon, CloseIcon } from './icons.tsx';
import { TrashIcon } from './icons/TrashIcon.tsx';
import { UserIcon } from './icons/UserIcon.tsx';
import { PlusIcon } from './icons/PlusIcon.tsx';

interface CharactersStudioProps {
    characters: Character[];
    onCreate: (data: Partial<Character>) => void;
    onUpdate: (id: string, data: Partial<Character>) => void;
    onDelete: (id: string) => void;
}

const CharacterForm: React.FC<{
    character?: Character | null;
    onSave: (data: Partial<Character>) => void;
    onCancel: () => void;
}> = ({ character, onSave, onCancel }) => {
    const [name, setName] = useState(character?.name || '');
    const [archetype, setArchetype] = useState(character?.archetype || '');
    const [description, setDescription] = useState(character?.description || '');
    const [avatar, setAvatar] = useState<string | undefined>(character?.avatar);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => setAvatar(e.target?.result as string);
            reader.readAsDataURL(file);
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ id: character?.id, name, archetype, description, avatar });
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 w-full max-w-lg space-y-4">
                <h3 className="text-lg font-bold text-white mb-2">{character ? 'Edit Character' : 'Create New Character'}</h3>
                <div className="flex items-center gap-4">
                    <div className="w-24 h-24 rounded-full bg-neutral-800 flex items-center justify-center overflow-hidden border border-neutral-700 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        {avatar ? <img src={avatar} alt={name} className="w-full h-full object-cover" /> : <UserIcon className="w-12 h-12 text-neutral-600" />}
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
                    <div className="flex-grow space-y-3">
                        <input value={name} onChange={e => setName(e.target.value)} placeholder="Character Name" className="w-full bg-neutral-800 p-2 rounded" required />
                        <input value={archetype} onChange={e => setArchetype(e.target.value)} placeholder="Archetype (e.g., The Hero)" className="w-full bg-neutral-800 p-2 rounded" />
                    </div>
                </div>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description, traits, backstory..." rows={5} className="w-full bg-neutral-800 p-2 rounded" />
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-neutral-300">Cancel</button>
                    <button type="submit" className="px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded">Save</button>
                </div>
            </form>
        </div>
    );
};


export const CharactersStudio: React.FC<CharactersStudioProps> = ({ characters, onCreate, onUpdate, onDelete }) => {
    const [editingCharacter, setEditingCharacter] = useState<Character | 'new' | null>(null);

    const handleSave = (data: Partial<Character>) => {
        if (editingCharacter === 'new') {
            onCreate(data);
        } else if (editingCharacter && data.id) {
            onUpdate(data.id, data);
        }
        setEditingCharacter(null);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto w-full space-y-8 h-full overflow-y-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-neutral-200 mb-2">Character Studio</h2>
                    <p className="text-neutral-400">Manage fictional characters and archetypes for your projects.</p>
                </div>
                <button
                    onClick={() => setEditingCharacter('new')}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-lg"
                >
                    <PlusIcon className="w-5 h-5" />
                    <span>New Character</span>
                </button>
            </div>

            {characters.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-[50vh] border-2 border-dashed border-neutral-800 rounded-xl text-center">
                    <PencilIcon className="w-16 h-16 text-neutral-700 mb-4" />
                    <h3 className="text-xl font-semibold text-neutral-300">No Characters Defined</h3>
                    <p className="text-neutral-500">Create a character to begin building your cast.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {characters.map(char => (
                        <div key={char.id} className="group relative bg-neutral-800 rounded-lg overflow-hidden border border-neutral-700">
                            <div className="aspect-[3/4] bg-neutral-900 flex items-center justify-center">
                                {char.avatar ? <img src={char.avatar} alt={char.name} className="w-full h-full object-cover"/> : <UserIcon className="w-16 h-16 text-neutral-700"/>}
                            </div>
                            <div className="p-4">
                                <h3 className="font-bold text-white truncate">{char.name}</h3>
                                <p className="text-xs text-neutral-400">{char.archetype}</p>
                            </div>
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button onClick={() => setEditingCharacter(char)} className="p-2 bg-blue-600 rounded-full text-white"><EditIcon/></button>
                                <button onClick={() => onDelete(char.id)} className="p-2 bg-red-600 rounded-full text-white"><TrashIcon/></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {editingCharacter && (
                <CharacterForm
                    character={editingCharacter === 'new' ? null : editingCharacter}
                    onSave={handleSave}
                    onCancel={() => setEditingCharacter(null)}
                />
            )}
        </div>
    );
};