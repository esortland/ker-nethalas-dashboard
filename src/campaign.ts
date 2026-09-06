import type { AttributeRolls, Campaign, CheckMode, CheckOutcome, CheckResult, CombatSide, CombatState, Direction, DomainRoom, Enemy, EquipmentSlot, ExplorationStep, Item, OpposedResult, ResourceKey, Skill } from "./types";

export const STORAGE_KEY = "com.esortland.ker-nethalas/campaigns-v1";

export const freshCombat = (): CombatState => ({ active: false, round: 1, actingSide: "player", reactions: 0, enemyTurnsTaken: [], enemies: [], stage: "setup", surpriseAttempted: false, initiativePenalty: 0, surpriseBonus: { player: 0, enemy: 0 }, log: [] });

export const DEFAULT_SKILLS: Skill[] = [
  ["acrobatics", "Acrobatics", "general", 10], ["athletics", "Athletics", "general", 10],
  ["bladed", "Bladed Weapons", "weapon", 0], ["bludgeoning", "Bludgeoning Weapons", "weapon", 0],
  ["dodge", "Dodge", "general", 10], ["medicine", "Medicine", "general", 0],
  ["perception", "Perception", "general", 20], ["reason", "Reason", "general", 0],
  ["scavenge", "Scavenge", "general", 0], ["shafted", "Shafted Weapons", "weapon", 0],
  ["stealth", "Stealth", "general", 0], ["thievery", "Thievery", "general", 0],
  ["unarmed", "Unarmed Combat & Fist Weapons", "weapon", 20],
].map(([id, name, category, base]) => ({ id: String(id), name: String(name), category: category as Skill["category"], startingBase: Number(base), base: Number(base), gearModifier: 0, markedForImprovement: false }));

export function makeCampaign(): Campaign {
  const now = new Date().toISOString();
  const room: DomainRoom = { id: crypto.randomUUID(), number: 1, x: 0, y: 0, state: "entered", notes: "", tags: [], kind: "unknown", entryType: "passage", description: "", hasEncounter: false, eventDescription: "", scavengeUsed: false, deepSearchUsed: false, feature: { trapped: false, locked: false, resolved: true, type: "none" } };
  return {
    schemaVersion: 7,
    id: crypto.randomUUID(),
    name: "The First Descent",
    characterName: "Unnamed Gravebound",
    characterCreated: false,
    descentReason: "",
    domainName: "Uncatalogued Domain",
    resources: {
      health: { current: 13, max: 13 },
      toughness: { current: 30, max: 30 },
      aether: { current: 11, max: 11 },
      sanity: { current: 13, max: 13 },
      exhaustion: { current: 0, max: 10 },
    },
    attributesGenerated: false,
    masteries: [
      { id: crypto.randomUUID(), name: "", feature: "", tierOneAbility: "" },
      { id: crypto.randomUUID(), name: "", feature: "", tierOneAbility: "" },
    ],
    eventDie: 20,
    tensionDie: 8,
    lairDie: 10,
    exitDie: 8,
    lairFound: false,
    exitFound: false,
    growingDarknessPending: false,
    growingDarkness: [],
    lightRemaining: 20,
    explorationStep: "shape",
    inventory: [
      { id: crypto.randomUUID(), name: "Torch", quantity: 1, weight: "light", kind: "light", traits: [], notes: "20 rooms of light", twoHanded: false, armor: 0 },
      { id: crypto.randomUUID(), name: "Ration", quantity: 1, weight: "light", kind: "consumable", traits: [], notes: "Reduce Exhaustion by 1", twoHanded: false, armor: 0 }
    ],
    equipment: {},
    combat: freshCombat(),
    rooms: [room],
    currentRoomId: room.id,
    phase: "enter",
    skills: DEFAULT_SKILLS.map((skill) => ({ ...skill })),
    resistances: { spellward: 40, endurance: 20, resolve: 20 },
    events: [{ id: crypto.randomUUID(), at: now, text: "The descent began in Room 1." }],
    updatedAt: now,
  };
}

