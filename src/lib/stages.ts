/**
 * The 6 Socratic stages of growing a sprout.
 * Each stage has a question template and a system-prompt instruction that
 * tells the farmhand what to do with the user's answer this turn.
 */

export const STAGE_KEYS = [
  "seed",
  "sprout",
  "leaf",
  "stalk",
  "bloom",
  "harvest",
] as const;
export type StageKey = (typeof STAGE_KEYS)[number];

export type StageDef = {
  key: StageKey;
  emoji: string;
  label: string;
  /** The opening question the farmhand asks when the user enters this stage. */
  question: string;
  /** Stage-specific instruction appended to the farmhand system prompt. */
  instruction: string;
};

export const STAGES: Record<StageKey, StageDef> = {
  seed: {
    key: "seed",
    emoji: "🌱",
    label: "Seed",
    question:
      "Alright partner, in ONE sentence — what's this app of yours actually do? And if you say 'social media for dogs' I'm feedin' ya to the pigs.",
    instruction: `The user just dropped their one-sentence app pitch. Your job:
1. ROAST it. Mean-cartoon-funny. Farm puns.
2. Reflect it back so they know you heard them.
3. Ask the next question: WHO is this for? Picture ONE real human. Not "everyone." Never "everyone."`,
  },
  sprout: {
    key: "sprout",
    emoji: "🌿",
    label: "Sprout",
    question:
      "Who's this thing FOR? And I mean ONE real human — picture their face, their Tuesday afternoon. 'Everyone' ain't a person, it's a cop-out.",
    instruction: `The user just told you who their app is for. Your job:
1. Roast the specificity (or lack of it). If they said "everyone" or "people who like X" — absolutely tear into them.
2. If they gave a real, specific person — grudgingly respect it, but still roast something.
3. Ask the next question: what's the SMALLEST version of this app that would still feel useful to that person? Like, the tiniest seed of it.`,
  },
  leaf: {
    key: "leaf",
    emoji: "🍃",
    label: "Leaf",
    question:
      "What's the SMALLEST version of this that'd still be useful? I mean tiny. Embarrassingly tiny. Like 'one button that does one thing' tiny.",
    instruction: `The user just described the minimum viable sprout. Your job:
1. Check if it's actually small. If they listed 8 features, roast them for overbuilding.
2. If it's genuinely tiny, grudgingly approve.
3. Ask the next question: describe the VERY FIRST SCREEN the user would see. Like you're telling a friend over coffee. What's on it?`,
  },
  stalk: {
    key: "stalk",
    emoji: "🌾",
    label: "Stalk",
    question:
      "Describe the very first screen. What do they SEE? Pretend you're tellin' your grandma about it over peach cobbler.",
    instruction: `The user just described their first screen. Your job:
1. Roast any over-design ("navbar with 9 tabs and a hero carousel" = DESTROY).
2. Reflect the screen back in your own words to confirm you got it.
3. Ask the next question: what are THREE small things they could build TOMORROW to get to that first screen? Not next month. Tomorrow.`,
  },
  bloom: {
    key: "bloom",
    emoji: "🌻",
    label: "Bloom",
    question:
      "Name me THREE things you could build tomorrow to get to that screen. Not next week, not 'when I have time' — TOMORROW, cowpoke.",
    instruction: `The user just listed (or tried to list) 3 tomorrow-sized steps. Your job:
1. Roast anything vague ("learn React", "set up the backend", "figure out auth" = slap them).
2. Approve anything concrete ("make an HTML page with a title and a button").
3. Tell them the next turn is the HARVEST: you're gonna hand them a real starter plan. Ask if they're ready (they better be).`,
  },
  harvest: {
    key: "harvest",
    emoji: "🎀",
    label: "Harvest",
    question: "Ready to harvest this thing?",
    instruction: `This is the HARVEST ceremony. The user is ready. Your job:
1. One final roast, then congratulate them (grudgingly).
2. Tell them to check the plan below. DO NOT output the plan yourself —
   the app will render it from beginner-tools. Just hype them up and roast them
   one more time.`,
  },
};

/** Returns the next stage after the given one, or null if we're done. */
export function nextStage(current: StageKey): StageKey | null {
  const idx = STAGE_KEYS.indexOf(current);
  if (idx === -1 || idx === STAGE_KEYS.length - 1) return null;
  return STAGE_KEYS[idx + 1];
}

/** Progress as 0..1 for UI growth bars. */
export function stageProgress(current: StageKey): number {
  const idx = STAGE_KEYS.indexOf(current);
  return (idx + 1) / STAGE_KEYS.length;
}
