import assert from "node:assert/strict";
import {groupScenePacks, variantForScene, teleportDestinations,sceneIdFromRegionUUID,countTeleporters,categorize,isCommercialLocation,packageCategories} from "../scripts/catalog.mjs";
import {prepareVariantImport} from "../scripts/pack-import.mjs";
import {createSceneCatalogReviewRows,encodeSceneCatalogReviewCsv,REVIEW_CSV_HEADERS} from "../scripts/catalog-export.mjs";

const location="Arctic Outpost";
const packId="tomcartosmodern-arctic-outpost.scenes";
const sourcePackage="tomcartosmodern-arctic-outpost";
const make=(id,name,pack=packId,loc=location)=>({packId:pack,packLabel:`Scenes: ${loc}`,sourcePackage:pack.split(".")[0],locationLabel:loc,id,name});
const entries=[
  make("a","Arctic Outpost - Ground Floor - Night"),
  make("b","Arctic Outpost - Upper Floor - Night"),
  make("c","Arctic Outpost - Roof"),
  make("d","Arctic Outpost - Ground Floor - Day"),
  make("e","Arctic Outpost - Upper Floor - Day"),
  make("f","Arctic Outpost - Roof - Snowstorm"),
];
const groups=groupScenePacks(entries);
assert.equal(groups.length,1,"one location per creator Scene compendium");
// The 18 GM-supplied commercial locations override keyword categories that
// would otherwise incorrectly assign bars to Entertainment, offices to Retail,
// or rooftops and towers to Urban. Pack classification is location-wide.
const commercialNames = [
  "Retro Diner", "Dive Bar", "Office Block", "Fast Food", "Cafe", "Bodega",
  "Local Pub", "Leisure Center", "Boxing Gym", "Local Gamestore", "Noodle Bar",
  "Sports Bar", "Luxury Rooftop Bar", "Winery", "Nakatomi Tower",
  "Dusky Skull Cantina", "Jewellry Boutique", "Tailor"
];
assert.equal(commercialNames.length,18);
for (const name of commercialNames) {
  assert.equal(categorize(name),"Commercial", `${name} is a commercial location`);
  assert.equal(categorize(`Tom Cartos Modern - ${name}`),"Commercial",`${name} works with creator prefix`);
  assert.equal(categorize(`${name} - Upper Floor - Night`),"Commercial",`${name} works with variants`);
  assert.equal(isCommercialLocation(name),true);
}
for (const alt of ["Café", "Leisure Centre", "Local Game Store", "Jewellery Boutique", "Jewelry Boutique"]) {
  assert.equal(categorize(alt),"Commercial",`${alt} is a recognized alternate spelling`);
}
for (const [name,want] of [
  ["Rooftop", "Streets & Urban"],
  ["Generic Office", "Retail & Offices"],
  ["Barracks", "Military & Security"],
  ["City Sports Arena", "Streets & Urban"],
  ["Nightclub", "Entertainment"],
  ["Retailor Services", "Retail & Offices"]
]) assert.equal(categorize(name),want,`${name} must not be pulled into Commercial`);
const commercialPackEntries=commercialNames.flatMap((name,index)=>[
  make(`c${index}a`,`${name} - Ground Floor - Night`,`creator-commercial-${index}.scenes`,name),
  make(`c${index}b`,`${name} - Roof - Night`,`creator-commercial-${index}.scenes`,name)
]);
const commercialPacks=groupScenePacks(commercialPackEntries);
assert.equal(commercialPacks.length,18);
for (const location of commercialPacks) {
  assert.equal(location.category,"Commercial",`${location.base} correctly grouped`);
  assert.equal(location.scenes.length,2);
  assert.equal(location.variants.find(v=>v.label==="Night")?.scenes.length,2);
}
const genericLabelPack=packageCategories([
  make("generated1","Retro Diner - Night","generic.scenes","Undefined Location"),
  make("generated2","Retro Diner - Day","generic.scenes","Undefined Location")
]);
assert.equal(genericLabelPack.get("generic.scenes"),"Commercial","pack fallback uses classified scenes when creator location has no known type");
assert.deepEqual(groups[0].variants.map(v=>[v.label,v.scenes.length]),[["Standard",1],["Day",2],["Night",2],["Snowstorm",1]]);
assert.equal(variantForScene({name:"Night Market — Ground Floor"},"Night Market").label,"Standard");
assert.equal(variantForScene({name:"Night Market — Night"},"Night Market").label,"Night");
assert.equal(variantForScene({name:"Arctic Outpost - Night - Snowstorm"},location).label,"Snowstorm · Night");
assert.equal(groupScenePacks([...entries,make("g","Arctic Outpost - Night","otherpack.scenes")]).length,2,"never merge unrelated source packs");
const batch=Array.from({length:93},(_,i)=>Array.from({length:i<78?8:7},(_,j)=>make(`id${i}_${j}`,`Location ${i} - ${j%2?"Day":"Night"} - Floor ${j}`,`tcmodern-${i}.scenes`,`Location ${i}`))).flat().slice(0,729);
assert.equal(batch.length,729);
assert.equal(groupScenePacks(batch).length,93,"729 index rows collapse to 93 creator-location cards");
// The review CSV includes EVERY indexed Scene, retaining source identity even
// when one creator module represents multiple independent locations.
const reviewRows=createSceneCatalogReviewRows(batch,groupScenePacks(batch));
assert.equal(reviewRows.length,729,"export never collapses the 729 source Scenes into pack rows");
assert.equal(new Set(reviewRows.map(row=>row.sourceKey)).size,729,"source keys are unique");
assert.ok(reviewRows.every(row=>row.packId && row.sceneId && row.originalName && row.location));
const cityScenes=[
  make("park","City Park","city-streets-03.scenes","City Streets 03"),
  make("channel","Overflow Channel","city-streets-03.scenes","City Streets 03"),
  make("bridge1","Road Bridge","city-streets-03.scenes","City Streets 03"),
  make("bridge2","Road Bridge No Traffic","city-streets-03.scenes","City Streets 03")
];
const cityRows=createSceneCatalogReviewRows(cityScenes,groupScenePacks(cityScenes));
assert.equal(cityRows.length,4);
assert.ok(cityRows.every(row=>row.location==="City Streets 03"),"current labels are exported as suggestions, not invented sublocations");
assert.equal(new Set(cityRows.map(row=>row.sourceKey)).size,4,"different scenes in a pack remain distinct");
assert.equal(cityRows.find(row=>row.sceneId==="bridge2").originalName,"Road Bridge No Traffic");
const csv=encodeSceneCatalogReviewCsv(cityRows);
assert.equal(csv.codePointAt(0),0xFEFF,"Excel-friendly UTF-8 BOM");
assert.match(csv,/"Location \[EDIT\]"/);
assert.match(csv,/"city-streets-03.scenes:bridge2"/);
assert.equal(csv.split("\r\n").length-2,4,"4 data rows plus header and final separator");
const awkward=encodeSceneCatalogReviewCsv([{
  ...cityRows[0],displayName:'=SUM(5,5)',notes:'two lines\r\nwith a comma, and "quotes"',originalName:'-unsafe creator name'
}]);
assert.match(awkward,/"'=SUM\(5,5\)"/,"formula-like content is guarded in review files");
assert.match(awkward,/"'-unsafe creator name"/,"formula-like original names are guarded");
assert.ok(awkward.includes('"two lines\r\nwith a comma, and ""quotes"""'),"CSV quote/newline encoding is reversible");
assert.throws(()=>createSceneCatalogReviewRows([...cityScenes,cityScenes[0]],groupScenePacks(cityScenes)),/twice/);
assert.throws(()=>createSceneCatalogReviewRows(cityScenes,[]),/not mapped/);
assert.equal(REVIEW_CSV_HEADERS.length,13);
console.log("PASS catalog review export: all scene rows, stable identities, original titles, source variants, Excel-safe CSV.");
const teleporter=uuids=>({regions:[{behaviors:[{type:"teleportToken",system:{destinations:new Set(uuids)}}]}]});
assert.equal(countTeleporters(teleporter(["Scene.c.Region.roof"])),1);
assert.deepEqual(teleportDestinations(teleporter(["Scene.c.Region.roof"])),["Scene.c.Region.roof"]);
assert.deepEqual(teleportDestinations({regions:[{behaviors:[{type:"teleportToken",system:{destination:"Scene.b.Region.other"}}]}]}),["Scene.b.Region.other"]);
assert.deepEqual(sceneIdFromRegionUUID("Scene.c.Region.roof"),{sceneId:"c",packId:null});
assert.deepEqual(sceneIdFromRegionUUID(`Compendium.${packId}.Scene.c.Region.roof`),{sceneId:"c",packId});