export function loadCampaign(): Campaign {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return makeCampaign();
  try {
    const parsed = JSON.parse(raw) as Campaign & { schemaVersion: number };
    if (parsed.schemaVersion === 7) return parsed;
    if (parsed.schemaVersion === 6) return migrateV6(parsed);
    if (parsed.schemaVersion === 5) return migrateV5(parsed);
    if (parsed.schemaVersion === 4) return migrateV4(parsed);
    if (parsed.schemaVersion === 3) return migrateV3(parsed);
    if (parsed.schemaVersion === 2) return migrateV2({
      ...parsed, skills: parsed.skills.map(skill => ({
        ...skill,
        startingBase: skill.startingBase ?? DEFAULT_SKILLS.find(candidate => candidate.id === skill.id)?.startingBase ?? 0,
      })),
    });
    if (parsed.schemaVersion === 1) return migrateV1(parsed);
    return makeCampaign();
  } catch {
    return makeCampaign();
  }
}

function migrateV1(old: any): Campaign {
  return migrateV2({ ...old, schemaVersion: 2, characterCreated: old.characterName !== "Unnamed Gravebound", descentReason: "", skills: DEFAULT_SKILLS.map((skill) => ({ ...skill })), resistances: { spellward: 40, endurance: 20, resolve: 20 } });
}

function hydrateRoom(room: any): DomainRoom {
  return { kind: "unknown", entryType: "passage", description: "", hasEncounter: false, eventDescription: "", scavengeUsed: false, deepSearchUsed: false, feature: { trapped: false, locked: false, resolved: true, type: "none" }, ...room };
}

function migrateV2(old: any): Campaign {
  return migrateV3({ ...old, schemaVersion: 3, rooms: old.rooms.map(hydrateRoom), tensionDie: 8, lairDie: 10, exitDie: 8, lairFound: false, exitFound: false, growingDarknessPending: false, growingDarkness: [], lightRemaining: 20, explorationStep: "ready" });
}

function migrateV3(old: any): Campaign {
  return migrateV4({ ...old, schemaVersion: 4, inventory: old.inventory ?? [], equipment: old.equipment ?? {} });
}

function migrateV4(old: any): Campaign {
  return migrateV5({ ...old, schemaVersion: 5, combat: { active: false, round: 1, actingSide: "player", reactions: 0, enemies: [], log: [] } });
}

function migrateV5(old: any): Campaign {
  return migrateV6({ ...old, schemaVersion: 6, attributesGenerated: old.characterCreated, masteries: old.masteries ?? [
    { id: crypto.randomUUID(), name: "Legacy Mastery 1", feature: "Record from character sheet", tierOneAbility: "Record from character sheet" },
    { id: crypto.randomUUID(), name: "Legacy Mastery 2", feature: "Record from character sheet", tierOneAbility: "Record from character sheet" },
  ] });
}

function migrateV6(old: any): Campaign {
  return { ...old, schemaVersion: 7, combat: { ...freshCombat(), ...(old.combat ?? {}), stage: old.combat?.active ? "turn" : "setup", initiativeSide: old.combat?.active ? old.combat?.actingSide ?? "player" : undefined, enemyTurnsTaken: [], surpriseAttempted: false, initiativePenalty: 0, surpriseBonus: { player: 0, enemy: 0 } } };
}

export function saveCampaign(campaign: Campaign) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...campaign, updatedAt: new Date().toISOString() }));
}

export function updateResource(campaign: Campaign, key: ResourceKey, delta: number): Campaign {
  const resource = campaign.resources[key];
  const current = Math.max(0, Math.min(resource.max, resource.current + delta));
  return { ...campaign, resources: { ...campaign.resources, [key]: { ...resource, current } } };
}

export function generateAttributes(campaign: Campaign, supplied?: AttributeRolls): Campaign {
  const rolls: AttributeRolls = supplied ?? { health: rollDie(6), toughness: [rollDie(6), rollDie(6), rollDie(6)], aether: rollDie(6), sanity: rollDie(6) };
  const health=rolls.health+10, toughness=rolls.toughness.reduce((sum,value)=>sum+value,20), aether=rolls.aether+8, sanity=rolls.sanity+10;
  return log({ ...campaign, attributesGenerated:true, attributeRolls:rolls, resources:{ ...campaign.resources, health:{current:health,max:health}, toughness:{current:toughness,max:toughness}, aether:{current:aether,max:aether}, sanity:{current:sanity,max:sanity}, exhaustion:{current:0,max:10} } }, `Attributes established: Health ${health}, Toughness ${toughness}, Aether ${aether}, Sanity ${sanity}.`);
}

