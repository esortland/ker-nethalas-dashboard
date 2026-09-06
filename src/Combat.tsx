import { useMemo, useState } from "react";
import { addEnemy, advanceCombatTurn, applyDamageToEnemy, applyDamageToPlayer, confirmDamageToEnemy, equippedArmor, establishInitiative, fleeCombat, log, markImprovementsFromChecks, performCheck, performManualCheck, previewDamage, recoverAfterCombat, resolveArmorIntegrity, resolveOpposed, rollDie, useArmorInCombat } from "./campaign";
import type { DamageResponse } from "./campaign";
import type { Campaign, CheckMode, CheckResult, Enemy, OpposedResult, PendingCombatResolution } from "./types";

type RollStyle = "manual" | "digital";

export function Combat({ campaign, onUpdate, onFinish, onFlee }: { campaign: Campaign; onUpdate: (value: Campaign) => void; onFinish: (value: Campaign) => void; onFlee: (value: Campaign) => void }) {
  const [draft, setDraft] = useState<Omit<Enemy,"id">>({ name:"Bone Wretch", health:10, maxHealth:10, combat:40, mind:30, armor:0, notes:"" });
  const [targetId, setTargetId] = useState(campaign.combat.enemies[0]?.id ?? "");
  const [rollStyle, setRollStyle] = useState<RollStyle>(campaign.rollStyle);
  const [manualRolls, setManualRolls] = useState<[number,number]>([50,50]);
  const [skillId, setSkillId] = useState("bladed");
  const [defenseId, setDefenseId] = useState("dodge");
  const [mode, setMode] = useState<CheckMode>("normal");
  const [speed, setSpeed] = useState(0);
  const [targetWeakSpot, setTargetWeakSpot] = useState(false);
  const [enemyAction, setEnemyAction] = useState<"physical"|"magical"|"other">("physical");
  const [locationRoll, setLocationRoll] = useState(50);
  const [location, setLocation] = useState("");
  const [weakSpot, setWeakSpot] = useState(false);
  const [dice, setDice] = useState("6");
  const [fixed, setFixed] = useState(0);
  const [pool, setPool] = useState<number[]>([]);
  const [chosen, setChosen] = useState(0);
  const [damageResponse, setDamageResponse] = useState<DamageResponse>("normal");
  const [damageType, setDamageType] = useState("physical");
  const [exhaustBoost, setExhaustBoost] = useState(false);
  const [incomingDamage, setIncomingDamage] = useState(0);
  const [ignoreArmor, setIgnoreArmor] = useState(false);
  const [armorItemId, setArmorItemId] = useState("");
  const [playerAction, setPlayerAction] = useState<"attack"|"ability"|"item"|"flee"|"other">("attack");
  const [actionText, setActionText] = useState("");
  const [aetherCost, setAetherCost] = useState(0);
  const [itemId, setItemId] = useState("");
  const [consumeItem, setConsumeItem] = useState(false);
  const [moveRoll, setMoveRoll] = useState(1);
  const [moveText, setMoveText] = useState("");
  const [recoveryRoll, setRecoveryRoll] = useState(1);

  const enemyCanAct = (enemy:Enemy) => enemy.health > 0 && (campaign.combat.actingSide !== "enemy" || !campaign.combat.enemyTurnsTaken.includes(enemy.id));
  const target = campaign.combat.enemies.find(enemy => enemy.id === targetId && enemyCanAct(enemy)) ?? campaign.combat.enemies.find(enemyCanAct) ?? campaign.combat.enemies.find(enemy => enemy.health > 0) ?? campaign.combat.enemies[0];
  const attackSkill = campaign.skills.find(skill => skill.id === skillId) ?? campaign.skills.find(skill => skill.category === "weapon")!;
  const defenseSkill = campaign.skills.find(skill => skill.id === defenseId) ?? campaign.skills.find(skill => skill.id === "dodge")!;
  const perception = campaign.skills.find(skill => skill.id === "perception")!;
  const stealth = campaign.skills.find(skill => skill.id === "stealth")!;
  const armorPieces = equippedArmor(campaign);
  const selectedArmorId=campaign.combat.stage==="player-hit-location"?armorItemId:campaign.combat.pending?.armorItemId;
  const selectedArmor = armorPieces.find(item=>item.id===selectedArmorId);
  const canFlee=Boolean(campaign.previousRoomId&&campaign.rooms.some(room=>room.id===campaign.previousRoomId));
  const highestMind = Math.max(0, ...campaign.combat.enemies.map(enemy => enemy.mind));
  const canParry = useMemo(() => Object.values(campaign.equipment).some(id => { const item=campaign.inventory.find(v=>v.id===id); return item?.kind === "shield" || item?.traits.some(t=>t.toLowerCase()==="parrying"); }), [campaign]);
  const changeRollStyle=(value:RollStyle)=>{setRollStyle(value);onUpdate({...campaign,rollStyle:value});};

  const check = (subjectId:string, name:string, score:number, modifier:number, rollIndex:number, checkMode:CheckMode="normal") => rollStyle === "manual"
    ? performManualCheck(subjectId,name,score,modifier,manualRolls[rollIndex])
    : performCheck(subjectId,name,score,modifier,checkMode);
  const opposed = (attacker:CheckResult, defender:CheckResult, text:string, value=campaign) => {
    const result=resolveOpposed(attacker,defender);
    const marked=markImprovementsFromChecks(value,attacker,defender);
    return { result, value:log({ ...marked, combat:{ ...marked.combat,lastOpposed:result,log:[text,...marked.combat.log].slice(0,30) } },text) };
  };
  const setPending = (value:Campaign, pending:PendingCombatResolution, text:string) => log({ ...value, combat:{...value.combat,pending,stage:pending.kind.includes("hit") ? (pending.kind === "player-hit" ? "hit-location" : "player-hit-location") : "defensive-move",log:[text,...value.combat.log].slice(0,30)}},text);
  const completeAction = (value=campaign, text="Action resolved.") => onUpdate(advanceCombatTurn(log(value,text), campaign.combat.actingSide === "enemy" ? target?.id : undefined));

  const attemptSurprise=()=>{
    if(!target)return;
    const a=check(`skill:${stealth.id}`,stealth.name,stealth.base+stealth.gearModifier,0,0);
    const d=check(`enemy:${target.id}`,"Highest enemy Mind",highestMind,0,1);
    const {result,value}=opposed(a,d,"Surprise check resolved.");
    if(result.winner==="attacker") onUpdate(establishInitiative({...value,combat:{...value.combat,surpriseAttempted:true}},"player","player"));
    else onUpdate(log({...value,combat:{...value.combat,surpriseAttempted:true,initiativePenalty:-20}},"Surprise failed; Perception has −20 for initiative."));
  };
  const rollInitiative=()=>{
    if(!target)return;
    const a=check(`skill:${perception.id}`,perception.name,perception.base+perception.gearModifier,campaign.combat.initiativePenalty,0);
    const d=check(`enemy:${target.id}`,"Highest enemy Mind",highestMind,0,1);
    const {result,value}=opposed(a,d,"Initiative check resolved.");
    if(result.winner==="tie") return onUpdate(log(value,"Initiative tied; reroll."));
    const playerFumbled=a.outcome==="fumble", enemyFumbled=d.outcome==="fumble";
    const side=result.winner==="attacker"?"player":"enemy";
    onUpdate(establishInitiative(value,side,playerFumbled&&!enemyFumbled?"enemy":enemyFumbled&&!playerFumbled?"player":undefined));
  };
  const playerAttack=()=>{
    if(!target)return;
    const attackMode=targetWeakSpot?"disadvantage":mode;
    const a=check(`skill:${attackSkill.id}`,attackSkill.name,attackSkill.base+attackSkill.gearModifier,10+campaign.combat.surpriseBonus.player,0,attackMode);
    const d=check(`enemy:${target.id}`,`${target.name} Combat`,target.combat,-speed,1);
    const {result,value}=opposed(a,d,"Player attack resolved.");
    if(result.bothFailed) return completeAction(applyDamageToEnemy(value,target.id,1,true),"Both failed; defender took 1 unmitigated damage.");
    if(result.winner==="attacker") return onUpdate(setPending(value,{kind:"player-hit",targetId:target.id,critical:a.outcome==="critical-success"||targetWeakSpot,weakSpot:targetWeakSpot},"Hit scored; resolve location, Weak Spot, and damage."));
    if(result.winner==="defender") return onUpdate(setPending(value,{kind:"enemy-defended",targetId:target.id,critical:false},"Enemy defended; roll its Defensive Move."));
    onUpdate(log(value,"Attack tied; reroll."));
  };
  const enemyPhysicalAttack=()=>{
    if(!target)return;
    const reactionPenalty=-20*campaign.combat.reactions;
    const a=check(`enemy:${target.id}`,`${target.name} Combat`,target.combat,10+campaign.combat.surpriseBonus.enemy,0);
    const d=check(`skill:${defenseSkill.id}`,defenseSkill.name,defenseSkill.base+defenseSkill.gearModifier,reactionPenalty,1,mode);
    const base={...campaign,combat:{...campaign.combat,reactions:campaign.combat.reactions+1}};
    const {result,value}=opposed(a,d,"Enemy physical attack resolved.",base);
    if(result.bothFailed) return completeAction(applyDamageToPlayer(value,1,0,true),"Both failed; defender took 1 unmitigated damage.");
    if(result.winner==="attacker") return onUpdate(setPending(value,{kind:"enemy-hit",targetId:target.id,critical:a.outcome==="critical-success"},"Enemy hit; enter its damage and preview the result."));
    if(result.winner==="defender") return onUpdate(setPending(value,{kind:"player-defended",targetId:target.id,critical:false},"Defense succeeded; roll your Defensive Move."));
    onUpdate(log(value,"Attack tied; reroll."));
  };
  const resolveSpellward=()=>{
    if(!target)return;
    const spellward=check("resistance:spellward","Spellward",campaign.resistances.spellward,0,0);
    const value=log(markImprovementsFromChecks({...campaign,lastCheck:spellward},spellward),`Spellward ${spellward.roll}/${spellward.target}: ${spellward.outcome}.`);
    if(spellward.outcome==="success"||spellward.outcome==="critical-success") completeAction(value,"Magical action resisted.");
    else onUpdate(log({...value,combat:{...value.combat,stage:"enemy-damage",pending:{kind:"enemy-hit",targetId:target.id,critical:false}}},"Spellward failed; enter the action’s stated damage or effect (Armor normally ignored)."));
  };
  const recordOther=()=>completeAction(campaign,"Enemy action resolved from its instructions.");
  const recordLocation=()=>{
    const roll=rollStyle==="digital"?rollDie(100):Math.max(1,Math.min(100,locationRoll));
    const critical=Boolean(campaign.combat.pending?.critical||weakSpot||targetWeakSpot);
    onUpdate(log({...campaign,combat:{...campaign.combat,stage:"damage",pending:{...campaign.combat.pending!,location:location.trim()||`Table result ${roll}`,weakSpot:weakSpot||targetWeakSpot,critical}}},`Hit location ${roll}: ${location.trim()||"consulted table"}${critical?"; Critical Strike":""}.`));
  };
  const recordPlayerLocation=()=>{
    const roll=rollStyle==="digital"?rollDie(100):Math.max(1,Math.min(100,locationRoll));
    onUpdate(log({...campaign,combat:{...campaign.combat,stage:"enemy-damage",pending:{...campaign.combat.pending!,location:location.trim()||`Human table result ${roll}`,armorItemId:armorItemId||undefined}}},`Gravebound hit location ${roll}: ${location.trim()||"consulted human table"}; ${armorItemId?"matching Armor selected":"no matching Armor"}.`));
  };
  const rollPool=()=>{ const results=dice.split(",").map(Number).filter(v=>v>0).map(rollDie); setPool(results); setChosen(results[0]??0); };
  const damagePreview=target&&campaign.combat.pending?.kind==="player-hit" ? previewDamage(chosen,fixed+(exhaustBoost?1:0),campaign.combat.pending.critical,target.armor,damageResponse) : undefined;
  const confirmPlayerDamage=()=>{
    if(!target||!damagePreview)return;
    let value=confirmDamageToEnemy(campaign,target.id,chosen,fixed+(exhaustBoost?1:0),campaign.combat.pending?.critical??false,damageResponse);
    if(exhaustBoost) value={...value,resources:{...value.resources,exhaustion:{...value.resources.exhaustion,current:Math.min(value.resources.exhaustion.max,value.resources.exhaustion.current+2)}}};
    setPool([]);setChosen(0);setExhaustBoost(false);
    completeAction(value,`${damageType} damage confirmed.`);
  };
  const confirmIncoming=()=>{
    const usedArmor=ignoreArmor?0:(selectedArmor?.armor??0);
    const criticalTotal=(campaign.combat.pending?.critical?2:1)*incomingDamage;
    let value=applyDamageToPlayer(campaign,criticalTotal,usedArmor,ignoreArmor);
    if (!ignoreArmor&&selectedArmor) value=useArmorInCombat(value,selectedArmor.id);
    setIncomingDamage(0);
    completeAction(value,"Incoming damage/effect confirmed.");
  };
  const resolveAbility=()=>{
    if(aetherCost>campaign.resources.aether.current)return;
    const value={...campaign,resources:{...campaign.resources,aether:{...campaign.resources.aether,current:campaign.resources.aether.current-aetherCost}}};
    completeAction(value,`Ability resolved: ${actionText.trim()||"unnamed ability"}; spent ${aetherCost} Aether.`);
  };
  const resolveItem=(free:boolean)=>{
    const item=campaign.inventory.find(value=>value.id===itemId); if(!item)return;
    let value=campaign;
    if(consumeItem) value={...value,inventory:value.inventory.flatMap(entry=>entry.id!==item.id?[entry]:entry.quantity>1?[{...entry,quantity:entry.quantity-1}]:[])};
    const recorded=log(value,`${item.name} used${consumeItem?" and consumed":""}${free?" as a Free Action":" as a Standard Action"}.`);
    if(free) onUpdate(recorded); else completeAction(recorded,"Item action complete.");
  };
  const attemptFlee=()=>{
    if(!canFlee)return;
    const dodgeSkill=campaign.skills.find(skill=>skill.id==="dodge")!;
    const dodge=check(`skill:${dodgeSkill.id}`,dodgeSkill.name,dodgeSkill.base+dodgeSkill.gearModifier,0,0,mode);
    const value=log(markImprovementsFromChecks({...campaign,lastCheck:dodge},dodge),`Flee Dodge ${dodge.roll}/${dodge.target}: ${dodge.outcome}.`);
    if(dodge.outcome==="success"||dodge.outcome==="critical-success") onFlee(fleeCombat(value));
    else completeAction(value,"Flee failed; the way is blocked.");
  };
  const recordDefensiveMove=()=>completeAction(log(campaign,`Defensive Move ${moveRoll}: ${moveText.trim()||"resolved from table"}.`),"Defensive Move complete.");
  const armorPending=campaign.combat.armorUsed.filter(id=>!campaign.combat.armorIntegrityResolved.includes(id)&&campaign.inventory.some(item=>item.id===id));
  const finishRecovery=()=>{ if(armorPending.length)return; const roll=rollStyle==="digital"?rollDie(4):recoveryRoll; onFinish(recoverAfterCombat(campaign,roll)); };

  return <section className="combat-workspace guided-combat">
    <aside className="panel combat-status"><div className="section-kicker"><span>COMBAT</span><PageRef pages="75–84"/></div><h2>{campaign.combat.stage==="setup"?"Before the first blow":campaign.combat.stage==="recovery"?"After the fight":`Round ${campaign.combat.round}`}</h2><div className="combat-stepper">{["setup","turn","hit-location","damage","recovery"].map(step=><i className={campaign.combat.stage===step?"active":""} key={step}>{step}</i>)}</div><p>Acting side: <b>{campaign.combat.actingSide}</b></p><p>Initiative: <b>{campaign.combat.initiativeSide??"not set"}</b></p><p>Reactions this round: <b>{campaign.combat.reactions}</b> · next penalty {campaign.combat.reactions===0?"none":`−${campaign.combat.reactions*20}`}</p><p>Equipped Armor <b>{armorPieces.length?armorPieces.map(item=>`${item.name} ${item.armor}`).join(" · "):"none"}</b> · Parry <b>{canParry?"available":"unavailable"}</b></p><div className="roll-style"><button className={rollStyle==="manual"?"active":""} onClick={()=>changeRollStyle("manual")}>I roll</button><button className={rollStyle==="digital"?"active":""} onClick={()=>changeRollStyle("digital")}>Roll for me</button></div>{rollStyle==="manual"&&<div className="manual-pair"><label>Your / attacker roll<input type="number" min="1" max="100" value={manualRolls[0]} onChange={e=>setManualRolls([Number(e.target.value),manualRolls[1]])}/></label><label>Enemy / defender roll<input type="number" min="1" max="100" value={manualRolls[1]} onChange={e=>setManualRolls([manualRolls[0],Number(e.target.value)])}/></label></div>}<button className="finish-combat" onClick={()=>onUpdate({...campaign,combat:{...campaign.combat,stage:"recovery"}})}>Enemies defeated / combat ends</button></aside>

    <div className="panel combat-actions"><div className="section-kicker"><span>NEXT COMBAT STEP</span><PageRef pages={stagePage(campaign.combat.stage)}/></div>
      {campaign.combat.stage==="setup"&&<><h2>Surprise or initiative</h2><p>You may try to surprise the enemy first. If it fails, your later Perception check takes −20. You can also skip straight to initiative.</p><div className="guided-actions"><button disabled={!target||campaign.combat.surpriseAttempted} onClick={attemptSurprise}>Attempt surprise · Stealth vs Mind</button><button disabled={!target} onClick={rollInitiative}>Roll initiative · Perception{campaign.combat.initiativePenalty?" −20":""} vs Mind</button></div><small>Highest enemy Mind: {highestMind}</small></>}
      {campaign.combat.stage==="turn"&&campaign.combat.actingSide==="player"&&<><h2>Your turn</h2><p>Choose one Standard Action. Belt items and brief bookkeeping can be recorded as Free Actions without ending the turn.</p><div className="enemy-action-picker">{(["attack","ability","item","flee","other"] as const).map(value=><button className={playerAction===value?"active":""} onClick={()=>setPlayerAction(value)} key={value}>{value}</button>)}</div>{playerAction==="attack"&&<div className="check-controls combat-form"><label>Target<select value={target?.id??""} onChange={e=>setTargetId(e.target.value)}>{campaign.combat.enemies.filter(v=>v.health>0).map(v=><option value={v.id} key={v.id}>{v.name}</option>)}</select></label><label>Weapon Skill<select value={skillId} onChange={e=>setSkillId(e.target.value)}>{campaign.skills.filter(v=>v.category==="weapon").map(v=><option value={v.id} key={v.id}>{v.name}</option>)}</select></label><label>Roll mode<select value={mode} disabled={targetWeakSpot} onChange={e=>setMode(e.target.value as CheckMode)}><option value="normal">normal</option><option value="advantage">advantage</option><option value="disadvantage">disadvantage</option></select></label><label>Weapon Speed<input type="number" value={speed} onChange={e=>setSpeed(Number(e.target.value))}/></label><label className="wide checkbox"><input type="checkbox" checked={targetWeakSpot} onChange={e=>setTargetWeakSpot(e.target.checked)}/> Target the Weak Spot with Disadvantage</label><button onClick={playerAttack}>Resolve player attack {campaign.combat.surpriseBonus.player?`(+10 attack, +${campaign.combat.surpriseBonus.player} surprise)`:"(+10 attack)"}</button></div>}{playerAction==="ability"&&<div className="check-controls combat-form"><label>Ability / effect<input value={actionText} onChange={e=>setActionText(e.target.value)} placeholder="Name and result from your Mastery"/></label><label>Aether cost<input type="number" min="0" value={aetherCost} onChange={e=>setAetherCost(Math.max(0,Number(e.target.value)))}/></label><button disabled={aetherCost>campaign.resources.aether.current} onClick={resolveAbility}>Spend Aether & end action</button></div>}{playerAction==="item"&&<div className="check-controls combat-form"><label>Item<select value={itemId} onChange={e=>setItemId(e.target.value)}><option value="">Choose…</option>{campaign.inventory.map(item=><option value={item.id} key={item.id}>{item.name} ×{item.quantity}</option>)}</select></label><label className="checkbox"><input type="checkbox" checked={consumeItem} onChange={e=>setConsumeItem(e.target.checked)}/> Consume one</label><button disabled={!itemId} onClick={()=>resolveItem(false)}>Use as Standard Action</button><button disabled={!itemId} onClick={()=>resolveItem(true)}>Use as Free Action</button></div>}{playerAction==="flee"&&<div className="check-controls combat-form"><p className="wide">{canFlee?"Make a Dodge check. Success returns you to the previous room; failure spends this action.":"There is no previously visited room to flee to."}</p><button disabled={!canFlee} onClick={attemptFlee}>Attempt to flee · Dodge</button></div>}{playerAction==="other"&&<div className="check-controls combat-form"><label>Action / ruling<input value={actionText} onChange={e=>setActionText(e.target.value)} placeholder="Assist, swap gear, interact…"/></label><button onClick={()=>completeAction(campaign,`Other action: ${actionText.trim()||"resolved from the rules"}.`)}>Record Standard Action</button><button onClick={()=>onUpdate(log(campaign,`Free Action: ${actionText.trim()||"recorded"}.`))}>Record Free Action</button></div>}<PageRef pages="77"/></>}
      {campaign.combat.stage==="turn"&&campaign.combat.actingSide==="enemy"&&<><h2>Enemy turn</h2><p>Each living enemy acts once on its side’s turn. Choose the acting enemy, roll on its Action table, then classify the result.</p><label>Acting enemy<select value={target?.id??""} onChange={e=>setTargetId(e.target.value)}>{campaign.combat.enemies.filter(v=>v.health>0&&!campaign.combat.enemyTurnsTaken.includes(v.id)).map(v=><option value={v.id} key={v.id}>{v.name}</option>)}</select></label><div className="enemy-action-picker">{(["physical","magical","other"] as const).map(value=><button className={enemyAction===value?"active":""} onClick={()=>setEnemyAction(value)} key={value}>{value}</button>)}</div>{enemyAction==="physical"&&<div className="check-controls combat-form"><label>Defense<select value={defenseId} onChange={e=>setDefenseId(e.target.value)}>{campaign.skills.filter(v=>v.id==="dodge"||v.category==="weapon").map(v=><option disabled={v.category==="weapon"&&!canParry} value={v.id} key={v.id}>{v.name}</option>)}</select></label><label>Roll mode<select value={mode} onChange={e=>setMode(e.target.value as CheckMode)}><option value="normal">normal</option><option value="advantage">advantage</option><option value="disadvantage">disadvantage</option></select></label><button onClick={enemyPhysicalAttack}>Resolve physical attack</button></div>}{enemyAction==="magical"&&<button onClick={resolveSpellward}>Make automatic Spellward check</button>}{enemyAction==="other"&&<button onClick={recordOther}>I followed the action’s instructions</button>}</>}
      {campaign.combat.stage==="hit-location"&&<><h2>Hit location and Weak Spot</h2><p>Roll on the target’s anatomy table. Record only the result you need; the authored table stays in your book.</p><div className="check-controls combat-form"><label>Hit-location d100<input type="number" min="1" max="100" disabled={rollStyle==="digital"} value={locationRoll} onChange={e=>setLocationRoll(Number(e.target.value))}/></label><label>Body part / result<input placeholder="e.g. torso" value={location} onChange={e=>setLocation(e.target.value)}/></label><label className="wide checkbox"><input type="checkbox" checked={weakSpot||targetWeakSpot} disabled={targetWeakSpot} onChange={e=>setWeakSpot(e.target.checked)}/> This location is the Weak Spot</label><button onClick={recordLocation}>Record location & continue</button></div></>}
      {campaign.combat.stage==="player-hit-location"&&<><h2>Where did the enemy hit you?</h2><p>Roll the human hit-location table, then select only the Armor piece that covers that result. Shields permit Parry; they do not absorb every hit.</p><div className="check-controls combat-form"><label>Hit-location d100<input type="number" min="1" max="100" disabled={rollStyle==="digital"} value={locationRoll} onChange={e=>setLocationRoll(Number(e.target.value))}/></label><label>Body part / result<input placeholder="head, chest, abdomen, arm, leg, foot…" value={location} onChange={e=>setLocation(e.target.value)}/></label><label>Covering Armor<select value={armorItemId} onChange={e=>setArmorItemId(e.target.value)}><option value="">No matching Armor</option>{armorPieces.map(item=><option value={item.id} key={item.id}>{item.name} · Armor {item.armor}{item.integrity?` · Integrity d${item.integrity}`:""}</option>)}</select></label><button onClick={recordPlayerLocation}>Record location & continue</button></div><PageRef pages="80, 210"/></>}
      {campaign.combat.stage==="damage"&&target&&<><h2>Build and confirm damage</h2><p>Roll the whole pool, choose one die, add fixed modifiers, then apply Critical Strike, Armor, and the target’s response in order.</p><div className="damage-builder"><label>Dice sizes<input value={dice} onChange={e=>setDice(e.target.value)} placeholder="6,6,8"/></label><label>Chosen roll<input type="number" min="0" value={chosen} onChange={e=>setChosen(Number(e.target.value))}/></label><label>Fixed modifier<input type="number" value={fixed} onChange={e=>setFixed(Number(e.target.value))}/></label><label>Damage type<input value={damageType} onChange={e=>setDamageType(e.target.value)}/></label><label>Target response<select value={damageResponse} onChange={e=>setDamageResponse(e.target.value as DamageResponse)}>{["normal","vulnerable","resistant","immune"].map(v=><option key={v}>{v}</option>)}</select></label><label className="checkbox"><input type="checkbox" checked={exhaustBoost} onChange={e=>setExhaustBoost(e.target.checked)}/> Spend 2 Exhaustion for +1</label><button onClick={rollPool}>Roll digital pool</button></div>{pool.length>0&&<div className="damage-pool">{pool.map((value,index)=><button className={chosen===value?"active":""} key={index} onClick={()=>setChosen(value)}>Choose {value}</button>)}</div>}{damagePreview&&<div className="damage-preview"><span>Rolled + fixed <b>{damagePreview.raw}</b></span><span>After Critical <b>{damagePreview.criticalTotal}</b></span><span>After Armor {target.armor} <b>{damagePreview.afterArmor}</b></span><strong>Confirmed damage {damagePreview.final}</strong></div>}<button className="confirm-damage" disabled={chosen<=0} onClick={confirmPlayerDamage}>Confirm damage to {target.name}</button></>}
      {campaign.combat.stage==="enemy-damage"&&<><h2>Preview incoming damage or effect</h2><p>Enter the creature Action’s stated damage. Only the Armor selected for the rolled location applies.</p><div className="damage-preview"><label>Rolled damage<input type="number" min="0" value={incomingDamage} onChange={e=>setIncomingDamage(Number(e.target.value))}/></label><label className="checkbox"><input type="checkbox" checked={ignoreArmor} onChange={e=>setIgnoreArmor(e.target.checked)}/> Ignore Armor</label><span>{campaign.combat.pending?.critical?"After Critical Strike":"Incoming total"}<b>{(campaign.combat.pending?.critical?2:1)*incomingDamage}</b></span><span>Armor used <b>{ignoreArmor?0:selectedArmor?.armor??0}</b> {selectedArmor?.name}</span><strong>Damage after Armor {Math.max(0,(campaign.combat.pending?.critical?2:1)*incomingDamage-(ignoreArmor?0:selectedArmor?.armor??0))}</strong></div><button className="confirm-damage" onClick={confirmIncoming}>Confirm incoming damage / effect</button></>}
      {campaign.combat.stage==="defensive-move"&&<><h2>Resolve the Defensive Move</h2><p>{campaign.combat.pending?.kind==="player-defended"?"You defended successfully.":"The enemy defended successfully."} Roll on the Defensive Moves table and record the instruction you applied.</p><div className="check-controls combat-form"><label>Table roll<input type="number" min="1" value={moveRoll} onChange={e=>setMoveRoll(Number(e.target.value))}/></label><label>Result / note<input value={moveText} onChange={e=>setMoveText(e.target.value)}/></label><button onClick={recordDefensiveMove}>Defensive Move resolved</button></div></>}
      {campaign.combat.stage==="recovery"&&<><h2>Recover after the fight</h2><p>First check every Armor piece that absorbed damage. Then recover d4 Toughness and close combat.</p>{campaign.combat.armorUsed.map(id=>{const item=campaign.inventory.find(value=>value.id===id);if(!item)return null;const resolved=campaign.combat.armorIntegrityResolved.includes(id);return <div className="feature-result" key={id}><b>{item.name} · {item.integrity?`Integrity d${item.integrity}`:"Integrity not recorded"}</b>{resolved?<small>Resolved</small>:<button onClick={()=>onUpdate(resolveArmorIntegrity(campaign,id,rollStyle==="manual"?moveRoll:undefined))}>{rollStyle==="digital"&&item.integrity?`Roll d${item.integrity}`:"Resolve Integrity"}</button>}</div>})}<div className="check-controls combat-form"><label>Toughness d4<input type="number" min="1" max="4" disabled={rollStyle==="digital"} value={recoveryRoll} onChange={e=>setRecoveryRoll(Number(e.target.value))}/></label>{rollStyle==="manual"&&armorPending.length>0&&<label>Current Integrity result<input type="number" min="1" value={moveRoll} onChange={e=>setMoveRoll(Number(e.target.value))}/></label>}<button disabled={armorPending.length>0} onClick={finishRecovery}>{rollStyle==="digital"?"Roll d4, recover & finish":"Recover & finish combat"}</button></div><PageRef pages="83"/></>}
      {campaign.combat.lastOpposed&&<Opposed result={campaign.combat.lastOpposed}/>}</div>

    <div className="panel enemy-panel"><div className="section-kicker"><span>ENCOUNTER</span><PageRef pages="118–119, 131"/></div><h2>Enemies</h2><div className="enemy-add"><input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/>{(["health","combat","mind","armor"] as const).map(key=><label key={key}>{key}<input type="number" value={draft[key]} onChange={e=>setDraft({...draft,[key]:Number(e.target.value),...(key==="health"?{maxHealth:Number(e.target.value)}:{})})}/></label>)}<button onClick={()=>{const next=addEnemy(campaign,draft);onUpdate(next);setTargetId(next.combat.enemies.at(-1)!.id)}}>Add enemy from stat block</button></div>{campaign.combat.enemies.map(enemy=><article className={`enemy-card ${enemy.health<=0?"defeated":""}`} key={enemy.id}><div><strong>{enemy.name}</strong><small>Combat {enemy.combat} · Mind {enemy.mind} · Armor {enemy.armor}</small></div><b>{enemy.health}/{enemy.maxHealth} HP</b><button onClick={()=>onUpdate({...campaign,combat:{...campaign.combat,enemies:campaign.combat.enemies.filter(v=>v.id!==enemy.id)}})}>Remove</button></article>)}</div>
  </section>;
}

function stagePage(stage:Campaign["combat"]["stage"]){ return stage==="setup"?"76":stage==="hit-location"||stage==="player-hit-location"?"80, 210":stage==="damage"||stage==="enemy-damage"?"81–84":stage==="defensive-move"?"75, 77":stage==="recovery"?"83; Player Reference p. 2":"75–79"; }
function PageRef({pages}:{pages:string}) { return <span className="page-ref">P. {pages}</span>; }
function Opposed({result}:{result:OpposedResult}) { return <div className="opposed-result"><b>{result.winner} wins</b><span>Attack {result.attacker.roll}/{result.attacker.target} · {result.attacker.outcome}</span><span>Defense {result.defender.roll}/{result.defender.target} · {result.defender.outcome}</span>{result.bothFailed&&<strong>Both failed: defender takes 1 unmitigated damage</strong>}</div>; }