const documents={
  a:teleporter(["Scene.c.Region.roof"]),
  b:teleporter(["Scene.a.Region.ground"]),
  c:teleporter(["Scene.b.Region.upper"]),
  d:teleporter([]),e:teleporter([]),f:teleporter([])
};
const getSource=async s=>documents[s.id];
const empty={getExisting:()=>null,getWorldScene:()=>null};
const night=groups[0].variants.find(v=>v.label==="Night");
const planned=await prepareVariantImport({selectedScenes:night.scenes,allEntries:entries,getSource,...empty});
assert.deepEqual(new Set(planned.scenes.map(s=>s.id)),new Set(["a","b","c"]),"unlabeled roof is imported when native teleporter destinations require it");
assert.deepEqual(planned.linked.map(s=>s.id),["c"]);
assert.equal(planned.blockers.length,0);
assert.equal(planned.warnings.length,0);
const already=await prepareVariantImport({selectedScenes:night.scenes,allEntries:entries,getSource,
  getExisting:s=>s.id==="a"?{id:"a"}:null,
  getWorldScene:id=>id==="a"?{id:"a"}:null});
assert.equal(already.existing.length,1);
assert.deepEqual(new Set(already.missing.map(s=>s.id)),new Set(["b","c"]));
const collision=await prepareVariantImport({selectedScenes:night.scenes,allEntries:entries,getSource,
  getExisting:()=>null,getWorldScene:id=>id==="c"?{id:"c"}:null});
