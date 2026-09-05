import { useMemo, useState } from "react";
import { addEnemy, applyDamageToEnemy, applyDamageToPlayer, log, nextCombatRound, performCheck, playerArmor, resolveOpposed, rollDie } from "./campaign";
import type { Campaign, CheckMode, Enemy, OpposedResult } from "./types";

export function Combat({ campaign, onUpdate, onFinish }: { campaign: Campaign; onUpdate: (value: Campaign) => void; onFinish: () => void }) {
  const [draft, setDraft] = useState<Omit<Enemy,"id">>({ name:"Bone Wretch", health:10, maxHealth:10, combat:40, mind:30, armor:0, notes:"" });
  const [targetId, setTargetId] = useState(campaign.combat.enemies[0]?.id ?? "");
  const [skillId, setSkillId] = useState("bladed");
  const [defenseId, setDefenseId] = useState("dodge");
  const [mode, setMode] = useState<CheckMode>("normal");
  const [speed, setSpeed] = useState(0);
  const [dice, setDice] = useState("6");
  const [fixed, setFixed] = useState(0);
  const [critical, setCritical] = useState(false);
  const [pool, setPool] = useState<number[]>([]);
  const target = campaign.combat.enemies.find(enemy => enemy.id === targetId) ?? campaign.combat.enemies[0];
  const attackSkill = campaign.skills.find(skill => skill.id === skillId)!;
  const defenseSkill = campaign.skills.find(skill => skill.id === defenseId)!;
  const armor = playerArmor(campaign);
  const canParry = useMemo(() => Object.values(campaign.equipment).some(id => { const item=campaign.inventory.find(v=>v.id===id); return item?.kind === "shield" || item?.traits.some(t=>t.toLowerCase()==="parrying"); }), [campaign]);
  const record = (result: OpposedResult, text: string, value = campaign) => onUpdate(log({ ...value, combat:{ ...value.combat, lastOpposed:result, log:[text,...value.combat.log].slice(0,20) } }, text));
  const playerAttack = () => {
    if (!target) return;
    const a=performCheck(`skill:${attackSkill.id}`,attackSkill.name,attackSkill.base+attackSkill.gearModifier,10,mode);
    const d=performCheck(`enemy:${target.id}`,`${target.name} Combat`,target.combat,-speed,"normal"); const result=resolveOpposed(a,d);
    let value=campaign; if(result.bothFailed) value=applyDamageToEnemy(value,target.id,1,true);
    record(result,result.bothFailed?"Both failed: enemy suffers 1 unmitigated damage.":result.winner==="attacker"?"Attack wins: roll hit location and damage.":"Enemy defends: roll its Defensive Move.",value);
  };
  const enemyAttack = () => {
    if (!target) return;
    const penalty=-20*campaign.combat.reactions;
    const a=performCheck(`enemy:${target.id}`,`${target.name} Combat`,target.combat,0,"normal");
    const d=performCheck(`skill:${defenseSkill.id}`,defenseSkill.name,defenseSkill.base+defenseSkill.gearModifier,penalty,mode); const result=resolveOpposed(a,d);
    let value={...campaign,combat:{...campaign.combat,reactions:campaign.combat.reactions+1}};
    if(result.bothFailed) value=applyDamageToPlayer(value,1,0,true);
    record(result,result.bothFailed?"Both failed: you suffer 1 unmitigated damage.":result.winner==="attacker"?"Enemy attack wins: apply its damage.":"Defense wins: roll a Defensive Move.",value);
  };
  const rollPool=()=>setPool(dice.split(",").map(Number).filter(v=>v>0).map(rollDie));
  const deal=(chosen:number)=>{ if(!target)return; onUpdate(applyDamageToEnemy(campaign,target.id,(critical?2:1)*(chosen+fixed))); setPool([]); };
  return <section className="combat-workspace">
    <aside className="panel combat-status"><span>COMBAT · PAGES 75–87</span><h2>Round {campaign.combat.round}</h2><div className="combat-buttons"><button onClick={()=>onUpdate({...campaign,combat:{...campaign.combat,actingSide:campaign.combat.actingSide==="player"?"enemy":"player"}})}>Acting: {campaign.combat.actingSide}</button><button onClick={()=>onUpdate(nextCombatRound(campaign))}>Next round</button></div><p>Reactions this round: <b>{campaign.combat.reactions}</b>. Each after the first applies a cumulative −20.</p><p>Equipped armor: <b>{armor}</b> · Parry access: <b>{canParry?"yes":"no"}</b></p><button className="finish-combat" onClick={onFinish}>Finish combat & clear room</button></aside>
    <div className="panel combat-actions"><span>OPPOSED CHECKS</span><h2>Attack and defend</h2>{target?<><label>Target<select value={target.id} onChange={e=>setTargetId(e.target.value)}>{campaign.combat.enemies.map(v=><option value={v.id} key={v.id}>{v.name}</option>)}</select></label><div className="check-controls"><label>Roll mode<select value={mode} onChange={e=>setMode(e.target.value as CheckMode)}><option>normal</option><option>advantage</option><option>disadvantage</option></select></label><label>Weapon skill<select value={skillId} onChange={e=>setSkillId(e.target.value)}>{campaign.skills.filter(v=>v.category==="weapon").map(v=><option value={v.id} key={v.id}>{v.name}</option>)}</select></label><label>Weapon speed<input type="number" value={speed} onChange={e=>setSpeed(Number(e.target.value))}/></label><button onClick={playerAttack}>Player attack (+10)</button></div><div className="check-controls"><label>Defense<select value={defenseId} onChange={e=>setDefenseId(e.target.value)}>{campaign.skills.filter(v=>v.id==="dodge"||v.category==="weapon").map(v=><option disabled={v.category==="weapon"&&!canParry} value={v.id} key={v.id}>{v.name}</option>)}</select></label><button onClick={enemyAttack}>Enemy attack / react</button></div></>:<p>Add an enemy to begin.</p>}{campaign.combat.lastOpposed&&<Opposed result={campaign.combat.lastOpposed}/>}</div>
    <div className="panel enemy-panel"><span>ENCOUNTER</span><h2>Enemies</h2><div className="enemy-add"><input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/>{(["health","combat","mind","armor"] as const).map(key=><label key={key}>{key}<input type="number" value={draft[key]} onChange={e=>setDraft({...draft,[key]:Number(e.target.value),...(key==="health"?{maxHealth:Number(e.target.value)}:{})})}/></label>)}<button onClick={()=>{const next=addEnemy(campaign,draft);onUpdate(next);setTargetId(next.combat.enemies.at(-1)!.id)}}>Add enemy</button></div>{campaign.combat.enemies.map(enemy=><article className="enemy-card" key={enemy.id}><div><strong>{enemy.name}</strong><small>Combat {enemy.combat} · Mind {enemy.mind} · Armor {enemy.armor}</small></div><b>{enemy.health}/{enemy.maxHealth} HP</b><button onClick={()=>onUpdate({...campaign,combat:{...campaign.combat,enemies:campaign.combat.enemies.filter(v=>v.id!==enemy.id)}})}>Remove</button></article>)}</div>
    <div className="panel damage-panel"><span>DAMAGE POOL</span><h2>Choose your die</h2><p>Enter die sizes separated by commas. Roll all contributed dice, then choose one result. Criticals double the chosen result and fixed modifiers.</p><div className="check-controls"><label>Dice<input value={dice} onChange={e=>setDice(e.target.value)}/></label><label>Fixed<input type="number" value={fixed} onChange={e=>setFixed(Number(e.target.value))}/></label><label><input type="checkbox" checked={critical} onChange={e=>setCritical(e.target.checked)}/> Critical</label><button onClick={rollPool}>Roll pool</button></div><div className="damage-pool">{pool.map((value,index)=><button key={index} onClick={()=>deal(value)}>Choose {value} → {(critical?2:1)*(value+fixed)}</button>)}</div><label>Enemy damage (armor applies)<input type="number" min="0" onKeyDown={e=>{if(e.key==="Enter"){onUpdate(applyDamageToPlayer(campaign,Number(e.currentTarget.value)));e.currentTarget.value=""}}}/></label><small>Press Enter to apply. Damage reduces Toughness, then Health.</small></div>
  </section>;
}
function Opposed({result}:{result:OpposedResult}) { return <div className="opposed-result"><b>{result.winner} wins</b><span>Attack {result.attacker.roll}/{result.attacker.target} · {result.attacker.outcome}</span><span>Defense {result.defender.roll}/{result.defender.target} · {result.defender.outcome}</span>{result.bothFailed&&<strong>Both failed: 1 unmitigated damage</strong>}</div> }
