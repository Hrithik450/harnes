export interface MusicalSoundProfile {
  pitchRange: string;
  timbre: string;
  cadence: string;
  musicalAnalogy: string;
}

export interface VoiceProfile {
  id: string;
  name: string;
  gender: "female" | "male";
  accent: "American" | "British" | "Australian";
  musicalSound: MusicalSoundProfile;
  plainSoundDescription: string;
  bestFor: string;
  languageCode?: string;
}

/**
 * ElevenLabs Premade Voice Catalog described in plain English musical and acoustic qualities.
 * Everything is sound-based: pitch range, timbre, tempo cadence, and musical analogy.
 * No redundant keyword lists—matching is performed directly against acoustic and musical descriptions.
 */
export const ELEVENLABS_VOICE_CATALOG: VoiceProfile[] = [
  {
    id: "21m00Tcm4TlvDq8ikWAM",
    name: "Rachel",
    gender: "female",
    accent: "American",
    musicalSound: {
      pitchRange: "Warm mid-range mezzo tone (grounded chest resonance)",
      timbre: "Gentle natural breathiness, rounded soft consonants without sharp peaks",
      cadence: "Smooth legato phrasing, relaxed unhurried conversational tempo",
      musicalAnalogy:
        "Sounds like a warm acoustic coffeehouse ballad on nylon strings—soothing, authentic, intimate, and deeply comforting.",
    },
    plainSoundDescription:
      "Warm, intimate mid-pitch female voice with gentle breath and smooth legato flow. Feels like a comforting acoustic song.",
    bestFor:
      "Lifestyle, skincare, wellness, beauty, authentic storytelling, approachable promos",
  },
  {
    id: "9BWtsMINqrJLrRacOk9x",
    name: "Aria",
    gender: "female",
    accent: "American",
    musicalSound: {
      pitchRange: "Bright, rich soprano-to-mezzo with dynamic chest resonance",
      timbre: "Luminous, polished, expressive highs with zero vocal distortion",
      cadence: "Crisp rhythmic cadence with confident crescendos on emphasis words",
      musicalAnalogy:
        "Sounds like a soaring chamber string section—refined, commanding, vibrant, and elegant.",
    },
    plainSoundDescription:
      "Bright, rich female voice with dynamic resonance and confident crests. Feels like refined, soaring cinematic strings.",
    bestFor:
      "Luxury brands, corporate ads, finance, executive presentations, premium storytelling",
  },
  {
    id: "EXAVITQu4vr4xnSDxMaL",
    name: "Sarah",
    gender: "female",
    accent: "American",
    musicalSound: {
      pitchRange: "Soft, light-airy soprano in a sweet mid-high register",
      timbre: "Clean, dry, airy texture with effortless breath control",
      cadence: "Linear, breezy melodic contour with natural casual micro-pauses",
      musicalAnalogy:
        "Sounds like a gentle ukulele strum in open air—effortless, sweet, unpretentious, and cheerful.",
    },
    plainSoundDescription:
      "Soft, airy, sweet soprano with an easygoing rhythm. Feels like a light, breezy acoustic strum.",
    bestFor:
      "Retail promos, entertainment, everyday explainers, social product reviews",
  },
  {
    id: "FGY2WhTYpPnrIDTdsKH5",
    name: "Laura",
    gender: "female",
    accent: "American",
    musicalSound: {
      pitchRange: "High-energy, bright upper-mezzo with forward vocal projection",
      timbre: "Crisp acoustic attack, punchy transients, sharp articulate consonants",
      cadence: "Fast, punchy staccato rhythm with brisk upbeat momentum",
      musicalAnalogy:
        "Sounds like a lively pop brass hook or upbeat synth groove—exciting, bouncy, electric, and urgent.",
    },
    plainSoundDescription:
      "High-energy, punchy, upbeat female voice with crisp staccato rhythm. Feels like an electric pop brass hook.",
    bestFor:
      "Flash sales, high-energy retail promos, fitness, e-commerce drops, event announcements",
  },
  {
    id: "Xb7hH8MSUJpSbSDYk0k2",
    name: "Alice",
    gender: "female",
    accent: "British",
    musicalSound: {
      pitchRange: "Clean, crystalline mid-pitch British female register",
      timbre: "Pure harmonic overtones, zero grain, bell-like clarity on complex diction",
      cadence: "Steady, metronomic cadence with balanced, poised vocal arcs",
      musicalAnalogy:
        "Sounds like a Steinway grand piano playing crisp classical arpeggios—articulate, poised, intellectual, and lucid.",
    },
    plainSoundDescription:
      "Crystalline, bell-like British female voice with metronomic poise. Feels like a Steinway piano playing crisp classical notes.",
    bestFor:
      "Tech SaaS, B2B education, healthcare, professional services, masterclasses",
  },
  {
    id: "pFZP5JQG7iQjIQuC4Bku",
    name: "Lily",
    gender: "female",
    accent: "British",
    musicalSound: {
      pitchRange: "Low-register female contralto with rich smoky mid-low harmonics",
      timbre: "Velvety, dark, sultry texture with a soft breathy tail on phrases",
      cadence: "Slow, luscious legato glide with intimate proximity effect",
      musicalAnalogy:
        "Sounds like a muted jazz trumpet or warm double bass in a midnight lounge—sensual, hypnotic, and luxurious.",
    },
    plainSoundDescription:
      "Smoky, velvety, low-register female contralto with slow legato glide. Feels like a muted jazz horn in a late-night lounge.",
    bestFor:
      "Luxury real estate, hospitality, boutique fragrance, emotional storytelling, atmospheric spots",
  },
  {
    id: "cgSgspJ2msm6clMCkdW9",
    name: "Jessica",
    gender: "female",
    accent: "American",
    musicalSound: {
      pitchRange: "High, bright, playful soprano with lively vocal fry",
      timbre: "Sparkling, youthful texture with candid micro-inflections",
      cadence: "Bouncy, syncopated rhythm with rapid conversational turns",
      musicalAnalogy:
        "Sounds like bright acoustic guitar fingerpicking or a cheerful glockenspiel—fun, youthful, candid, and dynamic.",
    },
    plainSoundDescription:
      "Bright, playful, youthful soprano with bouncy syncopated rhythm. Feels like cheerful acoustic fingerpicking.",
    bestFor:
      "TikTok/Reels youth marketing, mobile apps, trendy fashion, beauty drops",
  },
  {
    id: "pNInz6obpgDQGcFmaJgB",
    name: "Adam",
    gender: "male",
    accent: "American",
    musicalSound: {
      pitchRange: "Deep, resonant baritone with low sub-bass rumble (100–200Hz)",
      timbre: "Grounded, muscular, solid chest vibration with authoritative decay",
      cadence: "Firm, deliberate pulse with steady anchor beats on key points",
      musicalAnalogy:
        "Sounds like a warm acoustic bass drum or deep pipe organ pedal note—solid, trustworthy, bold, and commanding.",
    },
    plainSoundDescription:
      "Deep, muscular, resonant baritone with sub-bass warmth. Feels like an acoustic bass drum—solid and bold.",
    bestFor:
      "Automotive, B2B software, corporate finance, bold anthems, cybersecurity",
  },
  {
    id: "ErXwobaYiN019PkySvjV",
    name: "Antoni",
    gender: "male",
    accent: "American",
    musicalSound: {
      pitchRange: "Warm, agile tenor with natural open mid-range harmonics",
      timbre: "Smooth, clean acoustic presence with a smile in the voice",
      cadence: "Gentle natural swing, friendly conversational tempo without stiffness",
      musicalAnalogy:
        "Sounds like a warm strumming rhythm guitar in an indie track—upbeat, friendly, modern, and accessible.",
    },
    plainSoundDescription:
      "Warm, agile tenor with natural swing and friendly acoustic presence. Feels like a sunny indie rhythm guitar.",
    bestFor:
      "Consumer tech, food & beverage, casual retail, modern apps, DTC startups",
  },
  {
    id: "nPczCjzI2devNBz1zQrb",
    name: "Brian",
    gender: "male",
    accent: "American",
    musicalSound: {
      pitchRange: "Heavyweight, rich broadcast baritone with wide stereo resonance",
      timbre: "Seasoned, velvety low-end with commanding vocal thickness",
      cadence: "Measured, stately pacing with dramatic emphasis and long vocal sustain",
      musicalAnalogy:
        "Sounds like an orchestral brass ensemble playing a majestic chord—timeless, monumental, legendary, and credible.",
    },
    plainSoundDescription:
      "Heavyweight, seasoned broadcast baritone with wide resonance. Feels like a majestic orchestral brass chord.",
    bestFor:
      "TV commercials, broadcast promos, brand manifestos, healthcare, institutions",
  },
  {
    id: "iP95p4xoKVk53GoZ742B",
    name: "Chris",
    gender: "male",
    accent: "American",
    musicalSound: {
      pitchRange: "Easygoing mid-range tenor with relaxed vocal decay",
      timbre: "Soft, organic, uncompressed acoustic texture with natural breathing",
      cadence: "Conversational groove, candid micro-pauses, warm storytelling pace",
      musicalAnalogy:
        "Sounds like a gentle front-porch acoustic jam—sincere, neighborly, candid, and trustworthy.",
    },
    plainSoundDescription:
      "Easygoing, organic tenor with relaxed vocal decay. Feels like a sincere front-porch acoustic jam.",
    bestFor:
      "Customer testimonials, how-to guides, local business promos, trustworthy explainer videos",
  },
  {
    id: "onwK4e9ZLuTAKqWW03F9",
    name: "Daniel",
    gender: "male",
    accent: "British",
    musicalSound: {
      pitchRange: "Stately, distinguished British baritone with rich chest acoustics",
      timbre: "Refined, aristocratic diction with crisp plosives and zero breath noise",
      cadence: "Formal, measured cadence with deliberate dramatic gravitas",
      musicalAnalogy:
        "Sounds like a solemn baroque pipe organ in a grand cathedral—prestigious, distinguished, and timeless.",
    },
    plainSoundDescription:
      "Distinguished, aristocratic British baritone with formal gravitas. Feels like a baroque pipe organ in a cathedral.",
    bestFor:
      "High-end real estate, luxury timepieces, private banking, heritage corporate spots",
  },
  {
    id: "TX3LPaxmHKxFdv7VOQHJ",
    name: "Liam",
    gender: "male",
    accent: "American",
    musicalSound: {
      pitchRange: "Punchy, forward-placed tenor with high dynamic range",
      timbre: "Bright, aggressive acoustic attack with tight vocal compression",
      cadence: "Rapid-fire staccato delivery with brisk, driving cadence",
      musicalAnalogy:
        "Sounds like a driving drum snare and electric bassline—fast, adrenaline-charged, punchy, and modern.",
    },
    plainSoundDescription:
      "Punchy, fast-paced tenor with driving staccato tempo. Feels like an electric bass and driving drum snare.",
    bestFor:
      "Fast-cut video ads, fitness, sports, streetwear, urgent high-energy campaigns",
  },
  {
    id: "JBFqnCBsd6RMkjVDRZzb",
    name: "George",
    gender: "male",
    accent: "British",
    musicalSound: {
      pitchRange: "Warm, low-mid British baritone with gentle chest resonance",
      timbre: "Slight natural gravel, warm analog tape-saturation texture",
      cadence: "Expansive, unhurried storytelling cadence like a master narrator",
      musicalAnalogy:
        "Sounds like an aged wooden cello or warm vinyl record crackle—nostalgic, timeless, and deeply captivating.",
    },
    plainSoundDescription:
      "Warm, gravelly, low-mid British baritone with analog warmth. Feels like an aged wooden cello or vintage vinyl.",
    bestFor:
      "Heritage brands, artisanal goods, premium travel, documentary spots, warm storytelling",
  },
];

