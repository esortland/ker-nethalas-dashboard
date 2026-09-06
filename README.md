# Ker Nethalas: Gravebound Companion

An extension-first solo campaign companion. The application owns campaign state and the internal Domain map; Owlbear Rodeo is a host rather than a gameplay dependency.

## Milestone 0.8

- Persistent versioned campaign state
- Core resource controls
- Internal room map and directional exploration
- Automatic Aether restoration on room entry
- Event usage die
- Contextual “What do I do now?” guidance
- Room states and notes
- Expedition journal
- JSON save export and deliberate campaign reset
- Responsive large-panel layout
- Editable Gravebound character identity and descent reason
- Complete starting skill roster with base and gear modifiers
- Spellward, Endurance, and Resolve resistance checks
- Normal, advantage, and disadvantage percentile checks
- Critical success and fumble detection on doubles
- Persistent skills marked for improvement
- Automatic migration of v0.1 campaign saves
- Guided shape → Lair/Exit → Tension → encounter → event procedure
- Room/corridor classification and table-roll recording
- Lair and Domain Exit usage dice
- Tension die with Growing Darkness trigger and reset
- Light-source room tracking
- Correct room/corridor encounter thresholds
- Overseer Lair and combat resolution states
- Once-per-room scavenge and deep-search tracking
- Door/passage entry records and room event notes
- Automatic migration of v0.2 campaign saves
- Inventory with light, normal, heavy, coin, and non-encumbering weights
- Rules-aware bundles and carried-slot calculations
- Backpack and up-to-three-pouch capacity expansion
- Fourteen equipment positions including belt quickslots and rings
- Two-handed weapon conflict handling
- Light-source activation and 20-room tracking
- Quick-add adventuring supplies and custom items
- Lockpick and Thieves’ Tools awareness during feature resolution
- Automatic migration of v0.3 campaign saves
- Round and acting-side combat tracker with reaction reset
- Editable enemies with Combat, Mind, Armor, and Health
- Opposed attack and defense checks with +10 attack and weapon Speed
- Cumulative −20 defensive Reaction penalties
- Both-fail unmitigated damage handling
- Player-selected damage-pool result and critical doubling
- Armor mitigation with Toughness-before-Health damage
- Equipment-aware armor, shields, and Parrying traits
- Combat completion returns directly to the exploration procedure
- Automatic migration of v0.4 campaign saves
- Character creation opens automatically for fresh campaigns
- Manual or digital attribute generation using the page 18 formulas
- Two starting Masteries with Features and Tier 1 Abilities
- Editable first Domain during character creation
- Creation validation across attributes, Skills, Resistances, and Masteries
- Contextual quick-reference drawer with source page numbers
- Versioned rule-reference registry ready for selective table digitization
- Automatic migration of v0.5 campaign saves
- Player-rolled or digital combat checks throughout the guided flow
- Optional surprise attempt and failed-surprise initiative penalty
- Side-based initiative order retained across combat rounds
- Guided Physical, Magical, and special enemy Action resolution
- Targeted Weak Spot attacks with automatic Disadvantage
- Hit-location recording without reproducing the authored lookup table
- Defensive Move pause and result recording
- Step-by-step damage preview: fixed modifiers, Critical Strike, Armor, and response
- Vulnerable, Resistant, and Immune damage calculations
- Optional +1 melee damage for 2 Exhaustion
- Confirm-before-apply incoming damage
- Mandatory post-fight d4 Toughness recovery before clearing the room
- Persistent guided combat stage with automatic migration of v0.6 saves
- First-Domain preflight for Domain name, Overseer, and Influence
- Intentional lightsource or darkness setup with the page 96 consequences shown
- Optional starting-weapon quick add and main-hand equip
- Persistent physical-dice or digital-roll preference
- Manual or digital exploration, Event usage, deep-search Tension, and feature rolls
- JSON campaign import with schema migration and error feedback
- One-step undo for accidental resource, procedure, or record changes
- Movement locked until the current room procedure is resolved
- Persistent Overseer and Influence context beside the Domain map
- Imported-save normalization and physical-die range protection
- Automatic migration of v0.7 campaign saves

## Run

```bash
npm install
npm run dev
```

Build and test with:

```bash
npm test
npm run build
```

The app also runs outside Owlbear, which keeps the gameplay model independently testable. Optional native Owlbear map mirroring will be added only after the extension-side campaign model is stable.
