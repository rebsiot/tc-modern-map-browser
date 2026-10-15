import {MODULE_ID, isTCModern, categorize, groupScenePacks, filterGroups, safeAssetPath, countTeleporters, sceneFloorLabel} from "./catalog.mjs";
import {sceneCreatorPackage, matchingWorldJournals, chooseLocationJournal} from "./journal-assist.mjs";
import {prepareVariantImport} from "./pack-import.mjs";
import {createSceneCatalogReviewRows, encodeSceneCatalogReviewCsv} from "./catalog-export.mjs";
import {applyCatalogMapping, planCatalogImport, planLocationCategoryChange,
  REVIEWED_MAPPING_COUNT, CATEGORY_NEEDS_REVIEW} from "./catalog-mapping.mjs";

const {ApplicationV2, DialogV2} = foundry.applications.api;
const SETTINGS_BACKUP = "originalPackFolders";
const AUTO_OPEN_JOURNALS = "autoOpenJournals";
const AUTO_IMPORT_JOURNALS = "autoImportMissingJournals";
const CATALOG_OVERRIDES = "catalogOverrides";
const CATALOG_PRIOR = "previousCatalogOverrides";
let lastCanvasSceneId = null;
let lastOpenedByModule = null;
const MAX_VISIBLE = 240;
let currentBrowser = null;

const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
}[c]));

function creatorPacks() {
  return [...game.packs].filter(pack => {
    const packageId = pack.metadata?.packageName || pack.collection?.split(".")?.[0];
    const mod = game.modules.get(packageId);
    return mod?.active && isTCModern(`${mod.id} ${mod.title}`);
  });
}

function scenePacks() {
  return creatorPacks().filter(pack => pack.documentName === "Scene");
}

// A creator release commonly contains one Scene pack and one Journal pack.
// Match by module/package ID, NEVER by an unreliable similarity in titles.
function associatedJournalPacks(scenePack) {
  const sourcePackage = scenePack?.metadata?.packageName ?? scenePack?.collection?.split(".")?.[0];
  return creatorPacks().filter(pack => pack.documentName === "JournalEntry" &&
    (pack.metadata?.packageName ?? pack.collection?.split(".")?.[0]) === sourcePackage);
}

function packLocationName(scenePack) {
  const sourcePackage = scenePack?.metadata?.packageName ?? scenePack?.collection?.split(".")?.[0];
  const title = game.modules.get(sourcePackage)?.title ?? scenePack?.title ?? sourcePackage ?? "Location";
  return String(title).replace(/^(?:Tom\s+Cartos\s+Modern|TC\s*Modern)\s*[-–—:]\s*/i, "").trim() || "Location";
}

function importedJournal(packId, id) {
  const origin = `${packId}:${id}`;
  const sourceUuid = `Compendium.${packId}.${id}`;
  const typedUuid = `Compendium.${packId}.JournalEntry.${id}`;
  return game.journal?.find?.(j => j.getFlag?.(MODULE_ID, "origin") === origin ||
    [sourceUuid,typedUuid].includes(j.getFlag?.("core", "sourceId")));
}

function importedScene(packId, id) {
  const origin = `${packId}:${id}`;
  const sourceUuid = `Compendium.${packId}.${id}`;
  const typedUuid = `Compendium.${packId}.Scene.${id}`;
  return game.scenes.find(s => s.getFlag?.(MODULE_ID,"origin") === origin ||
    [sourceUuid,typedUuid].includes(s.getFlag?.("core","sourceId")));
}

async function findFolder(name, type, parent=null) {
  let folder = game.folders.find(f => f.name === name && f.type === type && (f.folder?.id ?? null) === (parent?.id ?? null));
  if (!folder) folder = await Folder.create({name, type, folder: parent?.id ?? null});
  return folder;
}

async function locationFolder(scenePack, category, documentType, locationName=null) {
  const root = await findFolder("TC Modern", documentType);
  const categoryFolder = await findFolder(category, documentType, root);
  const sourcePackage = scenePack?.metadata?.packageName ?? scenePack?.collection?.split(".")?.[0];
  let label = String(locationName || packLocationName(scenePack)).trim() || packLocationName(scenePack);
  const siblings = game.folders.filter?.(f => f.type === documentType &&
    (f.folder?.id ?? null) === categoryFolder.id && f.name === label) ?? [];
  // Preserve packs as distinct folders even if two releases have matching titles.
  if (siblings.some(f => f.getFlag?.(MODULE_ID, "packageId") &&
      f.getFlag(MODULE_ID,"packageId") !== sourcePackage)) label += ` (${sourcePackage})`;
  const folder = await findFolder(label, documentType, categoryFolder);
  if (sourcePackage && !folder.getFlag?.(MODULE_ID,"packageId") && folder.setFlag)
    await folder.setFlag(MODULE_ID,"packageId",sourcePackage);
  return folder;
}

function safeJournalOwnership() {
  // Explicitly deny non-GM users even when creator compendium documents contain
  // old per-user grants from a different world. Avoid leaking GM-only map keys.
  const ownership = {default:0};
  for (const user of game.users ?? []) ownership[user.id] = user.isGM ? 3 : 0;
  return ownership;
}

async function importMatchingJournals(scenePack, category) {
  const packs = associatedJournalPacks(scenePack);
  if (!packs.length) return {imported:0, existing:0, failed:[], mapping:new Map(), total:0};
  const folder = await locationFolder(scenePack,category,"JournalEntry");
  const outcome = {imported:0,existing:0,failed:[],mapping:new Map(),total:0};
  for (const pack of packs) {
    let index;
    try { index = await pack.getIndex({fields:["name"]}); }
    catch(error) { outcome.failed.push(`${pack.title || pack.collection}: index unavailable`); console.warn(`${MODULE_ID}: Journal index failed`, pack.collection,error); continue; }
    for (const entry of index) {
      if (!entry._id) continue;
      outcome.total++;
      const exists = importedJournal(pack.collection,entry._id);
      if (exists) { outcome.existing++; outcome.mapping.set(entry._id,exists.id); continue; }
      try {
        const keepId = !game.journal.get?.(entry._id);
        const imported = await game.journal.importFromCompendium(pack,entry._id,{
          folder:folder.id,ownership:safeJournalOwnership(),
          flags:{[MODULE_ID]:{origin:`${pack.collection}:${entry._id}`}}
        },{keepId,renderSheet:false});
        if (!imported) throw new Error("Foundry returned no journal document");
        // Creator journals are often location keys / GM information. Keep GM-only.
        if (imported.update) await imported.update({ownership:safeJournalOwnership()});
        outcome.imported++;
        outcome.mapping.set(entry._id,imported.id);
      } catch(error) { outcome.failed.push(entry.name||entry._id); console.warn(`${MODULE_ID}: Journal import failed`,pack.collection,entry._id,error); }
    }
  }
  return outcome;
}

async function rewireJournalLinks(scene, mapping) {
  if (!scene || !mapping.size) return;
  try {
    const rawJournal = scene.journal?.id ?? scene.journal;
    if (typeof rawJournal === "string" && mapping.has(rawJournal) && mapping.get(rawJournal) !== rawJournal)
      await scene.update({journal:mapping.get(rawJournal)});
    const notes=[...(scene.notes ?? [])].filter(n => mapping.has(n.entryId) && mapping.get(n.entryId)!==n.entryId)
      .map(n=>({_id:n.id,entryId:mapping.get(n.entryId)}));
    if(notes.length) await scene.updateEmbeddedDocuments("Note",notes);
  } catch(error) { console.warn(`${MODULE_ID}: Some legacy scene-journal references could not be updated`,error); }
}

