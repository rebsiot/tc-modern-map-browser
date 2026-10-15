/** TC Modern Scene Library: pure catalog helpers (no Foundry runtime dependencies). */
export const MODULE_ID = "tc-modern-map-browser";

export function isTCModern(value) {
  const text = String(value ?? "").toLowerCase();
  return /tom[ _.-]?cartos|tc[ _.-]?modern/.test(text);
}

// GM-specified creator-location names. Phrase matches take
// precedence over broad keyword categories (e.g. "bar" = Entertainment or
// "rooftop" = Streets & Urban). Match complete word sequences to tolerate
// title prefixes, separators, floor labels and variant suffixes while avoiding
// substring collisions. This only affects catalog labels/new import folders;
// existing world Scenes and folders are never migrated automatically.
const COMMERCIAL_LOCATION_NAMES = [
  "retro diner", "dive bar", "office block", "fast food", "cafe", "bodega",
  "local pub", "leisure center", "leisure centre", "boxing gym",
  "local gamestore", "local game store", "noodle bar", "sports bar",
  "luxury rooftop bar", "winery", "nakatomi tower", "dusky skull cantina",
  "jewellry boutique", "jewellery boutique", "jewelry boutique", "tailor"
];

const normalizedWords = value => String(value ?? "")
  .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const commercialPhrases = COMMERCIAL_LOCATION_NAMES.map(normalizedWords);
export function isCommercialLocation(value) {
  const words = ` ${normalizedWords(value)} `;
  return commercialPhrases.some(phrase => words.includes(` ${phrase} `));
}

export function categorize(value) {
  if (isCommercialLocation(value)) return "Commercial";
  const s = String(value ?? "").toLowerCase();
  const rules = [
    ["Entertainment", /club|bar\b|pub\b|lounge|casino|ballroom|banquet|reception hall|event venue|theat(?:re|er)|cinema|arcade|restaurant|diner|cafe|nightlife|dance floor|strip|hotel bar/],
    ["Hotels & Lodging", /motel|hotel|inn\b|hostel|resort|campground|lodging/],
    ["Industrial", /warehouse|factory|plant\b|refinery|works\b|shipyard|construction|workshop|power station|industrial|garage/],
    ["Military & Security", /guard post|bunker|base\b|fort\b|checkpoint|coastguard|police|prison|cellblock|military|armory|barracks/],
    ["Medical & Science", /hospital|clinic|laboratory|lab\b|research center|medical|pharmacy|university|school/],
    ["Transport", /airport|airfield|plane|station|train|subway|metro|truck stop|ferry|ship\b|vessel|boat|cargo|port\b|dock|bus\b|parking|highway/],
    ["Residential", /house\b|apartment|condo|mansion|townhouse|residence|suburb|home\b|villa/],
    ["Retail & Offices", /office|store|shop|market|mall\b|bank|corporat|business|supermarket|retail|shopfront/],
    ["Streets & Urban", /street|alley|road|intersection|rooftop|city|urban|downtown|block\b|ruins/],
    ["Wilderness & Other", /island|woodland|forest|cave|lair|desert|swamp|mountain|park\b|beach|coast|outdoor|wasteland/]
  ];
  return rules.find(([,pattern]) => pattern.test(s))?.[0] ?? "Other Locations";
}

const VARIANT_PART = /^(clean|no\s+cars|no\s+vehicles|no\s+grid|gridless|with\s+grid|day|night|dusk|dawn|snow|rain|fog|abandoned|destroyed|ruined|wrecked|lights\s+on|lights\s+off|furnished|unfurnished|empty|occupied|dark|lit|battle|no\s+people|bloodied|foggy|alternate|variant\s+\d+)(?:\s*\d+)?$/i;

export function parseSceneName(name) {
  const original = String(name ?? "").trim();
  let base = original;
  const endings = [];
  // Only remove recognized descriptive suffixes; names like "Post-Apocalyptic"
  // and "Level -1" must remain distinct locations.
  for (let i = 0; i < 4; i++) {
    const match = base.match(/^(.*)\s+[-–—]\s+([^-–—]+)$/);
    if (!match || !VARIANT_PART.test(match[2].trim())) break;
    endings.unshift(match[2].trim());
    base = match[1].trim();
  }
  return {base: base || original, variant: endings.join(" · ") || "Standard"};
}