assert.equal(collision.blockers.length,1);
assert.match(collision.blockers[0],/c|Roof/);
const remapped=await prepareVariantImport({selectedScenes:night.scenes,allEntries:entries,getSource,
  getExisting:s=>s.id==="a"?{id:"changedID"}:null,getWorldScene:()=>null});
assert.equal(remapped.blockers.length,1,"remapped previously-imported IDs are flagged");
const unresolved=await prepareVariantImport({selectedScenes:[entries[0]],allEntries:entries,
  getSource:async()=>teleporter(["Scene.unknown.Region.z"]),...empty});
assert.equal(unresolved.warnings.length,1);
assert.equal(unresolved.blockers.length,0);
const v14={regions:[{behaviors:[{type:"teleportToken",system:{destinations:[{uuid:`Compendium.${packId}.Scene.c.Region.dest`}]}}]}]};
assert.deepEqual(teleportDestinations(v14),[`Compendium.${packId}.Scene.c.Region.dest`]);
const v14Preflight=await prepareVariantImport({selectedScenes:[entries[0]],allEntries:entries,
  getSource:async scene=>scene.id==="a"?v14:teleporter([]),...empty});
assert.equal(v14Preflight.warnings.length,1,"compendium-scoped links receive a world-UUID verification warning");
const sourceFail=await prepareVariantImport({selectedScenes:[entries[0]],allEntries:entries,getSource:async()=>{throw Error("offline");},...empty});
assert.equal(sourceFail.blockers.length,1);
console.log("PASS pure catalog/pack-preflight tests: grouping, variants, 729-row scale, native v13/v14 teleport UUIDs, linked destinations, imports, collisions, unreadable source.");

// Runtime smoke test exercises the real browser's Scene Library action and
// Foundry-shaped mocks; this is NOT a live Foundry v14 validation.
const callbacks=new Map();
class ApplicationV2 {constructor(){this.rendered=false;}}
const confirmations=[];
let allowConfirmation=true;
const DialogV2={confirm:async args=>{confirmations.push(args);return allowConfirmation;}};
globalThis.foundry={applications:{api:{ApplicationV2,DialogV2}}};
globalThis.Hooks={on:(e,fn)=>callbacks.set(e,fn),once:(e,fn)=>callbacks.set(e,fn)};
const notices=[];
globalThis.ui={notifications:{info:message=>notices.push(["info",message]),warn:message=>notices.push(["warn",message]),error:message=>notices.push(["error",message])}};
const moduleId="tc-modern-map-browser";
const worldScenes=[];
const worldJournals=[];
const folders=[];
const scenePack={collection:packId,documentName:"Scene",title:"Scenes",metadata:{packageName:sourcePackage},
  async getIndex(){return entries.map(s=>({_id:s.id,name:s.name}));},
  async getDocument(id){return documents[id];}};
