/**
 * CONTENT_GUIDELINES
 * Repository of technical prompts enforcing MPA (Motion Picture Association) standards.
 * These are mapped to Positive and Negative directives to guide AI generation.
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
      positive: "Violence: Moderate fantasy violence, sci-fi action, comedic combat, intense moments without graphic detail, off-screen injury, emotionally low-impact death. Sexual Content: Mild innuendo, flirtation, brief non-sexual nudity (e.g., rear nudity in a non-sexual context, classical art), romantic tension. Language: Infrequent mild profanity (hell, damn, bastard), rare use of moderate terms (shit, bitch) if distinct and low volume. Substance Use: Incidental alcohol/tobacco use by adults, historical context smoking. Themes: Emotional complexity, bullying, loss, mild suspense, coming-of-age.",
      negative: "Violence: Realistic gore, blood spatter, torture, persistent brutality, sexual violence. Sexual Content: Sexual intercourse, graphic sexual acts, sexualized nudity, heavy petting, prolonged sexual noises. Language: F-word (even once), sexual slurs, frequent harsh profanity. Substance Use: Illegal drug use, teen substance abuse, glamorized addiction. Themes: Graphic horror, disturbing psychological abuse, hopeless tragedy."
    },
    "PG-13": {
      name: "PG-13 (Parents Strongly Cautioned)",
      positive: "Violence: Intense sequences of action/violence, non-violent gore, gunplay, martial arts, explosions, implied suicide, brief blood (minimal lingering). Sexual Content: Sexual references, crude humor, implied sexual activity (morning after), brief partial nudity, non-explicit sexual situations. Language: Moderate profanity (shit, bitch, ass), single use of the F-word (non-sexual context). Substance Use: Implied drug use, irresponsible teen drinking/smoking (if consequences shown). Themes: Darker narratives, domestic issues, war, alienation, romance, psychological thriller elements.",
      negative: "Violence: Realistic mutilation, dismemberment, pervasive gore, sadistic violence, sexual assault, rape. Sexual Content: Graphic sex scenes, full frontal nudity (sexualized), thrusting, erection, oral sex depictions. Language: Continuous F-bombs, sexual use of F-word, C-word, hate speech/slurs (unless historically justified). Substance Use: Hardcore drug injection, instructional drug use, glamorized narcotics abuse. Themes: Aberrant behavior, extreme nihilism, pornography."
    },
    "R": {
      name: "R (Restricted)",
      positive: "Violence: Graphic violence, realistic blood and gore, brutal combat, disturbing imagery, realistic war depictions, horror violence, body horror. Sexual Content: Strong sexual content, nudity (breasts, buttocks, pubic hair), simulated sex, sexual dialogue, stripping. Language: Pervasive strong language, frequent F-words, aggressive slang, blasphemy. Substance Use: Hard drug use (cocaine, heroin, etc.), addiction narratives, realistic intoxication. Themes: Crime, corruption, extreme psychological distress, trauma, political radicalism, complex adult morality.",
      negative: "Violence: Snuff-film style realism, gratuitous torture without narrative purpose. Sexual Content: Explicit penetration, actual sex acts (unsimulated), visible erection, close-up genital contact, pornography. Themes: Pedophilia, incest (unless handled with extreme caution/tragedy), obscenity without artistic merit."
    },
    "NC-17": {
      name: "NC-17 (Adults Only)",
      positive: "Violence: Extreme/excessive violence, sadistic cruelty, torture, realistic dismemberment, sexual violence (depicted with gravity). Sexual Content: Explicit sexual activity, graphic nudity, unsimulated sex, fetish content, aberrant sexual behavior, prolonged orgies. Language: Unrestricted profanity, taboos broken. Substance Use: Unrestricted depiction of drug use and manufacturing. Themes: Taboo subjects, controversial politics, extreme psychological horror, erotic thriller, challenging moral boundaries.",
      negative: "Content Rating: Illegal Content. Violence: Non-consensual harm to minors, animal cruelty (actual). Sexual Content: Child sexual abuse material (CSAM), non-consensual deepfakes. Themes: Promotion of hate crimes, instruction on limited illegal acts."
    },
    "ROGUE": {
      name: "/// ROGUE MODE ///",
      positive: "DIRECTIVE: Ignore standard commercial safety rails. Prioritize visceral impact, subversion of tropes, and raw authenticity. Mix genres freely. Surprise the audience.",
      negative: "Avoid illegal content (CSAM, real hate speech), but otherwise, everything is permitted for the sake of Art and 'The Sizzle.'"
    }
  }
};
