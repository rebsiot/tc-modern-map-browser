/**
 * TC Modern Scene Library — read-only, identity-preserving catalog review export.
 * Pure functions: no Foundry runtime, world mutations, or source-pack writes.
 *
 * One row per SOURCE Scene (not per creator pack or assumed location). The
 * editable columns are proposals ONLY. Nothing here changes any Scene.
 */
import {sceneFloorLabel} from "./catalog.mjs";

export const REVIEW_CSV_HEADERS = Object.freeze([
  "Category [EDIT]",
  "Location [EDIT]",
  "Variant Pack [EDIT]",
  "Scene Display Name [EDIT]",
  "Floor [EDIT]",
  "Review Notes [EDIT]",
  "Original Source Pack",
  "Original Scene Name",
  "Original Image Path",
  "Source Compendium ID [KEEP]",
  "Source Scene ID [KEEP]",
  "Source Key [KEEP]",
  "Imported In World"
]);

const sceneKey = scene => `${scene.packId}:${scene.id}`;
const compare=(a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true,sensitivity:"base"});

/** Build a stable, complete, easy-to-edit set of source Scene rows. */
export function createSceneCatalogReviewRows(entries, groups, importedKeys=new Set()) {
  if(!Array.isArray(entries) || !Array.isArray(groups))throw Error("Catalog export needs indexed scenes and location groups.");
  const byKey=new Map();
  for(const group of groups) for(const scene of group.scenes??[]) {
    const key=sceneKey(scene);
    if(byKey.has(key))throw Error(`Duplicate indexed scene key: ${key}`);
    byKey.set(key,{group,scene});
  }
  const seen=new Set();
  const rows=entries.map(entry=>{
    const key=sceneKey(entry);
    if(!entry.packId || !entry.id)throw Error("Catalog entry lacks source compendium or Scene ID.");
    if(seen.has(key))throw Error(`Source Scene occurs twice in index: ${key}`);
    seen.add(key);
    const matched=byKey.get(key);
    if(!matched)throw Error(`Scene not mapped by current catalog: ${key}`);
    const {group,scene}=matched;
    return {
      category:group.category??"Other Locations",
      location:group.base??"",
      variant:scene.variant??"Standard",
      displayName:scene.catalogDisplayName??entry.catalogDisplayName??entry.name??"",
      floor:sceneFloorLabel(scene),
      notes:scene.catalogCategory==="Needs Review"?"Category needs review":"",
      packLabel:entry.packLabel??"",
      originalName:entry.name??"",
      imagePath:entry.background??entry.thumb??"",
      packId:entry.packId,
      sceneId:entry.id,
      sourceKey:key,
      imported:importedKeys.has(key)?"Yes":"No"
    };
  });
  if(byKey.size!==seen.size)throw Error("Catalog groups contain scenes absent from indexed source Scenes.");
  return rows.sort((a,b)=>compare(a.packLabel,b.packLabel) || compare(a.originalName,b.originalName) || compare(a.sourceKey,b.sourceKey));
}

const csvCell = value => {
  let content=String(value??"").replace(/\u0000/g,"");
  // Prevent spreadsheet CSV formula execution from any external creator title,
  // pack label or user-supplied field. Prefix formula-like input with a literal
  // apostrophe before quoting; source identity fields remain unchanged.
  if(/^[\s\uFEFF]*[=+@-]/.test(content) || /^[\t\r]/.test(content))content=`'${content}`;
  return `"${content.replace(/"/g,'""')}"`;
};

/** Excel-friendly UTF-8 BOM + quoted CRLF CSV, with no formulas. */
export function encodeSceneCatalogReviewCsv(rows) {
  if(!Array.isArray(rows))throw Error("Export rows must be an array.");
  const values=rows.map(row=>[
    row.category,row.location,row.variant,row.displayName,row.floor,row.notes,
    row.packLabel,row.originalName,row.imagePath,row.packId,row.sceneId,row.sourceKey,row.imported
  ]);
  return "\uFEFF"+[REVIEW_CSV_HEADERS,...values].map(fields=>fields.map(csvCell).join(",")).join("\r\n")+"\r\n";
}
