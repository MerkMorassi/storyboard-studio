
// JSON files will be fetched dynamically, not directly imported.
let _genresData: any;
let _themesData: any;
let _structuresData: any;
let _archetypesData: any;

const _loadRandomizerJsonData = async () => {
    if (_genresData && _themesData && _structuresData && _archetypesData) return; // Already loaded

    const files = [
        { name: 'genres.json', url: '/data/writer/genres.json', target: '_genresData' },
        { name: 'novel_themes.json', url: '/data/writer/novel_themes.json', target: '_themesData' },
        { name: 'structures.json', url: '/data/writer/structures.json', target: '_structuresData' },
        { name: 'archetypes.json', url: '/data/writer/archetypes.json', target: '_archetypesData' }
    ];

    for (const file of files) {
        try {
            const res = await fetch(file.url);
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            const rawText = await res.text();
            if (!rawText.trim()) {
                throw new Error("Response was empty.");
            }
            // Dynamically assign to the correct state variable
            if (file.target === '_genresData') _genresData = JSON.parse(rawText);
            else if (file.target === '_themesData') _themesData = JSON.parse(rawText);
            else if (file.target === '_structuresData') _structuresData = JSON.parse(rawText);
            else if (file.target === '_archetypesData') _archetypesData = JSON.parse(rawText);

        } catch (error) {
            console.error(`Error loading Randomizer JSON data from ${file.name}:`, error);
            throw new Error(`Failed to load Randomizer data from ${file.name}. Ensure the file exists and contains valid JSON. Details: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
};

// --- TYPE DEFINITIONS ---
export interface ScribeConfig {
    title: string; // Original title input for blueprint, will become workingTitle
    genre: string; // New field for genre
    theme: string;
    setting: string;
    tone: string;
    cast: string;
    beatSheet: string;
    // New fields for the comprehensive template outline
    workingTitle: string; // New field for the AI-generated/refined title
    logline: string;
    treatment: string;
    fundamentalStoryQuestions: string;
    archetypalCharacters: string;
    sceneGenerationQuestions: string;
}

// Added interface for archetype data to ensure type safety when accessing 'name'
interface ArchetypeData {
    name: string;
    // Add other properties if they exist in the JSON and are used, e.g., description?: string;
}

// --- CONTEXT MAPPING ---
// Forces settings to match genres so we don't get Cowboys in Space (unless intended).
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

// --- HELPER FUNCTIONS ---
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const pickKey = (obj: any) => {
    const keys = Object.keys(obj);
    return keys[Math.floor(Math.random() * keys.length)];
};

// --- THE RANDOMIZER ENGINE ---
export const generateRandomConfig = async (): Promise<ScribeConfig> => {
    await _loadRandomizerJsonData(); // Ensure data is loaded

    // Cast to 'any' to bypass strict JSON typing for dynamic access
    const genres = _genresData as any;
    const themes = _themesData as any;
    const structures = _structuresData as any;
    const archetypes = _archetypesData as any; // Access archetypes

    // 1. ROLL GENRE & SUBGENRE
    const mainGenreKey = pickKey(genres); // e.g., "sci_fi"
    const subGenreData = genres[mainGenreKey].subgenres || genres[mainGenreKey]; 
    const subGenreKey = pickKey(subGenreData); 
    const genreInfo = subGenreData[subGenreKey];

    // 2. RESOLVE SETTING
    const possibleSettings = GENRE_SETTING_MAP[mainGenreKey] || ["Unknown Location", "The Void"];
    const selectedSetting = pick(possibleSettings);

    // 3. INJECT PHILOSOPHY (Thematic Depth)
    const themeKey = pickKey(themes.core_themes);
    const philosophyData = themes.core_themes[themeKey].philosophies;
    const coreQuestion = Array.isArray(philosophyData) ? philosophyData[0] : (philosophyData.core_questions ? pick(philosophyData.core_questions) : "Why are we here?");

    // 4. ROLL STRUCTURE & BEAT
    const structureKey = pickKey(structures);
    const structure = structures[structureKey];
    const openingBeat = structure.beats.find((b: any) => b.label.toLowerCase().includes("opening") || b.label.toLowerCase().includes("ordinary")) || structure.beats[0];

    // 5. CONSTRUCT THE ARTIFACTS
    const tone = `${mainGenreKey.toUpperCase()} // ${subGenreKey.replace(/_/g, ' ').toUpperCase()}`;
    const titleStub = `UNTITLED ${subGenreKey.toUpperCase()} PROJECT`;

    // Fixed: Explicitly cast `Object.values` results to `ArchetypeData[]`
    // Pick some archetypes for initial suggestion
    const randomJungian = pick(Object.values(archetypes.jungian_core) as ArchetypeData[]).name;
    const randomPearson = pick(Object.values(archetypes.pearson_12) as ArchetypeData[]).name;

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
    (Ref: ${genreInfo.examples ? genreInfo.examples.join(', ') : "N/A"})

    ## THEMATIC QUESTION
    "${coreQuestion}"

    ## SEQUENCE: ${openingBeat.label.toUpperCase()}
    ACTION: ${openingBeat.instruction}
    CONTEXT: The scene must take place in ${selectedSetting} and establish the tone of ${subGenreKey}.
    `;

    // --- NEW: Populate placeholder/default for outline fields ---
    const logline = `A [protagonist_type] named [character_name], battling [internal_struggle] in a [setting_type] world, must confront [antagonist_type] to ${coreQuestion.toLowerCase().replace('?', '.')}.`;
    
    const treatment = `
[Protagonist Name], a [description] living in a ${selectedSetting}, is deeply affected by the philosophical question: "${coreQuestion}". An inciting incident (drawing from "${openingBeat.label}") forces them to embark on a journey. They encounter various challenges, reflecting the themes of ${themeKey} and the genre of ${subGenreKey}. The midpoint brings a major twist, leading to a dark night where they confront their flaws. Ultimately, they face the antagonist, (which could be the abstract concept of "${coreQuestion}" or a concrete character), leading to a resolution where they find ${pick(['acceptance', 'redemption', 'a new truth'])}.
    `.trim();

    const fundamentalStoryQuestions = `
1. What is the protagonist's main goal? (e.g., to find purpose, to survive, to learn the truth)
2. What is the antagonist's main goal? (e.g., to maintain control, to spread chaos, to suppress truth)
3. What is the central conflict between the protagonist and antagonist?
4. What is at stake for the protagonist if they fail to achieve their goal?
5. What is the protagonist's character flaw or weakness?
6. What event/incident sets the story in motion?
7. What is the midpoint twist that raises the stakes?
8. What is the climax of the story?
9. What is the resolution of the story?
    `.trim();

    const archetypalCharacters = `
- Protagonist: The Hero (e.g., The ${randomPearson})
- Antagonist: The Shadow (e.g., The ${pick(Object.values(archetypes.masculine_moore) as ArchetypeData[]).name})
- Mentor: The Sage
- Love Interest: The Lover
- Sidekick: The Orphan
- Threshold Guardian: The Gatekeeper (e.g., The ${randomJungian})
- Shapeshifter: The Trickster
- Trickster: The Jester
    `.trim();

    const sceneGenerationQuestions = `
1. What is the specific 'ordinary world' event that grounds the protagonist?
2. How does the 'call to adventure' manifest visually and emotionally?
3. What specific interaction introduces the main conflict or antagonist?
4. Describe a moment where the protagonist is confronted by their weakness.
5. What is the 'new world' like, and how does the protagonist first navigate it?
6. Detail a 'fun and games' scene where the protagonist experiences initial success or failure.
7. What is the exact 'midpoint' event that changes everything?
8. How do 'bad guys close in', making the situation feel hopeless?
    `.trim();


    return {
        title: titleStub, // Initial title input
        genre: mainGenreKey, // Randomly selected genre
        theme: subGenreKey, 
        setting: selectedSetting,
        tone: tone,
        cast: cast.trim().replace(/^\s+/gm, ''), 
        beatSheet: beatSheet.trim().replace(/^\s+/gm, ''),
        // New outline fields
        workingTitle: titleStub, // Initial working title
        logline: logline.trim(),
        treatment: treatment.trim(),
        fundamentalStoryQuestions: fundamentalStoryQuestions,
        archetypalCharacters: archetypalCharacters,
        sceneGenerationQuestions: sceneGenerationQuestions,
    };
};