export function itemSlots(item: Item) {
  if (item.weight === "none") return 0;
  if (item.weight === "heavy") return item.quantity * 2;
  if (item.weight === "light") return Math.ceil(item.quantity / 10);
  if (item.weight === "coins") return Math.ceil(item.quantity / 100);
  return item.quantity;
}

export function inventoryUsage(campaign: Campaign) {
  const equipped = new Set(Object.values(campaign.equipment));
  const used = campaign.inventory.filter(item => !equipped.has(item.id)).reduce((sum, item) => sum + itemSlots(item), 0);
  const equippedItems = campaign.inventory.filter(item => equipped.has(item.id));
  const backpacks = equippedItems.filter(item => item.name.toLowerCase().includes("backpack")).length;
  const pouches = equippedItems.filter(item => item.name.toLowerCase().includes("pouch")).length;
  return { used, capacity: 10 + Math.min(1, backpacks) * 20 + Math.min(3, pouches) * 5 };
}

export function addItem(campaign: Campaign, input: Omit<Item, "id">): Campaign {
  const item = { ...input, id: crypto.randomUUID() };
  return log({ ...campaign, inventory: [...campaign.inventory, item] }, `Acquired ${item.quantity}× ${item.name}.`);
}

export function changeItemQuantity(campaign: Campaign, id: string, delta: number): Campaign {
  const item = campaign.inventory.find(value => value.id === id);
  if (!item) return campaign;
  const quantity = item.quantity + delta;
  const equipment = { ...campaign.equipment };
  if (quantity <= 0) for (const key of Object.keys(equipment) as EquipmentSlot[]) if (equipment[key] === id) delete equipment[key];
  return { ...campaign, equipment, inventory: quantity <= 0 ? campaign.inventory.filter(value => value.id !== id) : campaign.inventory.map(value => value.id === id ? { ...value, quantity } : value) };
}

export function equipItem(campaign: Campaign, id: string, slot: EquipmentSlot | "carried"): Campaign {
  const equipment = { ...campaign.equipment };
  for (const key of Object.keys(equipment) as EquipmentSlot[]) if (equipment[key] === id) delete equipment[key];
  if (slot === "carried") return { ...campaign, equipment };
  equipment[slot] = id;
  const item = campaign.inventory.find(value => value.id === id);
  if (slot === "mainHand" && item?.twoHanded) delete equipment.offHand;
  if (slot === "offHand" && campaign.inventory.find(value => value.id === equipment.mainHand)?.twoHanded) delete equipment.mainHand;
  return { ...campaign, equipment };
}

export function hasItem(campaign: Campaign, name: string) {
  return campaign.inventory.some(item => item.quantity > 0 && item.name.toLowerCase().includes(name.toLowerCase()));
}

const offsets: Record<Direction, [number, number]> = {
  north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0],
};

export function addRoom(campaign: Campaign, direction: Direction, entryType: "passage" | "door" = "passage"): Campaign {
  const current = campaign.rooms.find((room) => room.id === campaign.currentRoomId)!;
  const [dx, dy] = offsets[direction];
  const occupied = campaign.rooms.find((room) => room.x === current.x + dx && room.y === current.y + dy);
  if (occupied) return enterRoom(campaign, occupied.id);
  const room: DomainRoom = {
    id: crypto.randomUUID(), number: campaign.rooms.length + 1,
    x: current.x + dx, y: current.y + dy, state: "entered", notes: "", tags: [], kind: "unknown", entryType, description: "", hasEncounter: false, eventDescription: "", scavengeUsed: false, deepSearchUsed: false,
    feature: { trapped: false, locked: false, resolved: entryType === "passage", type: entryType === "door" ? "door" : "none" },
  };
  return log({
    ...campaign,
    rooms: [...campaign.rooms, room],
    currentRoomId: room.id,
    phase: "enter",
    explorationStep: "shape",
    lightRemaining: Math.max(0, campaign.lightRemaining - 1),
    resources: { ...campaign.resources, aether: { ...campaign.resources.aether, current: campaign.resources.aether.max } },
  }, `Entered Room ${room.number}; Aether restored.`);
}

export function enterRoom(campaign: Campaign, id: string): Campaign {
  const room = campaign.rooms.find((candidate) => candidate.id === id);
  if (!room || room.id === campaign.currentRoomId) return campaign;
  return log({
    ...campaign, currentRoomId: id, phase: "enter", explorationStep: "tension", lightRemaining: Math.max(0, campaign.lightRemaining - 1),
    resources: { ...campaign.resources, aether: { ...campaign.resources.aether, current: campaign.resources.aether.max } },
  }, `Returned to Room ${room.number}; Aether restored.`);
}