const journalPack={collection:`${sourcePackage}.journals`,documentName:"JournalEntry",title:"Journal Entries",metadata:{packageName:sourcePackage},
  async getIndex(){return [{_id:"j1",name:"Arctic Outpost Map Key"}];}};
const packs=[scenePack,journalPack];
packs.get=id=>packs.find(p=>p.collection===id);
const mod={id:sourcePackage,title:"Tom Cartos Modern - Arctic Outpost",active:true};
const modules=new Map([[sourcePackage,mod],[moduleId,{id:moduleId,title:"TC Modern Scene Library",active:true}]]);
const makeDoc=(id,name,flags={})=>({id,name,flags,
  getFlag(scope,key){return this.flags?.[scope]?.[key];},
  sheet:{render(){this.opened=true;}},notes:[],
  async update(data){this.lastUpdate=data;},async updateEmbeddedDocuments(){}
});
worldScenes.get=id=>worldScenes.find(d=>d.id===id);
worldScenes.importFromCompendium=async(pack,id,data,options)=>{
  assert.equal(options.keepId,true,"batch importer preserves original scene document ID");
  assert.equal(worldScenes.get(id),undefined,"never overwrite a world Scene");
  const doc=makeDoc(id,entries.find(e=>e.id===id)?.name??id,data.flags);
  worldScenes.push(doc);
  return doc;
};
worldJournals.get=id=>worldJournals.find(d=>d.id===id);
worldJournals.importFromCompendium=async(pack,id,data,options)=>{
  assert.equal(data.ownership.default,0);
  assert.equal(data.ownership.player,0);
  assert.equal(data.ownership.gm,3);
  const doc=makeDoc(id,"Map Key",data.flags);
  worldJournals.push(doc);
  return doc;
};
folders.get=id=>folders.find(f=>f.id===id);
let serial=0;
globalThis.Folder={create:async data=>{
  const folder={id:`folder${++serial}`,name:data.name,type:data.type,
    folder:data.folder?folders.get(data.folder):null,flags:{},
    getFlag(scope,key){return this.flags[scope]?.[key];},async setFlag(scope,key,val){this.flags[scope]??={};this.flags[scope][key]=val;}};
  folders.push(folder);return folder;
}};
const storedSettings=new Map();
globalThis.game={user:{id:"gm",isGM:true},users:[{id:"gm",isGM:true},{id:"player",isGM:false}],
  packs,modules,scenes:worldScenes,journal:worldJournals,folders,
  settings:{get:(_module,key)=>storedSettings.get(key) ?? false,
    register(){},set:async(_module,key,value)=>{storedSettings.set(key,value);}}};