/**
 * Google Cloud TTS & Gemini Voice Models described in plain English musical and acoustic qualities.
 * Includes Google's Journey, Studio, and Neural2 models as well as Gemini core conversational voices.
 */
export const GOOGLE_VOICE_CATALOG: VoiceProfile[] = [
  {
    id: "en-US-Journey-F",
    name: "Journey-F",
    gender: "female",
    accent: "American",
    languageCode: "en-US",
    musicalSound: {
      pitchRange: "Warm mid-range mezzo tone (conversational chest resonance)",
      timbre: "Natural human breathiness with expressive intimate inflection",
      cadence: "Fluid legato phrasing with conversational pacing",
      musicalAnalogy:
        "Sounds like a warm acoustic guitar fingerpicking by an indie artist—intimate, natural, and relatable.",
    },
    plainSoundDescription:
      "Warm, expressive, natural mid-pitch female voice with intimate conversational flow. Feels like a comforting acoustic song.",
    bestFor:
      "Lifestyle, skincare, wellness, beauty, authentic storytelling, approachable promos",
  },
  {
    id: "en-US-Journey-D",
    name: "Journey-D",
    gender: "male",
    accent: "American",
    languageCode: "en-US",
    musicalSound: {
      pitchRange: "Warm agile tenor with open mid-range harmonics",
      timbre: "Clean, natural conversational presence with friendly acoustic warmth",
      cadence: "Easygoing conversational swing without rigid cadence",
      musicalAnalogy:
        "Sounds like an upbeat acoustic rhythm guitar in a coffeehouse—friendly, modern, and accessible.",
    },
    plainSoundDescription:
      "Warm, natural, conversational tenor with relaxed vocal flow. Feels like an acoustic rhythm guitar.",
    bestFor:
      "DTC explainer videos, casual tech, podcasts, authentic creator-led promos",
  },
  {
    id: "en-US-Journey-O",
    name: "Journey-O",
    gender: "female",
    accent: "American",
    languageCode: "en-US",
    musicalSound: {
      pitchRange: "Soft, delicate soprano in a gentle mid-high register",
      timbre: "Airy, peaceful breath texture with gentle vocal decay",
      cadence: "Tranquil, unhurried cadence with soothing micro-pauses",
      musicalAnalogy:
        "Sounds like a light ukulele strum in open air—effortless, sweet, and wholesome.",
    },
    plainSoundDescription:
      "Soft, airy, sweet soprano with gentle cadence. Feels like a light ukulele strum in open air.",
    bestFor:
      "Skincare, calm morning routines, gentle wellness, meditation, everyday retail",
  },
  {
    id: "en-US-Studio-O",
    name: "Studio-O",
    gender: "female",
    accent: "American",
    languageCode: "en-US",
    musicalSound: {
      pitchRange: "Rich, polished soprano-to-mezzo with dynamic chest resonance",
      timbre: "Pristine studio mastering, luminous clarity, zero distortion",
      cadence: "Poised, commanding cadence with graceful crescendos",
      musicalAnalogy:
        "Sounds like soaring chamber strings in a concert hall—refined, commanding, and elegant.",
    },
    plainSoundDescription:
      "Pristine, rich female voice with luminous studio polish and confident crests. Feels like refined chamber strings.",
    bestFor:
      "Luxury brands, corporate commercials, executive presentations, enterprise SaaS",
  },
  {
    id: "en-US-Studio-Q",
    name: "Studio-Q",
    gender: "male",
    accent: "American",
    languageCode: "en-US",
    musicalSound: {
      pitchRange: "Deep, resonant broadcast baritone with low chest harmonics",
      timbre: "Muscular, velvety low-end with authoritative vocal weight",
      cadence: "Stately, deliberate cadence with deep commanding presence",
      musicalAnalogy:
        "Sounds like a majestic orchestral brass section or deep pipe organ—solid, bold, and authoritative.",
    },
    plainSoundDescription:
      "Deep, muscular, broadcast baritone with rich chest resonance. Feels like a majestic brass section.",
    bestFor:
      "Automotive, enterprise trust, financial institutions, bold brand anthems",
  },
  {
    id: "en-US-Neural2-F",
    name: "Neural2-F",
    gender: "female",
    accent: "American",
    languageCode: "en-US",
    musicalSound: {
      pitchRange: "High-energy, bright upper-mezzo with forward projection",
      timbre: "Crisp attack, punchy transients, articulate consonants",
      cadence: "Fast, upbeat staccato delivery with brisk momentum",
      musicalAnalogy:
        "Sounds like an electric pop brass hook with lively momentum—exciting, punchy, and urgent.",
    },
    plainSoundDescription:
      "High-energy, punchy, upbeat female voice with crisp staccato rhythm. Feels like an electric pop brass hook.",
    bestFor:
      "Flash sales, fitness, e-commerce drops, urgent retail promos, social ads",
  },
  {
    id: "en-US-Neural2-D",
    name: "Neural2-D",
    gender: "male",
    accent: "American",
    languageCode: "en-US",
    musicalSound: {
      pitchRange: "Punchy, forward-placed tenor with high dynamic range",
      timbre: "Bright, energetic attack with driving compression",
      cadence: "Rapid-fire staccato delivery with brisk, driving cadence",
      musicalAnalogy:
        "Sounds like an electric bass and driving drum snare—fast, punchy, and adrenaline-charged.",
    },
    plainSoundDescription:
      "Punchy, fast-paced tenor with driving staccato tempo. Feels like an electric bass and drum snare.",
    bestFor:
      "Fast-cut video ads, sports, streetwear, viral hooks, high-energy campaigns",
  },
  {
    id: "en-GB-Journey-F",
    name: "Journey-F (UK)",
    gender: "female",
    accent: "British",
    languageCode: "en-GB",
    musicalSound: {
      pitchRange: "Crystalline mid-pitch British female register",
      timbre: "Pure harmonic overtones, bell-like clarity on complex diction",
      cadence: "Metronomic, poised, intellectual pacing with balanced arcs",
      musicalAnalogy:
        "Sounds like a Steinway grand piano playing crisp classical arpeggios—articulate, poised, and lucid.",
    },
    plainSoundDescription:
      "Crystalline British female voice with metronomic poise. Feels like a grand piano playing crisp classical notes.",
    bestFor:
      "Tech SaaS, B2B education, luxury cosmetics, fintech, masterclasses",
  },
  {
    id: "en-GB-Journey-D",
    name: "Journey-D (UK)",
    gender: "male",
    accent: "British",
    languageCode: "en-GB",
    musicalSound: {
      pitchRange: "Distinguished British baritone with rich chest acoustics",
      timbre: "Refined, cultured diction with crisp plosives and gravitas",
      cadence: "Measured, deliberate cadence with formal dramatic weight",
      musicalAnalogy:
        "Sounds like a solemn baroque pipe organ in a grand cathedral—prestigious, distinguished, and timeless.",
    },
    plainSoundDescription:
      "Distinguished British baritone with formal gravitas. Feels like a baroque pipe organ in a cathedral.",
    bestFor:
      "Heritage brands, luxury timepieces, private wealth, documentary spots",
  },
  {
    id: "en-US-Neural2-C",
    name: "Neural2-C",
    gender: "female",
    accent: "American",
    languageCode: "en-US",
    musicalSound: {
      pitchRange: "Warm, balanced mid-range contralto/mezzo",
      timbre: "Smooth, rounded, approachable texture with natural decay",
      cadence: "Gentle conversational glide with warm pacing",
      musicalAnalogy:
        "Sounds like a comforting acoustic cello and nylon strings—sincere, warm, and neighborly.",
    },
    plainSoundDescription:
      "Warm, rounded, gentle female voice with conversational glide. Feels like a warm acoustic cello.",
    bestFor:
      "Healthcare, family products, educational explainers, customer testimonials",
  },
  // Gemini Native Conversational Voices
  {
    id: "Puck",
    name: "Puck",
    gender: "male",
    accent: "American",
    languageCode: "en-US",
    musicalSound: {
      pitchRange: "Youthful, agile tenor with playful modulation",
      timbre: "Sparkling, bright, candid texture",
      cadence: "Spirited, bouncy syncopated rhythm",
      musicalAnalogy:
        "Sounds like bright acoustic guitar fingerpicking and indie synth-pop—fun, candid, and upbeat.",
    },
    plainSoundDescription:
      "Spirited, playful, enthusiastic tenor with bouncy rhythm. Feels like bright indie synth-pop.",
    bestFor:
      "Youth tech, engaging creators, lighthearted ads, TikTok/Reels explainers",
  },
  {
    id: "Charon",
    name: "Charon",
    gender: "male",
    accent: "American",
    languageCode: "en-US",
    musicalSound: {
      pitchRange: "Deep, resonant baritone with low sub-bass rumble",
      timbre: "Grounded, solid, authoritative chest resonance",
      cadence: "Steady, deliberate pulse with confident decay",
      musicalAnalogy:
        "Sounds like an acoustic bass drum or deep pipe organ pedal note—solid, trustworthy, and commanding.",
    },
    plainSoundDescription:
      "Deep, resonant baritone with low sub-bass warmth. Feels like an acoustic bass drum—solid and bold.",
    bestFor:
      "Anthemic ads, automotive, executive authority, bold B2B campaigns",
  },
  {
    id: "Kore",
    name: "Kore",
    gender: "female",
    accent: "American",
    languageCode: "en-US",
    musicalSound: {
      pitchRange: "Calm, soothing mid-range mezzo tone",
      timbre: "Gentle natural breathiness with smooth rounded consonants",
      cadence: "Tranquil legato flow with relaxed unhurried cadence",
      musicalAnalogy:
        "Sounds like a warm acoustic coffeehouse ballad on nylon strings—soothing, intimate, and authentic.",
    },
    plainSoundDescription:
      "Calm, soothing, warm mezzo with gentle breath. Feels like a tranquil acoustic melody.",
    bestFor:
      "Mindfulness, healthcare, authentic testimonials, wellness, calm storytelling",
  },
  {
    id: "Fenrir",
    name: "Fenrir",
    gender: "male",
    accent: "American",
    languageCode: "en-US",
    musicalSound: {
      pitchRange: "Forward, energetic tenor with bold attack",
      timbre: "Punchy, crisp articulation with tight compression",
      cadence: "Fast-paced staccato rhythm with driving momentum",
      musicalAnalogy:
        "Sounds like an electric bass and driving drum snare—fast, adrenaline-charged, and punchy.",
    },
    plainSoundDescription:
      "Forward, energetic, punchy tenor with crisp delivery. Feels like an electric bass and drum rhythm.",
    bestFor:
      "Action, sports, fast-cut video ads, dynamic marketing promos",
  },
  {
    id: "Aoede",
    name: "Aoede",
    gender: "female",
    accent: "American",
    languageCode: "en-US",
    musicalSound: {
      pitchRange: "Luminous soprano with expressive highs",
      timbre: "Pure, radiant, bell-like clarity with expressive warmth",
      cadence: "Fluid, soaring melodic cadence with graceful crescendos",
      musicalAnalogy:
        "Sounds like soaring chamber strings—refined, vibrant, and emotionally resonant.",
    },
    plainSoundDescription:
      "Melodic, radiant soprano with bright expressive contour. Feels like soaring cinematic strings.",
    bestFor:
      "Inspiring brand narratives, luxury showcases, creative drops, aspirational spots",
  },
];