const explorationOrder: ExplorationStep[] = ["shape", "lair", "tension", "encounter", "event", "ready"];
export function setExplorationStep(campaign: Campaign, step: ExplorationStep) { return { ...campaign, explorationStep: step }; }

function stepUsageDie<T extends 4 | 6 | 8 | 10>(die: T, result: number): { die: T; triggered: boolean } {
  if (result > 2) return { die, triggered: false };
  if (die === 4) return { die, triggered: true };
  const chain = [10, 8, 6, 4];
  return { die: chain[chain.indexOf(die) + 1] as T, triggered: false };
}

export function checkTension(campaign: Campaign, forcedRoll?: number): Campaign {
  const result = forcedRoll ?? rollDie(campaign.tensionDie);
  const next = stepUsageDie(campaign.tensionDie, result);
  return log({ ...campaign, tensionDie: next.triggered ? 8 : next.die as Campaign["tensionDie"], growingDarknessPending: campaign.growingDarknessPending || next.triggered }, next.triggered ? "Tension broke: roll Growing Darkness; tension reset to d8." : `Tension die rolled ${result}; now d${next.die}.`);
}

export function addFeature(campaign: Campaign, type: DomainRoom["feature"]["type"]): Campaign {
  return { ...campaign, rooms: campaign.rooms.map(room => room.id === campaign.currentRoomId ? { ...room, feature: { type, trapped: false, locked: false, resolved: false } } : room) };
}

export function investigateFeature(campaign: Campaign, perception: "passed" | "failed", rolls?: { difficulty?: number; trap?: number; lock?: number }): Campaign {
  const room = campaign.rooms.find(value => value.id === campaign.currentRoomId)!;
  const difficultyRoll = rolls?.difficulty ?? rollDie(100);
  const trapRoll = rolls?.trap ?? rollDie(10);
  const lockRoll = room.feature.type === "door" || room.feature.type === "container" ? rolls?.lock ?? rollDie(20) : undefined;
  const trapped = trapRoll >= 7;
  const locked = room.feature.type === "door" ? (lockRoll ?? 0) >= 12 : room.feature.type === "container" ? (lockRoll ?? 0) >= 10 : false;
  const next = { ...campaign, rooms: campaign.rooms.map(value => value.id === room.id ? { ...value, feature: { ...value.feature, difficultyRoll, trapRoll, lockRoll, trapped, locked, perception } } : value) };
  return log(next, `${room.feature.type} investigated: difficulty roll ${difficultyRoll}; Perception ${perception}; trap ${trapRoll}${lockRoll ? `; lock ${lockRoll}` : ""}.`);
}

export function resolveExplorationRoll(campaign: Campaign, forcedRoll?: number): Campaign {
  const room = campaign.rooms.find(value => value.id === campaign.currentRoomId)!;
  const patchRoom = (patch: Partial<DomainRoom>) => ({ ...campaign, rooms: campaign.rooms.map(value => value.id === room.id ? { ...value, ...patch } : value) });
  if (campaign.explorationStep === "shape") {
    const roll = forcedRoll ?? rollDie(100); const kind = roll <= 25 ? "corridor" : "room";
    return log({ ...patchRoom({ shapeRoll: roll, kind }), explorationStep: "lair" }, `Room ${room.number}: shape roll ${roll}, ${kind}.`);
  }
  if (campaign.explorationStep === "lair") {
    if (campaign.lairFound) {
      const result = forcedRoll ?? rollDie(campaign.exitDie); const next = stepUsageDie(campaign.exitDie, result);
      return log({ ...patchRoom(next.triggered ? { kind: "exit" } : {}), exitDie: next.triggered ? 8 : next.die as Campaign["exitDie"], exitFound: campaign.exitFound || next.triggered, explorationStep: "tension" }, next.triggered ? "The Domain exit was found." : `Exit die rolled ${result}; now d${next.die}.`);
    }
    const result = forcedRoll ?? rollDie(campaign.lairDie); const next = stepUsageDie(campaign.lairDie, result);
    return log({ ...patchRoom(next.triggered ? { kind: "lair" } : {}), lairDie: next.triggered ? 10 : next.die as Campaign["lairDie"], lairFound: next.triggered, explorationStep: "tension" }, next.triggered ? "The Overseer's Lair was found." : `Lair die rolled ${result}; now d${next.die}.`);
  }
  if (campaign.explorationStep === "tension") {
    return { ...checkTension(campaign, forcedRoll), explorationStep: "encounter" };
  }
  if (campaign.explorationStep === "encounter") {
    if (room.kind === "lair") return { ...campaign, explorationStep: "combat" };
    const roll = forcedRoll ?? rollDie(20);
    const roomLike = room.kind === "room" || (room.kind === "exit" && (room.shapeRoll ?? 100) > 25);
    const hasEncounter = roomLike ? roll >= 10 : roll >= 15;
    return log({ ...patchRoom({ encounterRoll: roll, hasEncounter }), explorationStep: hasEncounter ? "combat" : room.kind === "room" || room.kind === "exit" ? "event" : "ready" }, hasEncounter ? `Encounter check ${roll}: combat encounter.` : `Encounter check ${roll}: clear.`);
  }
  if (campaign.explorationStep === "event") {
    const roll = forcedRoll ?? rollDie(100);
    return log({ ...patchRoom({ eventRoll: roll }), explorationStep: "ready" }, `Event table roll: ${roll}.`);
  }
  return campaign;
}

