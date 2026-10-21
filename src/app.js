import {parseCard,greetingsOf} from "./card-context.js?v=5.5";
import { mountImmersionPanel } from "./immersion-panel.js?v=5.5";
import { mountModelBrowser } from "./model-browser.js?v=5.5";
import { PROVIDERS, DEFAULT_MODEL, prepareRun } from "./providers.js?v=5.5";
import { SPECIALISTS, SPECIALIST_KEYS } from "./rubrics/specialists.js?v=5.5";
import { importCardFile, importPortrait } from "./importer.js?v=5.5";
import { classifyCard, runSingle, runComparison } from "./evaluator.js?v=5.5";
import { renderAudit, renderComparison, reportToMarkdown, downloadText } from "./report.js?v=5.5";
import { APP_VERSION } from "./version.js?v=5.5";
import {planEstimate,priceForModel,estimatePricing,formatUSD} from './cost-estimate.js?v=5.5';
import {saveReport,allReports,pinReport,removeReport,clearReports,exportAllReports} from './report-history.js?v=5.5';
import {lintCard} from './static-lint.js?v=5.5';
import {mountFieldEditor} from './field-editor.js?v=5.5';
import {diffCardFields} from './card-diff.js?v=5.5';

const $ = (id) => document.getElementById(id);
let modelBrowser=null,activeProvider=null,immersionPanel=null;
let mode = "single", result = null, resultMode = "single", cardImage = null, busy = false;
let failedRawResponse = null;
let runId=0,runController=null;let historyItems=[];
const imported={A:null,B:null},importIds={A:0,B:0};let portraitImportId=0;
function cardFor(letter){
  const text=$('card'+letter).value,cached=imported[letter];
  return cached&&cached.text===text?cached.card:parseCard(text);
}
function updateRequestPlan(){
  const letters=mode==='compare'?['A','B']:['A'];let classifications=0,diagnostics=0;const warnings=[],detected=[];
  for(const letter of letters){
    if($('primary'+letter).value==='auto'||$('secondary'+letter).value==='auto')classifications++;
    try{
      const card=cardFor(letter),n=greetingsOf(card).length;
      if($('separateGreetings').checked&&n>1)diagnostics+=n;
      const selections=immersionPanel?.snapshot()||{},selected=mode==='single'?selections.modules:letter==='A'?selections.modulesA:selections.modulesB;
      detected.push('Card '+letter+': '+n+' greeting'+(n===1?'':'s')+' detected'+(selected?.includes('greetingBreakdown')?' · '+n+' grade'+(n===1?'':'s')+' requested '+($('separateGreetings').checked&&n>1?'in separate requests':'in the main request'):''));
      for(const warning of lintCard(card))warnings.push('Card '+letter+': '+warning);
    }catch{}
  }
  $('requestPlan').textContent=(busy?'Next run: ':'Planned model requests: ')+(1+classifications+diagnostics)+' total · 1 main '+(mode==='compare'?'comparison':'audit')+' + '+classifications+' classification + '+diagnostics+' greeting diagnostics. Extras share these requests. No automatic retries.';
  $('greetingSummary').textContent=detected.join(' | ');
  try {
    const cards=letters.map(l=>cardFor(l));
    const selections=immersionPanel?.snapshot()||{};
    const perGreeting=letters.map(l=>(mode==='single'?selections.modules:l==='A'?selections.modulesA:selections.modulesB)?.includes('greetingBreakdown'));
    const cfg=readConfig();
    const plan=planEstimate({cards,mode,separateGreetings:$('separateGreetings').checked,perGreeting,autoClassifications:classifications,baseOutput:cfg.maxTokens});
    const estimate=estimatePricing(plan,priceForModel(cfg.provider,cfg.model));
    $('costEstimate').textContent='Approx. '+plan.inputTokens.toLocaleString()+' input tokens · '+plan.maxOutputTokens.toLocaleString()+' total output-token ceiling across '+plan.requestCount+' calls'+(estimate?' · estimated input '+formatUSD(estimate.input)+' · worst-case budget '+formatUSD(estimate.ceiling):' · price unavailable for selected provider/model')+'. Output is a maximum, not a prediction; token counts are approximate.';
  }catch{$('costEstimate').textContent='Cost estimate unavailable until inputs can be parsed.';}
  $('inputWarnings').textContent=[...new Set(warnings)].join(' ');$('inputWarnings').hidden=!warnings.length;
}
function cancelRun(message='Audit cancelled. No further requests will start. Already-started provider work may still be billed.'){
  runId++;runController?.abort(new DOMException('Audit cancelled.','AbortError'));runController=null;
  setBusy(false);status(message);
}
function resetRawResponse() {
  failedRawResponse = null;
  $("saveFailedResponse").hidden = true;
}
const storeKey = "card-analyzer-5-settings";
let settings = {};
try { settings = JSON.parse(localStorage.getItem(storeKey)||"{}") || {}; } catch {}
const keys = (()=>{try{return JSON.parse(localStorage.getItem(storeKey+"-keys")||"{}")||{}}catch{return {}}})();

