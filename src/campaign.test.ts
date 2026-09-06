import { describe, expect, it, vi } from "vitest";
import { addFeature, addItem, addRoom, advanceCombatTurn, applyDamageToEnemy, applyDamageToPlayer, checkTension, choosePercentile, confirmDamageToEnemy, equipItem, establishInitiative, generateAttributes, investigateFeature, inventoryUsage, itemSlots, makeCampaign, nextCombatRound, performCheck, performManualCheck, previewDamage, recoverAfterCombat, resolveExplorationRoll, resolveOpposed, resolveOutcome, updateResource, validateCharacterSetup } from "./campaign";

describe("campaign rules", () => {
  it("clamps resources", () => {
    let campaign = makeCampaign();
    expect(updateResource(campaign, "health", -99).resources.health.current).toBe(0);
    expect(updateResource(campaign, "health", 99).resources.health.current).toBe(campaign.resources.health.max);
  });
  it("adds a connected room and restores aether", () => {
    vi.stubGlobal("crypto", { randomUUID: () => Math.random().toString() });
    const campaign = { ...makeCampaign(), resources: { ...makeCampaign().resources, aether: { current: 1, max: 12 } } };
    const next = addRoom(campaign, "east");
    expect(next.rooms).toHaveLength(2);
    expect(next.resources.aether.current).toBe(12);
  });
  it("reads reversed percentile digits for advantage and disadvantage", () => {
    expect(choosePercentile(2, 7, "normal")).toBe(27);
    expect(choosePercentile(2, 7, "advantage")).toBe(27);
    expect(choosePercentile(2, 7, "disadvantage")).toBe(72);
    expect(choosePercentile(0, 0, "normal")).toBe(100);
  });
  it("resolves doubles as critical success or fumble", () => {
    expect(resolveOutcome(33, 40)).toBe("critical-success");
    expect(resolveOutcome(55, 40)).toBe("fumble");
    expect(resolveOutcome(31, 40)).toBe("success");
    expect(resolveOutcome(41, 40)).toBe("failure");
    expect(resolveOutcome(100, 80)).toBe("fumble");
  });
  it("marks skill doubles as eligible for improvement", () => {
    const result = performCheck("skill:dodge", "Dodge", 40, 0, "normal", [2, 2]);
    expect(result.outcome).toBe("critical-success");
    expect(result.canMarkImprovement).toBe(true);
  });
  it("validates the exact starting allotment", () => {
    let campaign = makeCampaign();
    const bonuses: Record<string, number> = { bladed: 60, bludgeoning: 40, acrobatics: 30, athletics: 30, dodge: 30, medicine: 20, perception: 20, reason: 10, scavenge: 10, stealth: 10 };
    campaign.characterName = "Galea";
    campaign = generateAttributes(campaign,{health:4,toughness:[2,3,4],aether:5,sanity:6});
    campaign.masteries = campaign.masteries.map((value,index)=>({...value,name:`Mastery ${index+1}`,tierOneAbility:`Ability ${index+1}`})) as typeof campaign.masteries;
    campaign.skills = campaign.skills.map(skill => ({ ...skill, base: skill.startingBase + (bonuses[skill.id] ?? 0) }));
    expect(validateCharacterSetup(campaign).valid).toBe(true);
  });
  it("generates character attributes from visible dice", () => {
    const campaign=generateAttributes(makeCampaign(),{health:4,toughness:[2,3,4],aether:5,sanity:6});
    expect(campaign.resources.health).toEqual({current:14,max:14});
    expect(campaign.resources.toughness).toEqual({current:29,max:29});
    expect(campaign.resources.aether).toEqual({current:13,max:13});
    expect(campaign.resources.sanity).toEqual({current:16,max:16});
    expect(campaign.attributesGenerated).toBe(true);
  });
  it("walks a room through shape, discovery, tension and encounter", () => {
    let campaign = makeCampaign();
    campaign = resolveExplorationRoll(campaign, 70);
    expect(campaign.rooms[0].kind).toBe("room");
    expect(campaign.explorationStep).toBe("lair");
    campaign = resolveExplorationRoll(campaign, 8);
    campaign = resolveExplorationRoll(campaign, 8);
    campaign = resolveExplorationRoll(campaign, 9);
    expect(campaign.rooms[0].hasEncounter).toBe(false);
    expect(campaign.explorationStep).toBe("event");
    campaign = resolveExplorationRoll(campaign, 42);
    expect(campaign.rooms[0].eventRoll).toBe(42);
    expect(campaign.explorationStep).toBe("ready");
  });
  it("uses the correct encounter threshold for corridors", () => {
    let campaign = makeCampaign();
    campaign = resolveExplorationRoll(campaign, 10);
    campaign = resolveExplorationRoll(campaign, 8);
    campaign = resolveExplorationRoll(campaign, 8);
    campaign = resolveExplorationRoll(campaign, 14);
    expect(campaign.rooms[0].kind).toBe("corridor");
    expect(campaign.rooms[0].hasEncounter).toBe(false);
    expect(campaign.explorationStep).toBe("ready");
  });
  it("resets tension and raises Growing Darkness when d4 depletes", () => {
    const campaign = { ...makeCampaign(), tensionDie: 4 as const };
    const next = checkTension(campaign, 1);
    expect(next.tensionDie).toBe(8);
    expect(next.growingDarknessPending).toBe(true);
  });
  it("resolves door trap and lock thresholds", () => {
    let campaign = addFeature(makeCampaign(), "door");
    campaign = investigateFeature(campaign, "passed", { difficulty: 44, trap: 7, lock: 12 });
    expect(campaign.rooms[0].feature.trapped).toBe(true);
    expect(campaign.rooms[0].feature.locked).toBe(true);
    expect(campaign.rooms[0].feature.difficultyRoll).toBe(44);
  });
  it("uses the lower lock threshold for containers", () => {
    let campaign = addFeature(makeCampaign(), "container");
    campaign = investigateFeature(campaign, "failed", { difficulty: 20, trap: 2, lock: 10 });
    expect(campaign.rooms[0].feature.trapped).toBe(false);
    expect(campaign.rooms[0].feature.locked).toBe(true);
  });
  it("bundles light items and coins while heavy items use two slots", () => {
    expect(itemSlots({id:"x",name:"Torch",quantity:11,weight:"light",kind:"light",traits:[],notes:"",twoHanded:false,armor:0})).toBe(2);
    expect(itemSlots({id:"x",name:"Coins",quantity:201,weight:"coins",kind:"other",traits:[],notes:"",twoHanded:false,armor:0})).toBe(3);
    expect(itemSlots({id:"x",name:"Greatsword",quantity:1,weight:"heavy",kind:"weapon",traits:[],notes:"",twoHanded:true,armor:0})).toBe(2);
  });
  it("equipped items leave carried capacity and containers increase it", () => {
    let campaign = addItem(makeCampaign(), {name:"Backpack",quantity:1,weight:"normal",kind:"container",traits:[],notes:"",twoHanded:false,armor:0});
    const backpack = campaign.inventory.find(item=>item.name==="Backpack")!;
    campaign = equipItem(campaign,backpack.id,"backpack");
    expect(inventoryUsage(campaign).capacity).toBe(30);
    expect(inventoryUsage(campaign).used).toBe(2);
  });
  it("resolves opposed checks by outcome, then higher roll", () => {
    const success=performCheck("a","Attack",50,0,"normal",[3,2]);
    const failure=performCheck("d","Defense",20,0,"normal",[4,1]);
    expect(resolveOpposed(success,failure).winner).toBe("attacker");
    const low=performCheck("a","Attack",80,0,"normal",[2,1]);
    const high=performCheck("d","Defense",80,0,"normal",[4,3]);
    expect(resolveOpposed(low,high).winner).toBe("defender");
  });
  it("flags both failed checks", () => {
    const a=performCheck("a","Attack",10,0,"normal",[3,2]);
    const d=performCheck("d","Defense",10,0,"normal",[4,1]);
    expect(resolveOpposed(a,d).bothFailed).toBe(true);
  });
  it("applies armor then toughness then health", () => {
    let campaign=makeCampaign(); campaign.resources.toughness.current=3;
    campaign=applyDamageToPlayer(campaign,8,2);
    expect(campaign.resources.toughness.current).toBe(0);
    expect(campaign.resources.health.current).toBe(10);
  });
  it("applies enemy armor and resets reactions next round", () => {
    let campaign=makeCampaign();
    campaign.combat.enemies=[{id:"e",name:"Wretch",health:8,maxHealth:8,combat:40,mind:20,armor:2,notes:""}];
    campaign=applyDamageToEnemy(campaign,"e",5);
    expect(campaign.combat.enemies[0].health).toBe(5);
    campaign.combat.reactions=3;
    expect(nextCombatRound(campaign).combat.reactions).toBe(0);
  });
  it("accepts a player-entered percentile roll without rerolling it", () => {
    const result=performManualCheck("skill:dodge","Dodge",40,-20,22);
    expect(result.roll).toBe(22);
    expect(result.target).toBe(20);
    expect(result.outcome).toBe("fumble");
    expect(result.canMarkImprovement).toBe(true);
  });
  it("retains side-based initiative and resets reactions after both sides act", () => {
    let campaign=establishInitiative(makeCampaign(),"enemy","enemy");
    expect(campaign.combat.actingSide).toBe("enemy");
    expect(campaign.combat.surpriseBonus.enemy).toBe(20);
    campaign.combat.reactions=2;
    campaign=advanceCombatTurn(campaign);
    expect(campaign.combat.actingSide).toBe("player");
    expect(campaign.combat.surpriseBonus.enemy).toBe(0);
    expect(campaign.combat.round).toBe(1);
    campaign=advanceCombatTurn(campaign);
    expect(campaign.combat.actingSide).toBe("enemy");
    expect(campaign.combat.round).toBe(2);
    expect(campaign.combat.reactions).toBe(0);
  });
  it("gives every living enemy one turn before changing sides", () => {
    let campaign=establishInitiative(makeCampaign(),"enemy");
    campaign.combat.enemies=[
      {id:"a",name:"A",health:4,maxHealth:4,combat:40,mind:20,armor:0,notes:""},
      {id:"b",name:"B",health:4,maxHealth:4,combat:40,mind:20,armor:0,notes:""},
      {id:"dead",name:"Dead",health:0,maxHealth:4,combat:40,mind:20,armor:0,notes:""},
    ];
    campaign=advanceCombatTurn(campaign,"a");
    expect(campaign.combat.actingSide).toBe("enemy");
    expect(campaign.combat.enemyTurnsTaken).toEqual(["a"]);
    campaign=advanceCombatTurn(campaign,"b");
    expect(campaign.combat.actingSide).toBe("player");
    expect(campaign.combat.round).toBe(1);
  });
  it("previews Critical Strike, Armor, and vulnerability in rules order", () => {
    expect(previewDamage(5,1,true,3,"vulnerable")).toEqual({raw:6,criticalTotal:12,afterArmor:9,final:18});
    expect(previewDamage(5,1,false,3,"resistant").final).toBe(1);
    expect(previewDamage(5,1,false,3,"immune").final).toBe(0);
  });
  it("confirms calculated damage without applying Armor twice", () => {
    let campaign=makeCampaign();
    campaign.combat.enemies=[{id:"e",name:"Wretch",health:20,maxHealth:20,combat:40,mind:20,armor:3,notes:""}];
    campaign=confirmDamageToEnemy(campaign,"e",5,1,true,"vulnerable");
    expect(campaign.combat.enemies[0].health).toBe(2);
  });
  it("recovers d4 Toughness after combat and resets the guided flow", () => {
    let campaign=makeCampaign();
    campaign.resources.toughness.current=10;
    campaign.combat={...campaign.combat,active:true,stage:"recovery",round:4,enemies:[{id:"e",name:"Wretch",health:0,maxHealth:8,combat:40,mind:20,armor:0,notes:""}]};
    campaign=recoverAfterCombat(campaign,4);
    expect(campaign.resources.toughness.current).toBe(14);
    expect(campaign.combat.active).toBe(false);
    expect(campaign.combat.stage).toBe("setup");
    expect(campaign.combat.enemies).toEqual([]);
  });
});
