import { useEffect, useMemo, useState } from "react";
import { addFeature, addItem, addRoom, changeItemQuantity, checkTension, enterRoom, equipItem, generateAttributes, hasItem, importCampaign, investigateFeature, inventoryUsage, loadCampaign, log, markImprovementsFromChecks, performCheck, performManualCheck, resolveExplorationRoll, resolveUnknownFeatureInteraction, rollUsageDie, saveCampaign, updateResource, validateCharacterSetup, validatePlaySetup } from "./campaign";
import type { AttributeRolls, Campaign, CheckMode, Direction, DomainRoom, EquipmentSlot, Item, ItemWeight, ResourceKey, Skill } from "./types";
import { Combat } from "./Combat";
import { QUICK_RULES } from "./rules";
import { MASTERY_OPTIONS, RESISTANCE_USES, RESOURCE_USES, SKILL_USES } from "./characterData";

const resourceLabels: Record<ResourceKey, string> = {
  health: "Health", toughness: "Toughness", aether: "Aether", sanity: "Sanity", exhaustion: "Exhaustion",
};

const guidance: Record<Campaign["phase"], { title: string; text: string; page: string }> = {
  enter: { title: "You entered a room", text: "Restore Aether, then determine what this room contains and resolve anything immediate.", page: "Domain Exploration" },
  resolve: { title: "Resolve the room", text: "Handle enemies, traps, doors, containers, or other features before treating the room as safe.", page: "Rules Reference" },
  explore: { title: "The room is yours to explore", text: "Search, interact, set camp when permitted, or choose a connected passage.", page: "Domain Exploration" },
  camp: { title: "Set Camp", text: "Resolve recovery, marked skill improvements, equipment changes, and the camp procedure.", page: "Camping" },
};
const explorationGuidance: Record<Campaign["explorationStep"], { title: string; text: string; page: string }> = {
  darkness: { title: "Face the darkness", text: "Without an active light, you are Blinded. Make a Resolve check now; on a failure lose 1 Sanity, then continue the room-entry procedure.", page: "96" },
  shape: { title: "Determine the new location", text: "Roll the Room & Corridor Shape table. A result of 1–25 is a corridor; 26–100 is a room.", page: "96–97" },
  lair: { title: "Make the Domain discovery check", text: "Roll the Lair usage die. After finding the Overseer, new locations use the Exit die instead.", page: "96–99" },
  tension: { title: "Check the rising tension", text: "Moving into any room or corridor triggers the Tension usage die. A depleted d4 triggers Growing Darkness and resets to d8.", page: "120" },
  encounter: { title: "Check for an encounter", text: "Roll d20: rooms encounter on 10+, corridors on 15+. An Overseer's Lair skips this check and contains its Overseer.", page: "98" },
  event: { title: "Roll the room event", text: "Because this is a room without a combat encounter, roll on the Events table and record the result.", page: "98 and Events table" },
  combat: { title: "Resolve the combat encounter", text: "Record or generate the enemy, then resolve combat. Mark this complete when the room is safe or you have escaped.", page: "75–87" },
  ready: { title: "Choose what you do here", text: "You may scavenge once, make one deep search, interact with a feature, set camp when permitted, or leave through an available route.", page: "99 and 116–123" },
};

function combatGuidance(campaign: Campaign) {
  const stage = campaign.combat.stage;
  if (stage === "setup") return { title:"Establish who acts first", text:"Add the encounter, optionally attempt surprise, then oppose Perception against the highest enemy Mind for initiative.", page:"76" };
  if (stage === "hit-location") return { title:"Determine where the attack landed", text:"Roll on the enemy’s anatomy table, identify its Weak Spot, and record whether this becomes a Critical Strike.", page:"80" };
  if (stage === "player-hit-location") return { title:"Find your hit location", text:"Roll on the human hit-location table, then select only an Armor piece that covers that body part.", page:"80, 210" };
  if (stage === "damage") return { title:"Build the Damage Pool", text:"Roll every contributed die, choose one result, add fixed modifiers, then preview Critical Strike, Armor, and damage response.", page:"81–83" };
  if (stage === "enemy-damage") return { title:"Confirm the enemy action", text:"Enter the action’s damage or effect and confirm whether Armor applies before changing turns.", page:"77, 81–83" };
  if (stage === "defensive-move") return { title:"Resolve the Defensive Move", text:"Use the table in your book, apply its instruction, then mark the action complete.", page:"75, 77" };
  if (stage === "recovery") return { title:"Close the fight", text:"Recover d4 Toughness after the fight, then return to the cleared room.", page:"Player Reference p. 2" };
  return { title:`Round ${campaign.combat.round}: ${campaign.combat.actingSide} acts`, text:campaign.combat.actingSide === "player" ? "Choose an attack or other Standard Action. The dashboard pauses after each resolution step." : "Roll the creature’s Action table, classify the result, and resolve its Physical, Magical, or special instructions.", page:"75–79" };
}