const {SceneLibrary}=await import("../scripts/browser.mjs");
const browser=new SceneLibrary();
await browser.load();
const exports=[];
globalThis.saveDataToFile=(data,mime,filename)=>exports.push({data,mime,filename});
const originalScenes=worldScenes.length,originalJournals=worldJournals.length;
await browser.action("export-review");
assert.equal(exports.length,1,"CSV export initiated by module action");
assert.match(exports[0].filename,/tc-modern-scene-catalog-\d{4}-\d{2}-\d{2}\.csv/);
assert.match(exports[0].mime,/text\/csv/);
assert.equal(exports[0].data.split("\r\n").length-2,entries.length,"exports entire source index");
assert.equal(worldScenes.length,originalScenes,"catalog review export never imports/updates world Scenes");
assert.equal(worldJournals.length,originalJournals,"catalog review export never imports/updates Journals");
browser.query="no-match";browser.category="Commercial";
await browser.action("export-review");
assert.equal(exports[1].data,exports[0].data,"filters do not silently omit source rows");
browser.failures=["Failed Pack"];
allowConfirmation=false;
await browser.action("export-review");
assert.equal(exports.length,2,"partial catalog export requires explicit GM confirmation");
allowConfirmation=true;
await browser.action("export-review");
assert.match(exports.at(-1).filename,/PARTIAL/);
browser.failures=[];
assert.equal(worldScenes.length,originalScenes);
console.log("PASS mocked Foundry export action: full data despite filters, download naming, partial-export confirmation, read-only.");
confirmations.length=0;
browser.query="";browser.category="All";
const htmlDetail={innerHTML:"",querySelector:()=>null};
browser.root={querySelector:selector=>selector==="[data-detail]"?htmlDetail:null};
assert.equal(browser.groups.length,1);
assert.equal(browser.groups[0].variants.length,4);
browser.selectedKey=browser.groups[0].key;
browser.selectedVariantKey="night";
browser.selectedEntry=browser.groups[0].scenes.findIndex(s=>s.id==="a");
browser.drawDetails();
assert.match(htmlDetail.innerHTML,/Choose a variant pack/);
assert.match(htmlDetail.innerHTML,/data-action="import-variant"/);
assert.match(htmlDetail.innerHTML,/View individual scenes and floors/);
assert.match(htmlDetail.innerHTML,/Import Night pack \(2\)/);
if(process.env.TC_UI_PREVIEW) {
  const fs=await import("node:fs/promises");
  const css=await fs.readFile(new URL("../styles/browser.css",import.meta.url),"utf8");
  await fs.writeFile(process.env.TC_UI_PREVIEW,`<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0;padding:25px;background:#18191c;color:#ddd;font:14px Arial,sans-serif}
    .tcmodern-library{height:700px;max-width:1060px;margin:auto;background:#24272c}
    .tcmodern-details{width:600px;height:620px;margin:auto;background:#2e3138}
    ${css}</style></head><body><div class="tcmodern-library"><div class="tcmodern-details"><div class="tcmodern-scroll tcmodern-detail-body">${htmlDetail.innerHTML}</div></div></div></body></html>`);
}
browser.root=null;
await browser.action("import-variant");
assert.equal(worldScenes.length,3,"imports two Night scenes and the linked Roof as one pack");
assert.deepEqual(new Set(worldScenes.map(s=>s.id)),new Set(["a","b","c"]));
assert.equal(worldJournals.length,1,"matched Journal imported once");
assert.equal(confirmations.length,1,"the user confirms the preview once");
assert.match(confirmations[0].content,/linked destination/);
assert.equal(worldScenes.find(s=>s.id==="a").getFlag(moduleId,"origin"),`${packId}:a`);
assert.equal(worldJournals[0].getFlag(moduleId,"origin"),`${sourcePackage}.journals:j1`);
const snapshot=worldScenes.slice();
await browser.action("import-variant");
assert.equal(worldScenes.length,3,"repeat operation is idempotent");
assert.equal(confirmations.length,1,"no repeat import confirmation when complete");
assert.deepEqual(worldScenes.map(s=>s.id),snapshot.map(s=>s.id));
// Now try another location variant with an unrelated world Scene using the
// source ID; the preflight must stop before any writes or journal import.
worldScenes.push(makeDoc("d","Unrelated Scene"));
browser.selectedVariantKey="day";
browser.selectedEntry=browser.groups[0].scenes.findIndex(s=>s.id==="d");
await browser.action("import-variant");
assert.equal(worldScenes.length,4);
assert.equal(confirmations.length,1);
assert.equal(browser.importStatus.blockers.length,1);
assert.ok(notices.some(([type,msg])=>type==="error"&&msg.includes("blocked")));
// v14 typed core.sourceId should detect manual imports without the module's
// origin flag; we should import the missing Day floor without duplicating d.
worldScenes.find(s=>s.id==="d").flags={core:{sourceId:`Compendium.${packId}.Scene.d`}};
worldJournals[0].flags={core:{sourceId:`Compendium.${sourcePackage}.journals.JournalEntry.j1`}};
assert.ok(browser.getImportedKeys().has(`${packId}:d`));
await browser.action("import-variant");
assert.equal(worldScenes.length,5,"typed UUID import skips existing Day ground floor, imports only missing Day upper floor");
assert.equal(worldJournals.length,1,"typed Journal source ID deduplicates correctly");
console.log("PASS mocked Foundry UI flow: Night pack+linked roof+GM Journal, re-import skips existing, collision aborts before world writes.");