export function log(campaign: Campaign, text: string): Campaign {
  return { ...campaign, events: [{ id: crypto.randomUUID(), at: new Date().toISOString(), text }, ...campaign.events].slice(0, 100) };
}

export function rollDie(sides: number) { return Math.floor(Math.random() * sides) + 1; }

export function readPercentileDigits(tens: number, ones: number) {
  const value = tens * 10 + ones;
  return value === 0 ? 100 : value;
}

export function choosePercentile(tens: number, ones: number, mode: CheckMode) {
  const forward = readPercentileDigits(tens, ones);
  const reversed = readPercentileDigits(ones, tens);
  if (mode === "advantage") return Math.min(forward, reversed);
  if (mode === "disadvantage") return Math.max(forward, reversed);
  return forward;
}

export function resolveOutcome(roll: number, target: number): CheckOutcome {
  const doubles = roll === 100 || roll % 11 === 0;
  if (doubles) return roll <= target ? "critical-success" : "fumble";
  return roll <= target ? "success" : "failure";
}

export function performCheck(subjectId: string, subjectName: string, score: number, modifier: number, mode: CheckMode, digits?: [number, number]): CheckResult {
  const rawDigits: [number, number] = digits ?? [rollDie(10) - 1, rollDie(10) - 1];
  const target = Math.max(0, score + modifier);
  const roll = choosePercentile(rawDigits[0], rawDigits[1], mode);
  const outcome = resolveOutcome(roll, target);
  return { id: crypto.randomUUID(), subjectId, subjectName, mode, rawDigits, roll, target, modifier, outcome, canMarkImprovement: subjectId.startsWith("skill:") && (roll === 100 || roll % 11 === 0) };
}

export function performManualCheck(subjectId: string, subjectName: string, score: number, modifier: number, roll: number): CheckResult {
  const normalized = Math.max(1, Math.min(100, Math.round(roll)));
  const target = Math.max(0, score + modifier);
  const tens = normalized === 100 ? 0 : Math.floor(normalized / 10);
  const ones = normalized === 100 ? 0 : normalized % 10;
  return { id: crypto.randomUUID(), subjectId, subjectName, mode: "normal", rawDigits: [tens, ones], roll: normalized, target, modifier, outcome: resolveOutcome(normalized, target), canMarkImprovement: subjectId.startsWith("skill:") && (normalized === 100 || normalized % 11 === 0) };
}

const rank = (outcome: CheckOutcome) => outcome === "critical-success" ? 3 : outcome === "success" ? 2 : outcome === "failure" ? 1 : 0;
export function resolveOpposed(attacker: CheckResult, defender: CheckResult): OpposedResult {
  const bothFailed = rank(attacker.outcome) < 2 && rank(defender.outcome) < 2;
  let winner: OpposedResult["winner"];
  if (rank(attacker.outcome) !== rank(defender.outcome)) winner = rank(attacker.outcome) > rank(defender.outcome) ? "attacker" : "defender";
  else if (attacker.roll !== defender.roll) winner = attacker.roll > defender.roll ? "attacker" : "defender";
  else if (attacker.target !== defender.target) winner = attacker.target > defender.target ? "attacker" : "defender";
  else winner = "tie";
  return { attacker, defender, winner, bothFailed };
}

