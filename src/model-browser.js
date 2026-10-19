import { OPENROUTER_MODELS, CACHE_KEY, CACHE_MAX_AGE_MS, toBrowserModels, catalogAuthors,
  filterAndSortModels, formatPrice, fetchOpenRouterCatalog } from "./openrouter-models.js?v=5.1.7";

const safe=value=>String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const RECOMMENDED="__recommended__";
export function mountModelBrowser({getModel,onSelect}) {
  const $=id=>document.getElementById(id);
  let cache=null,loading=false,error="",started=false,infoOpen=null;
  let author=OPENROUTER_MODELS.some(m=>m.id===getModel()) ? RECOMMENDED : null;
  let sort="newest",descending=true;
  try {
    const saved=JSON.parse(localStorage.getItem(CACHE_KEY)||"null");
    if(Number.isFinite(saved?.fetchedAt) && Array.isArray(saved?.models) && toBrowserModels(saved.models).length) cache=saved;
  } catch {}
  const catalog=()=>toBrowserModels(cache?.models);
  const chip=(label,action,value,active)=>'<button type="button" class="model-chip'+(active?' active':'')+'" data-action="'+action+'" data-value="'+safe(value)+'" aria-pressed="'+active+'">'+safe(label)+'</button>';
  function renderFilters() {
    const scroller=$("modelAuthors"),position=scroller.scrollLeft;
    scroller.innerHTML=chip("★ Recommended","author",RECOMMENDED,author===RECOMMENDED)+
      chip("All providers","author","",author===null)+
      catalogAuthors(catalog()).map(a=>chip(a,"author",a,author===a)).join("");
    scroller.scrollLeft=position;
    $("modelSortControls").hidden=author===RECOMMENDED;
    $("modelSorts").innerHTML=[["newest","Newest"],["context","Context length"],["name","Name"]]
      .map(([value,label])=>chip(label,"sort",value,sort===value)).join("");
    $("modelSortDirection").textContent=descending?"↓":"↑";
    $("modelSortDirection").setAttribute("aria-label","Reverse sort order (currently "+
      (sort==="name"?(descending?"A to Z":"Z to A"):(descending?"descending":"ascending"))+")");
  }
  function syncSelection() {
    const id=getModel();
    const label=OPENROUTER_MODELS.find(m=>m.id===id)?.label || catalog().find(m=>m.id===id)?.name || id;
    $("selectedModel").textContent=label+(label!==id?" ("+id+")":"");
    for(const button of $("modelList").querySelectorAll("[data-model]")) {
      const selected=button.dataset.model===id;
      button.setAttribute("aria-pressed",String(selected));
      button.closest(".model-card").classList.toggle("selected",selected);
    }
  }
  function renderList() {
    const list=$("modelList"),position=list.scrollTop,query=$("modelSearch").value;
    const terms=query.toLowerCase().split(/\s+/).filter(Boolean);
    const recommended=author===RECOMMENDED;
    const visible=recommended ? OPENROUTER_MODELS.filter(m=>terms.every(t=>(m.label+" "+m.id).toLowerCase().includes(t)))
      :filterAndSortModels(catalog(),{query,author,sort,descending});
    list.innerHTML=visible.map((m,i)=>{
      const selected=m.id===getModel(),expanded=infoOpen===m.id;
      const metrics=recommended ? '<p class="micro">'+(/latest/i.test(m.id)?'Follows the newest release automatically':'Pinned version')+'</p>'
        :'<div class="model-metrics"><span class="context-pill">'+m.contextLength.toLocaleString()+' tokens</span><span>In <b>'+formatPrice(m.inputPrice)+'</b></span><span>Out <b>'+formatPrice(m.outputPrice)+'</b></span>'+(m.vision?'<span>▧ Reads images</span>':'')+'</div>';
      return '<article class="model-card'+(selected?' selected':'')+'"><div class="model-row"><button type="button" class="model-pick" data-model="'+safe(m.id)+'" aria-pressed="'+selected+'"><strong>'+safe(m.label||m.name)+'</strong><small>'+safe(recommended?m.id:m.author)+'</small>'+metrics+'</button>'+
        (recommended?'':'<button type="button" class="model-info" data-info="'+safe(m.id)+'" aria-label="About '+safe(m.name)+'" aria-expanded="'+expanded+'" aria-controls="model-details-'+i+'">i</button>')+'</div>'+
        (!recommended?'<div class="model-description" id="model-details-'+i+'"'+(expanded?'':' hidden')+'><code>'+safe(m.id)+'</code><p>'+safe(m.description||'No description available.')+'</p><small>Prices are USD per million tokens.</small></div>':'')+'</article>';
    }).join("") || '<p class="micro model-empty">'+(loading?'Loading OpenRouter’s model list…':recommended||catalog().length?'No models match your search.':'Model list unavailable. Refresh the list or enter a model ID above.')+'</p>';
    list.scrollTop=position;
    $("modelCount").textContent=visible.length+" "+(recommended?'recommended choices':'models')+" shown";
    syncSelection();
  }
  function renderStatus() {
    $("catalogStatus").textContent=error || (cache?catalog().length+" models · updated "+new Date(cache.fetchedAt).toLocaleDateString():loading?'Loading catalog…':'');
    $("catalogStatus").classList.toggle("catalog-error",Boolean(error));
    $("refreshModels").disabled=loading;
    $("refreshModels").textContent=loading?'Refreshing…':'↻ Refresh list';
    $("modelList").setAttribute("aria-busy",String(loading));
  }
  async function load() {
    if(loading)return;
    loading=true;error="";renderStatus();renderList();
    try {
      const models=await fetchOpenRouterCatalog();
      cache={fetchedAt:Date.now(),models};
      try {localStorage.setItem(CACHE_KEY,JSON.stringify(cache));}catch{}
    } catch(e) {error=e.message+ (cache?' Showing the saved catalog.':'');}
    finally {loading=false;renderFilters();renderList();renderStatus();}
  }
  $("modelSearch").addEventListener("input",()=>{ $("modelList").scrollTop=0;renderList(); });
  $("openRouterBrowser").addEventListener("click",event=>{
    const button=event.target.closest("button"); if(!button)return;
    if(button.dataset.model) {onSelect(button.dataset.model);syncSelection();}
    else if(button.dataset.info) {infoOpen=infoOpen===button.dataset.info?null:button.dataset.info;renderList();
      // Restore keyboard focus after rebuilding the rows.
      [...$("modelList").querySelectorAll("[data-info]")].find(b=>b.dataset.info===button.dataset.info)?.focus({preventScroll:true});
    }
    else if(button.dataset.action) {
      if(button.dataset.action==="author") author=button.dataset.value||null;
      else if(button.dataset.action==="sort") sort=button.dataset.value;
      $("modelList").scrollTop=0;renderFilters();renderList();
      [...$("openRouterBrowser").querySelectorAll("[data-action]")].find(b=>b.dataset.action===button.dataset.action && b.dataset.value===button.dataset.value)?.focus({preventScroll:true});
    }
  });
  $("modelSortDirection").addEventListener("click",()=>{descending=!descending;renderFilters();renderList();});
  $("refreshModels").addEventListener("click",load);
  renderFilters();renderList();renderStatus();
  return {syncSelection,activate() {
    syncSelection();
    if(!started) {started=true;if(!cache || Date.now()-cache.fetchedAt>CACHE_MAX_AGE_MS) void load();}
  }};
}
