
import genresData from '../data/writer/genres.json';
import structuresData from '../data/writer/structures.json';
import archetypesData from '../data/writer/archetypes.json';

// --- TYPE DEFINITIONS ---
export interface ScribeConfig {
    title: string;
    theme: string;
    setting: string;
    tone: string;
    cast: string;
    beatSheet: string;
}

// --- SMART MAPPINGS (CONTEXT LOGIC) ---
const GENRE_SETTING_MAP: Record<string, string[]> = {
    western: ["High Desert Saloon", "Abandoned Mine", "Steam Train at Sunset", "Dusty Sheriff's Office", "Canyon Ambush Point", "Frontier Town"],
    sci_fi: ["Orbital Space Station", "Neon-Drenched Cyber Slum", "Terraforming Colony", "AI Server Farm", "Derelict Starship", "Virtual Reality Void"],
    horror: ["Haunted Victorian Manor", "Isolated Cabin in Woods", "Abandoned Asylum", "Foggy Graveyard", "Suburban Basement", "Ancient Ritual Site"],
    crime: ["Rainy Alleyway", "Police Interrogation Room", "Smoke-Filled Jazz Club", "Mob Front Pizzeria", "High-Rise Penthouse", "Forensics Lab"],
    fantasy: ["Ancient Wizard's Spire", "Enchanted Forest Clearing", "Dragon's Lair", "Bustling Medieval Tavern", "Crystal Cave", "Floating City"],
    action: ["Skyscraper Rooftop", "High-Speed Highway", "Secret Military Base", "Exploding Warehouse", "Jungle Guerilla Camp", "Underground Fight Club"],
    comedy: ["Suburban Living Room", "Chaotic Office Space", "Road Trip Diner", "High School Cafeteria", "Wedding Reception", "Television Studio"],
    drama: ["Quiet Coffee Shop", "Courtroom", "Hospital Waiting Room", "Family Dining Table", "City Park Bench", "Corporate Boardroom"],
    experimental: ["A White Void", "A Dreamscape of Melting Clocks", "Infinite Hallway of Mirrors", "Static TV Screen", "The Subconscious Mind", "Non-Euclidean Room"]
};

// --- FALLBACK THEMES ---
// Hardcoded themes to ensure stability if external files are missing or malformed
const FALLBACK_THEMES = [
    { key: "identity_crisis", question: "Who are we beneath the mask?" },
    { key: "survival_instinct", question: "What is the cost of staying alive?" },
    { key: "redemption_arc", question: "Can the past truly be rewritten?" },
    { key: "corruption_of_power", question: "Does absolute power always corrupt?" },
    { key: "digital_extinction", question: "Is consciousness defined by biology or memory?" },
    { key: "love_vs_duty", question: "What matters more: the heart or the law?" },
    { key: "technological_singularity", question: "Have we created our own destruction?" }
];

// --- HELPER FUNCTIONS ---
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const pickKey = (obj: any) => {
    const keys = Object.keys(obj);
    return keys[Math.floor(Math.random() * keys.length)];
};

// --- FLATTEN ARCHETYPES HELPER ---
const getAllArchetypes = (data: any): any[] => {
    let all: any[] = [];
    // Iterate over categories (jungian_core, masculine_moore, etc.)
    Object.keys(data).forEach(key => {
        if (key === 'meta') return;
        const category = data[key];
        if (typeof category === 'object' && category !== null) {
            Object.values(category).forEach((arch: any) => {
                if (arch.name) all.push(arch);
            });
        }
    });
    return all;
};

// --- THE RANDOMIZER ENGINE ---
export const generateRandomConfig = (): ScribeConfig => {
    const genres = genresData as any;
    const structures = structuresData as any;
    
    // Flatten the categorized archetypes into a single pool for random selection
    const allArchetypes = getAllArchetypes(archetypesData);

    // 1. ROLL GENRE & SUBGENRE
    const mainGenreKey = pickKey(genres); 
    const subGenreKey = pickKey(genres[mainGenreKey].subgenres); 
    const genreInfo = genres[mainGenreKey].subgenres[subGenreKey];

    // 2. RESOLVE SETTING (Context Aware)
    const possibleSettings = GENRE_SETTING_MAP[mainGenreKey] || ["Unknown Location", "The Void"];
    const selectedSetting = pick(possibleSettings);

    // 3. INJECT PHILOSOPHY (Thematic Depth)
    const themeObj = pick(FALLBACK_THEMES);
    const themeKey = themeObj.key;
    const coreQuestion = themeObj.question;

    // 4. ROLL STRUCTURE & BEAT
    const structureKey = pickKey(structures);
    const structure = structures[structureKey];
    
    // Find a beat that looks like an opening (usually index 0 or 1)
    const openingBeat = structure.beats.find((b: any) => 
        b.label.toLowerCase().includes("call") || 
        b.label.toLowerCase().includes("inciting") || 
        b.label.toLowerCase().includes("ordinary") || 
        b.label.toLowerCase().includes("hook") || 
        b.label.toLowerCase().includes("opening") ||
        b.label.toLowerCase().includes("introduction")
    ) || structure.beats[0];

    // 5. CASTING (Use flattened list)
    // Pick 2 distinct archetypes from the pool
    const role1 = pick(allArchetypes);
    let role2 = pick(allArchetypes);
    while (role2.name === role1.name && allArchetypes.length > 1) { 
        role2 = pick(allArchetypes); 
    }

    // Helper to extract fields safely
    const getTrait = (role: any) => role.traits ? role.traits.join(', ') : (role.virtue || 'Defined by Action');
    const getShadow = (role: any) => role.shadow || role.shadow_aspect || 'Internal Darkness';
    const getMotivation = (role: any) => role.motivation || role.core_desire || 'To overcome';

    // 6. CONSTRUCT THE ARTIFACTS
    const tone = `${mainGenreKey.toUpperCase()} // ${subGenreKey.replace(/_/g, ' ').toUpperCase()}`;
    const titleStub = `UNTITLED ${subGenreKey.toUpperCase()} SCRIPT`;

    const cast = `
ROLE: PROTAGONIST
ARCHETYPE: ${role1.name}
TRAIT: ${getTrait(role1)}
SHADOW: ${getShadow(role1)}
NOTE: Must fit the '${subGenreKey}' genre tropes.

ROLE: ANTAGONIST
ARCHETYPE: ${role2.name}
MOTIVATION: ${getMotivation(role2)}
NOTE: Represents the philosophical opposition to: "${coreQuestion}"
    `;

    const beatSheet = `
## GENRE DEFINITION
${genreInfo.definition}
(Examples: ${genreInfo.examples.join(', ')})

## THEMATIC QUESTION
"${coreQuestion}"
(Theme: ${themeKey.replace(/_/g, ' ').toUpperCase()})

## STRUCTURE: ${structure.name.toUpperCase()}
## SEQUENCE: ${openingBeat.label.toUpperCase()}
ACTION: ${openingBeat.instruction}
CONTEXT: The scene must take place in ${selectedSetting} and establish the tone of ${subGenreKey}.
    `;

    return {
        title: titleStub,
        theme: subGenreKey, 
        setting: selectedSetting,
        tone: tone,
        cast: cast.trim().replace(/^\s+/gm, ''), 
        beatSheet: beatSheet.trim().replace(/^\s+/gm, '')
    };
};