export function App() {
  const [campaign, setCampaign] = useState(loadCampaign);
  const [activeTab, setActiveTab] = useState<"explore" | "combat" | "character" | "inventory" | "journal">(campaign.characterCreated ? "explore" : "character");
  const [showGuide, setShowGuide] = useState(true);
  const [rollMessage, setRollMessage] = useState("");
  const [undoCampaign, setUndoCampaign] = useState<Campaign|null>(null);

  useEffect(() => saveCampaign(campaign), [campaign]);
  const currentRoom = campaign.rooms.find((room) => room.id === campaign.currentRoomId)!;
  const setupPending=campaign.characterCreated&&!campaign.domainSetup.complete;
  useEffect(() => { window.scrollTo({ top: 0, left: 0 }); }, [activeTab, setupPending]);
  const guide = !campaign.characterCreated ? { title:"Create your Gravebound", text:"Name your character, record why they entered Ker Nethalas, assign the listed skill allotments and set resistances to 40 / 20 / 20. Every requirement turns green when complete.", page:"19–20" } : activeTab === "explore" ? explorationGuidance[campaign.explorationStep] : activeTab === "combat" ? combatGuidance(campaign) : guidance[campaign.phase];

  function updateCampaign(next:Campaign|((value:Campaign)=>Campaign)) { setUndoCampaign(campaign); setCampaign(current=>typeof next==="function"?next(current):next); }

  function changeResource(key: ResourceKey, delta: number) { updateCampaign((value) => updateResource(value, key, delta)); }
  function travel(direction: Direction, entryType: "passage" | "door") { updateCampaign((value) => addRoom(value, direction, entryType)); setShowGuide(true); }
  function usageRoll(forcedRoll?:number) {
    updateCampaign((value) => {
      const result = rollUsageDie(value,forcedRoll);
      setRollMessage(`d${value.eventDie} → ${result.result}${result.depleted ? " · EVENT" : ""}`);
      return result.campaign;
    });
  }
  function reset() {
    if (confirm("Start a new campaign? Export your current campaign first if you want a backup.")) {
      localStorage.removeItem("com.esortland.ker-nethalas/campaigns-v1");
      location.reload();
    }
  }
  function exportSave() {
    const blob = new Blob([JSON.stringify(campaign, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = href; link.download = `${campaign.name.replace(/\W+/g, "-").toLowerCase()}.json`; link.click();
    URL.revokeObjectURL(href);
  }
  async function importSave(file?:File) {
    if(!file)return;
    try { const next=importCampaign(JSON.parse(await file.text())); updateCampaign(log(next,"Campaign save imported.")); setActiveTab(next.characterCreated?"explore":"character"); setShowGuide(true); }
    catch(error){ alert(error instanceof Error?error.message:"That campaign file could not be imported."); }
  }
  function undo(){ if(!undoCampaign)return; setCampaign(undoCampaign); setUndoCampaign(null); saveCampaign(undoCampaign); setRollMessage(""); }

  return <main className="app-shell">
    <header className="masthead">
      <div><p className="eyebrow">GRAVEBOUND COMPANION · v0.10</p><h1>{campaign.domainName}</h1><p>{campaign.characterName} · Room {currentRoom.number}</p></div>
      <div className="save-tools"><span className="saved">◆ Autosaved</span><button disabled={!undoCampaign} onClick={undo}>Undo</button><button onClick={exportSave}>Export</button><label className="import-save">Import<input type="file" accept="application/json,.json" onChange={event=>{void importSave(event.target.files?.[0]);event.currentTarget.value=""}}/></label><button onClick={reset}>New campaign</button></div>
    </header>

    <section className="resource-bar">
      {(Object.keys(resourceLabels) as ResourceKey[]).map((key) => <ResourceControl key={key} name={resourceLabels[key]} use={RESOURCE_USES[key]} resource={campaign.resources[key]} onChange={(delta) => changeResource(key, delta)} />)}
      <EventDieControl campaign={campaign} message={rollMessage} onRoll={usageRoll}/>
    </section>

    {setupPending&&<PlaySetup campaign={campaign} onUpdate={updateCampaign} onComplete={()=>{setActiveTab("explore");setShowGuide(true)}}/>}

    <nav className="tabs" hidden={setupPending}>
      {(["explore", "combat", "character", "inventory", "journal"] as const).map((tab) => <button key={tab} disabled={!campaign.characterCreated && tab !== "character"} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>{tab}</button>)}
      <button className="guide-button" onClick={() => setShowGuide((value) => !value)}>✦ What do I do now?</button>
    </nav>

    {!setupPending&&showGuide && <aside className="guidance"><div><span>NEXT PROCEDURE</span><h2>{guide.title}</h2><p>{guide.text}</p></div><div className="guidance-actions">{!campaign.characterCreated ? <small>Complete the checklist below<br/>Reference: pages {guide.page}</small> : <>{activeTab === "explore" && campaign.explorationStep !== "combat" && campaign.explorationStep !== "ready" ? <ExplorationRollControl key={campaign.explorationStep} campaign={campaign} onUpdate={updateCampaign}/> : activeTab === "explore" && campaign.explorationStep === "combat" ? <button onClick={() => setActiveTab("combat")}>Open combat dashboard</button> : activeTab !== "combat" ? <button onClick={() => updateCampaign((value) => ({ ...value, phase: value.phase === "enter" ? "resolve" : "explore" }))}>Mark step resolved</button> : null}<small>Reference: pages {guide.page}</small></>}</div></aside>}

    {!setupPending&&<details className="rules-drawer"><summary>Rules quick reference · pages for this screen</summary><div>{QUICK_RULES[activeTab].map(rule=><article key={rule.title}><PageRef pages={rule.page}/><strong>{rule.title}</strong><p>{rule.summary}</p></article>)}</div></details>}
    {!setupPending&&activeTab === "explore" && <Explore campaign={campaign} currentRoom={currentRoom} onTravel={travel} onUpdate={updateCampaign} />}
    {!setupPending&&activeTab === "combat" && <Combat campaign={campaign} onUpdate={updateCampaign} onFlee={(resolved)=>{updateCampaign(resolved);setActiveTab("explore");setShowGuide(true)}} onFinish={(resolved) => { updateCampaign(log({ ...resolved, explorationStep:"ready", rooms:resolved.rooms.map(room=>room.id===resolved.currentRoomId?{...room,hasEncounter:false,state:"cleared"}:room) },"Combat resolved; room cleared.")); setActiveTab("explore"); }} />}
    {!setupPending&&activeTab === "character" && <Character campaign={campaign} onUpdate={updateCampaign} onComplete={() => { setActiveTab("explore"); setShowGuide(true); }} />}
    {!setupPending&&activeTab === "inventory" && <Inventory campaign={campaign} onUpdate={updateCampaign} />}
    {!setupPending&&activeTab === "journal" && <Journal campaign={campaign} />}
  </main>;
}

function ResourceControl({ name, use, resource, onChange }: { name: string; use: string; resource: { current: number; max: number }; onChange: (delta: number) => void }) {
  return <div className="resource" title={use}><small>{name}</small><div><button aria-label={`Reduce ${name}`} onClick={() => onChange(-1)}>−</button><strong>{resource.current}</strong><span>/ {resource.max}</span><button aria-label={`Increase ${name}`} onClick={() => onChange(1)}>+</button></div><em>{use}</em></div>;
}

function PageRef({ pages }: { pages: string }) { return <span className="page-ref">BOOK · {pages}</span>; }

function EventDieControl({campaign,message,onRoll}:{campaign:Campaign;message:string;onRoll:(roll?:number)=>void}){
  const [manual,setManual]=useState(1);
  return <div className="event-die event-control"><small>EVENT DIE</small><strong>d{campaign.eventDie}</strong>{campaign.rollStyle==="manual"?<div><input aria-label="Event die result" type="number" min="1" max={campaign.eventDie} value={manual} onChange={event=>setManual(Number(event.target.value))}/><button onClick={()=>onRoll(Math.max(1,Math.min(campaign.eventDie,manual)))}>Apply</button></div>:<button onClick={()=>onRoll()}>Roll usage</button>}<span>{message||(campaign.rollStyle==="manual"?"enter your result":"ready")}</span></div>;
}

function ExplorationRollControl({campaign,onUpdate}:{campaign:Campaign;onUpdate:(campaign:Campaign)=>void}){
  const [manual,setManual]=useState(1);
  const step=campaign.explorationStep;
  const sides=step==="darkness"||step==="shape"||step==="event"?100:step==="encounter"?20:step==="tension"?campaign.tensionDie:campaign.lairFound?campaign.exitDie:campaign.lairDie;
  const label=step==="darkness"?`Resolve (${campaign.resistances.resolve})`:step==="lair"?campaign.lairFound?"Exit usage die":"Lair usage die":step;
  const apply=()=>onUpdate(resolveExplorationRoll(campaign,campaign.rollStyle==="manual"?Math.max(1,Math.min(sides,manual)):undefined));
  return <div className="procedure-roll"><div className="roll-toggle"><button className={campaign.rollStyle==="manual"?"active":""} onClick={()=>onUpdate({...campaign,rollStyle:"manual"})}>I roll</button><button className={campaign.rollStyle==="digital"?"active":""} onClick={()=>onUpdate({...campaign,rollStyle:"digital"})}>Roll for me</button></div>{campaign.rollStyle==="manual"?<label>{label} · d{sides}<input type="number" min="1" max={sides} value={manual} onChange={event=>setManual(Number(event.target.value))}/><button onClick={apply}>Apply & continue</button></label>:<button onClick={apply}>Roll d{sides} & continue</button>}</div>;
}

function PlaySetup({campaign,onUpdate,onComplete}:{campaign:Campaign;onUpdate:(campaign:Campaign)=>void;onComplete:()=>void}){
  const [weaponName,setWeaponName]=useState("");
  const lights=campaign.inventory.filter(item=>item.kind==="light"&&item.quantity>0);
  const activeLight=lights.some(item=>item.id===campaign.activeLightItemId);
  const weapon=campaign.inventory.find(item=>item.id===campaign.equipment.mainHand&&item.kind==="weapon");
  const setup=validatePlaySetup(campaign), domainNamed=setup.summary.domainNamed, overseerReady=setup.summary.overseer, lightReady=setup.summary.light, ready=setup.valid;
  const addWeapon=()=>{ if(!weaponName.trim())return; const next=addItem(campaign,{name:weaponName.trim(),quantity:1,weight:"normal",kind:"weapon",traits:[],notes:"Base non-magical weapon Damage Pool: d6",twoHanded:false,armor:0}); const item=next.inventory.at(-1)!; onUpdate(equipItem(next,item.id,"mainHand")); setWeaponName(""); };
  const finish=()=>{ if(!ready)return; const dark=campaign.domainSetup.lightChoice==="dark"; onUpdate(log({...campaign,domainSetup:{...campaign.domainSetup,complete:true},lightRemaining:dark?0:Math.max(0,campaign.lightRemaining-1),explorationStep:dark?"darkness":"shape",darknessNextStep:dark?"shape":undefined},`Domain prepared: ${campaign.domainName}, ruled by ${campaign.domainSetup.overseerName}; influence: ${campaign.domainSetup.influence}.`)); onComplete(); };
  return <section className="setup-workspace">
    <div className="panel setup-main"><div className="section-kicker"><span>PLAYTHROUGH PREFLIGHT</span><PageRef pages="96, 100, 179"/></div><h2>Prepare the first Domain</h2><p>These are the details the rules require before generating the starting location. The dashboard records the results; you still roll and interpret the book’s tables.</p>
      <label>Campaign name<input value={campaign.name} onChange={event=>onUpdate({...campaign,name:event.target.value})}/></label>
      <label>First Domain<input value={campaign.domainName} onChange={event=>onUpdate({...campaign,domainName:event.target.value})}/></label>
      <label>Overseer <small>Determine on page 179</small><input placeholder="Name or result" value={campaign.domainSetup.overseerName} onChange={event=>onUpdate({...campaign,domainSetup:{...campaign.domainSetup,overseerName:event.target.value}})}/></label>
      <label>Overseer Influence <small>Roll once on page 100</small><textarea placeholder="Record the modifier applied to creatures in this Domain" value={campaign.domainSetup.influence} onChange={event=>onUpdate({...campaign,domainSetup:{...campaign.domainSetup,influence:event.target.value}})}/></label>
    </div>
    <aside className="panel setup-side"><div className="section-kicker"><span>LIGHT & GEAR</span><PageRef pages="96, 206–212"/></div><h2>What enters the dark?</h2><label>Active lightsource<select value={activeLight?campaign.activeLightItemId:""} onChange={event=>{const id=event.target.value||undefined;onUpdate(log({...campaign,activeLightItemId:id,lightRemaining:id?20:0,domainSetup:{...campaign.domainSetup,lightChoice:id?"lit":""}},id?"Lightsource prepared for 20 rooms.":"Lightsource choice cleared."))}}><option value="">Choose a light…</option>{lights.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button className={campaign.domainSetup.lightChoice==="dark"?"active":""} onClick={()=>onUpdate(log({...campaign,activeLightItemId:undefined,lightRemaining:0,domainSetup:{...campaign.domainSetup,lightChoice:"dark"}},"Entering without a lightsource: Blinded; Resolve checks required on entry."))}>Deliberately enter in darkness</button><p className="setup-note">A Torch or Lamp needs a free hand. Without light you are Blinded and must check Resolve whenever entering a room or lose 1 Sanity.</p>
      <label>Starting weapon<div className="inline-add"><input placeholder="Weapon from your setup" value={weaponName} onChange={event=>setWeaponName(event.target.value)}/><button onClick={addWeapon}>Add & equip</button></div></label><p className="setup-note">{weapon?`${weapon.name} equipped in main hand.`:"No weapon equipped; Unarmed Combat remains available."}</p>
      <div className="roll-preference"><span>ROLL PREFERENCE</span><button className={campaign.rollStyle==="manual"?"active":""} onClick={()=>onUpdate({...campaign,rollStyle:"manual"})}>I roll physical dice</button><button className={campaign.rollStyle==="digital"?"active":""} onClick={()=>onUpdate({...campaign,rollStyle:"digital"})}>Roll digitally</button></div>
    </aside>
    <div className="panel readiness"><span>READY CHECK</span><ul><li className={domainNamed?"done":""}>First Domain named</li><li className={overseerReady?"done":""}>Overseer and Influence recorded</li><li className={lightReady?"done":""}>Lightsource—or deliberate darkness—chosen</li><li className={weapon?"done":""}>Weapon equipped <small>(recommended; not required)</small></li></ul><button disabled={!ready} onClick={finish}>Begin the first Domain</button></div>
  </section>;
}

function Explore({ campaign, currentRoom, onTravel, onUpdate }: { campaign: Campaign; currentRoom: DomainRoom; onTravel: (direction: Direction, entryType: "passage" | "door") => void; onUpdate: (campaign: Campaign) => void }) {
  const [entryType, setEntryType] = useState<"passage" | "door">("passage");
  const [deepTensionRoll,setDeepTensionRoll]=useState(1);
  const [featureRolls,setFeatureRolls]=useState({difficulty:1,trap:1,lock:1});
  const bounds = useMemo(() => ({ minX: Math.min(...campaign.rooms.map(r => r.x)), minY: Math.min(...campaign.rooms.map(r => r.y)) }), [campaign.rooms]);
  return <section className="workspace">
    <div className="map-panel panel">
      <div className="panel-heading"><div><span>DOMAIN MAP</span><h2>{campaign.domainName}</h2></div><div className="domain-dice"><b className={campaign.lightRemaining === 0 ? "danger-text" : ""}>LIGHT {campaign.lightRemaining}/20</b><b>TENSION d{campaign.tensionDie}</b><b>{campaign.lairFound ? `EXIT d${campaign.exitDie}` : `LAIR d${campaign.lairDie}`}</b></div></div>
      <div className="map-canvas">
        {campaign.rooms.map((room) => <button disabled={room.id!==currentRoom.id&&campaign.explorationStep!=="ready"} key={room.id} className={`room ${room.id === currentRoom.id ? "current" : ""} ${room.state}`} style={{ left: 280 + (room.x - bounds.minX) * 110, top: 200 + (room.y - bounds.minY) * 90 }} onClick={() => onUpdate(enterRoom(campaign, room.id))}><span>{room.number}</span><small>{room.kind} · {room.state}</small></button>)}
      </div>
    </div>
    <aside className="room-panel panel">
      <span>CURRENT LOCATION</span><h2>Room {currentRoom.number} · {currentRoom.kind}</h2>
      <div className="domain-context"><div><small>OVERSEER</small><strong>{campaign.domainSetup.overseerName}</strong><p>{campaign.domainSetup.influence}</p></div><button onClick={()=>onUpdate({...campaign,domainSetup:{...campaign.domainSetup,complete:false}})}>Edit setup</button></div>
      <div className="procedure-meter">{["darkness","shape","lair","tension","encounter","event","ready"].map(step => <i key={step} className={campaign.explorationStep === step ? "active" : ""}>{step}</i>)}</div>
      {campaign.growingDarknessPending && <div className="warning"><strong>Growing Darkness triggered</strong><input placeholder="Record the table result…" onKeyDown={event => { if(event.key === "Enter" && event.currentTarget.value) onUpdate(log({ ...campaign, growingDarknessPending: false, growingDarkness: [...campaign.growingDarkness, event.currentTarget.value] }, `Growing Darkness: ${event.currentTarget.value}`)); }} /></div>}
      <label>Next connection<select value={entryType} onChange={event => setEntryType(event.target.value as "passage" | "door")}><option value="passage">Open passage</option><option value="door">Door</option></select></label>
      <div className="direction-grid"><button disabled={campaign.explorationStep!=="ready"} onClick={() => onTravel("north", entryType)}>↑ North</button><button disabled={campaign.explorationStep!=="ready"} onClick={() => onTravel("west", entryType)}>← West</button><i>◆</i><button disabled={campaign.explorationStep!=="ready"} onClick={() => onTravel("east", entryType)}>East →</button><button disabled={campaign.explorationStep!=="ready"} onClick={() => onTravel("south", entryType)}>↓ South</button></div>{campaign.explorationStep!=="ready"&&<small className="route-lock">Resolve the current location before moving on.</small>}
      <div className="location-rolls"><small>SHAPE {currentRoom.shapeRoll ?? "—"}</small><small>ENCOUNTER {currentRoom.encounterRoll ?? "—"}</small><small>EVENT {currentRoom.eventRoll ?? "—"}</small></div>
      {currentRoom.eventRoll && <label>Event result<textarea value={currentRoom.eventDescription} placeholder={`Look up roll ${currentRoom.eventRoll} and record the result…`} onChange={event => onUpdate({ ...campaign, rooms: campaign.rooms.map(room => room.id === currentRoom.id ? { ...room, eventDescription: event.target.value } : room) })} /></label>}
      {campaign.explorationStep === "ready" && <div className="room-actions"><button disabled={currentRoom.scavengeUsed} onClick={() => onUpdate(log({ ...campaign, rooms: campaign.rooms.map(room => room.id === currentRoom.id ? { ...room, scavengeUsed: true } : room) }, `Scavenge attempt used in Room ${currentRoom.number}.`))}>Scavenge {currentRoom.scavengeUsed ? "used" : "once"}</button>{campaign.rollStyle==="manual"&&<label>Tension d{campaign.tensionDie}<input type="number" min="1" max={campaign.tensionDie} value={deepTensionRoll} onChange={event=>setDeepTensionRoll(Number(event.target.value))}/></label>}<button disabled={currentRoom.deepSearchUsed} onClick={() => { const searched = { ...campaign, resources: { ...campaign.resources, exhaustion: { ...campaign.resources.exhaustion, current: Math.min(campaign.resources.exhaustion.max, campaign.resources.exhaustion.current + 2) } }, rooms: campaign.rooms.map(room => room.id === currentRoom.id ? { ...room, deepSearchUsed: true } : room) }; onUpdate(log(checkTension(searched,campaign.rollStyle==="manual"?deepTensionRoll:undefined), `Deep search in Room ${currentRoom.number}: +2 Exhaustion.`)); }}>Deep search</button></div>}
      {campaign.explorationStep === "ready" && <div className="feature-panel">
        <label>Feature<select value={currentRoom.feature.type} onChange={event => onUpdate(addFeature(campaign, event.target.value as DomainRoom["feature"]["type"]))}><option value="none">None</option><option value="door">Door</option><option value="container">Container</option><option value="environment">Environmental feature</option></select></label>
        {currentRoom.feature.type !== "none" && <>
          {!currentRoom.feature.perception ? <div className="feature-actions"><p>Roll Random Difficulty, then make the Perception check. Only use the trap and lock results if Perception passes.</p>{campaign.rollStyle==="manual"&&<div className="feature-roll-inputs"><label>Difficulty d100<input type="number" min="1" max="100" value={featureRolls.difficulty} onChange={event=>setFeatureRolls({...featureRolls,difficulty:Number(event.target.value)})}/></label><label>Trap d10 <small>passed only</small><input type="number" min="1" max="10" value={featureRolls.trap} onChange={event=>setFeatureRolls({...featureRolls,trap:Number(event.target.value)})}/></label>{(currentRoom.feature.type==="door"||currentRoom.feature.type==="container")&&<label>Lock d20 <small>passed only</small><input type="number" min="1" max="20" value={featureRolls.lock} onChange={event=>setFeatureRolls({...featureRolls,lock:Number(event.target.value)})}/></label>}</div>}<button onClick={() => onUpdate(investigateFeature(campaign, "passed",campaign.rollStyle==="manual"?featureRolls:undefined))}>Perception passed</button><button onClick={() => onUpdate(investigateFeature(campaign, "failed",campaign.rollStyle==="manual"?{difficulty:featureRolls.difficulty}:undefined))}>Perception failed</button><PageRef pages="117"/></div>
          : currentRoom.feature.perception==="failed"&&!currentRoom.feature.interactionChosen ? <div className="feature-result"><b>Danger unknown</b><small>Difficulty d100: {currentRoom.feature.difficultyRoll}</small><p>You found nothing—but that does not reveal whether a trap exists. Leave it alone, or commit to interacting and only then roll the trap.</p>{campaign.rollStyle==="manual"&&<div className="feature-roll-inputs"><label>Trap d10<input type="number" min="1" max="10" value={featureRolls.trap} onChange={event=>setFeatureRolls({...featureRolls,trap:Number(event.target.value)})}/></label>{(currentRoom.feature.type==="door"||currentRoom.feature.type==="container")&&<label>Lock d20<input type="number" min="1" max="20" value={featureRolls.lock} onChange={event=>setFeatureRolls({...featureRolls,lock:Number(event.target.value)})}/></label>}</div>}<button onClick={()=>onUpdate(resolveUnknownFeatureInteraction(campaign,campaign.rollStyle==="manual"?featureRolls:undefined))}>Interact anyway</button><button onClick={()=>onUpdate(log({...campaign,rooms:campaign.rooms.map(room=>room.id===currentRoom.id?{...room,feature:{...room.feature,resolved:true}}:room)},`${currentRoom.feature.type} left alone; any trap remains unknown.`))}>Leave it alone</button><PageRef pages="117"/></div>
          : <div className="feature-result"><b>{currentRoom.feature.trapped ? currentRoom.feature.perception === "passed" ? "Trap detected" : "Trap triggered" : "No trap"}</b>{currentRoom.feature.lockRoll !== undefined && <b>{currentRoom.feature.locked ? "Locked" : "Unlocked"}</b>}<small>Difficulty d100: {currentRoom.feature.difficultyRoll} · Trap d10: {currentRoom.feature.trapRoll}{currentRoom.feature.lockRoll !== undefined ? ` · Lock d20: ${currentRoom.feature.lockRoll}` : ""}</small><p>{currentRoom.feature.trapped ? `${hasItem(campaign,"Thieves’ Tools") ? "Thieves’ Tools available." : "No Thieves’ Tools carried."} Disarm, bypass, trigger deliberately, or leave it.` : currentRoom.feature.locked ? `${hasItem(campaign,"Lockpick") ? "Lockpick available." : "No Lockpick carried."} Pick the lock, brute-force it (and check Tension), or leave it.` : "The feature can be interacted with safely."}</p><button onClick={() => onUpdate(log({ ...campaign, rooms: campaign.rooms.map(room => room.id === currentRoom.id ? { ...room, feature: { ...room.feature, resolved: true, trapped: false, locked: false } } : room) }, `${currentRoom.feature.type} resolved.`))}>Mark resolved</button><PageRef pages="117"/></div>}
        </>}
      </div>}
      <label>Room state<select value={currentRoom.state} onChange={(event) => onUpdate({ ...campaign, rooms: campaign.rooms.map(room => room.id === currentRoom.id ? { ...room, state: event.target.value as DomainRoom["state"] } : room) })}><option value="entered">Entered</option><option value="searched">Searched</option><option value="cleared">Cleared</option><option value="dangerous">Dangerous</option><option value="camp">Camp</option></select></label>
      <label>Field notes<textarea value={currentRoom.notes} placeholder="What did you find here?" onChange={(event) => onUpdate({ ...campaign, rooms: campaign.rooms.map(room => room.id === currentRoom.id ? { ...room, notes: event.target.value } : room) })} /></label>
    </aside>
  </section>;
}

function Character({ campaign, onUpdate, onComplete }: { campaign: Campaign; onUpdate: (campaign: Campaign) => void; onComplete: () => void }) {
  const [modifier, setModifier] = useState(0);
  const [mode, setMode] = useState<CheckMode>("normal");
  const [manualCheck,setManualCheck]=useState(50);
  const [attributeMode, setAttributeMode] = useState<"physical"|"digital">("physical");
  const [attributeRolls, setAttributeRolls] = useState<AttributeRolls>(campaign.attributeRolls ?? { health:1, toughness:[1,1,1], aether:1, sanity:1 });
  const setup = validateCharacterSetup(campaign);
  const setAttribute = (key:"health"|"aether"|"sanity", value:number) => setAttributeRolls({...attributeRolls,[key]:Math.min(6,Math.max(1,value))});
  const updateMastery = (index:number, patch:Partial<Campaign["masteries"][number]>) => onUpdate({...campaign,masteries:campaign.masteries.map((value,i)=>i===index?{...value,...patch}:value) as Campaign["masteries"]});
  const chooseMastery = (index:number, name:string) => updateMastery(index,{name});
  const updateSkill = (id: string, patch: Partial<Skill>) => onUpdate({ ...campaign, skills: campaign.skills.map(skill => skill.id === id ? { ...skill, ...patch } : skill) });
  const roll = (id: string, name: string, score: number, isSkill: boolean) => {
    const subjectId=`${isSkill ? "skill" : "resistance"}:${id}`;
    const result = campaign.rollStyle==="manual" ? performManualCheck(subjectId,name,score,modifier,manualCheck) : performCheck(subjectId, name, score, modifier, mode);
    onUpdate(log(markImprovementsFromChecks({ ...campaign, lastCheck: result },result), `${name} check: ${result.roll} vs ${result.target} — ${result.outcome.replace("-", " ")}.`));
  };
  const markLast = () => {
    const id = campaign.lastCheck?.subjectId.replace("skill:", "");
    if (!id) return;
    onUpdate(log({ ...campaign, lastCheck: { ...campaign.lastCheck!, canMarkImprovement: false }, skills: campaign.skills.map(skill => skill.id === id ? { ...skill, markedForImprovement: true } : skill) }, `${campaign.lastCheck!.subjectName} marked for improvement.`));
  };
  return <section className="character-workspace">
    <div className="panel character-identity">
      <div className="section-kicker"><span>{campaign.characterCreated ? "CHARACTER DOSSIER" : "CREATE YOUR GRAVEBOUND"}</span><PageRef pages="16"/></div><input className="name-input" value={campaign.characterName} onChange={event => onUpdate({ ...campaign, characterName: event.target.value })} />
      <label>Reason for entering Ker Nethalas<textarea value={campaign.descentReason} placeholder="What condemned or drew you here?" onChange={event => onUpdate({ ...campaign, descentReason: event.target.value })} /></label>
      <label>First Domain<input value={campaign.domainName} onChange={event=>onUpdate({...campaign,domainName:event.target.value})}/></label>
      <div className="roll-style"><button className={campaign.rollStyle==="manual"?"active":""} onClick={()=>onUpdate({...campaign,rollStyle:"manual"})}>I roll</button><button className={campaign.rollStyle==="digital"?"active":""} onClick={()=>onUpdate({...campaign,rollStyle:"digital"})}>Roll for me</button></div><div className="check-controls">{campaign.rollStyle==="manual"?<label>Physical d100 result<input type="number" min="1" max="100" value={manualCheck} onChange={event=>setManualCheck(Number(event.target.value))}/></label>:<label>Roll mode<select value={mode} onChange={event => setMode(event.target.value as CheckMode)}><option value="normal">Normal</option><option value="advantage">Advantage</option><option value="disadvantage">Disadvantage</option></select></label>}<label>Modifier<input type="number" step="10" value={modifier} onChange={event => setModifier(Number(event.target.value))} /></label></div>
      {campaign.lastCheck && <div className={`roll-result ${campaign.lastCheck.outcome}`}><small>LATEST CHECK</small><strong>{campaign.lastCheck.roll}</strong><p>{campaign.lastCheck.subjectName} vs {campaign.lastCheck.target}</p><b>{campaign.lastCheck.outcome.replace("-", " ")}</b>{campaign.lastCheck.canMarkImprovement && (campaign.skills.find(skill=>campaign.lastCheck?.subjectId===`skill:${skill.id}`)?.markedForImprovement?<small>Marked for improvement</small>:<button onClick={markLast}>Mark for improvement</button>)}</div>}
    </div>
    <div className="panel attribute-panel"><div className="section-kicker"><span>ATTRIBUTES</span><PageRef pages="18"/></div><h2>Roll your foundations</h2><p>Health d6+10 · Toughness 3d6+20 · Aether d6+8 · Sanity d6+10 · Exhaustion 0</p><div className="attribute-uses">{(Object.keys(resourceLabels) as ResourceKey[]).map(key=><div key={key}><strong>{resourceLabels[key]}</strong><small>{RESOURCE_USES[key]}</small></div>)}</div><div className="attribute-mode"><button className={attributeMode==="physical"?"active":""} onClick={()=>setAttributeMode("physical")}>Enter physical dice</button><button className={attributeMode==="digital"?"active":""} onClick={()=>setAttributeMode("digital")}>Roll digitally</button></div>{attributeMode==="physical"&&<div className="attribute-dice"><label>Health d6<input type="number" min="1" max="6" value={attributeRolls.health} onChange={e=>setAttribute("health",Number(e.target.value))}/></label><label>Toughness 3d6<div>{attributeRolls.toughness.map((value,index)=><input key={index} type="number" min="1" max="6" value={value} onChange={e=>setAttributeRolls({...attributeRolls,toughness:attributeRolls.toughness.map((v,i)=>i===index?Math.min(6,Math.max(1,Number(e.target.value))):v) as [number,number,number]})}/>)}</div></label><label>Aether d6<input type="number" min="1" max="6" value={attributeRolls.aether} onChange={e=>setAttribute("aether",Number(e.target.value))}/></label><label>Sanity d6<input type="number" min="1" max="6" value={attributeRolls.sanity} onChange={e=>setAttribute("sanity",Number(e.target.value))}/></label></div>}<button className="apply-attributes" onClick={()=>onUpdate(generateAttributes(campaign,attributeMode==="physical"?attributeRolls:undefined))}>{attributeMode==="physical"?"Apply entered dice":"Roll attributes"}</button>{campaign.attributesGenerated&&<div className="attribute-results"><b>Health {campaign.resources.health.max}</b><b>Toughness {campaign.resources.toughness.max}</b><b>Aether {campaign.resources.aether.max}</b><b>Sanity {campaign.resources.sanity.max}</b></div>}</div>
    <div className="panel skill-panel"><div className="panel-heading"><div><span>SKILLS</span><h2>Training & experience</h2></div><div><PageRef pages="19, 69–71"/><small>Natural maximum 80</small></div></div>
      <div className="skill-list">{campaign.skills.map(skill => <div className="skill-row" key={skill.id}><div><strong>{skill.name}</strong><small>{skill.category} · starts {skill.startingBase}{skill.markedForImprovement ? " · MARKED" : ""}</small><small className="stat-use">{SKILL_USES[skill.id]}</small></div><label>{campaign.characterCreated ? "Base" : "Allot"}{campaign.characterCreated ? <input type="number" min="0" max="80" value={skill.base} onChange={event => updateSkill(skill.id, { base: Math.min(80, Math.max(0, Number(event.target.value))) })} /> : <select value={skill.base - skill.startingBase} onChange={event => updateSkill(skill.id, { base: skill.startingBase + Number(event.target.value) })}><option value="0">—</option><option value="10">+10</option><option value="20">+20</option><option value="30">+30</option>{skill.category === "weapon" && <><option value="40">+40</option><option value="60">+60</option></>}</select>}</label><label>Gear<input type="number" step="5" value={skill.gearModifier} onChange={event => updateSkill(skill.id, { gearModifier: Number(event.target.value) })} /></label><strong className="effective">{skill.base + skill.gearModifier}</strong><button onClick={() => roll(skill.id, skill.name, skill.base + skill.gearModifier, true)}>Roll</button></div>)}</div>
    </div>
    <div className="panel resistance-panel"><div className="section-kicker"><span>RESISTANCES</span><PageRef pages="20"/></div><h2>Automatic defenses</h2>{Object.entries(campaign.resistances).map(([id, score]) => <div className="resistance" key={id}><div><strong>{id}</strong><small>{RESISTANCE_USES[id]}</small></div><input aria-label={`${id} score`} type="number" min="0" value={score} onChange={event => onUpdate({ ...campaign, resistances: { ...campaign.resistances, [id]: Number(event.target.value) } })}/><button onClick={() => roll(id, id[0].toUpperCase() + id.slice(1), score, false)}>Roll</button></div>)}<p>Assign 40 to one resistance and 20 to the other two. Resistances are automatic and are not Reactions.</p></div>
    <div className="panel mastery-panel"><div className="section-kicker"><span>GRAVEBOUND MASTERIES</span><PageRef pages="21+"/></div><h2>Two paths into the dark</h2><p>Choose two different Masteries. The focus line helps you compare them; use the current Gravebound entry in your book to record the exact Feature and one Tier 1 Ability.</p><div className="mastery-choices">{campaign.masteries.map((mastery,index)=>{const option=MASTERY_OPTIONS.find(value=>value.name===mastery.name);const other=campaign.masteries[index===0?1:0].name;return <article key={mastery.id}><label>Mastery {index+1}<select value={mastery.name} onChange={e=>chooseMastery(index,e.target.value)}><option value="">Choose a Mastery…</option>{mastery.name&&!MASTERY_OPTIONS.some(value=>value.name===mastery.name)&&<option value={mastery.name}>{mastery.name}</option>}{MASTERY_OPTIONS.map(value=><option key={value.name} value={value.name} disabled={value.name===other}>{value.name}</option>)}</select></label>{option&&<p className="mastery-focus"><strong>Focus</strong>{option.focus}</p>}<label>Feature<textarea value={mastery.feature} placeholder="Record the exact Feature from your current book…" onChange={e=>updateMastery(index,{feature:e.target.value})}/></label><label>Tier 1 Ability<input value={mastery.tierOneAbility} placeholder="Chosen Tier 1 Ability" onChange={e=>updateMastery(index,{tierOneAbility:e.target.value})}/></label></article>})}</div><p className="source-note">All 22 Gravebound-era Masteries are listed. Rules text stays editable so the dashboard follows your current book instead of older-edition wording.</p></div>
    <div className="panel creation-rules"><div className="section-kicker"><span>CREATION CHECKLIST</span><PageRef pages="16–21"/></div><h2>{campaign.characterCreated ? "Setup complete" : "Character setup"}</h2><ul><li className={setup.summary.descentReason ? "done" : ""}>Reason for the descent recorded</li><li className={setup.summary.attributes ? "done" : ""}>Attributes generated</li><li className={setup.summary.masteries ? "done" : ""}>Two Masteries and Tier 1 Abilities recorded</li><li className={setup.summary.weapon60 === 1 ? "done" : ""}>+60 to one weapon skill ({setup.summary.weapon60}/1)</li><li className={setup.summary.weapon40 === 1 ? "done" : ""}>+40 to one weapon skill ({setup.summary.weapon40}/1)</li><li className={setup.summary.thirty === 3 ? "done" : ""}>+30 to three skills ({setup.summary.thirty}/3)</li><li className={setup.summary.twenty === 2 ? "done" : ""}>+20 to two skills ({setup.summary.twenty}/2)</li><li className={setup.summary.ten === 3 ? "done" : ""}>+10 to three skills ({setup.summary.ten}/3)</li><li className={setup.summary.resistances ? "done" : ""}>Resistances assigned 40 / 20 / 20</li></ul>{!campaign.characterCreated && <button className="complete-character" disabled={!setup.valid} onClick={() => { onUpdate(log({ ...campaign, characterCreated: true, phase:"enter", explorationStep:"shape" }, `${campaign.characterName} completed character creation and began the descent.`)); onComplete(); }}>Complete character & begin descent</button>}<p>After creation, values remain editable for advancement, equipment, and unusual character options.</p></div>
  </section>;
}
const EQUIPMENT_SLOTS: EquipmentSlot[] = ["mainHand","offHand","belt","head","armor","gloves","boots","amulet","ring1","ring2","backpack","pouch1","pouch2","pouch3"];
function Inventory({ campaign, onUpdate }: { campaign: Campaign; onUpdate: (campaign: Campaign) => void }) {
  const usage = inventoryUsage(campaign);
  const [draft, setDraft] = useState({ name:"", quantity:1, weight:"normal" as ItemWeight, kind:"other" as Item["kind"] });
  const equippedSlot = (id:string) => (Object.entries(campaign.equipment).find(([,value]) => value === id)?.[0] as EquipmentSlot | undefined) ?? "carried";
  const submit = () => { if (!draft.name.trim()) return; onUpdate(addItem(campaign, { ...draft, name:draft.name.trim(), traits:[], notes:"", twoHanded:false, armor:0 })); setDraft({ name:"",quantity:1,weight:"normal",kind:"other" }); };
  return <section className="inventory-workspace">
    <aside className="panel load-panel"><span>CARRYING CAPACITY · PAGE 206</span><h2>{usage.used} / {usage.capacity} slots</h2><div className="capacity-track"><i style={{width:`${Math.min(100,usage.used/usage.capacity*100)}%`}} /></div>{usage.used > usage.capacity && <strong className="danger-text">ENCUMBERED BY {usage.used-usage.capacity}</strong>}<p>Light items bundle 10 per slot. Coins and gems bundle 100. Heavy items use two slots each. Equipped items do not use carried slots.</p><h3>Quick add</h3><div className="quick-items">{[["Torch","light","light"],["Ration","light","consumable"],["Bandage","light","consumable"],["Lockpick","none","tool"],["Thieves’ Tools","normal","tool"],["Crafting Supplies","light","other"]].map(([name,weight,kind])=><button key={name} onClick={()=>onUpdate(addItem(campaign,{name,quantity:1,weight:weight as ItemWeight,kind:kind as Item["kind"],traits:[],notes:"",twoHanded:false,armor:0}))}>+ {name}</button>)}</div></aside>
    <div className="panel items-panel"><div className="panel-heading"><div><span>INVENTORY & EQUIPMENT</span><h2>What you carry into the dark</h2></div><small>{campaign.inventory.length} distinct items</small></div>
      <div className="add-item"><input placeholder="Item name" value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/><input type="number" min="1" value={draft.quantity} onChange={e=>setDraft({...draft,quantity:Number(e.target.value)})}/><select value={draft.weight} onChange={e=>setDraft({...draft,weight:e.target.value as ItemWeight})}>{["none","light","normal","heavy","coins"].map(v=><option key={v}>{v}</option>)}</select><select value={draft.kind} onChange={e=>setDraft({...draft,kind:e.target.value as Item["kind"]})}>{["weapon","armor","shield","tool","consumable","light","container","other"].map(v=><option key={v}>{v}</option>)}</select><button onClick={submit}>Add</button></div>
      <div className="item-list">{campaign.inventory.map(item=><article className="item-card" key={item.id}><div><strong>{item.name}</strong><small>{item.kind} · {item.weight} · {itemSlotsLabel(item)}</small></div><div className="quantity"><button onClick={()=>onUpdate(changeItemQuantity(campaign,item.id,-1))}>−</button><b>{item.quantity}</b><button onClick={()=>onUpdate(changeItemQuantity(campaign,item.id,1))}>+</button></div><select value={equippedSlot(item.id)} onChange={e=>onUpdate(equipItem(campaign,item.id,e.target.value as EquipmentSlot|"carried"))}><option value="carried">Carried</option>{EQUIPMENT_SLOTS.map(slot=><option key={slot} value={slot}>{slot.replace(/([A-Z])/g," $1")}</option>)}</select>{item.kind === "light" && <button onClick={()=>onUpdate(log({...campaign,activeLightItemId:item.id,lightRemaining:20},`${item.name} lit; 20 rooms of light.`))}>Light</button>}<div className="item-combat"><input className="item-notes" placeholder="Traits: Parrying, Quick…" value={item.traits.join(", ")} onChange={e=>onUpdate({...campaign,inventory:campaign.inventory.map(value=>value.id===item.id?{...value,traits:e.target.value.split(",").map(v=>v.trim()).filter(Boolean)}:value)})}/><label>Armor <input type="number" min="0" value={item.armor} onChange={e=>onUpdate({...campaign,inventory:campaign.inventory.map(value=>value.id===item.id?{...value,armor:Number(e.target.value)}:value)})}/></label>{item.kind==="armor"&&<label>Integrity <select value={item.integrity??""} onChange={e=>onUpdate({...campaign,inventory:campaign.inventory.map(value=>value.id===item.id?{...value,integrity:e.target.value?Number(e.target.value) as Item["integrity"]:undefined}:value)})}><option value="">—</option>{[20,12,10,8,6,4].map(value=><option value={value} key={value}>d{value}</option>)}</select></label>}</div></article>)}</div>
    </div>
  </section>;
}
function itemSlotsLabel(item: Item) { if(item.weight==="none") return "0 slots"; if(item.weight==="light") return `${Math.ceil(item.quantity/10)} slot bundle`; if(item.weight==="coins") return `${Math.ceil(item.quantity/100)} coin slots`; return `${item.quantity*(item.weight==="heavy"?2:1)} slots`; }
function Journal({ campaign }: { campaign: Campaign }) { return <section className="single-panel panel"><span>EXPEDITION RECORD</span><h2>What the dark remembers</h2><ol className="journal">{campaign.events.map(event => <li key={event.id}><time>{new Date(event.at).toLocaleString()}</time>{event.text}</li>)}</ol></section>; }