export function playerArmor(campaign: Campaign) {
  const equipped = new Set(Object.values(campaign.equipment));
  return campaign.inventory.filter(item => equipped.has(item.id)).reduce((sum, item) => sum + item.armor, 0);
}

export function addEnemy(campaign: Campaign, enemy: Omit<Enemy, "id">): Campaign {
  return { ...campaign, combat: { ...campaign.combat, active: true, stage: campaign.combat.active ? campaign.combat.stage : "setup", enemies: [...campaign.combat.enemies, { ...enemy, id: crypto.randomUUID() }] } };
}

export function applyDamageToPlayer(campaign: Campaign, damage: number, armor = playerArmor(campaign), unmitigated = false): Campaign {
  let remaining = Math.max(0, damage - (unmitigated ? 0 : armor));
  const toughnessLoss = Math.min(campaign.resources.toughness.current, remaining); remaining -= toughnessLoss;
  const healthLoss = Math.min(campaign.resources.health.current, remaining);
  return log({ ...campaign, resources: { ...campaign.resources, toughness: { ...campaign.resources.toughness, current: campaign.resources.toughness.current - toughnessLoss }, health: { ...campaign.resources.health, current: campaign.resources.health.current - healthLoss } } }, `${damage} damage received${unmitigated ? " unmitigated" : `; ${armor} armor`}.`);
}

export function applyDamageToEnemy(campaign: Campaign, id: string, damage: number, unmitigated = false): Campaign {
  const enemy = campaign.combat.enemies.find(value => value.id === id); if (!enemy) return campaign;
  const net = Math.max(0, damage - (unmitigated ? 0 : enemy.armor));
  return log({ ...campaign, combat: { ...campaign.combat, enemies: campaign.combat.enemies.map(value => value.id === id ? { ...value, health: Math.max(0, value.health - net) } : value) } }, `${enemy.name} takes ${net} damage${unmitigated ? " unmitigated" : ` after ${enemy.armor} armor`}.`);
}

export function nextCombatRound(campaign: Campaign): Campaign {
  return { ...campaign, combat: { ...campaign.combat, round: campaign.combat.round + 1, reactions: 0, enemyTurnsTaken: [], actingSide: campaign.combat.initiativeSide ?? "player", stage: "turn", pending: undefined } };
}

export function establishInitiative(campaign: Campaign, side: CombatSide, surpriseSide?: CombatSide): Campaign {
  return log({ ...campaign, combat: { ...campaign.combat, active: true, round: 1, actingSide: side, initiativeSide: side, reactions: 0, enemyTurnsTaken: [], stage: "turn", initiativePenalty: 0, surpriseBonus: { player: surpriseSide === "player" ? 20 : 0, enemy: surpriseSide === "enemy" ? 20 : 0 }, pending: undefined } }, `${side === "player" ? "Gravebound" : "Enemies"} won initiative${surpriseSide ? `; ${surpriseSide} side has surprise` : ""}.`);
}

export function advanceCombatTurn(campaign: Campaign, actingEnemyId?: string): Campaign {
  const initiativeSide = campaign.combat.initiativeSide ?? "player";
  let enemyTurnsTaken = campaign.combat.enemyTurnsTaken;
  if (campaign.combat.actingSide === "enemy" && actingEnemyId) enemyTurnsTaken = [...new Set([...enemyTurnsTaken, actingEnemyId])];
  const remainingEnemies = campaign.combat.enemies.filter(enemy => enemy.health > 0 && !enemyTurnsTaken.includes(enemy.id));
  if (campaign.combat.actingSide === "enemy" && remainingEnemies.length > 0) return { ...campaign, combat: { ...campaign.combat, enemyTurnsTaken, stage:"turn", pending:undefined, surpriseBonus:{...campaign.combat.surpriseBonus,enemy:0} } };
  const actingSide: CombatSide = campaign.combat.actingSide === "player" ? "enemy" : "player";
  const roundComplete = actingSide === initiativeSide;
  return { ...campaign, combat: { ...campaign.combat, actingSide, enemyTurnsTaken: roundComplete ? [] : enemyTurnsTaken, round: roundComplete ? campaign.combat.round + 1 : campaign.combat.round, reactions: roundComplete ? 0 : campaign.combat.reactions, stage: "turn", pending: undefined, surpriseBonus: { ...campaign.combat.surpriseBonus, [campaign.combat.actingSide]: 0 } } };
}

