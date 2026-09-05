import { useEffect, useMemo, useState } from "react";
import { addFeature, addItem, addRoom, changeItemQuantity, checkTension, enterRoom, equipItem, hasItem, investigateFeature, inventoryUsage, loadCampaign, log, performCheck, resolveExplorationRoll, rollUsageDie, saveCampaign, updateResource, validateCharacterSetup } from "./campaign";
import type { Campaign, CheckMode, Direction, DomainRoom, EquipmentSlot, Item, ItemWeight, ResourceKey, Skill } from "./types";
import { Combat } from "./Combat";

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
  shape: { title: "Determine the new location", text: "Roll the Room & Corridor Shape table. A result of 1–25 is a corridor; 26–100 is a room.", page: "96–97" },
  lair: { title: "Make the Domain discovery check", text: "Roll the Lair usage die. After finding the Overseer, new locations use the Exit die instead.", page: "96–99" },
  tension: { title: "Check the rising tension", text: "Moving into any room or corridor triggers the Tension usage die. A depleted d4 triggers Growing Darkness and resets to d8.", page: "120" },
  encounter: { title: "Check for an encounter", text: "Roll d20: rooms encounter on 10+, corridors on 15+. An Overseer's Lair skips this check and contains its Overseer.", page: "98" },
  event: { title: "Roll the room event", text: "Because this is a room without a combat encounter, roll on the Events table and record the result.", page: "98 and Events table" },
  combat: { title: "Resolve the combat encounter", text: "Record or generate the enemy, then resolve combat. Mark this complete when the room is safe or you have escaped.", page: "75–87" },
  ready: { title: "Choose what you do here", text: "You may scavenge once, make one deep search, interact with a feature, set camp when permitted, or leave through an available route.", page: "99 and 116–123" },
};