/**
 * Score a voice profile against a sound query using its plainSoundDescription,
 * bestFor, name, gender, accent, and musical sound attributes.
 * No redundant keyword arrays needed—efficient token usage.
 */
function scoreVoice(voice: VoiceProfile, query: string): number {
  let score = 0;
  const searchable = [
    voice.name,
    voice.gender,
    voice.accent,
    voice.plainSoundDescription,
    voice.bestFor,
    voice.musicalSound.pitchRange,
    voice.musicalSound.timbre,
    voice.musicalSound.cadence,
    voice.musicalSound.musicalAnalogy,
  ]
    .join(" ")
    .toLowerCase();

  // Split query into significant words (3+ chars)
  const tokens = query
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);

  for (const token of tokens) {
    if (searchable.includes(token)) {
      score += 3;
    }
  }

  // Exact vocal register matches
  const pitchLower = voice.musicalSound.pitchRange.toLowerCase();
  if (query.includes("mezzo") && pitchLower.includes("mezzo")) score += 6;
  if (query.includes("soprano") && pitchLower.includes("soprano")) score += 6;
  if (query.includes("baritone") && pitchLower.includes("baritone")) score += 6;
  if (query.includes("tenor") && pitchLower.includes("tenor")) score += 6;
  if (query.includes("contralto") && pitchLower.includes("contralto")) score += 6;
  if (query.includes("bass") && pitchLower.includes("bass")) score += 5;

  // Gender bias if mentioned
  if (
    (query.includes("female") || query.includes("woman")) &&
    voice.gender === "female"
  ) {
    score += 5;
  }
  if (
    (query.includes("male") || query.includes("man") || query.includes("guy")) &&
    voice.gender === "male"
  ) {
    score += 5;
  }

  // Accent bias if mentioned
  if (query.includes("british") && voice.accent === "British") score += 4;
  if (query.includes("american") && voice.accent === "American") score += 3;

  return score;
}

