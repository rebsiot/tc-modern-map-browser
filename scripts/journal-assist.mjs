/** Pure matching helpers: no Foundry globals or document writes. */
import {isTCModern} from "./catalog.mjs";

const docList = collection => collection?.contents ?? (collection ? [...collection] : []);
const getFlag = (doc, scope, name) => doc?.getFlag?.(scope,name) ?? doc?.flags?.[scope]?.[name];
const packageOf = pack => pack?.metadata?.packageName ?? pack?.collection?.split(".")?.[0];

function packageFromUUID(value) {
  // Foundry may use Compendium.package.pack.id or
  // Compendium.package.pack.Scene.id, depending on version.
  const m = String(value??"").match(/^Compendium\.([^./]+)\.([^./]+)\.(?:Scene\.|JournalEntry\.)?([^./]+)$/);
  return m?.[1] ?? null;
}

function folderPackage(scene, game) {
  let folder = scene?.folder;
  if (typeof folder === "string") folder = game.folders?.get?.(folder);
  let withinTCModern = false;
  let packageId = null;
  for (let i=0; folder && i<12; i++) {
    if (folder.name === "TC Modern") withinTCModern = true;
    packageId ??= getFlag(folder,"tc-modern-map-browser","packageId");
    folder = folder.folder;
  }
  return withinTCModern ? packageId : null;
}

export function sceneCreatorPackage(scene, game) {
  const origin = getFlag(scene,"tc-modern-map-browser","origin");
  const packFromOrigin = typeof origin === "string" && origin.includes(":") ?
    origin.slice(0,origin.lastIndexOf(":")) : null;
  let packageId = packFromOrigin?.split(".")?.[0] ??
    packageFromUUID(getFlag(scene,"core","sourceId")) ?? folderPackage(scene,game);
  if (!packageId) {
    // Covers scenes imported manually through native compendium UI, provided
    // their original module asset references have been preserved.
    const backgrounds = [scene?.background?.src,scene?.img,scene?._source?.background?.src];
    for(const value of backgrounds) {
      const m=String(value??"").match(/(?:^|\/)modules\/([^/]+)\//i);
      if (m) {packageId=m[1]; break;}
    }
  }
  const module=game.modules?.get?.(packageId);
  return module?.active && isTCModern(`${module.id} ${module.title}`) ? packageId : null;
}

export function matchingWorldJournals(scene, sourcePackage, game, moduleId="tc-modern-map-browser") {
  const matches=[];
  const packagePrefix=`${sourcePackage}.`;
  const sourceUUIDPrefix=`Compendium.${packagePrefix}`;
  const seen=new Set();
  for (const journal of docList(game.journal)) {
    const origin=getFlag(journal,moduleId,"origin");
    const source=getFlag(journal,"core","sourceId");
    if ((typeof origin==="string" && origin.startsWith(packagePrefix)) ||
        (typeof source==="string" && source.startsWith(sourceUUIDPrefix))) {
      if(!seen.has(journal.id)){matches.push(journal);seen.add(journal.id);}
    }
  }
  // A scene can have an explicitly associated Journal and no preserved
  // compendium source flag. Respect that link for this verified creator scene.
  const linked=scene?.journal?.id ?? scene?.journal;
  const associated=game.journal?.get?.(linked);
  if(associated && !seen.has(associated.id))matches.unshift(associated);
  return matches;
}

const norm = s => String(s??"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
function sceneFloorName(name) {
  const n=norm(name);
  if(/\broof(?:top)?\b/.test(n))return "roof";
  if(/\b(?:second|2nd|02|upper|floor 2|level 2|balcony|mezzanine)\b/.test(n))return "upper";
  if(/\b(?:third|3rd|floor 3|level 3)\b/.test(n))return "third";
  if(/\b(?:ground|first|1st|01|floor 1|level 1)\b/.test(n))return "ground";
  if(/\bbasement\b/.test(n))return "basement";
  return "";
}
export function chooseLocationJournal(scene, journals, packageId="") {
  if (!journals?.length)return null;
  const linked=scene?.journal?.id ?? scene?.journal;
  const exact=journals.find(j=>j.id === linked);
  if (exact)return exact;
  if(journals.length===1)return journals[0];
  const sceneName=norm(scene?.name);
  const floor=sceneFloorName(scene?.name);
  const packWords=new Set(norm(packageId.replace(/^tomcartosmodern[-_]?/,"")).split(" ").filter(w=>w.length>2));
  const scored=journals.map(j=>{
    const name=norm(j.name);
    let score=0;
    if (name===sceneName)score+=15;
    if (sceneName && name.includes(sceneName))score+=8;
    if (floor && sceneFloorName(j.name)===floor)score+=8;
    if (/\b(?:map key|map keys|location key|location notes|gm notes)\b/.test(name))score+=4;
    for (const word of packWords) if(name.includes(word))score+=1;
    return {j,score};
  }).sort((a,b)=>b.score-a.score || a.j.name.localeCompare(b.j.name));
  return scored[0]?.j ?? null;
}