// Opening a Scene is a viewing action, not necessarily a GM activation for
// players. The canvasReady hook is local to the GM client and fires after the
// new scene is ready; no Journal is shown to players.
async function openLocationJournal(scene, {importMissing=false}={}) {
  if (!game.user?.isGM || !scene) return null;
  const sourcePackage = sceneCreatorPackage(scene, game);
  if (!sourcePackage) return null; // Never guess at non-TC Modern scenes.

  const sourcePack = scenePacks().find(pack =>
    (pack.metadata?.packageName ?? pack.collection?.split(".")?.[0]) === sourcePackage);
  if (!sourcePack) return null;

  let journals = matchingWorldJournals(scene, sourcePackage, game, MODULE_ID);
  if (!journals.length && importMissing) {
    // Explicit opt-in only: opening a scene otherwise never alters world data.
    const category = categorize(packLocationName(sourcePack));
    const outcome = await importMatchingJournals(sourcePack, category);
    if (outcome.failed.length) console.warn(`${MODULE_ID}: Some location journals could not be imported`,outcome.failed);
    journals = matchingWorldJournals(scene, sourcePackage, game, MODULE_ID);
  }
  const journal = chooseLocationJournal(scene, journals, sourcePackage);
  if (!journal) return null;
  if (game.scenes?.viewed?.id !== scene.id) return null; // Scene changed during async import.

  try {
    // Close only a sheet this feature actually opened. Never close a GM's
    // previously-opened Journal window or alter the Journal itself.
    const prior = lastOpenedByModule;
    if (prior?.journal?.id !== journal.id && prior?.openedClosedSheet && prior.journal?.sheet?.rendered) {
      try { await prior.journal.sheet.close(); }
      catch (error) {console.debug(`${MODULE_ID}: Could not close previous location journal`,error);}
    }
    if (game.scenes?.viewed?.id !== scene.id) return null;
    const wasOpen = Boolean(journal.sheet?.rendered);
    await journal.sheet.render(true);
    lastOpenedByModule = {journal, openedClosedSheet:!wasOpen};
    return journal;
  } catch (error) {
    console.warn(`${MODULE_ID}: Cannot open Journal for ${scene.name}`,error);
    return null;
  }
}

async function autoOpenViewedSceneJournal(canvas) {
  const scene = canvas?.scene ?? game.scenes?.viewed;
  if (!scene || !game.user?.isGM) return;
  if (scene.id === lastCanvasSceneId) return; // No repeated popup on redraws.
  lastCanvasSceneId = scene.id;
  if (!game.settings.get(MODULE_ID, AUTO_OPEN_JOURNALS)) return;
  await openLocationJournal(scene, {
    importMissing:game.settings.get(MODULE_ID, AUTO_IMPORT_JOURNALS)
  });
}

function uniqueCategoryList(groups) {
  return [...new Set(groups.map(g => g.category))].sort((a,b)=>a.localeCompare(b));
}

async function organizePackFolders({restore=false}={}) {
  if (!game.user.isGM) throw new Error("Only a GM may organize compendiums.");
  const packs = creatorPacks();
  if (!packs.length) {
    ui.notifications.warn("No active TC Modern compendiums to organize.");
    return 0;
  }
  const backup = {...game.settings.get(MODULE_ID, SETTINGS_BACKUP)};
  if (restore && !Object.keys(backup).length) {
    ui.notifications.info("No previous organization to restore.");
    return 0;
  }
  const counts = packs.reduce((n,p)=>({...n,[p.documentName]:(n[p.documentName]||0)+1}),{});
  const label = restore ? "Restore original folders" : "Organize compendiums";
  const yes = await DialogV2.confirm({window:{title:label},rejectClose:false,content:
    restore ? `<p>Return TC Modern compendiums to their saved original folder assignments? Other packs will not be touched.</p>` :
    `<p>Place <strong>${packs.length}</strong> TC Modern compendiums (${counts.Scene||0} Scene packs, ${counts.JournalEntry||0} Journal packs) into one collapsible <strong>TC Modern</strong> folder with subfolders.</p>
    <p>No pack contents, permissions, or scene data will be changed. The original folder assignments will be saved for reversal.</p>`});
  if (!yes) return 0;

  const root = restore ? null : await findFolder("TC Modern", "Compendium");
  const sceneFolder = restore ? null : await findFolder("Scenes", "Compendium", root);
  const journalFolder = restore ? null : await findFolder("Journals & Other", "Compendium", root);
  if (!restore) {
    for (const pack of packs) {
      if (!Object.hasOwn(backup,pack.collection)) backup[pack.collection] = pack.folder?.id ?? null;
    }
    // Persist recovery information BEFORE changing any pack configurations.
    await game.settings.set(MODULE_ID, SETTINGS_BACKUP, backup);
  }
  let moved=0;
  const missing=[];
  for (const pack of packs) {
    if (restore && !Object.hasOwn(backup,pack.collection)) continue;
    const target = restore ? (backup[pack.collection] ?? null) :
      (pack.documentName === "Scene" ? sceneFolder.id : journalFolder.id);
    const safeTarget = restore && target && !game.folders.get(target) ? null : target;
    if (restore && target && !game.folders.get(target)) missing.push(pack.collection);
    if ((pack.folder?.id ?? null) === safeTarget) continue;
    try { await pack.setFolder(safeTarget); moved++; }
    catch(error) { console.warn(`${MODULE_ID}: Could not move ${pack.collection}`,error); }
  }
  if (restore) {
    const remaining = {...backup};
    for (const pack of packs) {
      const target = backup[pack.collection];
      if (Object.hasOwn(backup,pack.collection) && (pack.folder?.id ?? null) ===
          (target && game.folders.get(target) ? target : null)) delete remaining[pack.collection];
    }
    await game.settings.set(MODULE_ID, SETTINGS_BACKUP, remaining);
  }
  ui.notifications.info(`${moved} TC Modern packs ${restore?'restored':'organized'}.${missing.length?' Some original folders no longer exist.':''}`);
  return moved;
}