/**
 * Resolve the best matching voice profile based on musical/acoustic sound descriptions
 * or explicit voice ID / voice name. Everything is sound-based: pitch, timbre, cadence.
 * Defaults to ELEVENLABS_VOICE_CATALOG or accepts any VoiceProfile catalog.
 */
export function resolveVoiceBySound(
  soundQuery?: string,
  explicitVoiceId?: string,
  catalog: VoiceProfile[] = ELEVENLABS_VOICE_CATALOG,
): VoiceProfile {
  // 1. Explicit ID match
  if (explicitVoiceId) {
    const directMatch = catalog.find(
      (v) => v.id.toLowerCase() === explicitVoiceId.trim().toLowerCase(),
    );
    if (directMatch) return directMatch;
  }

  const query = (soundQuery || "").toLowerCase().trim();
  if (!query) {
    return catalog[0];
  }

  // 2. Direct Name match (e.g. "Rachel", "Aria", "Journey-F", "Puck")
  const nameMatch = catalog.find(
    (v) =>
      v.name.toLowerCase() === query || query.includes(v.name.toLowerCase()),
  );
  if (nameMatch) return nameMatch;

  // 3. Score voices by musical/acoustic sound attributes
  let bestScore = -1;
  let bestVoice = catalog[0];

  for (const voice of catalog) {
    const score = scoreVoice(voice, query);
    if (score > bestScore) {
      bestScore = score;
      bestVoice = voice;
    }
  }

  return bestVoice;
}

/**
 * Resolve the best matching Google Cloud TTS / Gemini voice profile based on musical/acoustic sound descriptions.
 */
export function resolveGoogleVoiceBySound(
  soundQuery?: string,
  explicitVoiceId?: string,
): VoiceProfile {
  return resolveVoiceBySound(soundQuery, explicitVoiceId, GOOGLE_VOICE_CATALOG);
}
