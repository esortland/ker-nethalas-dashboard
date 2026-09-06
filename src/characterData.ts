import type { ResourceKey } from "./types";

export const RESOURCE_USES: Record<ResourceKey, string> = {
  health: "Lasting injury; damage reaches this after Toughness is gone.",
  toughness: "Your first buffer against damage; some returns after combat.",
  aether: "Fuel for supernatural Mastery Abilities.",
  sanity: "Mental stability against darkness, terror, and unnatural strain.",
  exhaustion: "Accumulated fatigue; higher levels make survival more dangerous.",
};

export const SKILL_USES: Record<string, string> = {
  acrobatics: "Balance, agility, tumbling, and precise movement.",
  athletics: "Climb, jump, swim, force obstacles, and other feats of strength.",
  bladed: "Attack and defend with swords, knives, and other bladed weapons.",
  bludgeoning: "Attack and defend with clubs, hammers, and other blunt weapons.",
  dodge: "Evade physical attacks and attempt to flee combat.",
  medicine: "Treat wounds and identify or safely use medical substances.",
  perception: "Notice hidden danger and features; also helps determine initiative.",
  reason: "Recall knowledge, investigate clues, and solve logical problems.",
  scavenge: "Search a cleared location for useful supplies and spoils.",
  shafted: "Attack and defend with spears, polearms, and other shafted weapons.",
  stealth: "Move quietly, remain unseen, and gain surprise.",
  thievery: "Pick locks, disarm traps, and perform delicate illicit work.",
  unarmed: "Attack and defend bare-handed or with fist weapons.",
};

export const RESISTANCE_USES: Record<string, string> = {
  spellward: "Automatic defense against hostile magic and supernatural effects.",
  endurance: "Automatic defense against poison, disease, and bodily hardship.",
  resolve: "Automatic defense against fear, darkness, and mental pressure.",
};

export interface MasteryOption {
  name: string;
  focus: string;
}

// Names follow the current Gravebound-era 22-Mastery catalog. Descriptions are
// short playstyle signposts, not replacements for rules text in the book.
export const MASTERY_OPTIONS: MasteryOption[] = [
  { name: "Abyssal Reaver", focus: "Demonic power and punishing close combat." },
  { name: "Arcanist", focus: "Flexible arcane attacks and magical control." },
  { name: "Brawler", focus: "Unarmed pressure, toughness, and brutal strikes." },
  { name: "Bulwark", focus: "Armor, shields, protection, and endurance." },
  { name: "Caustic Blade", focus: "Poisons and corrosion against flesh and armor." },
  { name: "Duskblade", focus: "Weapon combat reinforced by shadow magic." },
  { name: "Emissary", focus: "Illusion, deception, and supernatural influence." },
  { name: "Fatebender", focus: "Twist chance, time, and possible outcomes." },
  { name: "Flamecaster", focus: "Aggressive fire magic and burning damage." },
  { name: "Frostweaver", focus: "Cold magic, protection, and control." },
  { name: "Gravecaller", focus: "Necromancy and command of the dead." },
  { name: "Hexmancer", focus: "Curses, afflictions, and magical debilitation." },
  { name: "Icon Caller", focus: "Sacred icons, blessings, and summoned power." },
  { name: "Mindbinder", focus: "Mental influence and control of enemies." },
  { name: "Ritualist", focus: "Prepared rites and adaptable occult effects." },
  { name: "Stormbrand", focus: "Lightning, speed, and storm-charged attacks." },
  { name: "Tracker", focus: "Hunting, survival, awareness, and chosen prey." },
  { name: "Umber Phantom", focus: "Stealth, shadows, and elusive attacks." },
  { name: "Weapon Master", focus: "Superior technique with conventional weapons." },
  { name: "Wraith", focus: "Spectral movement and deathly supernatural power." },
  { name: "Wrath-spawn", focus: "Fury, pain, and overwhelming aggression." },
  { name: "Zealot", focus: "Faith, conviction, and relentless judgment." },
];