class SceneLibrary extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "tc-modern-scene-library",
    window: {title:"TC Modern — Scene Library", resizable:true},
    position: {width:1040, height:700}
  };

  constructor(options={}) {
    super(options);
    this.entries=[];
    this.sourceEntries=[];
    this.groups=[];
    this.failures=[];
    this.loaded=false;
    this.loading=null;
    this.query="";
    this.category="All";
    this.unimported=false;
    this.selectedKey="";
    this.editingCategoryKey="";
    this.selectedVariantKey="";
    this.selectedEntry=null;
    this.importStatus=null;
    this.busy=false;
    this.importJournals=true;
    this.teleporterState=new Map(); // packId:sceneId => {count}|{error}; null means unscanned
    this.teleporterJobs=new Map();
    this.teleportersOnly=false;
    this.scanRunning=false;
    this.scanProgress={done:0,total:0};
  }

  async _renderHTML() {
    const root=document.createElement("div");
    root.className="tcmodern-library";
    root.innerHTML = `
      <div class="tcmodern-head">
        <div class="tcmodern-summary" data-summary>Loading installed TC Modern scene packs...</div>
        <div class="tcmodern-actions">
          <button type="button" data-action="refresh" title="Re-read compendium indexes"><i class="fas fa-arrows-rotate"></i> Refresh</button>
          <button type="button" data-action="scan-teleporters" title="Inspect Scene Region behaviors in all installed TC Modern packs"><i class="fas fa-right-left"></i> Scan teleporters</button>
          <details class="tcmodern-management"><summary><i class="fas fa-list-check"></i> Catalog tools</summary>
            <div class="tcmodern-management-actions">
              <button type="button" data-action="export-review" title="Download full currently applied Scene mapping as a backup CSV"><i class="fas fa-file-csv"></i> Export catalog CSV</button>
              <button type="button" data-action="import-catalog" title="Preview and apply an edited CSV to this world's browser catalog only"><i class="fas fa-file-import"></i> Import corrected CSV</button>
              <button type="button" data-action="undo-catalog" title="Restore the world mapping from before the last category change or CSV import"><i class="fas fa-rotate-left"></i> Undo last mapping</button>
              <button type="button" data-action="organize" title="Group TC Modern packs in the Compendium sidebar"><i class="fas fa-folder-tree"></i> Organize compendiums</button>
              <button type="button" data-action="restore" title="Undo a prior Compendium sidebar organization"><i class="fas fa-rotate-left"></i> Undo compendium grouping</button>
            </div>
          </details>
          <input data-catalog-file type="file" accept=".csv,text/csv" hidden>
        </div>
      </div>
      <div class="tcmodern-filters">
        <input type="search" data-query placeholder="Search locations, maps or variants..." aria-label="Search scenes">
        <select data-category aria-label="Category"><option value="All">All categories</option></select>
        <label class="tcmodern-check"><input data-unimported type="checkbox"> Not yet imported</label>
        <label class="tcmodern-check"><input data-teleporters-only type="checkbox"> Teleporters only</label>
        <label class="tcmodern-check" title="Open the matching imported Journal on the GM screen when a TC Modern scene is viewed"><input data-auto-journals type="checkbox"> Auto-open GM journal</label>
      </div>
      <div class="tcmodern-main">
        <section class="tcmodern-locations" aria-label="Location search results">
          <div class="tcmodern-section-title">Creator locations <span data-visible-count></span></div>
          <div data-location-list class="tcmodern-scroll"></div>
        </section>
        <section class="tcmodern-details" aria-label="Selected location">
          <div data-detail class="tcmodern-scroll tcmodern-detail-body"><p class="notes">Choose a location on the left.</p></div>
        </section>
      </div>
      <p class="tcmodern-footer">Uses installed TC Modern compendiums only. Imported scenes are copies; source packs, walls and lighting remain untouched. GM only.</p>`;
    return root;
  }

  _replaceHTML(result,content) { content.replaceChildren(result); }

  async _onRender() {
    const root=this.element?.querySelector(".tcmodern-library");
    if (!root) return;
    this.root=root;
    root.querySelector("[data-query]").value=this.query;
    root.querySelector("[data-unimported]").checked=this.unimported;
    root.querySelector("[data-teleporters-only]").checked=this.teleportersOnly;
    root.querySelector("[data-auto-journals]").checked=game.settings.get(MODULE_ID,AUTO_OPEN_JOURNALS);
    root.querySelector("[data-query]").addEventListener("input",e=>{this.query=e.target.value;this.draw();});
    root.querySelector("[data-catalog-file]").addEventListener("change",e=>{
      const file=e.target.files?.[0];
      e.target.value="";
      if(file)void this.importCatalogFile(file);
    });
    root.querySelector("[data-category]").addEventListener("change",e=>{this.category=e.target.value;this.selectedKey="";this.draw();});
    root.querySelector("[data-unimported]").addEventListener("change",e=>{this.unimported=e.target.checked;this.draw();});
    root.querySelector("[data-teleporters-only]").addEventListener("change",e=>{
      this.teleportersOnly=e.target.checked;this.draw();
      if(this.teleportersOnly && this.teleporterState.size<this.entries.length) void this.scanTeleporters();
    });
    root.addEventListener("change",e=>{
      if(e.target.matches("[data-import-journals]"))this.importJournals=e.target.checked;
      if(e.target.matches("[data-auto-journals]"))void game.settings.set(MODULE_ID,AUTO_OPEN_JOURNALS,e.target.checked);
      if(e.target.matches("[data-category-choice]")) {
        const group=this.filtered?.[Number(e.target.dataset.categoryChoice)];
        if(!group || group.key!==this.editingCategoryKey)return;
        const custom=e.target.closest(".tcmodern-category-editor")?.querySelector("[data-new-category]");
        if(e.target.value==="__new__") {
          if(custom){custom.hidden=false;custom.querySelector("input")?.focus();}
        } else {
          if(custom)custom.hidden=true;
          void this.changeLocationCategory(group,e.target.value);
        }
      }
    });
    root.addEventListener("keydown",e=>{
      if(e.key!=="Enter" || !e.target.matches("[data-new-category-input]"))return;
      e.preventDefault();
      const editor=e.target.closest(".tcmodern-category-editor");
      const group=this.filtered?.[Number(editor?.dataset.categoryEditor)];
      if(group?.key===this.editingCategoryKey)void this.changeLocationCategory(group,e.target.value);
    });
    root.addEventListener("click", e => {
      const edit=e.target.closest("[data-edit-category]");
      if(edit){
        const group=this.filtered?.[Number(edit.dataset.editCategory)];
        if(!group || this.busy)return;
        this.editingCategoryKey=this.editingCategoryKey===group.key?"":group.key;
        this.draw();return;
      }
      if(e.target.closest("[data-cancel-category]")){
        this.editingCategoryKey="";this.draw();return;
      }
      const customSave=e.target.closest("[data-save-category]");
      if(customSave){
        const group=this.filtered?.[Number(customSave.dataset.saveCategory)];
        const editor=customSave.closest(".tcmodern-category-editor");
        const name=editor?.querySelector("[data-new-category-input]")?.value;
        if(group?.key===this.editingCategoryKey)void this.changeLocationCategory(group,name);
        return;
      }
      const button=e.target.closest("[data-action]");
      if (button) {void this.action(button.dataset.action);return;}
      const loc=e.target.closest("[data-location]");
      if(loc) {this.selectedKey=this.filtered[Number(loc.dataset.location)]?.key??"";
        this.selectedEntry=null;this.selectedVariantKey="";this.importStatus=null;
        this.draw();void this.scanSelectedGroup();return;}
      const variant=e.target.closest("[data-variant-pack]");
      if(variant) {
        const group=this.groups.find(g=>g.key===this.selectedKey);
        const picked=group?.variants[Number(variant.dataset.variantPack)];
        if(!picked)return;
        this.selectedVariantKey=picked.key;
        this.selectedEntry=group.scenes.indexOf(picked.scenes[0]);
        this.importStatus=null;
        this.drawDetails();return;
      }
      const sceneButton=e.target.closest("[data-variant-scene]");
      if(sceneButton) {this.selectedEntry=Number(sceneButton.dataset.variantScene);this.drawDetails();}
    });
    if (this.loaded) this.draw();
    else if(!this.loading) void this.load();
  }

  async load({refresh=false}={}) {
    if (this.loading) return this.loading;
    this.loading=(async()=>{
      this.loaded=false;
      if(this.root) this.root.querySelector("[data-summary]").textContent="Indexing TC Modern scene packs...";
      const packs=scenePacks();
      const entries=[]; const failures=[];
      // Bounded concurrency prevents hammering Foundry's socket while indexing
      // a full creator library (potentially 93+ packs).
      let position=0;
      const worker=async()=>{
        while(position<packs.length){
          const pack=packs[position++];
          let index;
          try { index=await pack.getIndex({fields:["name","thumb","img","background.src"]}); }
          catch(firstError){
            try {index=await pack.getIndex({fields:["name"]});}
            catch(error){failures.push(pack.title);console.warn(`${MODULE_ID}: Index unavailable`,pack.collection,error);continue;}
          }
          for(const scene of index){
            if (!scene.name || !scene._id) continue;
            entries.push({packId:pack.collection,packLabel:pack.title||pack.metadata?.label||pack.collection,
              sourcePackage:pack.metadata?.packageName??pack.collection.split(".")[0],
              locationLabel:packLocationName(pack),
              id:scene._id,name:scene.name,thumb:safeAssetPath(scene.thumb||scene.img),
              background:safeAssetPath(scene.background?.src)});
          }
        }
      };
      await Promise.all(Array.from({length:Math.min(packs.length,4)},worker));
      this.sourceEntries=entries;
      this.rebuildCatalog();
      this.failures=failures;
      this.loaded=true;
    })();
    try{await this.loading;}
    finally{
      this.loading=null;
      if(this.root && this.rendered){this.draw();void this.scanSelectedGroup();}
    }
  }

  rebuildCatalog() {
    const overrides=game.settings.get(MODULE_ID,CATALOG_OVERRIDES) || {};
    this.entries=applyCatalogMapping(this.sourceEntries,overrides);
    this.groups=groupScenePacks(this.entries);
  }

  async changeLocationCategory(group, category) {
    if(!game.user?.isGM || this.busy)return;
    // Resolve the selected location from the current catalog, never from
    // untrusted DOM labels. Save only a category override for its source IDs.
    const current=this.groups.find(g=>g.key===group?.key);
    if(!current){ui.notifications.warn("Location changed. Refresh the library and try again.");return;}
    let plan;
    try {
      plan=planLocationCategoryChange(current,category,game.settings.get(MODULE_ID,CATALOG_OVERRIDES)||{});
    }catch(error){ui.notifications.warn(error.message||String(error));return;}
    if(!plan.changes.length){this.editingCategoryKey="";this.draw();return;}
    this.busy=true;
    try {
      // Do not silently overwrite a second GM's edits while this action waits
      // for a settings write. The change also becomes the one-step undo point.
      const live=game.settings.get(MODULE_ID,CATALOG_OVERRIDES)||{};
      if(JSON.stringify(live)!==JSON.stringify(plan.previous))
        throw Error("World catalog changed. Refresh and try again.");
      await game.settings.set(MODULE_ID,CATALOG_PRIOR,{savedAt:new Date().toISOString(),overrides:plan.previous});
      await game.settings.set(MODULE_ID,CATALOG_OVERRIDES,plan.next);
      this.editingCategoryKey="";
      if(this.category!=="All" && this.category!==plan.category)this.category="All";
      this.rebuildCatalog();
      ui.notifications.info(`${plan.location} moved to ${plan.category} in the Scene Library (${plan.scenes} source Scenes). Existing world Scenes and folders were not changed.`);
    }catch(error){
      console.error(`${MODULE_ID}: Cannot change location category`,error);
      ui.notifications.error(`Category change not saved: ${error.message||error}`);
    }finally{this.busy=false;this.draw();}
  }

  sceneKey(scene) {return `${scene.packId}:${scene.id}`;}

  async inspectTeleporter(scene) {
    const key=this.sceneKey(scene);
    if(this.teleporterState.has(key))return this.teleporterState.get(key);
    if(this.teleporterJobs.has(key))return this.teleporterJobs.get(key);
    const job=(async()=>{
      try {
        const pack=game.packs.get(scene.packId);
        if(!pack)throw Error(`Missing compendium ${scene.packId}`);
        const document=await pack.getDocument(scene.id);
        if(!document)throw Error(`Missing scene ${scene.id}`);
        const result={count:countTeleporters(document)};
        this.teleporterState.set(key,result);
        return result;
      } catch(error) {
        this.teleporterState.set(key,{error:true});
        console.warn(`${MODULE_ID}: Could not inspect teleporters in ${scene.packId}/${scene.id}`,error);
        return {error:true};
      } finally {this.teleporterJobs.delete(key);}
    })();
    this.teleporterJobs.set(key,job);
    return job;
  }

  async scanSelectedGroup(){
    const key=this.selectedKey;
    const group=this.groups.find(g=>g.key===key);
    if(!group)return;
    const todo=group.scenes.filter(s=>!this.teleporterState.has(this.sceneKey(s)));
    if(!todo.length)return;
    // A small number of entries are requested on selection, avoiding a full
    // compendium scan every time the browser opens.
    let offset=0;
    const worker=async()=>{while(offset<todo.length)await this.inspectTeleporter(todo[offset++]);};
    await Promise.all(Array.from({length:Math.min(3,todo.length)},worker));
    if(this.selectedKey===key && !this.scanRunning) this.draw();
  }

  async scanTeleporters(){
    if(this.scanRunning || !this.loaded)return;
    this.scanRunning=true;
    const pending=this.entries.filter(s=>!this.teleporterState.has(this.sceneKey(s)));
    this.scanProgress={done:0,total:pending.length};
    this.draw();
    let cursor=0;
    const worker=async()=>{
      while(cursor<pending.length){
        const scene=pending[cursor++];
        await this.inspectTeleporter(scene);
        this.scanProgress.done++;
        if(this.scanProgress.done%12===0)this.updateScanSummary();
      }
    };
    try{await Promise.all(Array.from({length:Math.min(3,pending.length)},worker));}
    finally{
      this.scanRunning=false;
      this.updateScanSummary();
      this.draw();
      ui.notifications.info(`Teleporter scan complete: ${this.teleportStats().scenes} scenes with native teleport regions; ${this.teleportStats().errors} unreadable scenes.`);
    }
  }

  teleportStats(){
    const values=[...this.teleporterState.values()];
    return {scanned:values.length,scenes:values.filter(v=>v.count>0).length,
      behaviors:values.reduce((n,v)=>n+(v.count??0),0),errors:values.filter(v=>v.error).length};
  }

  updateScanSummary(){
    if(!this.root)return;
    const stats=this.teleportStats();
    const summary=this.root.querySelector("[data-summary]");
    const mapped=this.entries.filter(s=>s.catalogMatched).length;
    const review=this.entries.filter(s=>s.catalogCategory===CATEGORY_NEEDS_REVIEW).length;
    const text=`${this.groups.length.toLocaleString()} locations · ${this.entries.length.toLocaleString()} scenes · ${scenePacks().length} source compendiums · ${mapped}/${this.entries.length} catalog-mapped (of ${REVIEWED_MAPPING_COUNT} bundled)${review?` · ${review} Scenes need category review`:""}`;
    const suffix=stats.scanned?` · ${stats.scenes} teleporter scenes (${stats.scanned}/${this.entries.length} inspected${stats.errors?`, ${stats.errors} failed`:""})`:"";
    const progress=this.scanRunning?` · scanning ${this.scanProgress.done}/${this.scanProgress.total} remaining scenes`:"";
    summary.textContent=text+suffix+progress+(this.failures.length?` · ${this.failures.length} unreadable packs`:"");
    const button=this.root.querySelector('[data-action="scan-teleporters"]');
    if(button){button.disabled=this.scanRunning;button.title=this.scanRunning?"Teleporter scan in progress":"Inspect native Teleport Token Region behaviors";}
  }

  draw() {
    if(!this.root)return;
    const root=this.root;
    const cats=uniqueCategoryList(this.groups);
    const dropdown=root.querySelector("[data-category]");
    dropdown.replaceChildren(new Option("All categories","All"),...cats.map(c=>new Option(c,c)));
    if(!cats.includes(this.category))this.category="All";
    dropdown.value=this.category;
    const importedKeys=this.getImportedKeys();
    const found=filterGroups(this.groups,{query:this.query,category:this.category,unimported:this.unimported,imported:importedKeys})
      .filter(g=>!this.teleportersOnly||g.scenes.some(s=>(this.teleporterState.get(this.sceneKey(s))?.count??0)>0));
    this.filtered=found;
    if(!found.some(g=>g.key===this.selectedKey)) {this.selectedKey=found[0]?.key??"";this.selectedEntry=null;this.selectedVariantKey="";this.importStatus=null;}
    if(!found.some(g=>g.key===this.editingCategoryKey))this.editingCategoryKey="";
    this.updateScanSummary();
    root.querySelector("[data-visible-count]").textContent=`${found.length} matches`;
    const list=root.querySelector("[data-location-list]");
    const scrollTop=list.scrollTop;
    list.innerHTML=found.length?found.slice(0,MAX_VISIBLE).map((group,i)=>{
      const selected=group.key===this.selectedKey ?" is-selected":"";
      const count=group.scenes.length;
      const imp=group.scenes.filter(s=>importedKeys.has(`${s.packId}:${s.id}`)).length;
      const teleport=group.scenes.filter(s=>(this.teleporterState.get(this.sceneKey(s))?.count??0)>0).length;
      const editing=group.key===this.editingCategoryKey;
      return `<div class="tcmodern-location-row">
        <button type="button" class="tcmodern-location${selected}" data-location="${i}">
        <strong>${escapeHTML(group.base)}${teleport?` <span class="tcmodern-teleport"><i class="fas fa-right-left"></i> Teleport (${teleport})</span>`:""}</strong>
        <small>${escapeHTML(group.category)} · ${group.variants.length} variant pack${group.variants.length===1?"":"s"} · ${count} scenes${imp?` · ${imp} imported`:""}</small>
        </button>
        <button type="button" class="tcmodern-category-trigger" data-edit-category="${i}" aria-label="Change Category for ${escapeHTML(group.base)}" aria-expanded="${editing}" ${this.busy?"disabled":""}><i class="fas fa-folder-tree"></i> Change Category</button>
        ${editing?`<div class="tcmodern-category-editor" data-category-editor="${i}">
          <label for="tcmodern-category-${i}">Category for ${escapeHTML(group.base)}</label>
          <div class="tcmodern-category-editor-controls">
            <select id="tcmodern-category-${i}" data-category-choice="${i}" aria-label="Category for ${escapeHTML(group.base)}" ${this.busy?"disabled":""}>
              ${cats.map(cat=>`<option value="${escapeHTML(cat)}" ${cat===group.category?"selected":""}>${escapeHTML(cat)}</option>`).join("")}
              <option value="__new__">Create new category...</option>
            </select>
            <button type="button" data-cancel-category>Cancel</button>
          </div>
          <div class="tcmodern-category-custom" data-new-category hidden>
            <input type="text" maxlength="80" data-new-category-input placeholder="New category name" aria-label="New category name">
            <button type="button" data-save-category="${i}" ${this.busy?"disabled":""}>Save</button>
          </div>
          <small>Changes this location and all its variants in the catalog. Existing world Scenes stay in their current folders.</small>
        </div>`:""}
      </div>`;
    }).join("") + (found.length>MAX_VISIBLE?`<p class="tcmodern-tip">Showing ${MAX_VISIBLE} of ${found.length}. Refine your search for more.</p>`:""):
      `<p class="tcmodern-tip">${this.teleportersOnly&&this.teleporterState.size<this.entries.length?"Scanning for teleporters; results will appear as scenes are checked.":"No locations match your filters."}</p>`;
    list.scrollTop=scrollTop;
    this.drawDetails();
  }

  getImportedKeys() {
    const imports=new Set();
    for(const s of game.scenes){
      const origin=s.getFlag?.(MODULE_ID,"origin");
      if(origin)imports.add(origin);
      const source=s.getFlag?.("core","sourceId");
      if(source?.startsWith("Compendium.")) {
        for(const group of this.groups) {
          const prefix=`Compendium.${group.packId}.`;
          if(!source.startsWith(prefix))continue;
          const remainder=source.slice(prefix.length);
          const sceneId=remainder.startsWith("Scene.")?remainder.slice("Scene.".length):remainder;
          if(sceneId && !sceneId.includes("."))imports.add(`${group.packId}:${sceneId}`);
          break;
        }
      }
    }
    return imports;
  }

  drawDetails(){
    if(!this.root)return;
    const region=this.root.querySelector("[data-detail]");
    const group=this.groups.find(g=>g.key===this.selectedKey);
    if(!group){region.innerHTML=`<p class="tcmodern-tip">Choose a creator location to see its variant packs.</p>`;return;}
    if(!group.variants.some(v=>v.key===this.selectedVariantKey))this.selectedVariantKey=group.variants[0]?.key??"";
    const variant=group.variants.find(v=>v.key===this.selectedVariantKey);
    if(!variant){region.innerHTML=`<p class="tcmodern-tip">This location has no available scenes.</p>`;return;}
    if(this.selectedEntry===null || !variant.scenes.some(s=>s===group.scenes[this.selectedEntry]))
      this.selectedEntry=group.scenes.indexOf(variant.scenes[0]);
    const choice=group.scenes[this.selectedEntry];
    const imported=importedScene(choice.packId,choice.id);
    const preview=choice.thumb||choice.background;
    const sourcePack=game.packs.get(choice.packId);
    const journals=sourcePack?associatedJournalPacks(sourcePack):[];
    const teleports=this.teleporterState.get(this.sceneKey(choice));
    const importedKeys=this.getImportedKeys();
    const importedCount=variant.scenes.filter(s=>importedKeys.has(this.sceneKey(s))).length;
    const remaining=variant.scenes.length-importedCount;
    const status=this.importStatus?.key===`${group.key}:${variant.key}`?this.importStatus:null;
    region.innerHTML=`
      <div class="tcmodern-detail-title"><h2>${escapeHTML(group.base)}</h2>
      <span class="tcmodern-category${group.category===CATEGORY_NEEDS_REVIEW?" tcmodern-review-needed":""}">${escapeHTML(group.category)}</span></div>
      <p class="tcmodern-source">${escapeHTML(group.packLabel)} · ${group.scenes.length} scenes in ${group.variants.length} variant pack${group.variants.length===1?"":"s"}</p>
      <h3>Choose a variant pack</h3>
      <div class="tcmodern-variant-packs" role="group" aria-label="Variant packs for ${escapeHTML(group.base)}">${group.variants.map((v,i)=>{
        const active=v.key===variant.key?" is-active":"";
        const count=v.scenes.filter(s=>importedKeys.has(this.sceneKey(s))).length;
        const teleCount=v.scenes.filter(s=>(this.teleporterState.get(this.sceneKey(s))?.count??0)>0).length;
        return `<button type="button" class="tcmodern-variant-pack${active}" data-variant-pack="${i}" aria-pressed="${v.key===variant.key}">
          <span class="tcmodern-variant-name">${escapeHTML(v.label)}</span>
          <small>${v.scenes.length} scene${v.scenes.length===1?"":"s"}${count?` · ${count} imported`:""}</small>
          ${teleCount?`<span class="tcmodern-teleport"><i class="fas fa-right-left"></i> ${teleCount}</span>`:""}
        </button>`;
      }).join("")}</div>
      <div class="tcmodern-choice-heading"><h3>${escapeHTML(variant.label)} · ${variant.scenes.length} included scene${variant.scenes.length===1?"":"s"}</h3>
        <span>${remaining?`${remaining} to import`:"Already imported"}</span></div>
      ${status?.blockers?.length?`<div class="tcmodern-import-warning"><strong>${status.partial?"Pack import interrupted — some scenes were imported:":"Pack import blocked — no changes made:"}</strong><ul>${status.blockers.map(s=>`<li>${escapeHTML(s)}</li>`).join("")}</ul></div>`:""}
      ${status?.warnings?.length?`<div class="tcmodern-import-warning"><strong>Links to review:</strong><ul>${status.warnings.map(s=>`<li>${escapeHTML(s)}</li>`).join("")}</ul></div>`:""}
      ${journals.length?`<label class="tcmodern-journal-option"><input type="checkbox" data-import-journals ${this.importJournals?"checked":""} ${this.busy?"disabled":""}> Include associated GM Journals (once per creator location)</label>`:""}
      <div class="tcmodern-detail-buttons">
        <button type="button" class="tcmodern-primary" data-action="import-variant" ${this.busy?"disabled":""}>
          <i class="fas fa-layer-group"></i> ${this.busy?"Checking / importing...":!remaining?"Check / import linked scenes":importedCount?`Import missing scenes (${remaining})`:`Import ${escapeHTML(variant.label)} pack (${remaining})`}</button>
        <button type="button" data-action="import" ${this.busy?"disabled":""}>
          <i class="fas ${imported?"fa-eye":"fa-file-import"}"></i> ${imported?"Open previewed scene":"Import previewed scene only"}</button>
        ${journals.length?`<button type="button" data-action="journals" ${this.busy?"disabled":""}><i class="fas fa-book-open"></i> Import GM journals</button>`:""}
        <button type="button" data-action="pack" ${this.busy?"disabled":""}><i class="fas fa-box-archive"></i> Open source compendium</button>
      </div>
      <div class="tcmodern-preview">
        ${preview?`<img alt="${escapeHTML(choice.name)} preview" loading="lazy" src="${escapeHTML(preview)}" data-preview>`:
          `<div class="tcmodern-no-preview"><i class="fas fa-map"></i> Preview unavailable in the index</div>`}
      </div>
      <p class="tcmodern-preview-name">${escapeHTML(choice.catalogDisplayName??choice.name)} <small>(source: ${escapeHTML(choice.name)})</small></p>
      <details class="tcmodern-scene-details">
        <summary>View individual scenes and floors (${variant.scenes.length})</summary>
        <div class="tcmodern-variants">${variant.scenes.map(scene=>{
          const i=group.scenes.indexOf(scene);
          const active=i===this.selectedEntry?" is-active":"";
          const done=importedKeys.has(this.sceneKey(scene));
          const floor=sceneFloorLabel(scene);
          return `<button type="button" class="tcmodern-variant${active}" data-variant-scene="${i}" title="${escapeHTML(scene.name)}">
            <span>${escapeHTML(scene.catalogDisplayName || (floor?`${floor} - ${scene.name}`:scene.name))}</span>
            ${(this.teleporterState.get(this.sceneKey(scene))?.count??0)>0?`<span class="tcmodern-teleport"><i class="fas fa-right-left"></i> Teleport</span>`:""}
            ${done?`<span class="tcmodern-imported"><i class="fas fa-check"></i> Imported</span>`:""}
          </button>`;
        }).join("")}</div>
      </details>
      <p class="tcmodern-teleport-status">${teleports?.count>0?`<i class="fas fa-right-left"></i> Previewed scene: ${teleports.count} native Teleport Token behavior${teleports.count===1?"":"s"}`:
        teleports?.error?"Teleporter inspection unavailable for the previewed scene":teleports?"No native Teleport Token behaviors in previewed scene":"Teleporter scan pending"}. Pack import additionally checks linked destinations.</p>
      <p class="tcmodern-tip">Pack import previews all scenes and follows native Teleport Token links to include required floors when available. Existing world scenes are never overwritten. Individual scene import remains available. Category labels affect only new imports, not existing world Scene folders.</p>`;
    const previewEl=region.querySelector("[data-preview]");
    if(previewEl && choice.background && choice.background!==choice.thumb){
      previewEl.addEventListener("error",()=>{if(previewEl.dataset.triedFallback)return;previewEl.dataset.triedFallback="1";previewEl.src=choice.background;},{once:true});
    }
  }

  async importCatalogFile(file) {
    if(!game.user?.isGM || this.busy)return;
    if(!this.loaded)await this.load();
    let plan;
    try {
      if(file.size>5*1024*1024)throw Error("Catalog CSV is larger than 5 MB");
      const current=game.settings.get(MODULE_ID,CATALOG_OVERRIDES) || {};
      plan=planCatalogImport(await file.text(),this.sourceEntries,current);
    }catch(error){
      console.error(`${MODULE_ID}: CSV parsing failed`,error);
      ui.notifications.error(`Catalog CSV rejected: ${error.message || error}. No data was changed.`);
      return;
    }
    if(plan.errors.length){
      console.warn(`${MODULE_ID}: Catalog preflight blocked`,plan.errors);
      this.importStatus=null;
      ui.notifications.error(`CSV remapping blocked (${plan.errors.length} issue(s)). No data changed; see F12 console.`);
      return;
    }
    if(!plan.changes.length){
      ui.notifications.info(`Catalog is already up to date. ${plan.matched} matching source Scenes checked; no world data changed.`);
      return;
    }
    const examples=plan.changes.slice(0,12).map(change=>
      `<li>${escapeHTML(change.key)}: ${escapeHTML(change.before.category)} / ${escapeHTML(change.before.location)} -> `+
      `${escapeHTML(change.after.category)} / ${escapeHTML(change.after.location)} / ${escapeHTML(change.after.variant)}</li>`).join("");
    const skipped=plan.unknown.length?`<p><strong>${plan.unknown.length} unknown source keys will be skipped:</strong> `+
      `${escapeHTML(plan.unknown.slice(0,6).join(", "))}${plan.unknown.length>6?" ...":""}</p>`:"";
    const warnings=plan.warnings.filter(w=>!w.startsWith("unknown"));
    const yes=await DialogV2.confirm({window:{title:"Preview TC Modern Catalog Remapping"},rejectClose:false,content:
      `<p>This imports <strong>catalog labels only</strong> for the current world, not creator source Scenes or world Scenes.</p>`+
      `<p>CSV rows: ${plan.rows}. Matched: ${plan.matched}. Changed: <strong>${plan.changes.length}</strong>. `+
      `Skipped: ${plan.unknown.length}. Unlisted source Scenes retain their current mappings.</p>`+
      `<p>Example changes:</p><div class="tcmodern-import-preview"><ul>${examples}</ul></div>`+
      skipped+(warnings.length?`<p>${warnings.length} original-name differences noted in console.</p>`:"")+
      `<p>Before applying, the module saves the previous world mapping for <strong>Undo last mapping</strong>. `+
      `Export catalog CSV first if you also want a downloadable backup. `+
      `No existing world Scene, Journal, folder, artwork or teleporter is modified. Apply these changes?</p>`});
    if(!yes)return;
    this.busy=true;
    try{
      // Guard against another GM updating the setting while the dialog was open.
      const live=game.settings.get(MODULE_ID,CATALOG_OVERRIDES) || {};
      if(JSON.stringify(live)!==JSON.stringify(plan.previous))throw Error("World catalog changed during preview. Re-import the CSV to review again.");
      await game.settings.set(MODULE_ID,CATALOG_PRIOR,{savedAt:new Date().toISOString(),overrides:plan.previous});
      await game.settings.set(MODULE_ID,CATALOG_OVERRIDES,plan.next);
      this.selectedKey="";this.selectedEntry=null;this.selectedVariantKey="";
      this.editingCategoryKey="";
      this.rebuildCatalog();
      ui.notifications.info(`Applied ${plan.changes.length} reviewed catalog changes. Undo last mapping is available. No Scene documents changed.`);
    }catch(error){
      console.error(`${MODULE_ID}: Catalog import failed`,error);
      ui.notifications.error(`Catalog mapping not applied: ${error.message||error}`);
    }finally{this.busy=false;this.draw();}
  }

  async undoCatalogImport() {
    if(!game.user?.isGM || this.busy)return;
    const saved=game.settings.get(MODULE_ID,CATALOG_PRIOR) || {};
    if(!Object.hasOwn(saved,"overrides")){
      ui.notifications.info("No previous catalog import is available to undo.");return;
    }
    const yes=await DialogV2.confirm({window:{title:"Undo Last Catalog Change"},rejectClose:false,content:
      `<p>Restore the previous world catalog labels (saved ${escapeHTML(saved.savedAt??"previously")})?</p>`+
      `<p>Current labels are kept as the new one-step backup, so the action can be reversed. `+
      `No existing Scenes, Journals, Regions, folders or creator compendiums will be modified.</p>`});
    if(!yes)return;
    this.busy=true;
    try{
      const current=game.settings.get(MODULE_ID,CATALOG_OVERRIDES) || {};
      await game.settings.set(MODULE_ID,CATALOG_PRIOR,{savedAt:new Date().toISOString(),overrides:current});
      await game.settings.set(MODULE_ID,CATALOG_OVERRIDES,saved.overrides || {});
      this.selectedKey="";this.selectedVariantKey="";this.selectedEntry=null;
      this.editingCategoryKey="";
      this.rebuildCatalog();
      ui.notifications.info("Restored previous Scene Library catalog labels; original Scenes remain untouched.");
    }catch(error){
      console.error(`${MODULE_ID}: Undo catalog mapping failed`,error);
      ui.notifications.error("Could not restore the previous catalog mapping. Check F12 console.");
    }finally{this.busy=false;this.draw();}
  }

  async action(action){
    if(this.busy)return;
    if(action==="refresh") {
      if(this.scanRunning){ui.notifications.warn("Wait for the teleporter scan to finish before refreshing.");return;}
      this.entries=[];this.groups=[];this.selectedKey="";this.selectedVariantKey="";this.editingCategoryKey="";this.importStatus=null;this.loaded=false;this.teleporterState.clear();
      await this.load({refresh:true});return;
    }
    if(action==="export-review") {
      // Always export the FULL indexed catalog, regardless of search/category or
      // current selection; this is a review export, not a world document export.
      if(!this.loaded)await this.load();
      if(this.failures.length) {
        const items=this.failures.slice(0,12).map(name=>`<li>${escapeHTML(name)}</li>`).join("");
        const yes=await DialogV2.confirm({window:{title:"Incomplete Scene Catalog"},rejectClose:false,content:
          `<p><strong>${this.failures.length} source compendium(s) could not be indexed.</strong> The review export will be incomplete.</p><ul>${items}</ul>${this.failures.length>12?"<p>Additional failed packs omitted from this preview.</p>":""}<p>Export the <strong>partial</strong> list anyway? Choose No and use Refresh if you need a complete inventory.</p>`});
        if(!yes)return;
      }
      try {
        const rows=createSceneCatalogReviewRows(this.entries,this.groups,this.getImportedKeys());
        const csv=encodeSceneCatalogReviewCsv(rows);
        const date=new Date().toISOString().slice(0,10);
        const filename=`tc-modern-scene-catalog-${this.failures.length?"PARTIAL-":""}${date}.csv`;
        if(typeof saveDataToFile==="function") {
          saveDataToFile(csv,"text/csv;charset=utf-8",filename);
        } else {
          // Standard browser fallback for Foundry runtimes where the helper is
          // unavailable. Revoke the temporary URL after triggering download.
          const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
          const anchor=document.createElement("a");
          anchor.href=url;anchor.download=filename;
          document.body.append(anchor);anchor.click();anchor.remove();
          setTimeout(()=>URL.revokeObjectURL(url),10000);
        }
        ui.notifications.info(`Downloaded ${rows.length} original TC Modern Scene rows from ${new Set(rows.map(row=>row.packId)).size} source compendiums. Editing the CSV does not change Foundry.`);
      } catch(error) {
        console.error(`${MODULE_ID}: Catalog review export failed`,error);
        ui.notifications.error("Could not export the Scene catalog. Check console and refresh the library.");
      }
      return;
    }
    if(action==="import-catalog") {
      this.root?.querySelector("[data-catalog-file]")?.click();
      return;
    }
    if(action==="undo-catalog") {await this.undoCatalogImport();return;}
    if(action==="scan-teleporters") {await this.scanTeleporters();return;}
    if(action==="organize"||action==="restore") {
      this.busy=true;
      try{await organizePackFolders({restore:action==="restore"});}
      catch(error){console.error(`${MODULE_ID}: Folder action failed`,error);ui.notifications.error("Compendium organization failed. See console.");}
      finally{this.busy=false;this.draw();}
      return;
    }
    const group=this.groups.find(g=>g.key===this.selectedKey);
    const scene=group?.scenes[this.selectedEntry??0];
    if(!scene)return;
    const pack=game.packs.get(scene.packId);
    if(!pack){ui.notifications.warn("Source compendium no longer exists. Refresh the library.");return;}
    if(action==="pack") {pack.render(true);return;}
    if(action==="import-variant") {
      const variant=group.variants.find(v=>v.key===this.selectedVariantKey);
      if(!variant)return;
      const targetKey=`${group.key}:${variant.key}`;
      this.importStatus=null;
      this.busy=true;this.drawDetails();
      let plan;
      try {
        plan=await prepareVariantImport({
          selectedScenes:variant.scenes,allEntries:this.entries,
          getSource:async entry=>{
            const source=game.packs.get(entry.packId);
            if(!source)throw Error(`Source pack ${entry.packId} unavailable`);
            return await source.getDocument(entry.id);
          },
          getExisting:entry=>importedScene(entry.packId,entry.id),
          getWorldScene:id=>game.scenes.get(id)
        });
      } catch(error) {
        console.error(`${MODULE_ID}: Variant preflight failed`,error);
        ui.notifications.error("Variant pack could not be inspected. Nothing was imported; check console.");
        return;
      } finally {this.busy=false;this.drawDetails();}
      this.importStatus={key:targetKey,warnings:plan.warnings,blockers:plan.blockers};
      this.drawDetails();
      if(plan.blockers.length) {
        console.warn(`${MODULE_ID}: Variant import blocked`,plan.blockers);
        ui.notifications.error(`Pack import blocked by ${plan.blockers.length} ID/inspection issue(s). See the details panel; no changes made.`);
        return;
      }
      if(!plan.missing.length) {
        ui.notifications.info(`All ${plan.scenes.length} scenes in this variant and its linked destinations are already imported.`);
        return;
      }
      const linked=new Set(plan.linked.map(s=>this.sceneKey(s)));
      const sceneList=plan.scenes.map(s=>{
        const status=plan.existing.includes(s)?"already imported":linked.has(this.sceneKey(s))?"linked destination":"new";
        return `<li>${escapeHTML(s.name)} <small>(${escapeHTML(status)})</small></li>`;
      }).join("");
      const confirmed=await DialogV2.confirm({window:{title:`Import ${variant.label} — ${group.base}`},rejectClose:false,content:
        `<p><strong>${escapeHTML(group.base)} / ${escapeHTML(variant.label)}</strong></p>
        <p>Import <strong>${plan.missing.length}</strong> missing Scenes; skip ${plan.existing.length} already in the world. `+
        `${plan.linked.length?`${plan.linked.length} additional scene(s) are required by native teleporter links and included in this import.`:"No additional linked destinations were identified."}</p>
        <div class="tcmodern-import-preview"><ul>${sceneList}</ul></div>
        ${plan.warnings.length?`<p><strong>Review these unresolved destinations after import:</strong></p><ul>${plan.warnings.map(w=>`<li>${escapeHTML(w)}</li>`).join("")}</ul>`:""}
        <p>Destination: <strong>Scenes / TC Modern / ${escapeHTML(group.category)} / ${escapeHTML(group.base)}</strong>. Linked scenes belonging to other mapped locations will use their own destination folders.</p>
        <p>${this.importJournals && associatedJournalPacks(pack).length?"Associated Journal entries will be imported GM-only, skipping existing copies.":"Associated Journals will not be imported."} Source assets must remain installed.</p>
        <p>Existing Scenes will not be replaced. Original Scene IDs and Region IDs are retained for teleport links. If any import fails, earlier successful imports remain and can be resumed with Import missing scenes.</p>`});
      if(!confirmed)return;
      this.busy=true;this.drawDetails();
      let imported=0;let skipped=0;let journalResult={imported:0,failed:[],mapping:new Map()};
      let problem=null;
      try {
        if(this.importJournals)journalResult=await importMatchingJournals(pack,group.category);
        for(const entry of plan.scenes) {
          // Recheck immediately before import; another GM could have imported
          // this exact scene since the preflight.
          if(importedScene(entry.packId,entry.id)){skipped++;continue;}
          if(game.scenes.get(entry.id))throw Error(`Scene ID ${entry.id} became occupied while importing ${entry.name}`);
          const source=game.packs.get(entry.packId);
          if(!source)throw Error(`Source compendium ${entry.packId} disappeared`);
          const folder=await locationFolder(source,entry.catalogCategory||group.category,"Scene",entry.catalogLocation||group.base);
          const created=await game.scenes.importFromCompendium(source,entry.id,{
            folder:folder.id,flags:{[MODULE_ID]:{origin:`${entry.packId}:${entry.id}`}}
          },{keepId:true,renderSheet:false});
          if(!created)throw Error(`Import returned no document for ${entry.name}`);
          imported++;
          // A changed ID would leave any native Scene.<id>.Region.<id> links
          // pointing at the wrong place; surface the problem, never hide it.
          if(created.id!==entry.id)throw Error(`${entry.name}: Foundry changed ID ${entry.id} to ${created.id}; check teleport links`);
          await rewireJournalLinks(created,journalResult.mapping);
        }
      } catch(error) {
        problem=error;
        console.error(`${MODULE_ID}: Variant import was only partially completed`,error);
      } finally {this.busy=false;this.draw();}
      const extra=journalResult.imported?` · ${journalResult.imported} new GM Journal(s)`:"";
      if(problem){
        ui.notifications.error(`${imported} scene(s) imported before an error. Remaining scenes were not overwritten; check console and rerun Import missing.`);
        this.importStatus={key:targetKey,warnings:plan.warnings,blockers:[String(problem.message??problem)],partial:true};
        this.drawDetails();
      } else {
        ui.notifications.info(`${imported} scenes imported, ${skipped} skipped as existing${extra}${plan.warnings.length?` · ${plan.warnings.length} external link(s) to verify`:""}${journalResult.failed.length?` · ${journalResult.failed.length} Journal failure(s)`:""}.`);
        this.importStatus={key:targetKey,warnings:plan.warnings,blockers:[]};
        this.drawDetails();
      }
      return;
    }
    if(action==="journals") {
      const yes=await DialogV2.confirm({window:{title:"Import Associated Journals"},rejectClose:false,content:
        `<p>Import all Journal entries from this creator module into <strong>Journal Entries / TC Modern / ${escapeHTML(group.category)} / ${escapeHTML(packLocationName(pack))}</strong>?</p><p>Existing imports are skipped. Imported journals are GM-only by default.</p>`});
      if(!yes)return;
      this.busy=true;this.drawDetails();
      try {const j=await importMatchingJournals(pack,group.category);
        ui.notifications.info(`${j.imported} Journal entries imported, ${j.existing} already present${j.failed.length?`, ${j.failed.length} failed (see console)`:""}.`);
      }catch(error){console.error(`${MODULE_ID}: Journal import failed`,error);ui.notifications.error("Journal import failed; see console.");}
      finally{this.busy=false;this.draw();}
      return;
    }
    if(action!=="import")return;
    const existing=importedScene(scene.packId,scene.id);
    if(existing){existing.sheet?.render(true);return;}
    if(game.scenes.get(scene.id)){
      ui.notifications.error(`Cannot import ${scene.name}: its original Scene ID is already used by another world Scene. Nothing was changed.`);
      return;
    }
    const confirmed=await DialogV2.confirm({window:{title:"Import TC Modern Scene"},rejectClose:false,content:
      `<p>Import <strong>${escapeHTML(scene.name)}</strong> from <strong>${escapeHTML(scene.packLabel)}</strong> into the world Scenes directory?</p>
      <p>Destination: <strong>Scenes / TC Modern / ${escapeHTML(group.category)} / ${escapeHTML(group.base)}</strong>.</p>
      <p>${this.importJournals && associatedJournalPacks(pack).length?"Matching Journal entries from this creator module are imported into their own Journal Entries folders (only once; GM-only by default).":"Associated Journal entries will not be imported with this scene."}</p>
      <p>Walls, lights, tiles, and scene settings are copied. Keep the original TC Modern module installed so its map assets remain available.</p>`});
    if(!confirmed)return;
    this.busy=true;this.drawDetails();
    try{
      const folder=await locationFolder(pack,group.category,"Scene",group.base);
      // Import journals BEFORE the scene so its note links can be resolved.
      const journals = this.importJournals ? await importMatchingJournals(pack,group.category) :
        {imported:0,existing:0,failed:[],mapping:new Map(),total:0};
      // Do not silently remap IDs: native Teleport Token destinations may
      // reference the original Scene.<id>.Region.<id> UUID.
      if(game.scenes.get(scene.id))throw Error(`Scene ID ${scene.id} became occupied during import`);
      const created=await game.scenes.importFromCompendium(pack,scene.id,{
        folder:folder.id,flags:{[MODULE_ID]:{origin:`${scene.packId}:${scene.id}`}}
      },{keepId:true,renderSheet:false});
      if(!created)throw new Error("Import returned no Scene document");
      if(created.id!==scene.id)throw Error(`Foundry changed original Scene ID ${scene.id} to ${created.id}; check teleport links`);
      await rewireJournalLinks(created,journals.mapping);
      ui.notifications.info(`Imported ${scene.name}${journals.imported?` and ${journals.imported} Journal(s)`:""}${journals.failed.length?`; ${journals.failed.length} Journal(s) failed (see console)`:""}.`);
      created.sheet?.render(true);
    }catch(error){console.error(`${MODULE_ID}: Import failed`,error);ui.notifications.error(`Could not import ${scene.name}. Check console and module compatibility.`);}
    finally{this.busy=false;this.draw();}
  }
}

