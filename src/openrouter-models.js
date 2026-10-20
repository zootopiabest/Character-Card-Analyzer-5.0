export const OPENROUTER_MODELS = [
  { id: "~google/gemini-flash-latest", label: "Gemini Flash — Latest" },
  { id: "~google/gemini-pro-latest", label: "Gemini Pro — Latest" },
  { id: "~deepseek/deepseek-v4-flash-latest", label: "DeepSeek Flash — Latest" },
  { id: "latest:deepseek-pro", label: "DeepSeek Pro — Latest" },
  { id: "~anthropic/claude-opus-latest", label: "Claude Opus — Latest" },
  { id: "~anthropic/claude-sonnet-latest", label: "Claude Sonnet — Latest" },
  { id: "anthropic/claude-opus-4.6", label: "Claude Opus 4.6" },
  { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
];

export const CACHE_KEY = "card-analyzer-5-openrouter-catalog";
export const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const isListedModel = id => typeof id === "string" && id.includes("/") && !id.endsWith(":batch");
const perMillion = raw => {
  if (!["string","number"].includes(typeof raw) || raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value * 1_000_000 : null;
};
export function toBrowserModels(data) {
  if (!Array.isArray(data)) return [];
  return data.filter(m => isListedModel(m?.id)).map(m => ({
    id:m.id, name:typeof m.name === "string" && m.name ? m.name : m.id,
    author:m.id.replace(/^~/,"").split("/")[0],
    created:Number.isFinite(m.created) ? m.created : 0,
    contextLength:Number.isFinite(m.context_length) ? m.context_length : 0,
    inputPrice:perMillion(m.pricing?.prompt), outputPrice:perMillion(m.pricing?.completion),
    description:typeof m.description === "string" ? m.description.slice(0,1200) : "",
    vision:Array.isArray(m.architecture?.input_modalities) && m.architecture.input_modalities.includes("image")
  }));
}
export function catalogAuthors(models) {
  const latest=new Map();
  for(const m of models) latest.set(m.author,Math.max(latest.get(m.author)||0,m.created));
  return [...latest].sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0])).map(([author])=>author);
}
export function filterAndSortModels(models,{query="",author=null,sort="newest",descending=true}={}) {
  const terms=query.toLowerCase().split(/\s+/).filter(Boolean);
  const sign=(sort==="name" ? !descending : descending) ? -1 : 1;
  return models.filter(m=>(!author || m.author===author) &&
    terms.every(t=>(m.name+" "+m.id).toLowerCase().includes(t)))
    .sort((a,b)=>sign*(sort==="name" ? a.name.localeCompare(b.name)
      : sort==="context" ? a.contextLength-b.contextLength : a.created-b.created) || a.id.localeCompare(b.id));
}
export function formatPrice(price) {
  if(price===null) return "—";
  if(price===0) return "Free";
  return "$"+(price<0.01 ? price.toPrecision(2) : price.toFixed(2));
}
export async function fetchOpenRouterCatalog({signal}={}) {
  let response;
  try { response=await fetch("https://openrouter.ai/api/v1/models",{signal:signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)}); }
  catch { signal?.throwIfAborted(); throw new Error("Could not reach OpenRouter. Check your connection and retry."); }
  if(!response.ok) throw new Error("OpenRouter error "+response.status+". Try again in a moment.");
  const json=await response.json().catch(()=>null);
  if(!Array.isArray(json?.data) || !toBrowserModels(json.data).length)
    throw new Error("OpenRouter returned no models. Enter a model ID manually or retry.");
  return json.data;
}
export function selectLatestDeepSeekPro(catalog) {
  const matches=catalog.flatMap(model=>{
    const match=typeof model?.id==="string" && model.id.match(/^deepseek\/deepseek-v(\d+(?:\.\d+)*)-pro(?:-\d{4,8})?$/);
    return match ? [{model,version:match[1].split(".").map(Number)}] : [];
  });
  matches.sort((a,b)=>{
    for(let i=0;i<Math.max(a.version.length,b.version.length);i++) {
      const difference=(b.version[i]||0)-(a.version[i]||0);
      if(difference) return difference;
    }
    return (b.model.created||0)-(a.model.created||0) || a.model.id.localeCompare(b.model.id);
  });
  if(!matches.length) throw new Error("OpenRouter has no matching DeepSeek Pro release. Choose a pinned model or enter an exact ID.");
  return matches[0].model;
}

