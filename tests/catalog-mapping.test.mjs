import assert from "node:assert/strict";
import fs from "node:fs";
import {REVIEWED_CATALOG,REVIEWED_MAPPING_COUNT,applyCatalogMapping,
  parseCatalogCsv,planCatalogImport,planLocationCategoryChange,
  validateCategoryName,CATEGORY_NEEDS_REVIEW} from "../scripts/catalog-mapping.mjs";
import {groupScenePacks} from "../scripts/catalog.mjs";
import {createSceneCatalogReviewRows,encodeSceneCatalogReviewCsv} from "../scripts/catalog-export.mjs";

const sourceRecords=Object.keys(REVIEWED_CATALOG).map(key=>{
  const pos=key.lastIndexOf(":");
  const packId=key.slice(0,pos),id=key.slice(pos+1);
  return {packId,id,name:`Indexed ${id}`,packLabel:packId,
    locationLabel:packId,sourcePackage:packId.split(".")[0]};
});
const sceneMap=applyCatalogMapping(sourceRecords,{});
const groups=groupScenePacks(sceneMap);
assert.equal(REVIEWED_MAPPING_COUNT,729,"the approved review has 729 identity-mapped Scenes");
assert.equal(sceneMap.filter(s=>s.catalogMatched).length,729);
assert.equal(new Set(sourceRecords.map(s=>s.packId)).size,93);
assert.equal(groups.length,112,"the reviewed mapping yields 112 locations, not 93 creator modules");
const city8=groups.filter(g=>g.packId.includes("city-streets-08"));
assert.deepEqual(city8.map(g=>g.base).sort(),["City Streets 08 \u2014 Combined","Parade Route","Police Roadblock","Street Market"].sort());
assert.equal(city8.reduce((n,g)=>n+g.scenes.length,0),16);
const city5=groups.filter(g=>g.packId.includes("city-streets-05"));
assert.deepEqual(city5.map(g=>g.base).sort(),["Beachfront Promenade","Maintenance Tunnels","Vehicle Lockup"].sort());
const sports=groups.find(g=>g.base==="Outdoor Park Courts");
assert.equal(sports.scenes.length,6);
assert.deepEqual(sports.variants.map(v=>v.label).sort(),["Basketball","Futsal","Open","Open / Clean","Tennis","Volleyball"].sort());
assert.equal(groups.filter(g=>g.category===CATEGORY_NEEDS_REVIEW).length,2);
const reviewNames=groups.filter(g=>g.category===CATEGORY_NEEDS_REVIEW).map(g=>g.base).sort();
assert.deepEqual(reviewNames,["Embassy","News Broadcaster"]);
const embassy=groups.find(g=>g.base==="Embassy");
const broadcaster=groups.find(g=>g.base==="News Broadcaster");
assert.equal(embassy.scenes.length,8);
assert.equal(broadcaster.scenes.length,8);
const originalKeys=sceneMap.map(s=>`${s.packId}:${s.id}`).sort();
const embassyPlan=planLocationCategoryChange(embassy,"Services",{});
assert.equal(embassyPlan.changes.length,8,"one location change covers every floor and variant");
assert.equal(Object.keys(embassyPlan.next).length,8,"unrelated source Scenes aren't modified");
const embassyChanged=groupScenePacks(applyCatalogMapping(sourceRecords,embassyPlan.next));
assert.deepEqual(embassyChanged.flatMap(g=>g.scenes.map(s=>`${s.packId}:${s.id}`)).sort(),originalKeys,
  "the reclassification retains every original Scene ID");
assert.equal(embassyChanged.find(g=>g.base==="Embassy").category,"Services");
assert.equal(embassyChanged.find(g=>g.base==="News Broadcaster").category,CATEGORY_NEEDS_REVIEW);
assert.equal(embassyChanged.find(g=>g.base==="Embassy").scenes.length,8);
assert.equal(embassyChanged.length,112,"changing a category never splits a location");
const repeat=planLocationCategoryChange(embassyChanged.find(g=>g.base==="Embassy"),"Services",embassyPlan.next);
assert.equal(repeat.changes.length,0,"choosing the active category is idempotent");
const restored=planLocationCategoryChange(embassyChanged.find(g=>g.base==="Embassy"),CATEGORY_NEEDS_REVIEW,embassyPlan.next);
assert.equal(restored.changes.length,8);
assert.equal(Object.keys(restored.next).length,0,"returning to the bundled label removes redundant overrides");
const sportsPlan=planLocationCategoryChange(sports,"Recreation & Sports",{});
const recategorized=groupScenePacks(applyCatalogMapping(sourceRecords,sportsPlan.next)).find(g=>g.base==="Outdoor Park Courts");
assert.equal(recategorized.category,"Recreation & Sports");
assert.deepEqual(recategorized.variants.map(v=>v.label).sort(),sports.variants.map(v=>v.label).sort(),
  "category changes preserve variant labels and members");
