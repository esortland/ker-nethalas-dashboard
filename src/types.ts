export type ResourceKey = "health" | "toughness" | "aether" | "sanity" | "exhaustion";
export type Direction = "north" | "east" | "south" | "west";
export type RoomState = "entered" | "searched" | "cleared" | "dangerous" | "camp";
export type RoomKind = "unknown" | "room" | "corridor" | "lair" | "exit";
export type ExplorationStep = "shape" | "lair" | "tension" | "encounter" | "event" | "combat" | "ready";

export interface Resource { current: number; max: number }
export interface DomainRoom {
  id: string;
  number: number;
  x: number;
  y: number;
  state: RoomState;
  notes: string;
  tags: string[];
  kind: RoomKind;
  entryType: "passage" | "door";
  shapeRoll?: number;
  description: string;
  encounterRoll?: number;
  hasEncounter: boolean;
  eventRoll?: number;
  eventDescription: string;
  scavengeUsed: boolean;
  deepSearchUsed: boolean;
  feature: { trapped: boolean; locked: boolean; resolved: boolean; type: "none" | "door" | "container" | "environment"; difficultyRoll?: number; trapRoll?: number; lockRoll?: number; perception?: "passed" | "failed" };
}

export interface CampaignEvent {
  id: string;
  at: string;
  text: string;
}

export type CheckMode = "normal" | "advantage" | "disadvantage";
export type CheckOutcome = "critical-success" | "success" | "failure" | "fumble";
export interface Skill {
  id: string;
  name: string;
  category: "weapon" | "general";
  startingBase: number;
  base: number;
  gearModifier: number;
  markedForImprovement: boolean;
}
export interface CheckResult {
  id: string;
  subjectId: string;
  subjectName: string;
  mode: CheckMode;
  rawDigits: [number, number];
  roll: number;
  target: number;
  modifier: number;
  outcome: CheckOutcome;
  canMarkImprovement: boolean;
}
export interface Enemy { id: string; name: string; health: number; maxHealth: number; combat: number; mind: number; armor: number; notes: string }
export interface OpposedResult { attacker: CheckResult; defender: CheckResult; winner: "attacker" | "defender" | "tie"; bothFailed: boolean }
export interface CombatState { active: boolean; round: number; actingSide: "player" | "enemy"; reactions: number; enemies: Enemy[]; lastOpposed?: OpposedResult; log: string[] }
export type ItemWeight = "none" | "light" | "normal" | "heavy" | "coins";
export type EquipmentSlot = "mainHand" | "offHand" | "belt" | "head" | "armor" | "gloves" | "boots" | "amulet" | "ring1" | "ring2" | "backpack" | "pouch1" | "pouch2" | "pouch3";
export interface Item {
  id: string; name: string; quantity: number; weight: ItemWeight;
  kind: "weapon" | "armor" | "shield" | "tool" | "consumable" | "light" | "container" | "other";
  traits: string[]; notes: string; twoHanded: boolean; armor: number;
  integrity?: 20 | 12 | 10 | 8 | 6 | 4;
}

export interface Campaign {
  schemaVersion: 5;
  id: string;
  name: string;
  characterName: string;
  characterCreated: boolean;
  descentReason: string;
  domainName: string;
  resources: Record<ResourceKey, Resource>;
  eventDie: 20 | 12 | 10 | 8 | 6 | 4;
  tensionDie: 8 | 6 | 4;
  lairDie: 10 | 8 | 6 | 4;
  exitDie: 8 | 6 | 4;
  lairFound: boolean;
  exitFound: boolean;
  growingDarknessPending: boolean;
  growingDarkness: string[];
  lightRemaining: number;
  explorationStep: ExplorationStep;
  inventory: Item[];
  equipment: Partial<Record<EquipmentSlot, string>>;
  combat: CombatState;
  activeLightItemId?: string;
  rooms: DomainRoom[];
  currentRoomId: string;
  phase: "enter" | "resolve" | "explore" | "camp";
  skills: Skill[];
  resistances: Record<"spellward" | "endurance" | "resolve", number>;
  lastCheck?: CheckResult;
  events: CampaignEvent[];
  updatedAt: string;
}