function openLibrary(){
  if(!game.user?.isGM){ui.notifications.warn("TC Modern Scene Library is available to GMs only.");return;}
  if(currentBrowser?.rendered){currentBrowser.bringToFront();return;}
  currentBrowser=new SceneLibrary();
  void currentBrowser.render(true);
}

Hooks.once("init",()=>{
  game.settings.register(MODULE_ID,AUTO_OPEN_JOURNALS,{
    name:"Auto-open TC Modern location journals",
    hint:"For GMs: when you view an imported TC Modern scene, open its matching already-imported Journal entry. Never shows a Journal to players.",
    scope:"client",config:true,restricted:true,type:Boolean,default:true
  });
  game.settings.register(MODULE_ID,AUTO_IMPORT_JOURNALS,{
    name:"Import missing location Journals when viewing scenes",
    hint:"Optional GM-only action: if a scene's matching TC Modern Journal is not in this world, import the source module's Journal entries before opening one. Off by default.",
    scope:"client",config:true,restricted:true,type:Boolean,default:false
  });
  game.settings.register(MODULE_ID,SETTINGS_BACKUP,{
    name:"Original TC Modern Compendium Folders",scope:"world",config:false,type:Object,default:{}
  });
  game.settings.register(MODULE_ID,CATALOG_OVERRIDES,{
    name:"TC Modern Reviewed Catalog Overrides",scope:"world",config:false,type:Object,default:{},
    onChange:()=>{
      if(!currentBrowser?.loaded)return;
      currentBrowser.rebuildCatalog();
      if(!currentBrowser.busy)currentBrowser.draw();
    }
  });
  game.settings.register(MODULE_ID,CATALOG_PRIOR,{
    name:"Previous TC Modern Catalog Overrides",scope:"world",config:false,type:Object,default:{}
  });
  const module=game.modules.get(MODULE_ID);
  if(module)module.api={open:openLibrary,refresh:async()=>{openLibrary();await currentBrowser?.load({refresh:true});},
    organize:()=>organizePackFolders(),restore:()=>organizePackFolders({restore:true}),
    openLocationJournal:scene=>openLocationJournal(scene??game.scenes?.viewed, {importMissing:false})};
});