export function packageCategories(entries) {
  // Classify an entire creator map pack, not each individual floor. Otherwise
  // Roof may be tagged Urban and Upper Floor may fall into Other Locations,
  // despite all belonging to one Grand Ballroom or hotel release.
  const packs = new Map();
  for (const e of entries) {
    const row=packs.get(e.packId) ?? {label:e.locationLabel ?? e.packLabel ?? "", names:[]};
    row.names.push(e.name ?? "");
    packs.set(e.packId,row);
  }
  const categories=new Map();
  for (const [packId,row] of packs) {
    const byPack=categorize(row.label);
    if(byPack !== "Other Locations") {categories.set(packId,byPack);continue;}
    const scores=new Map();
    for (const name of row.names) {
      const category=categorize(name);
      if (category !== "Other Locations") scores.set(category,(scores.get(category)??0)+1);
    }
    const winner=[...scores].sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0]))[0];
    categories.set(packId,winner?.[0]??"Other Locations");
  }
  return categories;
}

const collectionItems=value=>{
  if(!value)return [];
  if(Array.isArray(value))return value;
  if(Array.isArray(value.contents))return value.contents;
  if(typeof value.values==="function")return [...value.values()];
  if(typeof value[Symbol.iterator]==="function")return [...value];
  return typeof value==="object" ? Object.values(value) : [];
};

export function countTeleporters(scene) {
  // Inspect real native Region Behaviors; never infer teleporters from stairs
  // or a floor name. Supports both document collections and serialized data.
  const regions=collectionItems(scene?.regions ?? scene?._source?.regions ?? scene?.toObject?.()?.regions);
  let count=0;
  for(const region of regions) {
    for(const behavior of collectionItems(region?.behaviors)) {
      if(/^teleport[\s_-]*token$/i.test(String(behavior?.type??""))) count++;
    }
  }
  return count;
}

const FLOOR_NAMES = [
  [/\bdance\s+floor\b/i,"Dance Floor"],
  [/\broof(?:top)?\b/i,"Roof"],
  [/\b(?:second|2nd|02|floor\s*2|level\s*2|upper)\s*(?:floor|level)?\b/i,"Floor 2"],
  [/\b(?:third|3rd|03|floor\s*3|level\s*3)\s*(?:floor|level)?\b/i,"Floor 3"],
  [/\b(?:first|1st|01|ground|floor\s*1|level\s*1)\s*(?:floor|level)?\b/i,"Ground Floor"],
  [/\bbasement|lower\s+(?:floor|level)|level\s*-1\b/i,"Basement"],
  [/\bbalcony|mezzanine\b/i,"Balcony"]
];

export function sceneFloorLabel(scene) {
  // A reviewed value is authoritative, including an intentionally blank floor.
  if(scene && Object.hasOwn(scene,"catalogFloor"))return String(scene.catalogFloor??"");
  const name=String(scene?.name??"");
  // Source scene name is authoritative. Only inspect asset filenames if the
  // same name doesn't identify a floor, which can occur in legacy compendiums.
  const sources=[name,String(scene?.background??""),String(scene?.thumb??"")];
  for (const source of sources) {
    for (const [pattern,label] of FLOOR_NAMES) if (pattern.test(source)) return label;
  }
  return "";
}

export function sceneVariantLabel(scene,group) {
  const floor=sceneFloorLabel(scene);
  const variant=scene.variant??parseSceneName(scene.name).variant;
  if (floor) return `${floor} — ${variant}`;
  const duplicated=group?.scenes?.filter(s=>(s.variant??"Standard")===variant).length > 1;
  if (!duplicated) return variant;
  const name=String(scene.name??"").trim();
  if(name && name.toLowerCase()!==String(group?.base??"").toLowerCase()) return `${name} — ${variant}`;
  // Identically named source Scenes must still have distinguishable buttons.
  return `${variant} · ${String(scene.id??"").slice(0,8)}`;
}

export function groupScenes(entries) {
  const groups = new Map();
  const categories=packageCategories(entries);
  for (const entry of entries) {
    const {base, variant} = parseSceneName(entry.name);
    // Group variants within the SAME source pack only; never merge unrelated
    // creator modules with similar location names.
    const key = `${entry.packId}::${base.toLowerCase()}`;
    if (!groups.has(key)) groups.set(key, {key, base, packId:entry.packId, packLabel:entry.packLabel,
      category:categories.get(entry.packId) ?? "Other Locations", scenes:[]});
    groups.get(key).scenes.push({...entry, variant});
  }
  for (const group of groups.values()) group.scenes.sort((a,b)=>{
    if (a.variant === "Standard") return -1;
    if (b.variant === "Standard") return 1;
    return a.variant.localeCompare(b.variant) || a.name.localeCompare(b.name);
  });
  return [...groups.values()].sort((a,b)=>a.packLabel.localeCompare(b.packLabel) || a.base.localeCompare(b.base));
}