// Remapping changes the world's Scene Library labels, never the native world
// Scenes or source compendiums. Includes an undo that works after reopening.
const beforeRemap=JSON.stringify(worldScenes.map(s=>[s.id,s.name,s.flags]));
const beforeJournals=JSON.stringify(worldJournals.map(s=>[s.id,s.name,s.flags]));
const beforeFolders=JSON.stringify(folders.map(f=>[f.id,f.name,f.type]));
const fullRows=createSceneCatalogReviewRows(browser.entries,browser.groups);
const renamed=fullRows.map(r=>({...r,category:"Military",location:"Arctic Outpost - Reviewed"}));
const renamedCsv=encodeSceneCatalogReviewCsv(renamed);
await browser.importCatalogFile({name:"approved.csv",size:renamedCsv.length,text:async()=>renamedCsv});
assert.equal(browser.groups.length,1);
assert.equal(browser.groups[0].base,"Arctic Outpost - Reviewed");
assert.equal(browser.groups[0].category,"Military");
assert.equal(Object.keys(storedSettings.get("catalogOverrides")??{}).length,6);
assert.ok(Object.hasOwn(storedSettings.get("previousCatalogOverrides"),"overrides"));
assert.equal(JSON.stringify(worldScenes.map(s=>[s.id,s.name,s.flags])),beforeRemap);
assert.equal(JSON.stringify(worldJournals.map(s=>[s.id,s.name,s.flags])),beforeJournals);
assert.equal(JSON.stringify(folders.map(f=>[f.id,f.name,f.type])),beforeFolders);
await browser.undoCatalogImport();
assert.equal(browser.groups[0].base,"Arctic Outpost");
assert.equal(Object.keys(storedSettings.get("catalogOverrides")??{}).length,0);
assert.equal(JSON.stringify(worldScenes.map(s=>[s.id,s.name,s.flags])),beforeRemap);
const mismatched=encodeSceneCatalogReviewCsv([{...fullRows[0],sourceKey:"bogus.key"}]);
await browser.importCatalogFile({size:mismatched.length,text:async()=>mismatched});
assert.equal(Object.keys(storedSettings.get("catalogOverrides")??{}).length,0);
console.log("PASS mocked Foundry world mapping: confirmed preview, world setting, one-step undo, source ID rejection, no Scene/Journal/folder edits.");

// Direct location Change Category updates the world catalog immediately,
// including all variants, without requiring a CSV or touching any world docs.
const categoryBefore=browser.groups[0].category;
const variantLabelsBefore=browser.groups[0].variants.map(v=>v.label);
const sourceKeysBefore=browser.groups[0].scenes.map(s=>`${s.packId}:${s.id}`).sort();
browser.category=categoryBefore;
await browser.changeLocationCategory(browser.groups[0],"Services");
assert.equal(browser.groups[0].category,"Services");
assert.equal(browser.category,"All","a moved entry remains visible after leaving a filtered category");
assert.equal(Object.keys(storedSettings.get("catalogOverrides")??{}).length,6);
assert.deepEqual(browser.groups[0].variants.map(v=>v.label),variantLabelsBefore);
assert.deepEqual(browser.groups[0].scenes.map(s=>`${s.packId}:${s.id}`).sort(),sourceKeysBefore);
assert.equal(JSON.stringify(worldScenes.map(s=>[s.id,s.name,s.flags])),beforeRemap);
assert.equal(JSON.stringify(worldJournals.map(s=>[s.id,s.name,s.flags])),beforeJournals);
assert.equal(JSON.stringify(folders.map(f=>[f.id,f.name,f.type])),beforeFolders);
assert.ok(Object.hasOwn(storedSettings.get("previousCatalogOverrides"),"overrides"));
const reopened=new SceneLibrary();
reopened.sourceEntries=entries;
reopened.rebuildCatalog();
assert.equal(reopened.groups[0].category,"Services","overrides survive reopening the library");
const changesBeforeRepeat=JSON.stringify(storedSettings.get("catalogOverrides"));
await reopened.changeLocationCategory(reopened.groups[0],"Services");
assert.equal(JSON.stringify(storedSettings.get("catalogOverrides")),changesBeforeRepeat,"repeat save is idempotent");

