/** Read-only preflight for complete TC Modern variant imports.
 * Intentionally independent of Foundry globals for deterministic tests.
 */
import {teleportDestinations,sceneIdFromRegionUUID} from "./catalog.mjs";

const keyOf = scene => `${scene.packId}:${scene.id}`;
const packageOf = scene => scene.sourcePackage || scene.packId?.split(".")?.[0];

/**
 * Traverse real native Teleport Token destinations, including connected floors
 * omitted from the selected variant's descriptive filename grouping.
 * The preflight never creates/updates/deletes Foundry documents.
 */
export async function prepareVariantImport({selectedScenes,allEntries,getSource,getExisting,getWorldScene,maxScenes=200}) {
  const selected=new Set(selectedScenes.map(keyOf));
  const first=selectedScenes[0];
  if(!first)return {scenes:[],missing:[],existing:[],linked:[],warnings:[],blockers:[]};
  const sourcePackage=packageOf(first);
  const eligible=allEntries.filter(s=>packageOf(s)===sourcePackage);
  const byKey=new Map(eligible.map(s=>[keyOf(s),s]));
  const byId=new Map();
  for(const entry of eligible) {
    const list=byId.get(entry.id)??[];
    list.push(entry);
    byId.set(entry.id,list);
  }
  const scenes=[];
  const queue=[...selectedScenes];
  const seen=new Set();
  const warningSet=new Set();
  const blockers=[];
  const warn=message=>warningSet.add(message);
  for(let pos=0;pos<queue.length;pos++) {
    const entry=queue[pos];
    const key=keyOf(entry);
    if(seen.has(key))continue;
    seen.add(key);
    if(seen.size>maxScenes) {
      blockers.push(`Import preflight exceeded ${maxScenes} linked scenes. No changes were made.`);
      break;
    }
    scenes.push(entry);
    let source;
    try {
      source=await getSource(entry);
      if(!source)throw new Error("Scene unavailable");
    } catch(error) {
      blockers.push(`Cannot inspect ${entry.name}: ${error?.message||String(error)}. No changes were made.`);
      continue;
    }
    for(const uuid of teleportDestinations(source)) {
      const destination=sceneIdFromRegionUUID(uuid);
      if(!destination) {
        warn(`${entry.name}: unrecognized teleporter destination ${uuid}`);
        continue;
      }
      if(destination.packId) {
        // A destination expressed as a Compendium UUID may still target the
        // source document, not the newly imported world Region. Surface it;
        // do not rewrite creator Region data without verifying live behavior.
        warn(`${entry.name}: compendium-scoped teleporter ${uuid} may require a world Region UUID after import`);
      }
      let candidates=destination.packId ?
        [byKey.get(`${destination.packId}:${destination.sceneId}`)].filter(Boolean) :
        byId.get(destination.sceneId)??[];
      if(!destination.packId && candidates.length>1) {
        // Current pack wins only if it uniquely identifies a linked Scene.
        const local=candidates.filter(candidate=>candidate.packId===entry.packId);
        candidates=local.length===1?local:candidates;
      }
      if(candidates.length>1) {
        warn(`${entry.name}: teleporter destination ${uuid} matches several source scenes; resolve manually`);
        continue;
      }
      if(candidates.length===1) {
        const target=candidates[0];
        if(!seen.has(keyOf(target)))queue.push(target);
      } else {
        // The destination may already exist independently in the world.
        // A compendium UUID points to the original pack rather than a World Scene.
        if(!destination.packId && getWorldScene(destination.sceneId)) {
          warn(`${entry.name}: destination ${uuid} exists in the world but its creator location was not identified; verify it is the intended Scene`);
          continue;
        }
        warn(`${entry.name}: destination ${uuid} is outside this creator location; it must be checked separately`);
      }
    }
  }

  const missing=[],existing=[],linked=[];
  const expectedIds=new Map();
  for(const scene of scenes) {
    if(!selected.has(keyOf(scene)))linked.push(scene);
    const found=getExisting(scene);
    if(found) {
      existing.push(scene);
      // Native World Scene UUIDs target the source ID. A prior imported copy
      // with a different ID can break cross-scene teleport destinations.
      const occupied=getWorldScene(scene.id);
      if(found.id!==scene.id && occupied?.id!==found.id) {
        blockers.push(`${scene.name}: already imported as ${found.id}, not its original ID ${scene.id}. Review linked teleporters before importing.`);
      }
    } else {
      const occupied=getWorldScene(scene.id);
      if(occupied) blockers.push(`${scene.name}: world Scene ID ${scene.id} is used by another scene. Cannot safely preserve teleporter UUIDs.`);
      else missing.push(scene);
    }
    const firstAtId=expectedIds.get(scene.id);
    if(firstAtId && firstAtId!==keyOf(scene)) {
      blockers.push(`${scene.name}: linked packs reuse Scene ID ${scene.id}. Import destinations would be ambiguous.`);
    }
    expectedIds.set(scene.id,keyOf(scene));
  }
  return {scenes,missing,existing,linked,warnings:[...warningSet],blockers};
}