export function filterGroups(groups, {query="", category="All", unimported=false, imported=new Set()}={}) {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return groups.filter(group => {
    if (category !== "All" && group.category !== category) return false;
    if (unimported && group.scenes.every(s => imported.has(`${s.packId}:${s.id}`))) return false;
    const haystack = `${group.base} ${group.packLabel} ${group.category} ${group.scenes.map(s=>`${s.name} ${s.catalogDisplayName??""} ${s.variant??""}`).join(" ")}`.toLowerCase();
    return words.every(w => haystack.includes(w));
  });
}

export function safeAssetPath(path) {
  const p = String(path ?? "").trim();
  // Display only Foundry-hosted static assets, not arbitrary remote URLs.
  if (!/^(modules|systems|worlds)\/[\w%/.+()' -]+$/i.test(p) || p.includes("..")) return "";
  return p;
}

// Pack-first browser (v0.2.4): one row per creator Scene compendium, with
// complete variant sets beneath it. Entries stay tied to their original pack
// and Scene IDs; no Scene is reclassified or rewritten in the compendium.
const normalizeWords = value => String(value ?? "")
  .toLowerCase().replace(/[\u2013\u2014_-]/g, " ").replace(/[^a-z0-9]+/g, " ").trim();

const VARIANT_MARKERS = [
  ["no-cars", "No Cars", /\b(?:no cars?|no vehicles?|without cars?)\b/i],
  ["gridless", "Gridless", /\b(?:no grid|gridless)\b/i],
  ["lights-off", "Lights Off", /\b(?:lights? off|unlit|blackout|power off)\b/i],
  ["lights-on", "Lights On", /\b(?:lights? on|illuminated)\b/i],
  ["snowstorm", "Snowstorm", /\b(?:snow\s*storm|blizzard)\b/i],
  ["day", "Day", /\b(?:daytime|daylight|day)\b/i],
  ["night", "Night", /\b(?:nighttime|night)\b/i],
  ["dusk", "Dusk", /\b(?:dusk|twilight|sunset)\b/i],
  ["dawn", "Dawn", /\b(?:dawn|sunrise)\b/i],
  ["snow", "Snow", /\b(?:snowy|snow|winter)\b/i],
  ["rain", "Rain", /\b(?:rainy|rain|stormy|thunderstorm)\b/i],
  ["fog", "Fog", /\b(?:foggy|fog|misty|mist)\b/i],
  ["abandoned", "Abandoned", /\b(?:abandoned|derelict)\b/i],
  ["destroyed", "Destroyed", /\b(?:destroyed|ruined|ruins|wrecked)\b/i],
  ["furnished", "Furnished", /\b(?:furnished)\b/i],
  ["unfurnished", "Unfurnished", /\b(?:unfurnished|empty)\b/i],
  ["occupied", "Occupied", /\b(?:occupied)\b/i],
  ["clean", "Clean", /\b(?:clean)\b/i],
  ["bloody", "Bloodied", /\b(?:bloodied|bloody)\b/i],
  ["battle", "Battle", /\b(?:battle|combat)\b/i],
  ["alternate", "Alternate", /\b(?:alternate|alternative|alt\.?|variant\s*\d+)\b/i]
];

export function variantForScene(scene, locationName="") {
  // When the creator location itself includes a descriptive word (e.g. Night
  // Market), it is not a variant. Remove the location title only when it is
  // actually present as a complete word sequence in the indexed Scene name.
  let name=normalizeWords(scene?.name);
  const location=normalizeWords(locationName);
  if(location) {
    const at=name.indexOf(location);
    if(at>=0 && (at===0 || name[at-1]===" ") &&
       (at+location.length===name.length || name[at+location.length]===" ")) {
      name=(name.slice(0,at)+" "+name.slice(at+location.length)).trim();
    }
  }
  const found=[];
  for(const [key,label,matcher] of VARIANT_MARKERS) {
    if(matcher.test(name)) found.push({key,label});
  }
  // Longer phrases replace shorter markers, avoiding "Snowstorm + Snow" etc.
  const ids=new Set(found.map(f=>f.key));
  if(ids.has("snowstorm"))ids.delete("snow");
  if(ids.has("unfurnished"))ids.delete("furnished");
  if(ids.has("lights-off"))ids.delete("lights-on");
  const keep=found.filter(f=>ids.has(f.key));
  if(!keep.length)return {key:"standard",label:"Standard"};
  return {key:keep.map(f=>f.key).join("+"),label:keep.map(f=>f.label).join(" · ")};
}

export function groupScenePacks(entries) {
  const categories=packageCategories(entries);
  const locations=new Map();
  for(const entry of entries) {
    const packId=entry.packId;
    // An explicit reviewed location can be ONE OF MANY within a Scene pack.
    // Keep different source compendiums independent, even if names match.
    const label=String(entry.catalogLocation || entry.locationLabel || entry.packLabel || packId).trim();
    const key=`${packId}::${label.toLowerCase().replace(/\s+/g," ").trim()}`;
    if(!locations.has(key)) {
      locations.set(key,{key,base:label,packId,packLabel:entry.packLabel,
        category:entry.catalogCategory || categories.get(packId) || "Other Locations",scenes:[],variants:[]});
    }
    const location=locations.get(key);
    // Mapping is validated prior to saving; do not silently reclassify a
    // creator location because one floor happens to contain "Roof" or "Bar".
    if(entry.catalogCategory && location.category!==entry.catalogCategory)
      console.warn(`TC Modern catalog category mismatch for ${label} (${packId})`);
    const variant=entry.catalogVariant
      ? {key:String(entry.catalogVariant).trim().toLocaleLowerCase(),label:String(entry.catalogVariant).trim()}
      : variantForScene(entry,location.base);
    const scene={...entry,variant:variant.label,variantKey:variant.key};
    location.scenes.push(scene);
  }
  for(const location of locations.values()) {
    const variantMap=new Map();
    for(const scene of location.scenes) {
      if(!variantMap.has(scene.variantKey))variantMap.set(scene.variantKey,{
        key:scene.variantKey,label:scene.variant,scenes:[]});
      variantMap.get(scene.variantKey).scenes.push(scene);
    }
    location.variants=[...variantMap.values()].sort((a,b)=>
      (a.key==="standard"?-1:b.key==="standard"?1:a.label.localeCompare(b.label)));
    for(const variant of location.variants) variant.scenes.sort((a,b)=>{
      const order={"Basement":0,"Ground Floor":1,"Dance Floor":2,"Floor 2":3,"Floor 3":4,"Balcony":5,"Roof":6};
      const aOrder=order[sceneFloorLabel(a)]??50;
      const bOrder=order[sceneFloorLabel(b)]??50;
      return aOrder-bOrder || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
    });
  }
  return [...locations.values()].sort((a,b)=>a.category.localeCompare(b.category)||
    a.base.localeCompare(b.base)||a.packId.localeCompare(b.packId));
}

export function teleportDestinations(scene) {
  // V14 stores a Set of destination Region UUIDs under system.destinations.
  // V13 also used a single system.destination. Do not guess destinations from
  // filenames or from the number of teleport behaviors.
  const result=new Set();
  const regions=collectionItems(scene?.regions??scene?._source?.regions??scene?.toObject?.()?.regions);
  for(const region of regions) for(const behavior of collectionItems(region?.behaviors)) {
    if(!/^teleport[\s_-]*token$/i.test(String(behavior?.type??"")))continue;
    const system=behavior.system??behavior._source?.system??{};
    const destinations=[...collectionItems(system.destinations),system.destination];
    for(const target of destinations) {
      const uuid=typeof target==="string"?target:target?.uuid??target?.id;
      if(typeof uuid==="string" && uuid.trim())result.add(uuid.trim());
    }
  }
  return [...result];
}

export function sceneIdFromRegionUUID(uuid) {
  const text=String(uuid??"");
  const world=text.match(/^Scene\.([\w-]+)\.Region\.[\w-]+(?:\.|$)/);
  if(world)return {sceneId:world[1],packId:null};
  const source=text.match(/^Compendium\.(.+?)\.Scene\.([\w-]+)\.Region\.[\w-]+(?:\.|$)/);
  if(source)return {sceneId:source[2],packId:source[1]};
  return null;
}
