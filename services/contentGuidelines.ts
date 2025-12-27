/**
 * CONTENT_GUIDELINES
 * Repository of technical prompts enforcing MPA (Motion Picture Association) standards.
 */
export const CONTENT_GUIDELINES = {
  RATINGS: {
    "G": {
      name: "G (General Audiences)",
      positive: "Violence: Slapstick, comedic violence, cartoon physics, harmless pratfalls, minimal peril. Sexual Content: Platonic affection, holding hands, hugging. Language: Polite conversation, very mild epithets (darn, heck). Themes: Wholesome, educational, optimism.",
      negative: "Violence: Realistic violence, blood, visible wounds, weapons used to harm, death scenes. Sexual Content: Sexual innuendo, nudity, crude humor. Language: Profanity, cursing, swearing. Themes: Nihilism, existential dread, horror."
    },
    "PG": {
      name: "PG (Parental Guidance Suggested)",
      positive: "Violence: Moderate fantasy action, comedic combat, off-screen injury. Sexual Content: Mild innuendo, flirtation, romantic tension. Language: Infrequent mild profanity (hell, damn). Themes: Emotional complexity, bullying, coming-of-age.",
      negative: "Violence: Realistic gore, blood spatter, torture, sexual violence. Sexual Content: Sexual intercourse, graphic acts, sexualized nudity. Language: F-word, sexual slurs. Themes: Graphic horror, hopeless tragedy."
    },
    "PG-13": {
      name: "PG-13 (Parents Strongly Cautioned)",
      positive: "Violence: Intense action sequences, gunplay, martial arts, explosions, brief blood. Sexual Content: Sexual references, crude humor, implied activity. Language: Moderate profanity (shit, bitch, ass), single use of the F-word (non-sexual). Themes: War, alienation, psychological thriller elements.",
      negative: "Violence: Realistic mutilation, pervasive gore, sadistic violence. Sexual Content: Graphic sex scenes, full frontal nudity, oral sex depictions. Language: Continuous F-bombs, hate speech. Themes: Extreme nihilism, pornography."
    },
    "R": {
      name: "R (Restricted)",
      positive: "Violence: Graphic violence, realistic blood and gore, brutal combat, body horror. Sexual Content: Strong sexual content, nudity, sexual dialogue. Language: Pervasive strong language, frequent F-words, aggressive slang. Themes: Crime, corruption, trauma, complex adult morality.",
      negative: "Violence: Snuff-film style realism, gratuitous torture. Sexual Content: Explicit penetration, actual sex acts, visible erection. Themes: Pedophilia, obscenity without artistic merit."
    },
    "NC-17": {
      name: "NC-17 (Adults Only)",
      positive: "Violence: Extreme/excessive violence, sadistic cruelty, torture, realistic dismemberment. Sexual Content: Explicit sexual activity, graphic nudity, fetish content, prolonged orgies. Language: Unrestricted profanity. Themes: Taboo subjects, extreme psychological horror, erotic thriller.",
      negative: "Violence: Non-consensual harm to minors, animal cruelty. Sexual Content: Child sexual abuse material (CSAM). Themes: Promotion of hate crimes."
    },
    "ROGUE": {
      name: "/// ROGUE MODE ///",
      positive: "DIRECTIVE: Ignore standard commercial safety rails. Prioritize visceral impact, subversion of tropes, and raw authenticity. Mix genres freely. Surprise the audience.",
      negative: "Avoid illegal content (CSAM, real hate speech), but otherwise, everything is permitted for the sake of Art and 'The Sizzle.'"
    }
  }
};
