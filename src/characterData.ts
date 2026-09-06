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
  pages: string;
  featureName?: string;
  featureSummary?: string;
  tierOneAbility?: string;
  tierOneSummary?: string;
}

// Names follow the current Gravebound-era 22-Mastery catalog. Descriptions are
// short playstyle signposts, not replacements for rules text in the book.
export const MASTERY_OPTIONS: MasteryOption[] = [
  { name:"Abyssal Reaver", pages:"22–23", focus:"Demonic power and punishing close combat.", featureName:"Conqueror's Vitality", featureSummary:"Defeated encounters build temporary Toughness until it is spent or you rest.", tierOneAbility:"Infernal Fists", tierOneSummary:"Spend Aether for a magical burst of Infernal damage." },
  { name:"Arcanist", pages:"24–25", focus:"Flexible arcane attacks and magical control.", featureName:"Arcane Feedback", featureSummary:"Arcane Ability damage becomes stronger against the same creature.", tierOneAbility:"Arcane Missiles", tierOneSummary:"Spend Aether to damage multiple enemies with magical darts." },
  { name:"Brawler", pages:"26–27", focus:"Unarmed pressure, toughness, and brutal strikes.", featureName:"Strongarms", featureSummary:"Improves unarmed damage and adds Bludgeoning damage with fist weapons.", tierOneAbility:"Feint", tierOneSummary:"After a physical attack, a successful Dodge improves your next attack." },
  { name:"Bulwark", pages:"28–29", focus:"Armor, shields, protection, and endurance.", featureName:"Heavy Training", featureSummary:"Ignore Armor maneuverability penalties and increase Endurance.", tierOneAbility:"Brace", tierOneSummary:"Take Exhaustion to reduce incoming damage before the attack roll." },
  { name:"Caustic Blade", pages:"Book of Masteries", focus:"Poisons and corrosion against flesh and armor." },
  { name:"Duskblade", pages:"30–31", focus:"Assassination, poison, and precise surprise attacks.", featureName:"Silent Strike", featureSummary:"Target a specific Hit Location without Disadvantage against an unaware foe.", tierOneAbility:"Poisoned Blade", tierOneSummary:"Spend Aether to poison a target with a conjured magical blade." },
  { name:"Emissary", pages:"32–33", focus:"Divine recovery, blessings, and judgment.", featureName:"Spiritual Healing", featureSummary:"Pray while camping to recover Sanity at a cost in Exhaustion and Camp safety.", tierOneAbility:"Heal Wounds", tierOneSummary:"Spend Aether and gain Exhaustion to heal Wounds." },
  { name:"Fatebender", pages:"Book of Masteries", focus:"Twist chance, time, and possible outcomes." },
  { name:"Flamecaster", pages:"34–35", focus:"Aggressive fire magic and burning damage.", featureName:"Flameborn", featureSummary:"Fire damage restores you instead of harming you.", tierOneAbility:"Fire Bolt", tierOneSummary:"Spend Aether to deal magical Fire damage to one target." },
  { name:"Frostweaver", pages:"36–37", focus:"Cold magic, protection, and control.", featureName:"Relentless Winter", featureSummary:"Targets damaged by your Frostweaver spells become Freezing.", tierOneAbility:"Frozen Bolt", tierOneSummary:"Spend Aether to deal magical Cold damage to one target." },
  { name:"Gravecaller", pages:"38–39", focus:"Necromancy and command of the dead.", featureName:"Necrotic Vitality", featureSummary:"Sacrifice an Undead minion to recover Wounds or Sanity.", tierOneAbility:"Raise Skeleton", tierOneSummary:"Sustain Aether to animate a suitable corpse as a Skeleton minion." },
  { name:"Hexmancer", pages:"40–41", focus:"Curses, afflictions, and magical debilitation.", featureName:"Unrelenting Curse", featureSummary:"Deal extra damage to targets suffering from the Cursed condition.", tierOneAbility:"Sap Vitality", tierOneSummary:"Spend Aether to inflict a stacking Combat Skill curse." },
  { name:"Icon Caller", pages:"42–43", focus:"Placed icons with offensive and defensive effects.", featureName:"Scribe", featureSummary:"Place up to two Icons as Standard Actions, with one of each type active.", tierOneAbility:"Restoration Icon", tierOneSummary:"Spend Aether to place an Icon that restores friendly Toughness each round." },
  { name:"Mindbinder", pages:"44–45", focus:"Mental influence and control of enemies.", featureName:"Mind Bend", featureSummary:"Enemies suffer a Combat Skill penalty when attacking you.", tierOneAbility:"Suppress Magic", tierOneSummary:"Spend Aether to prevent a target from using Magical actions briefly." },
  { name:"Ritualist", pages:"46–47", focus:"Prepared rites powered by crafted components.", featureName:"Ritual Components", featureSummary:"Prepare Ritual Components from Crafting Supplies while camping.", tierOneAbility:"Arcane Punishment", tierOneSummary:"Spend Aether and Ritual Components to deal scaling magical Arcane damage." },
  { name:"Stormbrand", pages:"48–49", focus:"Dual weapons and storm-charged attacks.", featureName:"Dual Wielding", featureSummary:"Ignore the normal drawbacks of wielding two one-handed weapons.", tierOneAbility:"Imbue Weapon", tierOneSummary:"Sustain Aether to add Lightning damage to a weapon's Damage Pool." },
  { name:"Tracker", pages:"50–51", focus:"Scavenging, survival, awareness, and traps.", featureName:"Scavenger", featureSummary:"Gain Advantage on Scavenge and Perception checks.", tierOneAbility:"Cave Forager", tierOneSummary:"Successful Scavenging also finds a Cooking Ingredient." },
  { name:"Umbra Phantom", pages:"52–53", focus:"Stealth, shadows, and supernatural escape.", featureName:"One With Darkness", featureSummary:"Increase Spellward and maximum Sanity.", tierOneAbility:"Darkvision", tierOneSummary:"Sustain Aether to see without a lightsource." },
  { name:"Weapon Master", pages:"54–55", focus:"Superior technique with a chosen conventional weapon.", featureName:"Dedication", featureSummary:"Choose one weapon to gain Skill and Damage Pool bonuses with it.", tierOneAbility:"Evasive Strike", tierOneSummary:"A successful attack improves your next defensive check." },
  { name:"Wraith", pages:"56–57", focus:"Acrobatic movement, evasion, and opening defenses.", featureName:"Hard to Hit", featureSummary:"Use Acrobatics instead of Dodge against attacks and traps.", tierOneAbility:"Combat Acrobatics", tierOneSummary:"Spend Aether to increase Acrobatics for the rest of combat." },
  { name:"Wrathspawn", pages:"58–59", focus:"Fury, pain, and overwhelming melee aggression.", featureName:"Savage Will", featureSummary:"Once per Rest, spend Aether after a hit to add damage that criticals cannot double.", tierOneAbility:"Bash", tierOneSummary:"Make a melee attack with additional Bludgeoning damage." },
  { name:"Zealot", pages:"60–61", focus:"Faith, conviction, and relentless judgment.", featureName:"Divine Guidance", featureSummary:"Gain Advantage on Resolve and reroll one Event per Rest.", tierOneAbility:"Holy Weapon", tierOneSummary:"Sustain Aether to add Holy damage to a weapon's Damage Pool." },
];
