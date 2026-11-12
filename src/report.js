import { optionalSections } from "./immersion-modules.js?v=5.7";
const safe = (v) => String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const number = (n) => typeof n==='number'&&Number.isFinite(n)?n.toFixed(1):'Unavailable';
const hasContextScoring = r => r.scoringVersion==='context-slop-1'||Boolean(r.contextSlop);
const scoringLabel = r => hasContextScoring(r)
  ? '80% rubric quality + 10% slop cleanliness + 10% context efficiency'
  : '90% rubric quality + 10% slop cleanliness (legacy scoring)';
const contextLabel = r => r.contextSlop ? r.contextSlop.score+'/100 (higher worse)'
  : hasContextScoring(r) ? 'Unavailable' : 'Not assessed (legacy report)';
const contextEvidence = r => r.contextSlop
  ? 'Estimated removable content: '+r.contextSlop.removablePercent.min+'–'+r.contextSlop.removablePercent.max+'% (approximate, not a token measurement).\n\n'+r.contextSlop.evidence
  : hasContextScoring(r) ? 'Unavailable; overall grade withheld.' : 'Not assessed in this saved report; its original score is unchanged.';

// Support the model's basic Markdown emphasis without ever trusting its HTML.
// Card text is escaped FIRST, then only our own strong/em tags are inserted.
const rich = text => safe(text).replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>')
  .replace(/(^|[\s(\[])\*([^*\n]+)\*(?=$|[\s.,!?;:)\]])/g,'$1<em>$2</em>');
const prose = (text, className='') => '<p'+(className?' class="'+className+'"':'')+'>'+rich(text)+'</p>';
const criterion = (name, val) => '<article class="criterion"><div class="criterion-head"><b>'+
  safe(name.replace(/([A-Z])/g," $1").replace(/^./,(c)=>c.toUpperCase()))+
  '</b><strong>'+number(val.score)+'/10</strong></div><p>'+safe(val.rationale)+'</p></article>';
const listBlock = (title, items) => items == null ? "" : '<section class="report-section"><h4>'+safe(title)+
  '</h4>'+(items.length ? '<ul>'+items.map((x)=>'<li>'+safe(x)+'</li>').join("")+'</ul>' :
  '<p class="muted">None evidenced.</p>')+'</section>';
const proseBlock = (title, content) => typeof content !== "string" ? "" :
  '<section class="report-section"><h4>'+safe(title)+'</h4><p>'+safe(content)+'</p></section>';

const EXTRA_PRESENTATION = {
  datingProfile: {symbol:'♡', eyebrow:'IN CHARACTER', tone:'rose', layout:'wide'},
  shoppingList: {symbol:'◇', eyebrow:'OFF SCRIPT', tone:'mint', layout:'standard'},
  topSongs: {symbol:'♫', eyebrow:'ON REPEAT', tone:'mint', layout:'standard'},
  demise: {symbol:'✧', eyebrow:'HYPOTHETICAL FATE', tone:'violet', layout:'wide'},
  psychoanalysis: {symbol:'◌', eyebrow:'BEHAVIORAL READING', tone:'violet', layout:'wide'},
  emotionalRegisters: {symbol:'◈', eyebrow:'REACTION MAP', tone:'mint', layout:'wide'},
  boringTuesday: {symbol:'☕', eyebrow:'EVERYDAY MOMENT', tone:'mint', layout:'standard'},
  pissThemOff: {symbol:'⚡', eyebrow:'PRESSURE POINTS', tone:'rose', layout:'standard'},
  creatorNotesNotes: {symbol:'✎', eyebrow:'EDITORIAL LENS', tone:'violet', layout:'wide'},
  greetingBreakdown: {symbol:'✦', eyebrow:'EACH OPENING, ITS OWN WORLD', tone:'violet', layout:'wide'}
};

const extraFallback = section => '<div class="extra-copy">'+
  section.paragraphs.map(p=>prose(p)).join('')+
  (section.items.length ? '<ul class="extra-simple-list">'+section.items.map(i=>'<li>'+rich(i)+'</li>').join('')+'</ul>' : '')+
  '</div>';
const extraPair = (label, content, variant='') =>
  '<div class="extra-pair'+(variant?' '+variant:'')+'"><span class="extra-pair-label">'+safe(label)+'</span>'+prose(content)+'</div>';