assert.equal(sportsPlan.changes.length,6);
assert.equal(validateCategoryName("  Public  Services  "),"Public Services");
for(const name of ["", "  ","A/B", "A\\B", "<script>","bad\nname","z".repeat(81)])
  assert.throws(()=>validateCategoryName(name),/category/i);
assert.throws(()=>planLocationCategoryChange({key:"x",packId:"p",scenes:[{packId:"other",id:"a"}]},"Services"),/invalid source/i);
assert.throws(()=>planLocationCategoryChange({key:"x",packId:"p",scenes:[{packId:"p",id:"a"},{packId:"p",id:"a"}]},"Services"),/Duplicate/i);
console.log("PASS location category override: Embassy's 8 scenes, unrelated News Broadcaster, court variants, undo, validation, 729 stable source identities.");
for(const [name,category] of [["Dusty Skull Cantina","Commercial"],["Nakatomi Plaza","Commercial"],
  ["Luxury Rooftop Bar","Commercial"],["Blast Furnace","Industrial"],
  ["Quarantine Checkpoint","Post Apocalyptic"],["McCallister Residence","Residential"]]){
  const group=groups.find(g=>g.base===name);
  assert.ok(group,`${name} must exist as a reviewed location`);
  assert.equal(group.category,category);
}
const exported=createSceneCatalogReviewRows(sceneMap,groups);
assert.equal(exported.length,729);
assert.equal(new Set(exported.map(r=>r.sourceKey)).size,729);
assert.ok(exported.some(r=>r.location==="Road Bridge"));
assert.ok(exported.some(r=>r.location==="Outdoor Park Courts"&&r.variant==="Futsal"));
console.log("PASS bundled mapping: 729 source IDs, 93 compendiums, 112 distinct locations, courts and City Streets splits.");

const first=exported.find(r=>r.location==="Outdoor Park Courts"&&r.variant==="Basketball");
const city8Row=exported.find(r=>r.location==="Police Roadblock");
const partial=[{...first,displayName:"Basketball - Updated",notes:'quoted "text" and comma, plus\nnew line'},city8Row];
const csv=encodeSceneCatalogReviewCsv(partial);
assert.equal(parseCatalogCsv(csv).length,2);
assert.equal(parseCatalogCsv(csv)[0]["Review Notes [EDIT]"],'quoted "text" and comma, plus\nnew line');
let plan=planCatalogImport(csv,sourceRecords,{});
assert.equal(plan.errors.length,0);
assert.equal(plan.matched,2);
assert.equal(plan.changes.length,1,"only edited label is changed");
assert.equal(plan.next[first.sourceKey].displayName,"Basketball - Updated");
assert.equal(plan.next[city8Row.sourceKey],undefined,"unchanged row is not stored as a world override");
plan=planCatalogImport(csv,sourceRecords,{[first.sourceKey]:plan.next[first.sourceKey]});
assert.equal(plan.changes.length,0,"applying same CSV twice is idempotent");
// Attempt to move only one scene from a multi-scene location to a new category.
const conflictCsv=encodeSceneCatalogReviewCsv([{...city8Row,category:"Industrial"}]);
assert.ok(planCatalogImport(conflictCsv,sourceRecords).errors.some(e=>e.includes("Category conflict")));
const mismatch=encodeSceneCatalogReviewCsv([{...city8Row,packId:"not-the-source"}]);
assert.ok(planCatalogImport(mismatch,sourceRecords).errors.some(e=>e.includes("does not match")));
const duplicate=encodeSceneCatalogReviewCsv([first,first]);
assert.ok(planCatalogImport(duplicate,sourceRecords).errors.some(e=>e.includes("duplicate")));
const unknown=encodeSceneCatalogReviewCsv([{...first,sceneId:"unknown",sourceKey:`${first.packId}:unknown`}]);
const unrecognized=planCatalogImport(unknown,sourceRecords);
assert.equal(unrecognized.unknown.length,1);
assert.ok(unrecognized.errors.some(e=>e.includes("No CSV source keys match")));
assert.throws(()=>parseCatalogCsv('"unterminated'),/Unclosed|no data/i);
console.log("PASS catalog CSV: quote-safe import, partial files, identity validation, duplicate rejection, category preflight and idempotence.");

// Optional development-time regression against the exact user-reviewed CSV,
// not shipped inside the module package (keeps creator file references private).
if(process.env.TC_APPROVED_CSV){
  const file=fs.readFileSync(process.env.TC_APPROVED_CSV,"utf8");
  const rows=parseCatalogCsv(file);
  const entries=rows.map(r=>({packId:r["Source Compendium ID [KEEP]"],id:r["Source Scene ID [KEEP]"],
    name:r["Original Scene Title"],locationLabel:r["Original Scene Pack"],packLabel:r["Original Scene Pack"]}));
  const tested=planCatalogImport(file,entries,{});
  assert.equal(tested.rows,729);
  assert.equal(tested.errors.length,0);
  assert.equal(tested.changes.length,0);
  console.log("PASS real approved CSV roundtrip: 729 exact source keys, no drift from bundled mapping.");
}
