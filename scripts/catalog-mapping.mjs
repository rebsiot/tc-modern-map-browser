/** TC Modern identity-based catalog remapping. Pure helpers (no Foundry globals).
 * Source compendium/Scene IDs are immutable keys; these labels never modify
 * the original Scene documents, UUIDs, or artwork paths.
 */
import {REVIEWED_CATALOG} from "./reviewed-catalog.mjs";

export const CATEGORY_NEEDS_REVIEW = "Needs Review";
export const CATALOG_FIELDS = Object.freeze(["category","location","variant","displayName","floor"]);
export const REVIEWED_MAPPING_COUNT = Object.keys(REVIEWED_CATALOG).length;
const LIMIT_BYTES = 5 * 1024 * 1024;
const SRC_KEY = "Source Key [KEEP]";
const SRC_PACK = "Source Compendium ID [KEEP]";
const SRC_SCENE = "Source Scene ID [KEEP]";
const CSV_FIELDS = Object.freeze({
  category:"Category [EDIT]",
  location:"Location [EDIT]",
  variant:"Variant Pack [EDIT]",
  displayName:"Scene Display Name [EDIT]",
  floor:"Floor [EDIT]"
});

const plainObject = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
export const sourceKey = scene => `${scene.packId}:${scene.id}`;
export function normalizeCatalogRecord(record, sourceName="", sourceLocation="") {
  const raw=plainObject(record);
  const category=String(raw.category ?? "").trim() || CATEGORY_NEEDS_REVIEW;
  return {
    category,
    location:String(raw.location ?? "").trim() || String(sourceLocation || sourceName).trim(),
    variant:String(raw.variant ?? "").trim() || "Standard",
    displayName:String(raw.displayName ?? "").trim() || String(sourceName).trim(),
    floor:String(raw.floor ?? "").trim()
  };
}
export function effectiveCatalogRecord(key, {overrides={},sourceName="",sourceLocation=""}={}) {
  const source=REVIEWED_CATALOG[key];
  const override=plainObject(overrides)[key];
  if(!source && !override)return null;
  return normalizeCatalogRecord({...plainObject(source),...plainObject(override)},sourceName,sourceLocation);
}
export function applyCatalogMapping(entries, overrides={}) {
  return entries.map(scene=>{
    const key=sourceKey(scene);
    const override=plainObject(overrides)[key];
    const source=REVIEWED_CATALOG[key];
    if(!override && !source)return {...scene,catalogMatched:false};
    const record=effectiveCatalogRecord(key,{overrides,sourceName:scene.name,sourceLocation:scene.locationLabel});
    return {...scene,catalogMatched:true,catalogCategory:record.category,
      catalogLocation:record.location,catalogVariant:record.variant,
      catalogDisplayName:record.displayName,catalogFloor:record.floor,
      catalogStatus:override?"World mapping":source?.status ?? "Reviewed catalog"};
  });
}

/** Validate a GM-created category used both as a display label and as the
 * name of the folder for any FUTURE imports. No Foundry documents are edited.
 */