// The GM can change one entry directly from the left list; category options
// include a custom-name path and do not require Catalog tools.
const list={innerHTML:"",scrollTop:0};
const filter={replaceChildren(){},value:"All"};
const status={textContent:""};
const visible={textContent:""};
const mockDetail={innerHTML:"",querySelector:()=>null};
globalThis.Option=function(label,value){return {label,value};};
reopened.root={querySelector:selector=>({
  "[data-category]":filter,"[data-location-list]":list,"[data-visible-count]":visible,
  "[data-summary]":status,"[data-detail]":mockDetail
})[selector]??null};
reopened.selectedKey=reopened.groups[0].key;
reopened.draw();
assert.match(list.innerHTML,/data-edit-category="0"/);
assert.match(list.innerHTML,/Change Category/);
reopened.editingCategoryKey=reopened.groups[0].key;
reopened.draw();
assert.match(list.innerHTML,/data-category-choice="0"/);
assert.match(list.innerHTML,/Create new category/);
assert.match(list.innerHTML,/Existing world Scenes stay in their current folders/);
reopened.root=null;
await reopened.undoCatalogImport();
assert.equal(reopened.groups[0].category,categoryBefore);
assert.equal(Object.keys(storedSettings.get("catalogOverrides")??{}).length,0);
assert.equal(JSON.stringify(worldScenes.map(s=>[s.id,s.name,s.flags])),beforeRemap);
assert.equal(JSON.stringify(worldJournals.map(s=>[s.id,s.name,s.flags])),beforeJournals);
assert.equal(JSON.stringify(folders.map(f=>[f.id,f.name,f.type])),beforeFolders);
console.log("PASS inline category change: variant-wide save, visible update, custom choice, persistence, one-step undo, zero world document changes.");
// A single-scene import must not let Foundry assign a new Scene ID over an
// unrelated world document, because native Region UUIDs rely on that ID.
worldScenes.push(makeDoc("f","Unrelated Collision Target"));
const singleCollisionBrowser=new SceneLibrary();
singleCollisionBrowser.sourceEntries=entries;
singleCollisionBrowser.rebuildCatalog();
singleCollisionBrowser.loaded=true;
singleCollisionBrowser.selectedKey=singleCollisionBrowser.groups[0].key;
singleCollisionBrowser.selectedVariantKey="snowstorm";
singleCollisionBrowser.selectedEntry=singleCollisionBrowser.groups[0].scenes.findIndex(s=>s.id==="f");
const beforeSingleCount=worldScenes.length;
await singleCollisionBrowser.action("import");
assert.equal(worldScenes.length,beforeSingleCount,"single Scene collision must not import or remap an occupied ID");
assert.ok(notices.some(([type,message])=>type==="error"&&message.includes("original Scene ID is already used")));
console.log("PASS mocked single Scene import: ID collision blocks before any Scene/Journal import.");

// A teleporter can lead from one named place to another place within the
// same creator module. New folders must use EACH destination's reviewed name.
const splitSource=[make("locA","City Park - Night"),make("locB","Overflow Channel - Night")];
const splitOverrides={
  [`${packId}:locA`]:{category:"City Streets",location:"City Park",variant:"Night",displayName:"City Park",floor:""},
  [`${packId}:locB`]:{category:"City Streets",location:"Overflow Channel",variant:"Night",displayName:"Overflow Channel",floor:""}
};
await globalThis.game.settings.set(moduleId,"catalogOverrides",splitOverrides);
documents.locA=teleporter(["Scene.locB.Region.roof"]);
documents.locB=teleporter([]);
const splitBrowser=new SceneLibrary();
splitBrowser.sourceEntries=splitSource;
splitBrowser.rebuildCatalog();
splitBrowser.loaded=true;
assert.equal(splitBrowser.groups.length,2);
const park=splitBrowser.groups.find(g=>g.base==="City Park");
splitBrowser.selectedKey=park.key;
splitBrowser.selectedVariantKey="night";
splitBrowser.selectedEntry=0;
await splitBrowser.action("import-variant");
assert.ok(worldScenes.get("locA"));
assert.ok(worldScenes.get("locB"));
const categoryFolder=folders.find(f=>f.type==="Scene" && f.name==="City Streets");
const parkFolder=folders.find(f=>f.type==="Scene" && f.name==="City Park" && f.folder?.id===categoryFolder?.id);
const channelFolder=folders.find(f=>f.type==="Scene" && f.name==="Overflow Channel" && f.folder?.id===categoryFolder?.id);
assert.ok(parkFolder,"City Park received its own Scene folder");
assert.ok(channelFolder,"Overflow Channel received its own Scene folder");
assert.notEqual(parkFolder.id,channelFolder.id);
assert.equal(worldScenes.get("locA").id,"locA");
assert.equal(worldScenes.get("locB").id,"locB");
console.log("PASS cross-location native teleport preflight: linked Scene imported under its own reviewed location folder, source IDs unchanged.");
