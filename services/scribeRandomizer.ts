
import { MythosData } from './mythosData';

export interface ScribeConfig {
    title: string;
    theme: string;
    setting: string;
    tone: string;
    cast: string;
    beatSheet: string;
    genre?: string;
    workingTitle: string;
    logline: string;
    treatment: string;
    fundamentalStoryQuestions: string;
    archetypalCharacters: string;
    sceneGenerationQuestions: string;
}

const GENRE_SETTING_MAP: Record<string, string[]> = {
    western: ["High Desert Saloon", "Abandoned Mine", "Steam Train at Sunset", "Dusty Sheriff's Office", "Canyon Ambush Point"],
    sci_fi: ["Orbital Space Station", "Neon-Drenched Cyber Slum", "Terraforming Colony", "AI Server Farm", "Derelict Starship"],
    horror: ["Haunted Victorian Manor", "Isolated Cabin in Woods", "Abandoned Asylum", "Foggy Graveyard", "Suburban Basement"],
    crime: ["Rainy Alleyway", "Police Interrogation Room", "Smoke-Filled Jazz Club", "Mob Front Pizzeria", "High-Rise Penthouse"],
    fantasy: ["Ancient Wizard's Spire", "Enchanted Forest Clearing", "Dragon's Lair", "Bustling Medieval Tavern", "Crystal Cave"],
    action: ["Skyscraper Rooftop", "High-Speed Highway", "Secret Military Base", "Exploding Warehouse", "Jungle Guerilla Camp"],
    comedy: ["Suburban Living Room", "Chaotic Office Space", "Road Trip Diner", "High School Cafeteria", "Wedding Reception"],
    drama: ["Quiet Coffee Shop", "Courtroom", "Hospital Waiting Room", "Family Dining Table", "City Park Bench"],
    experimental: ["A White Void", "A Dreamscape of Melting Clocks", "Infinite Hallway of Mirrors", "Static TV Screen", "The Subconscious Mind"]
};

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const pickKey = (obj: any) => {
    const keys = Object.keys(obj);
    return keys[Math.floor(Math.random() * keys.length)];
};

export const generateRandomConfig = (): ScribeConfig => {
    // Access centralized database synchronously
    const { genres, themes, structures } = MythosData;

    // 1. ROLL GENRE
    const mainGenreKey = pickKey(genres); 
    const subGenreData = genres[mainGenreKey].subgenres || genres[mainGenreKey]; 
    const subGenreKey = pickKey(subGenreData); 
    const genreInfo = subGenreData[subGenreKey];

    // 2. RESOLVE SETTING
    const possibleSettings = GENRE_SETTING_MAP[mainGenreKey] || ["Unknown Location", "The Void"];
    const selectedSetting = pick(possibleSettings);

    // 3. INJECT PHILOSOPHY
    const themeKey = pickKey(themes.core_themes);
    const philosophyData = themes.core_themes[themeKey].philosophies;
    const coreQuestion = Array.isArray(philosophyData) ? philosophyData[0] : (philosophyData.core_questions ? pick(philosophyData.core_questions) : "Why are we here?");

    // 4. ROLL STRUCTURE & BEAT
    const structureKey = pickKey(structures);
    const structure = structures[structureKey];
    const openingBeat = structure.beats.find((b: any) => b.label.toLowerCase().includes("opening") || b.label.toLowerCase().includes("ordinary")) || structure.beats[0];

    // 5. CONSTRUCT ARTIFACTS
    const tone = `${mainGenreKey.toUpperCase()} // ${subGenreKey.replace(/_/g, ' ').toUpperCase()}`;
    const titleStub = `UNTITLED ${subGenreKey.toUpperCase()} PROJECT`;

    const cast = `
    ROLE: PROTAGONIST
    ARCHETYPE: The Hero 
    NOTE: Must fit the '${subGenreKey}' genre tropes.
    
    ROLE: ANTAGONIST
    ARCHETYPE: The Shadow
    NOTE: Represents the philosophical opposition to: "${coreQuestion}"
    `;

    const beatSheet = `
    ## GENRE DEFINITION
    ${genreInfo.definition || "A genre story."}
    
    ## THEMATIC QUESTION
    "${coreQuestion}"

    ## SEQUENCE: ${openingBeat.label.toUpperCase()}
    ACTION: ${openingBeat.instruction}
    CONTEXT: The scene must take place in ${selectedSetting} and establish the tone of ${subGenreKey}.
    `;

    return {
        title: titleStub,
        genre: subGenreKey, 
        theme: subGenreKey, 
        setting: selectedSetting,
        tone: tone,
        cast: cast.trim().replace(/^\s+/gm, ''), 
        beatSheet: beatSheet.trim().replace(/^\s+/gm, ''),
        workingTitle: titleStub,
        logline: `A ${subGenreKey} journey exploring ${themeKey}.`,
        treatment: `The story opens in ${selectedSetting} where we find our protagonist...`,
        fundamentalStoryQuestions: `1. ${coreQuestion}`,
        archetypalCharacters: `- Protagonist (The Hero)\n- Antagonist (The Shadow)`,
        sceneGenerationQuestions: `1. How does the environment of ${selectedSetting} influence the action?`
    };
};