export function validateCategoryName(category) {
  const raw=String(category??"");
  if(/[\u0000-\u001F]/.test(raw))throw Error("Category contains unsupported control characters");
  const name=raw.trim().replace(/\s+/g," ");
  if(!name)throw Error("Choose a category name");
  if(name.length>80 || /[<>:\"/\\|?*\u0000-\u001F]/.test(name))
    throw Error("Category must be 1-80 characters without path separators or reserved filename characters");
  return name;
}

/** One-click, location-wide category change for all source Scenes that make up
 * a single library entry. This only returns a world-setting update plan; it
 * does not create/move/rename any world Scenes, Journals, folders or Regions.
 *
 * A group must come from the CURRENT indexed location list so that moving a
 * multi-floor/variant location never leaves a conflicting subset behind.
 */
export function planLocationCategoryChange(group, category, currentOverrides={}) {
  if(!group?.key || !group?.packId || !Array.isArray(group.scenes) || !group.scenes.length)
    throw Error("Choose a location before changing its category");
  const target=validateCategoryName(category);
  const previous={...plainObject(currentOverrides)};
  const next={...previous};
  const changes=[];
  const seen=new Set();
  for(const scene of group.scenes) {
    if(!scene.id || scene.packId!==group.packId)
      throw Error("Location contains an invalid source Scene identity");
    const key=sourceKey(scene);
    if(seen.has(key))throw Error(`Duplicate Scene identity in location: ${key}`);
    seen.add(key);
    const before=effectiveCatalogRecord(key,{overrides:previous,
      sourceName:scene.name,sourceLocation:scene.locationLabel}) ||
      normalizeCatalogRecord({category:group.category,location:group.base,
        variant:scene.variant,displayName:scene.name,floor:scene.catalogFloor},
        scene.name,group.base);
    const after={...before,category:target};
    const baseline=effectiveCatalogRecord(key,{sourceName:scene.name,
      sourceLocation:scene.locationLabel});
    // Returning to a bundled category removes the world override instead of
    // accumulating redundant copies of the original catalog.
    if(baseline && compareMapped(after,baseline))delete next[key];
    else next[key]=after;
    if(before.category!==target)changes.push({key,before,after});
  }
  return {groupKey:group.key,location:group.base,category:target,
    scenes:group.scenes.length,changes,previous,next};
}

/** Parse Excel-compatible CSV, including BOM, double-quoted commas and CRLFs. */
export function parseCatalogCsv(text) {
  if(typeof text!=="string" || !text.trim())throw Error("Empty catalog CSV");
  if(text.length>LIMIT_BYTES)throw Error("Catalog CSV exceeds 5 MB limit");
  const input=text.replace(/^\uFEFF/,"");
  const records=[];
  let row=[],field="",inside=false;
  for(let i=0;i<input.length;i++){
    const c=input[i];
    if(c==='"'){
      if(inside && input[i+1]==='"'){field+='"';i++;}
      else if(!inside && field==="")inside=true;
      else if(inside)inside=false;
      else throw Error(`Unexpected quote near character ${i}`);
    }else if(c==="," && !inside){row.push(field);field="";}
    else if((c==="\n" || c==="\r") && !inside){
      row.push(field);field="";
      if(row.some(v=>v!==""))records.push(row);
      row=[];
      if(c==="\r" && input[i+1]==="\n")i++;
    }else field+=c;
  }
  if(inside)throw Error("Unclosed quoted CSV cell");
  row.push(field);
  if(row.some(v=>v!==""))records.push(row);
  if(records.length<2)throw Error("Catalog CSV has no data rows");
  const headers=records.shift().map(v=>v.trim());
  if(new Set(headers).size!==headers.length)throw Error("Catalog CSV contains duplicate column headers");
  const needed=[SRC_KEY,SRC_PACK,SRC_SCENE,...Object.values(CSV_FIELDS)];
  const missing=needed.filter(header=>!headers.includes(header));
  if(missing.length)throw Error(`Catalog CSV missing columns: ${missing.join(", ")}`);
  return records.map((values,i)=>{
    if(values.length!==headers.length)throw Error(`CSV row ${i+2} contains ${values.length} fields; expected ${headers.length}`);
    return Object.fromEntries(headers.map((k,n)=>[k,values[n]]));
  });
}

const compareMapped=(a,b)=>CATALOG_FIELDS.every(field=>a[field]===b[field]);
const catalogGroupKey=(packId,location)=>`${packId}\u0000${location.toLowerCase().replace(/\s+/g," ").trim()}`;

/** Preflight rows against ORIGINAL live source identifiers. No persistence. */
export function planCatalogImport(csvText, entries, currentOverrides={}) {
  const rows=parseCatalogCsv(csvText);
  const indexed=new Map(entries.map(e=>[sourceKey(e),e]));
  const previous={...plainObject(currentOverrides)};
  const next={...previous};
  const seen=new Set(), errors=[], unknown=[], changes=[], warnings=[];
  let matched=0;
  rows.forEach((row,n)=>{
    const line=n+2;
    const key=String(row[SRC_KEY]??"").trim();
    const compendium=String(row[SRC_PACK]??"").trim();
    const id=String(row[SRC_SCENE]??"").trim();
    if(!key || !compendium || !id || key!==`${compendium}:${id}`){
      errors.push(`Row ${line}: source key does not match [KEEP] compendium and Scene IDs`);return;
    }
    if(seen.has(key)){errors.push(`Row ${line}: duplicate source key ${key}`);return;}
    seen.add(key);
    const scene=indexed.get(key);
    if(!scene){unknown.push(`${key} (CSV row ${line})`);return;}
    matched++;
    const proposed=Object.fromEntries(Object.entries(CSV_FIELDS).map(([field,column])=>[field,String(row[column]??"").trim()]));
    if(!proposed.location){errors.push(`Row ${line}: location cannot be blank (${key})`);return;}
    for(const [field,value] of Object.entries(proposed)) {
      if(value.length>200 || /[\r\n\u0000-\u001F]/.test(value))errors.push(`Row ${line}: invalid ${field} value (${key})`);
    }
    const originalName=String(row["Original Scene Name"] ?? row["Original Scene Title"] ?? "").trim();
    if(originalName && originalName!==scene.name)warnings.push(`Row ${line}: source name differs from indexed Scene: ${key}`);
    const before=effectiveCatalogRecord(key,{overrides:previous,sourceName:scene.name,sourceLocation:scene.locationLabel}) ||
      normalizeCatalogRecord({},scene.name,scene.locationLabel);
    const candidate=normalizeCatalogRecord(proposed,scene.name,scene.locationLabel);
    const baseline=effectiveCatalogRecord(key,{sourceName:scene.name,sourceLocation:scene.locationLabel});
    if(baseline && compareMapped(candidate,baseline))delete next[key];
    else next[key]=candidate;
    if(!compareMapped(before,candidate))changes.push({key,before,after:candidate});
  });
  if(!matched)errors.push("No CSV source keys match installed TC Modern compendium Scenes");
  if(!errors.length){
    // Every Scene in one location must use one category to make folder
    // placement predictable. Unmatched rows retain current mapping.
    const locations=new Map();
    for(const scene of entries){
      const key=sourceKey(scene);
      const record=effectiveCatalogRecord(key,{overrides:next,sourceName:scene.name,sourceLocation:scene.locationLabel});
      const location=record?.location || scene.locationLabel || scene.packLabel || scene.packId;
      const category=record?.category || CATEGORY_NEEDS_REVIEW;
      const id=catalogGroupKey(scene.packId,location);
      const first=locations.get(id);
      if(first && first.category!==category){
        errors.push(`Category conflict for ${location} (${scene.packId}): ${first.category} vs ${category}`);
        if(errors.length>20)break;
      }else if(!first)locations.set(id,{category});
    }
  }
  if(unknown.length)warnings.unshift(`${unknown.length} CSV source keys are not indexed in this world and will be skipped`);
  return {rows:rows.length,matched,unknown,warnings,errors,changes,
    next,previous,unchanged:matched-changes.length};
}

export {REVIEWED_CATALOG};