export type DamageResponse = "normal" | "vulnerable" | "resistant" | "immune";
export function previewDamage(rolled: number, fixed: number, critical: boolean, armor: number, response: DamageResponse = "normal") {
  const raw = Math.max(0, rolled + fixed);
  const criticalTotal = critical ? raw * 2 : raw;
  const afterArmor = Math.max(0, criticalTotal - Math.max(0, armor));
  const final = response === "vulnerable" ? afterArmor * 2 : response === "resistant" ? Math.floor(afterArmor / 2) : response === "immune" ? 0 : afterArmor;
  return { raw, criticalTotal, afterArmor, final };
}

export function confirmDamageToEnemy(campaign: Campaign, id: string, rolled: number, fixed: number, critical: boolean, response: DamageResponse = "normal"): Campaign {
  const enemy = campaign.combat.enemies.find(value => value.id === id);
  if (!enemy) return campaign;
  const damage = previewDamage(rolled, fixed, critical, enemy.armor, response);
  return log({ ...campaign, combat: { ...campaign.combat, enemies: campaign.combat.enemies.map(value => value.id === id ? { ...value, health: Math.max(0, value.health - damage.final) } : value) } }, `${enemy.name} takes ${damage.final} damage (${damage.criticalTotal} before Armor; ${response}).`);
}

export function recoverAfterCombat(campaign: Campaign, roll: number): Campaign {
  const amount = Math.max(1, Math.min(4, Math.round(roll)));
  const before = campaign.resources.toughness.current;
  const recovered = Math.min(amount, campaign.resources.toughness.max - before);
  return log({ ...updateResource(campaign, "toughness", amount), combat: { ...campaign.combat, active: false, stage: "setup", round: 1, reactions: 0, enemyTurnsTaken: [], pending: undefined, lastOpposed: undefined, initiativeSide: undefined, surpriseAttempted: false, initiativePenalty: 0, surpriseBonus: { player: 0, enemy: 0 }, enemies: [] } }, `Combat ended; recovered ${recovered} Toughness (d4 roll ${amount}).`);
}

export function validateCharacterSetup(campaign: Campaign) {
  const allocations = campaign.skills.map(skill => ({ skill, bonus: skill.base - skill.startingBase }));
  const count = (bonus: number) => allocations.filter(value => value.bonus === bonus).length;
  const weapon60 = allocations.filter(value => value.bonus === 60 && value.skill.category === "weapon").length;
  const weapon40 = allocations.filter(value => value.bonus === 40 && value.skill.category === "weapon").length;
  const allowed = allocations.every(value => [0, 10, 20, 30, 40, 60].includes(value.bonus) && (value.bonus < 40 || value.skill.category === "weapon"));
  const resistances = Object.values(campaign.resistances).sort((a, b) => a - b).join(",") === "20,20,40";
  const masteries = campaign.masteries.length === 2 && campaign.masteries.every(value => value.name.trim() && value.tierOneAbility.trim());
  return {
    valid: campaign.attributesGenerated && masteries && allowed && weapon60 === 1 && weapon40 === 1 && count(30) === 3 && count(20) === 2 && count(10) === 3 && resistances && campaign.characterName.trim().length > 0,
    summary: { attributes:campaign.attributesGenerated, masteries, weapon60, weapon40, thirty: count(30), twenty: count(20), ten: count(10), resistances },
  };
}

export function rollUsageDie(campaign: Campaign): { campaign: Campaign; result: number; depleted: boolean } {
  const result = rollDie(campaign.eventDie);
  if (result > 2) return { campaign: log(campaign, `Event die d${campaign.eventDie}: ${result}.`), result, depleted: false };
  const chain = [20, 12, 10, 8, 6, 4] as const;
  const index = chain.indexOf(campaign.eventDie);
  if (campaign.eventDie === 4) return { campaign: log(campaign, "Event die d4 depleted: resolve an Event."), result, depleted: true };
  const eventDie = chain[index + 1];
  return { campaign: log({ ...campaign, eventDie }, `Event die rolled ${result} and stepped down to d${eventDie}.`), result, depleted: false };
}
