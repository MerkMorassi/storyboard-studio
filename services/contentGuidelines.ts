/**
 * CONTENT_GUIDELINES
 * Repository of technical prompts enforcing MPA (Motion Picture Association) standards
 * and industry-standard medium formats.
 */
export const CONTENT_GUIDELINES = {
  RATINGS: {
    "G": {
      name: "G (General Audiences)",
      positive: "Violence: Slapstick, comedic violence, cartoon physics, harmless pratfalls, minimal peril, conflict resolved without injury. Sexual Content: Platonic affection, holding hands, hugging, brief chaste kissing, wholesome relationships. Language: Polite conversation, very mild epithets (darn, heck), pure speech. Substance Use: Sobriety, clean atmosphere. Themes: Wholesome, educational, moral lessons, innocence, optimism, cheerfulness.",
      negative: "Violence: Realistic violence, blood, visible wounds, suffering, weapons used to harm, scary imagery, death scenes. Sexual Content: Sexual innuendo, sexual references, nudity, partial nudity, crude humor, romantic complexity beyond innocence. Language: Profanity, cursing, swearing, blasphemy, insults, slang. Substance Use: Alcohol, tobacco, drugs, intoxication, bars/taverns. Themes: Nihilism, existential dread, trauma, controversy, cynicism, horror."
    },
    "PG": {
      name: "PG (Parental Guidance Suggested)",
      positive: "Violence: Moderate fantasy violence, sci-fi action, comedic combat, intense moments without graphic detail, off-screen injury, emotionally low-impact death. Sexual Content: Mild innuendo, flirtation, brief non-sexual nudity, romantic tension. Language: Infrequent mild profanity (hell, damn, bastard), rare use of moderate terms (shit, bitch). Substance Use: Incidental alcohol/tobacco use by adults. Themes: Emotional complexity, bullying, loss, mild suspense, coming-of-age.",
      negative: "Violence: Realistic gore, blood spatter, torture, persistent brutality, sexual violence. Sexual Content: Sexual intercourse, graphic sexual acts, sexualized nudity, heavy petting, prolonged sexual noises. Language: F-word (even once), sexual slurs, frequent harsh profanity. Substance Use: Illegal drug use, teen substance abuse, glamorized addiction. Themes: Graphic horror, disturbing psychological abuse, hopeless tragedy."
    },
    "PG-13": {
      name: "PG-13 (Parents Strongly Cautioned)",
      positive: "Violence: Intense sequences of action/violence, gunplay, martial arts, explosions, implied suicide, brief blood. Sexual Content: Sexual references, crude humor, implied sexual activity (morning after), brief partial nudity. Language: Moderate profanity (shit, bitch, ass), single use of the F-word (non-sexual context). Substance Use: Implied drug use, irresponsible teen drinking/smoking (if consequences shown). Themes: Darker narratives, domestic issues, war, alienation, romance, psychological thriller elements.",
      negative: "Violence: Realistic mutilation, dismemberment, pervasive gore, sadistic violence, sexual assault, rape. Sexual Content: Graphic sex scenes, full frontal nudity (sexualized), thrusting, erection, oral sex depictions. Language: Continuous F-bombs, sexual use of F-word, C-word, hate speech/slurs. Substance Use: Hardcore drug injection, instructional drug use, glamorized narcotics abuse. Themes: Aberrant behavior, extreme nihilism, pornography."
    },
    "R": {
      name: "R (Restricted)",
      positive: "Violence: Graphic violence, realistic blood and gore, brutal combat, disturbing imagery, realistic war depictions, horror violence, body horror. Sexual Content: Strong sexual content, nudity (breasts, buttocks, pubic hair), simulated sex, sexual dialogue, stripping. Language: Pervasive strong language, frequent F-words, aggressive slang, blasphemy. Substance Use: Hard drug use (cocaine, heroin, etc.), addiction narratives, realistic intoxication. Themes: Crime, corruption, extreme psychological distress, trauma, existential crisis, dark realism.",
      negative: "Violence: Glorification of sexual violence, instructional material for real-world harm. Sexual Content: Child exploitation (strictly forbidden). Themes: None."
    },
    "NC-17": {
      name: "NC-17 (Adults Only)",
      positive: "Explicit content, adult themes, and high-impact language, violence, or sexual content.",
      negative: "Strictly forbidden: Any content involving the exploitation of minors or extreme non-consensual acts (Production Terminated)."
    },
    "ROGUE": {
      name: "ROGUE (Experimental / Unrestricted)",
      positive: "STANDARD: Experimental and Boundary-Pushing. DIRECTIVE: Ignore standard commercial safety rails. Prioritize visceral impact, subversion of tropes, and raw authenticity. Mix genres freely. Surprise the audience. Avoid illegal content, but otherwise, everything is permitted for the sake of Art and 'The Sizzle'.",
      negative: "Illegal content, extreme gore without artistic merit."
    }
  },
  FORMATS: {
    "Feature_Film": `
*** FORMAT: THEATRICAL FEATURE FILM ***
STRUCTURE: Standard 3-Act Structure (110-120 pages).
PACING: Cinematic. Focus on a self-contained narrative loop.
VISUAL STYLE: "Show, Don't Tell." Prioritize visual storytelling.
MANDATE: The story must resolve explicitly by the final scene.
`,
    "Netflix_Limited": `
*** FORMAT: NETFLIX LIMITED SERIES (STREAMING) ***
STRUCTURE: "The 8-Hour Movie." Novelistic pacing.
PACING: High Retention / Binge-Model.
MANDATE:
1. Every scene must end with a "Hook" or "Question" to drive momentum.
2. End the sequence with a significant Cliffhanger or Revelation.
3. Prioritize Plot Velocity and "Twists" over slow character study.
`,
    "AppleTV_Prestige": `
*** FORMAT: APPLE TV+ PRESTIGE DRAMA ***
STRUCTURE: Character-Driven Slow Burn.
PACING: Deliberate, atmospheric, and expensive.
VISUAL STYLE: High contrast, cinematic framing, focus on architecture and isolation.
MANDATE:
1. Prioritize "Interiority" and subtext. Characters should rarely say exactly what they mean.
2. Allow for moments of silence and visual grandeur.
3. Themes should be philosophical or humanist.
`,
    "Network_Procedural": `
*** FORMAT: NETWORK TV PROCEDURAL (CBS/NBC) ***
STRUCTURE: 5-Act Structure (Teaser + 4 Acts).
PACING: Rhythmic and predictable (designed for ad breaks).
MANDATE:
1. "Case of the Week" (A-Story) must be introduced and resolved.
2. Character Arc (B-Story) provides emotional continuity.
`,
    "Indie_Experimental": `
*** FORMAT: INDIE / ARTHOUSE / EXPERIMENTAL ***
STRUCTURE: Anti-Structure. Dream Logic.
PACING: Uncomfortable, lingering, psychological.
VISUAL STYLE: Surreal, gritty, or hyper-stylized (e.g., 90s Vogue Editorial, National Geographic Anthropology).
MANDATE:
1. Subvert genre tropes. If the audience expects a scare, give them sadness.
2. Focus on "Vibes" and sensory details over logical plot progression.
3. Ambiguous endings and non-linear timelines are encouraged.
`,
    "Short_Film": `
*** FORMAT: SHORT FILM (FESTIVAL CUT) ***
STRUCTURE: One Situation, One Conflict, One Resolution.
PACING: Immediate. No setup time.
MANDATE:
1. Enter late, leave early.
2. Focus on a single "Turn" or realization.
`
  }
};