function greetingCards(report) {
  const greetings=Array.isArray(report.greetingBreakdown)?report.greetingBreakdown:[];
  const expected=Number.isInteger(report.greetingBreakdownExpected)?report.greetingBreakdownExpected:greetings.length;
  const status='Graded '+greetings.length+' of '+expected+' supplied greetings.';
  const cards=greetings.map((g,i)=>{
    const score=typeof g.score==='number'&&Number.isFinite(g.score)?Math.max(0,Math.min(10,g.score)):0;
    return '<article class="greeting-card">'+
      '<div class="greeting-top"><span class="greeting-index" aria-label="Greeting '+(i+1)+'">'+String(i+1).padStart(2,'0')+'</span>'+
      '<div class="greeting-identity"><h5>'+safe(g.label)+'</h5><span class="greeting-register">'+safe(g.register)+'</span></div>'+
      '<strong class="greeting-rating">'+safe(g.score)+'/10</strong></div>'+
      '<div class="greeting-meter" aria-hidden="true"><span style="width:'+score*10+'%"></span></div>'+
      prose(g.notes,'greeting-observation')+'</article>';
  }).join('');
  return '<div class="greeting-intro"><span class="greeting-count">'+safe(status)+'</span>'+
    '<span class="greeting-disclaimer">Individual opening scores. Not included in the overall grade.</span></div>'+
    (greetings.length?'<div class="greeting-list">'+cards+'</div>':
      '<p class="extra-empty">'+(report.greetingBreakdownIncomplete?'No valid greeting entries returned.':'No greeting text supplied.')+'</p>');
}
function extraBody(section, report) {
  const value=report[section.id];
  if(value?.notApplicable)return '<p class="extra-empty">Not applicable: '+safe(value.notApplicable)+'</p>';
  switch(section.id) {
    case 'greetingBreakdown': return greetingCards(report);
    case 'datingProfile': return '<div class="dating-letter"><span aria-hidden="true" class="dating-quote">“</span>'+
      '<div class="extra-copy">'+section.paragraphs.map(p=>prose(p)).join('')+'</div></div>';
    case 'demise': return '<div class="demise-layout">'+extraPair('The projected exit',value.howTheyDie)+
      extraPair('In memoriam',value.obituary,'obituary-panel')+'</div>';
    case 'shoppingList': return '<ol class="extra-number-list">'+value.items.map(item=>'<li>'+rich(item)+'</li>').join('')+'</ol>'+
      '<div class="extra-outro"><span>WHAT IT REVEALS</span>'+prose(value.notes)+'</div>';
    case 'topSongs': return '<ol class="track-list">'+value.map((song,i)=>'<li><span class="track-number">'+String(i+1).padStart(2,'0')+'</span>'+
      '<div class="track-info"><strong>'+rich(song.title)+'</strong><small>'+rich(song.artist)+'</small>'+prose(song.vibe)+'</div></li>').join('')+'</ol>';
    case 'emotionalRegisters': return '<div class="reaction-grid">'+
      [['sad','Sad'],['angry','Angry'],['happy','Happy'],['grief','Grief'],['comedy','Comedy']].map(([key,label])=>
        '<div class="reaction-tile"><span>'+label+'</span>'+prose(value[key])+'</div>').join('')+'</div>';
    case 'boringTuesday': return '<div class="everyday-pair">'+
      extraPair('The inconvenience',value.inconvenience)+extraPair('What actually happens',value.beat)+'</div>';
    case 'pissThemOff': return '<div class="pressure-list">'+
      [['trivial','A small irritation'],['personal','A personal hurt'],['denied','The claimed non-issue']].map(([key,label])=>
        extraPair(label,value[key])).join('')+'</div>';
    case 'psychoanalysis': return '<div class="reading-note extra-copy">'+section.paragraphs.map(p=>prose(p)).join('')+'</div>';
    case 'creatorNotesNotes': return '<div class="creator-reading extra-copy">'+section.paragraphs.map(p=>prose(p)).join('')+'</div>';
    default: return extraFallback(section);
  }
}
function renderOptionals(report) {
  const sections=optionalSections(report), warnings=report.optionalWarnings||[];
  if(!sections.length&&!warnings.length)return '';
  const cards=sections.map(section=>{
    const meta=EXTRA_PRESENTATION[section.id]||{symbol:'✦',eyebrow:'EXTRA INSIGHT',tone:'violet',layout:'standard'};
    return '<article class="extra-card extra-card--'+safe(meta.tone)+' extra-card--'+safe(meta.layout)+' extra-card--'+safe(section.id)+'">'+
      '<div class="extra-card-header"><span class="extra-symbol" aria-hidden="true">'+meta.symbol+'</span>'+
      '<div class="extra-card-heading"><span class="extra-kicker">'+meta.eyebrow+'</span><h4>'+safe(section.title)+'</h4></div></div>'+
      '<div class="extra-card-content">'+extraBody(section,report)+'</div></article>';
  }).join('');
  return '<details class="optional-results" open><summary>Optional extras <span class="extras-count">'+sections.length+' perspectives</span></summary>'+
    '<p class="extras-intro">Character explorations and critical commentary, kept separate from the scored audit. Greeting grades apply only to their individual openings.</p>'+
    (warnings.length?listBlock('Optional output incomplete',warnings):'')+
    '<div class="extras-grid">'+cards+'</div></details>';
}
export function renderAudit(report) {
  return '<div class="report">'+
    '<header class="result-header"><span class="eyebrow">'+safe('v'+(report.appVersion||'unknown')+' · '+report.kind.primary)+
    (report.kind.secondary?' + '+safe(report.kind.secondary):'')+
    '</span><div class="result-score'+(report.overallScore===null?' incomplete-score':'')+'"><span>'+number(report.overallScore)+
    (report.overallScore===null?'':'<small>/10</small>')+'</span><div><b>Overall quality</b><p>'+(report.overallScore===null?'Withheld: required criteria, slop or Context Slop unavailable.':scoringLabel(report))+'</p></div></div>'+
    proseBlock('Finding',report.summary)+'</header>'+listBlock('Incomplete audit',report.validationWarnings?.length?report.validationWarnings:null)+
    '<div class="score-strip"><div><small>Slop severity</small><strong>'+(report.slop?Math.round(report.slop.score):'Unavailable')+
    (report.slop?'<span>/100 ↑ worse</span>':'')+'</strong></div><div><small>Context Slop</small><strong>'+(report.contextSlop?Math.round(report.contextSlop.score):'—')+
    (report.contextSlop?'<span>/100 ↑ worse</span>':'')+'</strong>'+(report.contextSlop?'':'<small>'+safe(contextLabel(report))+'</small>')+'</div><div><small>Core dimensions</small><strong>'+
    Object.keys(report.core).length+'</strong></div><div><small>Specialist modules</small><strong>'+
    Object.keys(report.specialists).length+'</strong></div></div>'+
    '<details open><summary>Universal foundation</summary><div class="criteria-grid">'+
    Object.entries(report.core).map(([key,val])=>criterion(key,val)).join("")+'</div></details>'+
    Object.entries(report.specialists).map(([id,section])=>
      '<details open><summary>Specialist: '+safe(id)+'</summary><div class="criteria-grid">'+
      Object.entries(section).map(([key,val])=>criterion(key,val)).join("")+'</div></details>').join("")+
    proseBlock('Slop analysis',report.slop?.evidence)+
    proseBlock('Context Slop · persistent profile efficiency',contextEvidence(report))+
    listBlock('What it does well',report.strengths)+listBlock('Construction defects',report.weaknesses)+
    listBlock('Design considerations',report.designConsiderations?.length?report.designConsiderations:null)+
    proseBlock('First message synergy',report.firstMessageSynergy)+
    proseBlock('Profile → all greetings',report.profileGreetingCoverage)+
    proseBlock('Example dialogue & lasting voice',report.exampleDialogueAssessment)+
    (report.visual ? '<section class="report-section"><h4>Visual continuity: '+
      Math.round(report.visual.score)+'/100</h4><p>'+safe(report.visual.notes)+'</p>'+
      listBlock('Matches',report.visual.matches)+listBlock('Mismatches',report.visual.mismatches)+'</section>' : '')+
    renderOptionals(report)+'</div>';
}
export function renderComparison(data) {
  const c=data.comparison, A=data.cardA,B=data.cardB;
  const score=a=>number(a.overallScore);
  const row=(label,left,right)=>'<tr><th>'+safe(label)+'</th><td>'+safe(left)+'</td><td>'+safe(right)+'</td></tr>';
  const rubricKeys=new Set([...Object.keys(A.core),...Object.keys(B.core)]);
  const coreRows=[...rubricKeys].map(k=>row(k.replace(/([A-Z])/g,' $1'),A.core[k]?.score??'—',B.core[k]?.score??'—')).join('');
  const specialistRows=[...new Set([...Object.keys(A.specialists).flatMap(id=>Object.keys(A.specialists[id]).map(k=>id+'.'+k)),
    ...Object.keys(B.specialists).flatMap(id=>Object.keys(B.specialists[id]).map(k=>id+'.'+k))])]
    .map(key=>{const [module,criterion]=key.split('.');return row(key,A.specialists[module]?.[criterion]?.score??'—',B.specialists[module]?.[criterion]?.score??'—');}).join('');
  const diffs=(data.fieldDiff||[]).map(d=>'<li>'+safe(d.field)+': '+safe(d.status)+' ('+d.before+' → '+d.after+' chars)</li>').join('');
  return '<div class="compare-tabs" role="tablist" aria-label="Comparison report views">'+
    '<button type="button" class="tab active" data-report-tab="overview" aria-selected="true">Side by side</button>'+
    '<button type="button" class="tab" data-report-tab="cardA" aria-selected="false">Card A details</button>'+
    '<button type="button" class="tab" data-report-tab="cardB" aria-selected="false">Card B details</button></div>'+
    '<section data-report-panel="overview" class="comparison-summary"><h3>Head-to-head verdict</h3><p>'+safe(c.verdict)+'</p>'+
    '<div class="compare-score-cards"><article><small>Card A</small><strong>'+score(A)+'/10</strong><span>Slop '+(A.slop?A.slop.score+'/100':'—')+'</span><span>Context Slop '+safe(contextLabel(A))+'</span></article>'+
    '<article><small>Card B</small><strong>'+score(B)+'/10</strong><span>Slop '+(B.slop?B.slop.score+'/100':'—')+'</span><span>Context Slop '+safe(contextLabel(B))+'</span></article></div>'+
    '<details open><summary>Aligned grading criteria</summary><div class="compare-table-wrap"><table class="compare-table"><thead>'+row('Criterion','Card A','Card B')+'</thead><tbody>'+coreRows+specialistRows+'</tbody></table></div></details>'+
    '<div class="compare-cols">'+listBlock('Card A advantages',c.aAdvantages)+listBlock('Card B advantages',c.bAdvantages)+'</div>'+
    listBlock('Shared ground',c.sharedGround)+listBlock('Scope differences',c.scopeDifferences)+
    listBlock('Comparison output incomplete',data.comparisonWarnings?.length?data.comparisonWarnings:null)+
    (diffs?'<details><summary>Field changes · deterministic, not scored</summary><ul>'+diffs+'</ul></details>':'')+'</section>'+
    '<section data-report-panel="cardA" hidden><h3>Card A · full diagnostics</h3>'+renderAudit(A)+'</section>'+
    '<section data-report-panel="cardB" hidden><h3>Card B · full diagnostics</h3>'+renderAudit(B)+'</section>';
}
export function reportToMarkdown(result,mode='single') {
  const bullets = (items) => items?.length ? items.map(x=>'- '+x).join('\n') : 'None evidenced.';
  const audit = (r) => [
    '# Card audit: '+r.kind.primary+(r.kind.secondary?' + '+r.kind.secondary:''),
    'App version: **'+(r.appVersion||'unknown')+'** | Overall: **'+(r.overallScore===null?'Withheld — incomplete criteria':number(r.overallScore)+'/10')+'** | Slop: **'+(r.slop?r.slop.score+'/100 (higher worse)':'Unavailable')+'** | Context Slop: **'+contextLabel(r)+'**',
    'Scoring: '+scoringLabel(r)+'.',
    ...(r.validationWarnings?.length?['## Incomplete audit\n'+bullets(r.validationWarnings)]:[]),
    r.summary,'## Universal criteria',
    ...Object.entries(r.core).map(([name,v])=>'### '+name+': '+v.score+'/10\n'+v.rationale),
    ...Object.entries(r.specialists).flatMap(([id,criteria])=>['## '+id,
      ...Object.entries(criteria).map(([name,v])=>'### '+name+': '+v.score+'/10\n'+v.rationale)]),
    ...(r.slop?['## Slop\n'+r.slop.evidence]:[]),
    '## Context Slop\n'+contextEvidence(r),
    ...(r.strengths != null ? ['## Strengths\n'+bullets(r.strengths)] : []),
    ...(r.weaknesses != null ? ['## Weaknesses\n'+bullets(r.weaknesses)] : []),
    ...(r.designConsiderations?.length?['## Design considerations\n'+bullets(r.designConsiderations)]:[]),
    ...(r.firstMessageSynergy!=null?['## First message synergy\n'+r.firstMessageSynergy]:[]),
    ...(r.profileGreetingCoverage != null ? ['## Profile → all greetings\n'+r.profileGreetingCoverage] : []),
    ...(r.exampleDialogueAssessment != null ? ['## Example dialogue and lasting voice\n'+r.exampleDialogueAssessment] : []),
    ...(r.visual ? ['## Visual match: '+r.visual.score+'/100\n'+r.visual.notes,'### Matches\n'+bullets(r.visual.matches),'### Mismatches\n'+bullets(r.visual.mismatches)] : []),
    ...(optionalSections(r).length || r.optionalWarnings?.length ? [
      '## Optional extras\nNon-scoring commentary and illustrative interpretations, not canon or scoring evidence. Greeting grades are module-local.',
      ...(r.optionalWarnings?.length ? ['### Optional output incomplete\n'+bullets(r.optionalWarnings)] : []),
      ...optionalSections(r).map(s => '### '+s.title+'\n'+s.paragraphs.join('\n\n')+(s.items.length ? '\n'+bullets(s.items) : ''))
    ] : [])
  ].join('\n\n');
  const metadata=runMarkdown(result.run);
  if(mode==='single') return audit(result)+metadata;
  return ['# Card comparison',result.comparison.verdict,
    ...(result.comparisonWarnings?.length?['## Comparison output incomplete\n'+bullets(result.comparisonWarnings)]:[]),
    ...(result.comparison.aAdvantages!=null?['## A advantages\n'+bullets(result.comparison.aAdvantages)]:[]),
    ...(result.comparison.bAdvantages!=null?['## B advantages\n'+bullets(result.comparison.bAdvantages)]:[]),
    ...(result.comparison.sharedGround!=null?['## Shared ground\n'+bullets(result.comparison.sharedGround)]:[]),
    ...(result.comparison.scopeDifferences!=null?['## Differences in scope\n'+bullets(result.comparison.scopeDifferences)]:[]),
    '\n---\n',audit(result.cardA),'\n---\n',audit(result.cardB),metadata
  ].join('\n\n');
}
function runMarkdown(run){
  if(!run)return '';
  return '\n\n## Run record\n\n'+[
    'Started: '+run.startedAt+'; completed: '+run.completedAt,
    'Provider: '+run.provider+'; requested model: '+run.requestedModel+'; sent model: '+run.resolvedModel+'; returned models: '+(run.returnedModels?.join(', ')||'not reported'),
    'Mode: '+run.mode+(run.comparisonType?' ('+run.comparisonType+')':'')+'; send greetings separately: '+run.separateGreetings+'; isolated in this run: '+JSON.stringify(run.isolatedGreetings),
    'Settings: '+JSON.stringify(run.settings)+'; optional modules: '+JSON.stringify(run.optionalModules),
    ...(run.inputs||[]).map((input,i)=>'Input '+(i+1)+': '+input.label+'; '+input.characters+' characters; '+input.greetingCount+' greetings; SHA-256: '+(input.sha256||'unavailable')+(input.warnings?.length?'; '+input.warnings.join(' '):'')),
    'Model requests: '+run.requestCount+' (provider usage shown as reported, not estimated)',
    ...(run.requests||[]).map((r,i)=>(i+1)+'. '+r.purpose+' — '+r.status+'; model: '+(r.model||r.sentModel)+'; usage: '+JSON.stringify(r.usage||null)+(r.error?'; '+r.error:''))
  ].join('\n\n');
}
export function downloadText(name,data,mime) {
  const blob=new Blob([data],{type:mime}),url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');anchor.href=url;anchor.download=name;
  anchor.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