function status(message, error = false) {
  const el=$("status");el.hidden=!message;el.textContent=message;el.classList.toggle("error",error);
}
function setBusy(v) {
  busy=v;$("analyzeButton").disabled=v;$("cancelButton").hidden=!v;
  $("analyzeButton").textContent=v ? "Analyzing…" : mode==="compare" ? "Compare cards ↗" : "Run audit ↗";
  updateRequestPlan();
}
function populateSelector(id, primary) {
  const el=$(id);
  el.innerHTML = primary
    ? '<option value="auto">Auto-detect (extra API call)</option>'
    : '<option value="auto">Auto-select (extra API call)</option><option value="none">No secondary rubric</option>';
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
function updateModelSummary() {
  $("modelSettingsSummary").textContent=PROVIDERS[$("provider").value].label+" · "+($("model").value.trim()||"Choose a model");
  modelBrowser?.syncSelection();
}
function persistSettings(providerOverride) {
  try {
    const cfg=readConfig();
    if(providerOverride) cfg.provider=providerOverride;
    settings.providers=settings.providers||{};
    settings.providers[cfg.provider]={model:cfg.model,baseUrl:cfg.baseUrl,maxTokens:cfg.maxTokens};
    settings.provider=cfg.provider;settings.modelSettingsOpen=$("modelSettings").open;settings.rememberKey=$("rememberKey").checked;
    settings.separateGreetings=$("separateGreetings").checked;
    localStorage.setItem(storeKey,JSON.stringify(settings));
    if(settings.rememberKey) {keys[cfg.provider]=cfg.key;localStorage.setItem(storeKey+"-keys",JSON.stringify(keys));}
    else { localStorage.removeItem(storeKey+"-keys"); for(const p of Object.keys(keys)) delete keys[p]; }
  } catch(e) {status("Browser storage unavailable: "+e.message,true);}
}
function loadProvider(provider) {
  activeProvider=provider;
  const saved=settings.providers?.[provider]||{};
  $("model").value=saved.model ?? DEFAULT_MODEL(provider);
  $("apiBase").value=saved.baseUrl || "";
  $("maxTokens").value=(settings.outputLimits||{})[mode]||(mode==="compare"?32768:16384);
  $("apiKey").value=$("rememberKey").checked ? (keys[provider]||"") : "";
  $("customBaseWrap").hidden=provider!=="custom";
  $("openRouterBrowser").hidden=provider!=="openrouter";
  $("modelBrowserHint").hidden=provider!=="openrouter";
  updateModelSummary();
  if(provider==="openrouter" && $("modelSettings").open) modelBrowser?.activate();
}
function setMode(next) {
  const previousMode=mode;
  mode=next;
  document.querySelectorAll("[data-mode]").forEach((btn)=>{
    btn.classList.toggle("active",btn.dataset.mode===mode);
    btn.setAttribute("aria-selected",String(btn.dataset.mode===mode));
  });
  $("comparisonInputs").hidden=mode!=="compare";
  $("classificationB").hidden=mode!=="compare";
  $("artworkSettings").hidden=mode==="compare";
  immersionPanel?.setMode(mode);
  if (!busy) $("analyzeButton").textContent=mode==="compare"?"Compare cards ↗":"Run audit ↗";
  if(!busy){resetRawResponse();status("");}
  const limits=settings.outputLimits||{}; // Remember a manual limit for each mode.
  limits[previousMode]=Number($('maxTokens').value)||16384;
  settings.outputLimits=limits;
  $('maxTokens').value=limits[next] || (next==='compare'?32768:16384);
  updateRequestPlan();
}
function setCardText(which,text,filename="") {
  $("card"+which).value=text;
  $("count"+which).textContent=text.length.toLocaleString()+" characters";
  $("fileLabel"+which).textContent=filename||"JSON · Markdown · Text · PNG · CharX";
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
async function resolveKind(config,text,selection) {
  const {primary:prim,secondary:sec}=selection;
  const guessed=(prim==="auto"||sec==="auto")?await classifyCard(config,text):null;
  const primary=prim==="auto"?guessed.primary:prim;
  const secondary=sec==="none"?null:sec==="auto"?(guessed?.secondary||null):sec;
  return { primary,secondary:secondary===primary?null:secondary,
    scope:guessed?.scope||"unspecified",reason:guessed?.reason||"Manual selection" };
}
function displayResult(data,ka,kb,usedMode) {
  result=data;resultMode=usedMode;
  $("results").hidden=false;
  $('resultIdentity').textContent='Result for '+(data.run?.inputs||[]).map((input,i)=>(usedMode==='compare'?'Card '+(i?'B':'A')+': ':'')+input.label).join(' · ')+' · '+(data.run?.startedAt||'')+' · '+(data.run?.resolvedModel||'')+' · Inputs and selections captured when Run was pressed.';
  $("classificationSummary").innerHTML='<div class="classify-display"><b>Rubrics chosen</b><p>Card A: '+
    escapeHtml(classifyLabel(ka))+'</p>'+(kb?'<p>Card B: '+escapeHtml(classifyLabel(kb))+'</p>':"")+'</div>';
  $("resultContent").innerHTML=usedMode==="single"?renderAudit(data):renderComparison(data);
  $("results").scrollIntoView({behavior:"smooth",block:"start"});
}
async function run() {
  if(busy)return;
  const rawConfig=readConfig(),usedMode=mode;
  const selections=['A','B'].map(letter=>({primary:$('primary'+letter).value,secondary:$('secondary'+letter).value}));
  const optionals={...immersionPanel.snapshot(),separateGreetings:$('separateGreetings').checked,
    inputLabels:['A','B'].map(letter=>imported[letter]?.text===$('card'+letter).value?imported[letter].filename:'Pasted Card '+letter)};
  const comparisonType=$('comparisonType').value,image=cardImage;
  let a,b;
  try{a=cardFor('A');b=usedMode==='compare'?cardFor('B'):null;}
  catch(error){status(error.message,true);return;}
  const id=++runId;runController=new AbortController();const controller=runController;
  resetRawResponse();persistSettings();$('results').hidden=true;setBusy(true);
  status('Preparing the selected model and rubric…');
  try{
    const plan=planEstimate({cards:usedMode==='compare'?[a,b]:[a],mode:usedMode,separateGreetings:optionals.separateGreetings,
     perGreeting:(usedMode==='compare'?[optionals.modulesA,optionals.modulesB]:[optionals.modules]).map(m=>m.includes('greetingBreakdown')),
     autoClassifications:selections.slice(0,usedMode==='compare'?2:1).filter(x=>x.primary==='auto'||x.secondary==='auto').length,
     baseOutput:rawConfig.maxTokens});
   const cfg=await prepareRun({...rawConfig,maxTokens:plan.mainOutput,signal:controller.signal});
    const ka=await resolveKind(cfg,a,selections[0]);
    const kb=usedMode==='compare'?await resolveKind(cfg,b,selections[1]):null;
    if(id!==runId)return;
    status('Scoring the captured inputs. Any separate greeting diagnostics follow the main audit.');
    const data=usedMode==='single'?await runSingle(cfg,a,ka,image,optionals.modules,optionals)
      :await runComparison(cfg,a,ka,b,kb,comparisonType,optionals);
    if(id!==runId)return;
    if(usedMode==='compare'&&comparisonType==='remake')data.fieldDiff=diffCardFields(a,b);
    displayResult(data,ka,kb,usedMode);
    try{await saveReport(data,usedMode,ka,kb);await refreshHistory();}
    catch(error){status('Audit complete, but browser history could not save it: '+error.message,true);}
    const incomplete=usedMode==='single'?data.incomplete:data.cardA.incomplete||data.cardB.incomplete||data.comparisonWarnings.length;
    const diagnosticIncomplete=usedMode==='single'?Boolean(data.greetingBreakdownIncomplete||data.optionalWarnings?.length):
      [data.cardA,data.cardB].some(c=>c.greetingBreakdownIncomplete||c.optionalWarnings?.length);
    status(incomplete||diagnosticIncomplete?'Audit partially complete. Some required or optional results are missing; inspect the report and saved history.':'Audit complete. '+data.run.requestCount+' model request(s). Saved locally; no analyzer server stores reports.');
  }catch(error){
    if(id!==runId)return;
    controller.abort(error);
    failedRawResponse=typeof error.rawResponse==='string'&&error.rawResponse?error.rawResponse:null;
    $('saveFailedResponse').hidden=!failedRawResponse;
    status(error.message||String(error),true);
  }finally{if(id===runId){runController=null;setBusy(false);}}
}
async function refreshHistory(){
  try{
    historyItems=await allReports();const list=$('historyList');list.replaceChildren();
    if(!historyItems.length){list.textContent='No reports saved yet. Completed audits are archived automatically.';return;}
    for(const item of historyItems){
      const row=document.createElement('div');row.className='history-row';
      const title=document.createElement('span');title.textContent=item.label+' · '+new Date(item.createdAt).toLocaleString()+' · '+(item.mode==='compare'?'Comparison':'Audit');row.append(title);
      for(const [action,word] of [['open','Open'],['pin',item.pinned?'Unpin':'Pin'],['remove','Delete']]){
        const button=document.createElement('button');button.type='button';button.className='quiet-button';button.textContent=word;button.dataset.historyAction=action;button.dataset.historyId=item.id;row.append(button);
      }list.append(row);
    }
  }catch(error){$('historyList').textContent='Local history unavailable: '+error.message;}
}
function wireHistory(){
  $('historyList').addEventListener('click',async e=>{
    const button=e.target.closest('button[data-history-action]');if(!button)return;
    const entry=historyItems.find(x=>x.id===button.dataset.historyId);if(!entry)return;
    try{
      if(button.dataset.historyAction==='open'){displayResult(entry.report,entry.kindA,entry.kindB,entry.mode);status('Reopened local report · no API call.');}
      if(button.dataset.historyAction==='pin')await pinReport(entry.id,!entry.pinned);
      if(button.dataset.historyAction==='remove')await removeReport(entry.id);
      await refreshHistory();
    }catch(error){status('History action failed: '+error.message,true);}
  });
  $('exportHistory').addEventListener('click',async()=>{try{downloadText('analyzer-history.json',await exportAllReports(),'application/json');}catch(e){status(e.message,true);}});
  $('clearHistory').addEventListener('click',async()=>{
    if(!confirm('Delete all locally saved reports? This cannot be undone.'))return;
    try{await clearReports();await refreshHistory();}catch(e){status(e.message,true);}
  });
  void refreshHistory();
}
function wireFiles(which) {
  $("file"+which).addEventListener("change",async(e)=>{
    const file=e.target.files?.[0];if(!file)return;const id=++importIds[which],portraitId=which==="A"?++portraitImportId:null;
    try {
      status("Importing "+file.name+"…");
      const parsed=await importCardFile(file);
      if(id!==importIds[which])return;
      imported[which]=parsed;setCardText(which,parsed.text,parsed.filename);updateRequestPlan();
      if(which==="A"&&portraitId===portraitImportId) setImage(parsed.image,parsed.image?file.name:null);
      if(!busy)status("");
    } catch(err){if(id===importIds[which])status(err.message,true);}
    e.target.value="";
  });
  $("card"+which).addEventListener("input",()=> {
    importIds[which]++;$("count"+which).textContent=$("card"+which).value.length.toLocaleString()+" characters";updateRequestPlan();
  });
}
function init() {
  immersionPanel=mountImmersionPanel({onStorageError:message=>status(message,true),onChange:updateRequestPlan});
  wireHistory();
  $('resultContent').addEventListener('click',event=>{
    const button=event.target.closest('button[data-report-tab]');if(!button)return;
    const selected=button.dataset.reportTab;
    for(const tab of $('resultContent').querySelectorAll('[data-report-tab]')){const active=tab.dataset.reportTab===selected;tab.classList.toggle('active',active);tab.setAttribute('aria-selected',String(active));}
    for(const panel of $('resultContent').querySelectorAll('[data-report-panel]'))panel.hidden=panel.dataset.reportPanel!==selected;
  });
  ["A","B"].forEach((l)=>{
    mountFieldEditor({which:l,onChange:()=>{importIds[l]++;$('count'+l).textContent=$('card'+l).value.length.toLocaleString()+' characters';updateRequestPlan();}});
    populateSelector("primary"+l,true);populateSelector("secondary"+l,false);wireFiles(l);
    for(const prefix of ["primary","secondary"])$(prefix+l).addEventListener("change",updateRequestPlan);
  });
  $("rememberKey").checked=Boolean(settings.rememberKey);
  $("separateGreetings").checked=settings.separateGreetings===true;
  $("provider").value=PROVIDERS[settings.provider]?settings.provider:"gemini";
  loadProvider($("provider").value);
  modelBrowser=mountModelBrowser({getModel:()=>$("model").value.trim(),onSelect:id=>{
    $("model").value=id;persistSettings();updateModelSummary();
  }});
  $("modelSettings").open=settings.modelSettingsOpen!==false;
  if($("provider").value==="openrouter" && $("modelSettings").open) modelBrowser.activate();
  $("modelSettings").addEventListener("toggle",()=>{
    persistSettings();
    if($("modelSettings").open && $("provider").value==="openrouter") modelBrowser.activate();
  });
  $("provider").addEventListener("change",(e)=>{
    persistSettings(activeProvider);loadProvider(e.target.value);persistSettings();
  });
  $("model").addEventListener("input",updateModelSummary);
  for(const id of ["model","apiKey","apiBase","maxTokens","rememberKey","separateGreetings"]) {
    $(id).addEventListener("change",()=>{if(id==='maxTokens'){settings.outputLimits=settings.outputLimits||{};settings.outputLimits[mode]=Math.max(1024,Number($('maxTokens').value)||16384);}persistSettings();updateRequestPlan();});
  }
  document.querySelectorAll("[data-mode]").forEach((el)=>el.addEventListener("click",()=>setMode(el.dataset.mode)));
  $("analyzeButton").addEventListener("click",()=>run().catch((err)=>status(err.message,true)));
  $("cancelButton").addEventListener("click",()=>cancelRun());
  $("clearButton").addEventListener("click",()=>{
    cancelRun("");for(const letter of ["A","B"]){importIds[letter]++;imported[letter]=null;}portraitImportId++;
    setCardText("A","");setCardText("B","");setImage(null);$("results").hidden=true;result=null;resetRawResponse();status("");updateRequestPlan();
  });
  $("artFile").addEventListener("change",async(e)=>{
    const id=++portraitImportId;
    try{const f=e.target.files?.[0];if(f){const data=await importPortrait(f);if(id===portraitImportId)setImage(data,f.name);}}catch(err){if(id===portraitImportId)status(err.message,true);}
    e.target.value="";
  });
  $("clearArt").addEventListener("click",()=>{portraitImportId++;setImage(null);});
  $("saveMarkdown").addEventListener("click",()=>{if(result)downloadText("card-analyzer-report.md",reportToMarkdown(result,resultMode),"text/markdown");});
  $("saveJson").addEventListener("click",()=>{if(result)downloadText("card-analyzer-report.json",JSON.stringify(result,null,2),"application/json");});
  $("saveFailedResponse").addEventListener("click",()=>{
    if(failedRawResponse) downloadText("card-analyzer-raw-model-response.txt",failedRawResponse,"text/plain");
  });
  mode='single';setMode('single');
  $("runtimeVersion").textContent = "Runtime " + APP_VERSION + " loaded · Modular grading";
}
init();