export function App() {
  const [campaign, setCampaign] = useState(loadCampaign);
  const [activeTab, setActiveTab] = useState<"explore" | "combat" | "character" | "inventory" | "journal">("explore");
  const [showGuide, setShowGuide] = useState(true);
  const [rollMessage, setRollMessage] = useState("");

  useEffect(() => saveCampaign(campaign), [campaign]);
  const currentRoom = campaign.rooms.find((room) => room.id === campaign.currentRoomId)!;
  const guide = activeTab === "explore" ? explorationGuidance[campaign.explorationStep] : activeTab === "combat" ? { title:`Round ${campaign.combat.round}: ${campaign.combat.actingSide} acts`, text:"Resolve an opposed check, apply damage when required, then change the acting side. Reactions reset at the next round.", page:"75–87" } : guidance[campaign.phase];

  function changeResource(key: ResourceKey, delta: number) { setCampaign((value) => updateResource(value, key, delta)); }
  function travel(direction: Direction, entryType: "passage" | "door") { setCampaign((value) => addRoom(value, direction, entryType)); setShowGuide(true); }
  function usageRoll() {
    setCampaign((value) => {
      const result = rollUsageDie(value);
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

  return <main className="app-shell">
    <header className="masthead">
      <div><p className="eyebrow">GRAVEBOUND COMPANION · v0.5</p><h1>{campaign.domainName}</h1><p>{campaign.characterName} · Room {currentRoom.number}</p></div>
      <div className="save-tools"><span className="saved">◆ Autosaved</span><button onClick={exportSave}>Export</button><button onClick={reset}>New campaign</button></div>
    </header>

    <section className="resource-bar">
      {(Object.keys(resourceLabels) as ResourceKey[]).map((key) => <ResourceControl key={key} name={resourceLabels[key]} resource={campaign.resources[key]} onChange={(delta) => changeResource(key, delta)} />)}
      <button className="event-die" onClick={usageRoll}><small>EVENT DIE</small><strong>d{campaign.eventDie}</strong><span>{rollMessage || "roll usage"}</span></button>
    </section>

    <nav className="tabs">
      {(["explore", "combat", "character", "inventory", "journal"] as const).map((tab) => <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>{tab}</button>)}
      <button className="guide-button" onClick={() => setShowGuide((value) => !value)}>✦ What do I do now?</button>
    </nav>

    {showGuide && <aside className="guidance"><div><span>NEXT PROCEDURE</span><h2>{guide.title}</h2><p>{guide.text}</p></div><div className="guidance-actions">{activeTab === "explore" && campaign.explorationStep !== "combat" && campaign.explorationStep !== "ready" ? <button onClick={() => setCampaign(resolveExplorationRoll(campaign))}>Roll & continue</button> : activeTab === "explore" && campaign.explorationStep === "combat" ? <button onClick={() => setActiveTab("combat")}>Open combat dashboard</button> : <button onClick={() => setCampaign((value) => ({ ...value, phase: value.phase === "enter" ? "resolve" : "explore" }))}>Mark step resolved</button>}<small>Reference: pages {guide.page}</small></div></aside>}

    {activeTab === "explore" && <Explore campaign={campaign} currentRoom={currentRoom} onTravel={travel} onUpdate={setCampaign} />}
    {activeTab === "combat" && <Combat campaign={campaign} onUpdate={setCampaign} onFinish={() => { setCampaign(log({ ...campaign, combat:{...campaign.combat,active:false,reactions:0}, explorationStep:"ready", rooms:campaign.rooms.map(room=>room.id===campaign.currentRoomId?{...room,hasEncounter:false,state:"cleared"}:room) },"Combat resolved; room cleared.")); setActiveTab("explore"); }} />}
    {activeTab === "character" && <Character campaign={campaign} onUpdate={setCampaign} />}
    {activeTab === "inventory" && <Inventory campaign={campaign} onUpdate={setCampaign} />}
    {activeTab === "journal" && <Journal campaign={campaign} />}
  </main>;
}

function ResourceControl({ name, resource, onChange }: { name: string; resource: { current: number; max: number }; onChange: (delta: number) => void }) {
  return <div className="resource"><small>{name}</small><div><button onClick={() => onChange(-1)}>−</button><strong>{resource.current}</strong><span>/ {resource.max}</span><button onClick={() => onChange(1)}>+</button></div></div>;
}

function Explore({ campaign, currentRoom, onTravel, onUpdate }: { campaign: Campaign; currentRoom: DomainRoom; onTravel: (direction: Direction, entryType: "passage" | "door") => void; onUpdate: (campaign: Campaign) => void }) {
  const [entryType, setEntryType] = useState<"passage" | "door">("passage");
  const bounds = useMemo(() => ({ minX: Math.min(...campaign.rooms.map(r => r.x)), minY: Math.min(...campaign.rooms.map(r => r.y)) }), [campaign.rooms]);
  return <section className="workspace">
    <div className="map-panel panel">
      <div className="panel-heading"><div><span>DOMAIN MAP</span><h2>{campaign.domainName}</h2></div><div className="domain-dice"><b className={campaign.lightRemaining === 0 ? "danger-text" : ""}>LIGHT {campaign.lightRemaining}/20</b><b>TENSION d{campaign.tensionDie}</b><b>{campaign.lairFound ? `EXIT d${campaign.exitDie}` : `LAIR d${campaign.lairDie}`}</b></div></div>
      <div className="map-canvas">
        {campaign.rooms.map((room) => <button key={room.id} className={`room ${room.id === currentRoom.id ? "current" : ""} ${room.state}`} style={{ left: 280 + (room.x - bounds.minX) * 110, top: 200 + (room.y - bounds.minY) * 90 }} onClick={() => onUpdate(enterRoom(campaign, room.id))}><span>{room.number}</span><small>{room.kind} · {room.state}</small></button>)}
      </div>
    </div>
    <aside className="room-panel panel">
      <span>CURRENT LOCATION</span><h2>Room {currentRoom.number} · {currentRoom.kind}</h2>
      <div className="procedure-meter">{["shape","lair","tension","encounter","event","ready"].map(step => <i key={step} className={campaign.explorationStep === step ? "active" : ""}>{step}</i>)}</div>
      {campaign.growingDarknessPending && <div className="warning"><strong>Growing Darkness triggered</strong><input placeholder="Record the table result…" onKeyDown={event => { if(event.key === "Enter" && event.currentTarget.value) onUpdate(log({ ...campaign, growingDarknessPending: false, growingDarkness: [...campaign.growingDarkness, event.currentTarget.value] }, `Growing Darkness: ${event.currentTarget.value}`)); }} /></div>}
      <label>Next connection<select value={entryType} onChange={event => setEntryType(event.target.value as "passage" | "door")}><option value="passage">Open passage</option><option value="door">Door</option></select></label>
      <div className="direction-grid"><button onClick={() => onTravel("north", entryType)}>↑ North</button><button onClick={() => onTravel("west", entryType)}>← West</button><i>◆</i><button onClick={() => onTravel("east", entryType)}>East →</button><button onClick={() => onTravel("south", entryType)}>↓ South</button></div>
      <div className="location-rolls"><small>SHAPE {currentRoom.shapeRoll ?? "—"}</small><small>ENCOUNTER {currentRoom.encounterRoll ?? "—"}</small><small>EVENT {currentRoom.eventRoll ?? "—"}</small></div>
      {currentRoom.eventRoll && <label>Event result<textarea value={currentRoom.eventDescription} placeholder={`Look up roll ${currentRoom.eventRoll} and record the result…`} onChange={event => onUpdate({ ...campaign, rooms: campaign.rooms.map(room => room.id === currentRoom.id ? { ...room, eventDescription: event.target.value } : room) })} /></label>}
      {campaign.explorationStep === "ready" && <div className="room-actions"><button disabled={currentRoom.scavengeUsed} onClick={() => onUpdate(log({ ...campaign, rooms: campaign.rooms.map(room => room.id === currentRoom.id ? { ...room, scavengeUsed: true } : room) }, `Scavenge attempt used in Room ${currentRoom.number}.`))}>Scavenge {currentRoom.scavengeUsed ? "used" : "once"}</button><button disabled={currentRoom.deepSearchUsed} onClick={() => { const searched = { ...campaign, resources: { ...campaign.resources, exhaustion: { ...campaign.resources.exhaustion, current: Math.min(campaign.resources.exhaustion.max, campaign.resources.exhaustion.current + 2) } }, rooms: campaign.rooms.map(room => room.id === currentRoom.id ? { ...room, deepSearchUsed: true } : room) }; onUpdate(log(checkTension(searched), `Deep search in Room ${currentRoom.number}: +2 Exhaustion.`)); }}>Deep search</button></div>}
      {campaign.explorationStep === "ready" && <div className="feature-panel"><label>Feature<select value={currentRoom.feature.type} onChange={event => onUpdate(addFeature(campaign, event.target.value as DomainRoom["feature"]["type"]))}><option value="none">None</option><option value="door">Door</option><option value="container">Container</option><option value="environment">Environmental feature</option></select></label>{currentRoom.feature.type !== "none" && <>{!currentRoom.feature.perception ? <div className="feature-actions"><p>Roll the Random Difficulty table, then make a Perception check. Record whether it passed.</p><button onClick={() => onUpdate(investigateFeature(campaign, "passed"))}>Perception passed</button><button onClick={() => onUpdate(investigateFeature(campaign, "failed"))}>Perception failed</button></div> : <div className="feature-result"><b>{currentRoom.feature.trapped ? currentRoom.feature.perception === "passed" ? "Trap detected" : "Trap triggered if you interact" : "No trap"}</b>{currentRoom.feature.lockRoll !== undefined && <b>{currentRoom.feature.locked ? "Locked" : "Unlocked"}</b>}<small>Difficulty d100: {currentRoom.feature.difficultyRoll} · Trap d10: {currentRoom.feature.trapRoll}{currentRoom.feature.lockRoll !== undefined ? ` · Lock d20: ${currentRoom.feature.lockRoll}` : ""}</small><p>{currentRoom.feature.trapped ? `${hasItem(campaign,"Thieves’ Tools") ? "Thieves’ Tools available." : "No Thieves’ Tools carried."} Disarm, bypass, trigger deliberately, or leave it.` : currentRoom.feature.locked ? `${hasItem(campaign,"Lockpick") ? "Lockpick available." : "No Lockpick carried."} Pick the lock, brute-force it (and check Tension), or leave it.` : "The feature can be interacted with safely."}</p><button onClick={() => onUpdate(log({ ...campaign, rooms: campaign.rooms.map(room => room.id === currentRoom.id ? { ...room, feature: { ...room.feature, resolved: true, trapped: false, locked: false } } : room) }, `${currentRoom.feature.type} resolved.`))}>Mark resolved</button></div>}</>}</div>}
      <label>Room state<select value={currentRoom.state} onChange={(event) => onUpdate({ ...campaign, rooms: campaign.rooms.map(room => room.id === currentRoom.id ? { ...room, state: event.target.value as DomainRoom["state"] } : room) })}><option value="entered">Entered</option><option value="searched">Searched</option><option value="cleared">Cleared</option><option value="dangerous">Dangerous</option><option value="camp">Camp</option></select></label>
      <label>Field notes<textarea value={currentRoom.notes} placeholder="What did you find here?" onChange={(event) => onUpdate({ ...campaign, rooms: campaign.rooms.map(room => room.id === currentRoom.id ? { ...room, notes: event.target.value } : room) })} /></label>
    </aside>
  </section>;
}

function Character({ campaign, onUpdate }: { campaign: Campaign; onUpdate: (campaign: Campaign) => void }) {
  const [modifier, setModifier] = useState(0);
  const [mode, setMode] = useState<CheckMode>("normal");
  const setup = validateCharacterSetup(campaign);
  const updateSkill = (id: string, patch: Partial<Skill>) => onUpdate({ ...campaign, skills: campaign.skills.map(skill => skill.id === id ? { ...skill, ...patch } : skill) });
  const roll = (id: string, name: string, score: number, isSkill: boolean) => {
    const result = performCheck(`${isSkill ? "skill" : "resistance"}:${id}`, name, score, modifier, mode);
    onUpdate(log({ ...campaign, lastCheck: result }, `${name} check: ${result.roll} vs ${result.target} — ${result.outcome.replace("-", " ")}.`));
  };
  const markLast = () => {
    const id = campaign.lastCheck?.subjectId.replace("skill:", "");
    if (!id) return;
    onUpdate(log({ ...campaign, lastCheck: { ...campaign.lastCheck!, canMarkImprovement: false }, skills: campaign.skills.map(skill => skill.id === id ? { ...skill, markedForImprovement: true } : skill) }, `${campaign.lastCheck!.subjectName} marked for improvement.`));
  };
  return <section className="character-workspace">
    <div className="panel character-identity">
      <span>{campaign.characterCreated ? "CHARACTER DOSSIER" : "CREATE YOUR GRAVEBOUND"}</span><input className="name-input" value={campaign.characterName} onChange={event => onUpdate({ ...campaign, characterName: event.target.value })} />
      <label>Reason for entering Ker Nethalas<textarea value={campaign.descentReason} placeholder="What condemned or drew you here?" onChange={event => onUpdate({ ...campaign, descentReason: event.target.value })} /></label>
      <div className="check-controls"><label>Roll mode<select value={mode} onChange={event => setMode(event.target.value as CheckMode)}><option value="normal">Normal</option><option value="advantage">Advantage</option><option value="disadvantage">Disadvantage</option></select></label><label>Modifier<input type="number" step="10" value={modifier} onChange={event => setModifier(Number(event.target.value))} /></label></div>
      {campaign.lastCheck && <div className={`roll-result ${campaign.lastCheck.outcome}`}><small>LATEST CHECK</small><strong>{campaign.lastCheck.roll}</strong><p>{campaign.lastCheck.subjectName} vs {campaign.lastCheck.target}</p><b>{campaign.lastCheck.outcome.replace("-", " ")}</b>{campaign.lastCheck.canMarkImprovement && <button onClick={markLast}>Mark for improvement</button>}</div>}
    </div>
    <div className="panel skill-panel"><div className="panel-heading"><div><span>SKILLS</span><h2>Training & experience</h2></div><small>Natural maximum 80</small></div>
      <div className="skill-list">{campaign.skills.map(skill => <div className="skill-row" key={skill.id}><div><strong>{skill.name}</strong><small>{skill.category} · starts {skill.startingBase}{skill.markedForImprovement ? " · MARKED" : ""}</small></div><label>{campaign.characterCreated ? "Base" : "Allot"}{campaign.characterCreated ? <input type="number" min="0" max="80" value={skill.base} onChange={event => updateSkill(skill.id, { base: Math.min(80, Math.max(0, Number(event.target.value))) })} /> : <select value={skill.base - skill.startingBase} onChange={event => updateSkill(skill.id, { base: skill.startingBase + Number(event.target.value) })}><option value="0">—</option><option value="10">+10</option><option value="20">+20</option><option value="30">+30</option>{skill.category === "weapon" && <><option value="40">+40</option><option value="60">+60</option></>}</select>}</label><label>Gear<input type="number" step="5" value={skill.gearModifier} onChange={event => updateSkill(skill.id, { gearModifier: Number(event.target.value) })} /></label><strong className="effective">{skill.base + skill.gearModifier}</strong><button onClick={() => roll(skill.id, skill.name, skill.base + skill.gearModifier, true)}>Roll</button></div>)}</div>
    </div>
    <div className="panel resistance-panel"><span>RESISTANCES · PAGE 20</span><h2>Automatic defenses</h2>{Object.entries(campaign.resistances).map(([id, score]) => <div className="resistance" key={id}><strong>{id}</strong><input type="number" min="0" value={score} onChange={event => onUpdate({ ...campaign, resistances: { ...campaign.resistances, [id]: Number(event.target.value) } })}/><button onClick={() => roll(id, id[0].toUpperCase() + id.slice(1), score, false)}>Roll</button></div>)}<p>Assign 40 to one resistance and 20 to the other two during creation.</p></div>
    <div className="panel creation-rules"><span>STARTING ALLOTMENTS · PAGE 19</span><h2>{campaign.characterCreated ? "Setup complete" : "Character setup"}</h2><ul><li className={setup.summary.weapon60 === 1 ? "done" : ""}>+60 to one weapon skill ({setup.summary.weapon60}/1)</li><li className={setup.summary.weapon40 === 1 ? "done" : ""}>+40 to one weapon skill ({setup.summary.weapon40}/1)</li><li className={setup.summary.thirty === 3 ? "done" : ""}>+30 to three skills ({setup.summary.thirty}/3)</li><li className={setup.summary.twenty === 2 ? "done" : ""}>+20 to two skills ({setup.summary.twenty}/2)</li><li className={setup.summary.ten === 3 ? "done" : ""}>+10 to three skills ({setup.summary.ten}/3)</li><li className={setup.summary.resistances ? "done" : ""}>Resistances assigned 40 / 20 / 20</li></ul>{!campaign.characterCreated && <button className="complete-character" disabled={!setup.valid} onClick={() => onUpdate(log({ ...campaign, characterCreated: true }, `${campaign.characterName} completed character creation.`))}>Complete character</button>}<p>After creation, values remain editable for advancement, equipment, and unusual character options.</p></div>
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
      <div className="item-list">{campaign.inventory.map(item=><article className="item-card" key={item.id}><div><strong>{item.name}</strong><small>{item.kind} · {item.weight} · {itemSlotsLabel(item)}</small></div><div className="quantity"><button onClick={()=>onUpdate(changeItemQuantity(campaign,item.id,-1))}>−</button><b>{item.quantity}</b><button onClick={()=>onUpdate(changeItemQuantity(campaign,item.id,1))}>+</button></div><select value={equippedSlot(item.id)} onChange={e=>onUpdate(equipItem(campaign,item.id,e.target.value as EquipmentSlot|"carried"))}><option value="carried">Carried</option>{EQUIPMENT_SLOTS.map(slot=><option key={slot} value={slot}>{slot.replace(/([A-Z])/g," $1")}</option>)}</select>{item.kind === "light" && <button onClick={()=>onUpdate(log({...campaign,activeLightItemId:item.id,lightRemaining:20},`${item.name} lit; 20 rooms of light.`))}>Light</button>}<div className="item-combat"><input className="item-notes" placeholder="Traits: Parrying, Quick…" value={item.traits.join(", ")} onChange={e=>onUpdate({...campaign,inventory:campaign.inventory.map(value=>value.id===item.id?{...value,traits:e.target.value.split(",").map(v=>v.trim()).filter(Boolean)}:value)})}/><label>Armor <input type="number" min="0" value={item.armor} onChange={e=>onUpdate({...campaign,inventory:campaign.inventory.map(value=>value.id===item.id?{...value,armor:Number(e.target.value)}:value)})}/></label></div></article>)}</div>
    </div>
  </section>;
}
function itemSlotsLabel(item: Item) { if(item.weight==="none") return "0 slots"; if(item.weight==="light") return `${Math.ceil(item.quantity/10)} slot bundle`; if(item.weight==="coins") return `${Math.ceil(item.quantity/100)} coin slots`; return `${item.quantity*(item.weight==="heavy"?2:1)} slots`; }
function Journal({ campaign }: { campaign: Campaign }) { return <section className="single-panel panel"><span>EXPEDITION RECORD</span><h2>What the dark remembers</h2><ol className="journal">{campaign.events.map(event => <li key={event.id}><time>{new Date(event.at).toLocaleString()}</time>{event.text}</li>)}</ol></section>; }
