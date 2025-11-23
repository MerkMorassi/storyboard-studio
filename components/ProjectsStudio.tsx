import React, { useState } from 'react';
import { Project } from '../types.ts';

interface ProjectsStudioProps {
    projects: Project[];
    activeProjectId: string | null;
    onSelectProject: (id: string) => void;
    onCreateProject: (name: string) => void;
    onRenameProject: (id: string, newName: string) => void;
    onDeleteProject: (id: string) => void;
}

const ProjectCard: React.FC<{
    project: Project;
    isActive: boolean;
    onSelect: () => void;
    onRename: (newName: string) => void;
    onDelete: () => void;
}> = ({ project, isActive, onSelect, onRename, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(project.name);

    const handleRename = () => {
        if (name.trim() && name.trim() !== project.name) {
            onRename(name.trim());
        }
        setIsEditing(false);
    };
    
    return (
        <div className={`p-4 border transition-all duration-300 group ${isActive ? 'bg-neutral-700 border-neutral-500' : 'bg-neutral-800/50 border-neutral-700 hover:bg-neutral-700/50 hover:border-neutral-600'}`}>
            {isEditing ? (
                 <div className="flex flex-col gap-2">
                    <input 
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-600 p-2 text-lg font-bold focus:ring-2 focus:ring-neutral-500 outline-none"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                    />
                    <div className="flex gap-2">
                         <button onClick={handleRename} className="text-xs bg-neutral-600 hover:bg-neutral-500 px-3 py-1">Save</button>
                         <button onClick={() => setIsEditing(false)} className="text-xs bg-neutral-800 hover:bg-neutral-700 px-3 py-1">Cancel</button>
                    </div>
                </div>
            ) : (
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-neutral-200 truncate">{project.name}</h3>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} title="Rename project" className="p-1.5 text-neutral-400 hover:text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete project" className="p-1.5 text-neutral-400 hover:text-red-400">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        </button>
                    </div>
                </div>
            )}
             <button onClick={onSelect} className="w-full mt-4 bg-neutral-600 text-white font-semibold py-2 px-4 hover:bg-neutral-500 transition duration-300 disabled:bg-neutral-700 disabled:text-neutral-400 disabled:cursor-not-allowed" disabled={isActive}>
                {isActive ? 'Currently Active' : 'Switch to this Project'}
            </button>
        </div>
    );
};

export const ProjectsStudio: React.FC<ProjectsStudioProps> = ({ projects, activeProjectId, onSelectProject, onCreateProject, onRenameProject, onDeleteProject }) => {
    const [newProjectName, setNewProjectName] = useState('');

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (newProjectName.trim()) {
            onCreateProject(newProjectName.trim());
            setNewProjectName('');
        }
    };
    
    return (
        <div className="bg-neutral-900/50 p-6 border border-neutral-800 space-y-8 max-w-4xl mx-auto">
            <div>
                <h2 className="text-3xl font-bold text-neutral-200 mb-2">Projects</h2>
                <p className="text-md text-neutral-400 mb-6">Each project has its own separate set of images, storyboards, characters, and settings.</p>

                <form onSubmit={handleCreate} className="bg-neutral-800/50 p-4 border border-neutral-700">
                    <h3 className="text-lg font-semibold text-neutral-300 mb-3">Create New Project</h3>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            placeholder="My Awesome Movie..."
                            className="flex-grow bg-neutral-900 border border-neutral-600 p-2 focus:ring-2 focus:ring-neutral-500 outline-none"
                        />
                        <button
                            type="submit"
                            disabled={!newProjectName.trim()}
                            className="bg-neutral-700 text-white font-semibold py-2 px-4 hover:bg-neutral-600 transition duration-300 disabled:opacity-50"
                        >
                            Create Project
                        </button>
                    </div>
                </form>
            </div>

            <div className="space-y-4">
                {projects.length > 0 ? (
                    projects.map(project => (
                        <ProjectCard
                            key={project.id}
                            project={project}
                            isActive={project.id === activeProjectId}
                            onSelect={() => onSelectProject(project.id)}
                            onRename={(newName) => onRenameProject(project.id, newName)}
                            onDelete={() => onDeleteProject(project.id)}
                        />
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center h-full min-h-[30vh] bg-neutral-900/50 border-2 border-dashed border-neutral-800 p-8 text-center">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-neutral-700" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>
                        <h3 className="mt-4 text-xl font-semibold text-neutral-400">No Projects Found</h3>
                        <p className="mt-1 text-neutral-500">Create your first project above to get started.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
