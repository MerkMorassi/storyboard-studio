
export const simpleMarkdownToHtml = (markdown: string): string => {
    if (!markdown) return '';

    let html = markdown
        // Escape HTML characters to prevent injection (basic)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        
        // Headers
        .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-brand-hover mt-4 mb-2">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-white mt-5 mb-3">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-white mt-6 mb-4 border-b border-accent pb-2">$1</h1>')
        
        // Bold
        .replace(/\*\*(.*?)\*\*/gim, '<strong class="text-white">$1</strong>')
        .replace(/__((?:[^_]|_[^_])*?)__/gim, '<strong class="text-white">$1</strong>')
        
        // Italic
        .replace(/\*(.*?)\*/gim, '<em class="text-neutral-300">$1</em>')
        .replace(/_((?:[^_]|__)*?)_/gim, '<em class="text-neutral-300">$1</em>')
        
        // Blockquotes
        .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-brand pl-4 py-1 my-4 italic text-neutral-400 bg-neutral-800/30 rounded-r">$1</blockquote>')
        
        // Code blocks
        .replace(/```([\s\S]*?)```/gim, '<pre class="bg-black/50 p-4 rounded-lg my-4 overflow-x-auto border border-accent"><code class="font-mono text-sm text-green-400">$1</code></pre>')
        
        // Inline code
        .replace(/`([^`]+)`/gim, '<code class="bg-black/50 px-1.5 py-0.5 rounded font-mono text-sm text-green-400 border border-white/10">$1</code>')
        
        // Lists (unordered) - Wrap in a div to simulate list structure for visuals
        .replace(/^\s*-\s+(.*$)/gim, '<div class="flex gap-2 mb-1 ml-4"><span class="text-brand">•</span><span>$1</span></div>')
        .replace(/^\s*\*\s+(.*$)/gim, '<div class="flex gap-2 mb-1 ml-4"><span class="text-brand">•</span><span>$1</span></div>')
        
        // Horizontal Rule
        .replace(/^---$/gim, '<hr class="border-accent my-6" />');

    // Paragraphs: Any text block separated by double newlines that isn't already a tag
    return html.split('\n\n').map(block => {
        if (block.trim().match(/^<(h|div|blockquote|pre|hr)/)) return block;
        return `<p class="mb-4 leading-relaxed">${block.replace(/\n/g, '<br/>')}</p>`;
    }).join('');
};