function addButton(element){
  if(!game.user?.isGM)return;
  const root=element?.[0]??element?.element??element;
  if(!(root instanceof HTMLElement))return;
  const header=root.querySelector(".directory-header .header-actions, .directory-header, .header-actions");
  if(!header||header.querySelector("[data-tcmodern-browser]"))return;
  const button=document.createElement("button");
  button.type="button";
  button.dataset.tcmodernBrowser="true";
  button.className="tcmodern-open-library";
  button.title="Search TC Modern scenes and organize creator compendiums";
  button.innerHTML='<i class="fas fa-map-marked-alt"></i> TC Modern Library';
  button.addEventListener("click",openLibrary);
  header.append(button);
}
Hooks.on("renderSceneDirectory",(_app,html)=>addButton(html));
Hooks.on("renderSidebarTab",(app,html)=>{
  if((app?.tabName??app?.tab??"")==="scenes")addButton(html);
});
Hooks.on("canvasReady", canvas => {void autoOpenViewedSceneJournal(canvas);});
Hooks.once("ready",()=>{
  const node=document.getElementById("scenes")??document.querySelector('[data-tab="scenes"]');
  if(node)addButton(node);
});

// Exported for automated smoke tests. The public Foundry API remains module.api.
export {SceneLibrary, creatorPacks, scenePacks, associatedJournalPacks, packLocationName,
  importMatchingJournals, organizePackFolders, openLocationJournal, autoOpenViewedSceneJournal};
