export interface QuickRule { title: string; page: string; summary: string }

export const QUICK_RULES: Record<"explore"|"combat"|"character"|"inventory"|"journal", QuickRule[]> = {
  character: [
    { title:"Attributes", page:"18", summary:"Health d6+10; Toughness 3d6+20; Aether d6+8; Sanity d6+10; Exhaustion starts at 0." },
    { title:"Skill checks", page:"69", summary:"Roll d100 equal to or below the modified Skill score." },
    { title:"Advantage", page:"70", summary:"Read the percentile dice in the more favorable order; use the less favorable order for Disadvantage." },
    { title:"Improvement", page:"62", summary:"Doubles on a Skill check allow that Skill to be marked once for improvement at camp." },
  ],
  explore: [
    { title:"New location", page:"96–99", summary:"Determine shape, check for the Lair or Exit, roll Tension, then check the encounter and room event." },
    { title:"Tension", page:"120", summary:"Roll on movement, noise, or a specified trigger. A depleted d4 triggers Growing Darkness and resets to d8." },
    { title:"Scavenge", page:"99", summary:"A cleared location may be scavenged once, with one optional deep search." },
    { title:"Camp", page:"123–124", summary:"Choose activities, spend a Ration, then make the Camp check after all activities are resolved." },
  ],
  combat: [
    { title:"Initiative", page:"76", summary:"Oppose Perception against the highest enemy Mind; surprise uses Stealth against Mind." },
    { title:"Attack", page:"75, 77", summary:"The attacker receives +10. Compare the attacker and defender as an opposed check." },
    { title:"Weapon Speed", page:"79", summary:"Subtract weapon Speed from the target’s combat Skill while attacking." },
    { title:"Hit and damage", page:"80–83", summary:"Roll hit location, check the Weak Spot, roll the Damage Pool, choose one die, then apply Armor." },
    { title:"Reactions", page:"76–77", summary:"Each Reaction after the first suffers a cumulative −20 until the next round." },
  ],
  inventory: [
    { title:"Encumbrance", page:"206", summary:"Equipped items do not consume carried slots; light items bundle by ten and coins by one hundred." },
    { title:"Weapons", page:"207", summary:"Non-magical weapons deal d6 damage; weapon traits alter initiative, checks, parrying, or fixed damage." },
    { title:"Armor", page:"210", summary:"Protective pieces cover specified locations and may reduce Acrobatics, Dodge, and Stealth." },
    { title:"Belt", page:"212", summary:"A belt holds four quickslots; using an item from it is a Free Action." },
  ],
  journal: [{ title:"Progression", page:"62–63", summary:"Track Skill marks, XP, level benefits, Ability Points, and permanent Perks." }],
};

// Small mechanical lookups can be calculated directly. Larger authored result
// tables can use this model later while retaining their source-page provenance.
export interface DigitizedTable<Row> { id:string; title:string; page:string; die:string; rows:Row[] }
export const DIGITIZED_PROCEDURES = { usageDieChain:[20,12,10,8,6,4] as const, encounterThresholds:{room:10,corridor:15} as const };
