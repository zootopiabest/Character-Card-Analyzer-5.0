import { PROVIDERS, DEFAULT_MODEL } from "./providers.js";
import { SPECIALISTS, SPECIALIST_KEYS } from "./rubrics/specialists.js";
import { extractCardText, importCardFile, importPortrait } from "./importer.js";
import { classifyCard, runSingle, runComparison } from "./evaluator.js";
import { renderAudit, renderComparison, reportToMarkdown, downloadText } from "./report.js";

const $ = (id) => document.getElementById(id);
let mode = "single", result = null, resultMode = "single", cardImage = null, busy = false;
const storeKey = "card-analyzer-5-settings";
let settings = {};
try { settings = JSON.parse(localStorage.getItem(storeKey)||"{}") || {}; } catch {}
const keys = (()=>{try{return JSON.parse(localStorage.getItem(storeKey+"-keys")||"{}")||{}}catch{return {}}})();

function status(message, error = false) {
  const el=$("status");el.hidden=!message;el.textContent=message;el.classList.toggle("error",error);
}
function setBusy(v) {
  busy=v;$("analyzeButton").disabled=v;
  $("analyzeButton").textContent=v ? "Analyzing…" : mode==="compare" ? "Compare cards ↗" : "Run audit ↗";
}
function populateSelector(id, primary) {
  const el=$(id);
  el.innerHTML = primary
    ? '<option value="auto">Auto-detect from card</option>'
    : '<option value="auto">Auto-select if useful</option><option value="none">No secondary rubric</option>';
  for(const key of SPECIALIST_KEYS) {
    const opt=document.createElement("option");opt.value=key;opt.textContent=SPECIALISTS[key].label;el.appendChild(opt);
  }
  if(!primary) el.value="auto";
}
function readConfig() {
  return {
    provider:$("provider").value, model:$("model").value.trim(), key:$("apiKey").value.trim(),
    baseUrl:$("apiBase").value.trim(), maxTokens:Number($("maxTokens").value)||16384
  };
}
function persistSettings() {
  try {
    const cfg=readConfig();
    settings.providers=settings.providers||{};
    settings.providers[cfg.provider]={model:cfg.model,baseUrl:cfg.baseUrl,maxTokens:cfg.maxTokens};
    settings.provider=cfg.provider;settings.rememberKey=$("rememberKey").checked;
    localStorage.setItem(storeKey,JSON.stringify(settings));
    if(settings.rememberKey) {keys[cfg.provider]=cfg.key;localStorage.setItem(storeKey+"-keys",JSON.stringify(keys));}
    else { localStorage.removeItem(storeKey+"-keys"); for(const p of Object.keys(keys)) delete keys[p]; }
  } catch(e) {status("Browser storage unavailable: "+e.message,true);}
}
function loadProvider(provider) {
  const saved=settings.providers?.[provider]||{};
  $("model").value=saved.model ?? DEFAULT_MODEL(provider);
  $("apiBase").value=saved.baseUrl || "";
  $("maxTokens").value=saved.maxTokens || 16384;
  $("apiKey").value=$("rememberKey").checked ? (keys[provider]||"") : "";
  $("customBaseWrap").hidden=provider!=="custom";
}
function setMode(next) {
  mode=next;
  document.querySelectorAll("[data-mode]").forEach((btn)=>{
    btn.classList.toggle("active",btn.dataset.mode===mode);
    btn.setAttribute("aria-selected",String(btn.dataset.mode===mode));
  });
  $("comparisonInputs").hidden=mode!=="compare";
  $("classificationB").hidden=mode!=="compare";
  $("artworkSettings").hidden=mode==="compare";
  if (!busy) $("analyzeButton").textContent=mode==="compare"?"Compare cards ↗":"Run audit ↗";
  status("");
}
function setCardText(which,text,filename="") {
  $("card"+which).value=text;
  $("count"+which).textContent=text.length.toLocaleString()+" characters";
  $("fileLabel"+which).textContent=filename||"JSON · Markdown · Text · Embedded-card PNG";
}
function setImage(data,label) {
  cardImage=data;
  $("portraitPreview").hidden=!data;
  if(data) $("portraitPreview").src=data;
  else $("portraitPreview").removeAttribute("src");
  $("artFileLabel").textContent=label||"No image selected";
}
function escapeHtml(v) {
  return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;");
}
function classifyLabel(kind) {
  return SPECIALISTS[kind.primary].label +
    (kind.secondary?" + "+SPECIALISTS[kind.secondary].label:"") +
    (kind.scope && kind.scope!=="unspecified"?" · "+kind.scope:"") +
    (kind.reason?" · "+kind.reason:"");
}
async function resolveKind(config,text,letter) {
  const prim=$("primary"+letter).value,sec=$("secondary"+letter).value;
  const guessed=(prim==="auto"||sec==="auto")?await classifyCard(config,text):null;
  const primary=prim==="auto"?guessed.primary:prim;
  const secondary=sec==="none"?null:sec==="auto"?(guessed?.secondary||null):sec;
  return { primary,secondary:secondary===primary?null:secondary,
    scope:guessed?.scope||"unspecified",reason:guessed?.reason||"Manual selection" };
}
function displayResult(data,ka,kb,usedMode) {
  result=data;resultMode=usedMode;
  $("results").hidden=false;
  $("classificationSummary").innerHTML='<div class="classify-display"><b>Rubrics chosen</b><p>Card A: '+
    escapeHtml(classifyLabel(ka))+'</p>'+(kb?'<p>Card B: '+escapeHtml(classifyLabel(kb))+'</p>':"")+'</div>';
  $("resultContent").innerHTML=usedMode==="single"?renderAudit(data):renderComparison(data);
  $("results").scrollIntoView({behavior:"smooth",block:"start"});
}
async function run() {
  if(busy)return;
  const cfg=readConfig(),usedMode=mode;
  let a,b;
  try {
    a=extractCardText($("cardA").value);
    b=usedMode==="compare"?extractCardText($("cardB").value):null;
  } catch(err) { status(err.message,true);return; }
  persistSettings();setBusy(true);status("Reading the card's intended scope…");
  try {
    const ka=await resolveKind(cfg,a,"A");
    let kb=null;
    if(usedMode==="compare") {
      status("Classifying Card B, then applying selected rubrics…");
      kb=await resolveKind(cfg,b,"B");
    }
    status("Running evidence-led audit. Greeting grades stay separate.");
    const data=usedMode==="single" ? await runSingle(cfg,a,ka,cardImage)
      :await runComparison(cfg,a,ka,b,kb,$("comparisonType").value);
    displayResult(data,ka,kb,usedMode);
    status("Audit complete. The analyzer does not store reports on a server.");
  } catch(err) {
    status(err?.message||String(err),true);
  } finally {setBusy(false);}
}
function wireFiles(which) {
  $("file"+which).addEventListener("change",async(e)=>{
    const file=e.target.files?.[0];if(!file)return;
    try {
      status("Importing "+file.name+"…");
      const parsed=await importCardFile(file);
      setCardText(which,parsed.text,parsed.filename);
      if(which==="A") setImage(parsed.image,parsed.image?file.name:null);
      status("");
    } catch(err){status(err.message,true);}
    e.target.value="";
  });
  $("card"+which).addEventListener("input",()=> {
    $("count"+which).textContent=$("card"+which).value.length.toLocaleString()+" characters";
  });
}
function init() {
  ["A","B"].forEach((l)=>{
    populateSelector("primary"+l,true);populateSelector("secondary"+l,false);wireFiles(l);
  });
  $("rememberKey").checked=Boolean(settings.rememberKey);
  $("provider").value=PROVIDERS[settings.provider]?settings.provider:"gemini";
  loadProvider($("provider").value);
  $("provider").addEventListener("change",(e)=>{loadProvider(e.target.value);persistSettings();});
  for(const id of ["model","apiKey","apiBase","maxTokens","rememberKey"]) {
    $(id).addEventListener("change",()=>{persistSettings();});
  }
  document.querySelectorAll("[data-mode]").forEach((el)=>el.addEventListener("click",()=>setMode(el.dataset.mode)));
  $("analyzeButton").addEventListener("click",()=>run().catch((err)=>status(err.message,true)));
  $("clearButton").addEventListener("click",()=>{
    setCardText("A","");setCardText("B","");setImage(null);$("results").hidden=true;result=null;status("");
  });
  $("artFile").addEventListener("change",async(e)=>{
    try{const f=e.target.files?.[0];if(f)setImage(await importPortrait(f),f.name);}catch(err){status(err.message,true);}
    e.target.value="";
  });
  $("clearArt").addEventListener("click",()=>setImage(null));
  $("saveMarkdown").addEventListener("click",()=>{if(result)downloadText("card-analyzer-5-report.md",reportToMarkdown(result,resultMode),"text/markdown");});
  $("saveJson").addEventListener("click",()=>{if(result)downloadText("card-analyzer-5-report.json",JSON.stringify(result,null,2),"application/json");});
  setMode("single");
}
init();
