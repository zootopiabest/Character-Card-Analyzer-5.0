import { optionalSections } from "./immersion-modules.js?v=5.2.1";
const safe = (v) => String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const number = (n) => typeof n==='number'&&Number.isFinite(n)?n.toFixed(1):'Unavailable';
const criterion = (name, val) => '<article class="criterion"><div class="criterion-head"><b>'+
  safe(name.replace(/([A-Z])/g," $1").replace(/^./,(c)=>c.toUpperCase()))+
  '</b><strong>'+number(val.score)+'/10</strong></div><p>'+safe(val.rationale)+'</p></article>';
const listBlock = (title, items) => items == null ? "" : '<section class="report-section"><h4>'+safe(title)+
  '</h4>'+(items.length ? '<ul>'+items.map((x)=>'<li>'+safe(x)+'</li>').join("")+'</ul>' :
  '<p class="muted">None evidenced.</p>')+'</section>';
const proseBlock = (title, content) => typeof content !== "string" ? "" :
  '<section class="report-section"><h4>'+safe(title)+'</h4><p>'+safe(content)+'</p></section>';

function renderOptionals(report) {
  const sections = optionalSections(report), warnings = report.optionalWarnings || [];
  if (!sections.length && !warnings.length) return "";
  return '<details class="optional-results" open><summary>Optional extras · separate from scores</summary>' +
    '<p class="micro">Illustrative interpretations, not canon or scoring evidence. Greeting grades apply only within their report cards.</p>' +
    (warnings.length ? listBlock('Optional output incomplete',warnings) : '') +
    sections.map(s => '<section class="report-section"><h4>'+safe(s.title)+'</h4>'+s.paragraphs.map(p=>'<p>'+safe(p)+'</p>').join('')+
      (s.items.length ? '<ul>'+s.items.map(i=>'<li>'+safe(i)+'</li>').join('')+'</ul>' : '')+'</section>').join('')+'</details>';
}
export function renderAudit(report) {
  return '<div class="report">'+
    '<header class="result-header"><span class="eyebrow">'+safe('v'+(report.appVersion||'unknown')+' · '+report.kind.primary)+
    (report.kind.secondary?' + '+safe(report.kind.secondary):'')+
    '</span><div class="result-score'+(report.overallScore===null?' incomplete-score':'')+'"><span>'+number(report.overallScore)+
    (report.overallScore===null?'':'<small>/10</small>')+'</span><div><b>Overall quality</b><p>'+(report.overallScore===null?'Withheld: required criteria are incomplete.':'Deterministically weighted from selected rubrics')+'</p></div></div>'+
    proseBlock('Finding',report.summary)+'</header>'+listBlock('Incomplete audit',report.validationWarnings?.length?report.validationWarnings:null)+
    '<div class="score-strip"><div><small>Slop severity</small><strong>'+(report.slop?Math.round(report.slop.score):'Unavailable')+
    (report.slop?'<span>/100 ↑ worse</span>':'')+'</strong></div><div><small>Core dimensions</small><strong>'+
    Object.keys(report.core).length+'</strong></div><div><small>Specialist modules</small><strong>'+
    Object.keys(report.specialists).length+'</strong></div></div>'+
    '<details open><summary>Universal foundation</summary><div class="criteria-grid">'+
    Object.entries(report.core).map(([key,val])=>criterion(key,val)).join("")+'</div></details>'+
    Object.entries(report.specialists).map(([id,section])=>
      '<details open><summary>Specialist: '+safe(id)+'</summary><div class="criteria-grid">'+
      Object.entries(section).map(([key,val])=>criterion(key,val)).join("")+'</div></details>').join("")+
    proseBlock('Slop analysis',report.slop?.evidence)+
    listBlock('What it does well',report.strengths)+listBlock('Construction defects',report.weaknesses)+
    listBlock('Intentional tradeoffs, not defects',report.tradeoffs)+
    proseBlock('First message synergy',report.firstMessageSynergy)+
    proseBlock('Profile → all greetings',report.profileGreetingCoverage)+
    proseBlock('Example dialogue & lasting voice',report.exampleDialogueAssessment)+
    (report.visual ? '<section class="report-section"><h4>Visual continuity: '+
      Math.round(report.visual.score)+'/100</h4><p>'+safe(report.visual.notes)+'</p>'+
      listBlock('Matches',report.visual.matches)+listBlock('Mismatches',report.visual.mismatches)+'</section>' : '')+
    renderOptionals(report)+'</div>';
}
export function renderComparison(data) {
  const c=data.comparison;
  return '<div class="comparison-summary"><h3>Head-to-head verdict</h3><p>'+safe(c.verdict)+'</p><div class="compare-cols">'+
    listBlock('Card A advantages',c.aAdvantages)+listBlock('Card B advantages',c.bAdvantages)+'</div>'+
    listBlock('Shared ground',c.sharedGround)+listBlock('Scope differences',c.scopeDifferences)+listBlock('Comparison output incomplete',data.comparisonWarnings?.length?data.comparisonWarnings:null)+
    '</div><div class="compare-cols"><section><h3>Card A</h3>'+renderAudit(data.cardA)+
    '</section><section><h3>Card B</h3>'+renderAudit(data.cardB)+'</section></div>';
}
export function reportToMarkdown(result,mode='single') {
  const bullets = (items) => items?.length ? items.map(x=>'- '+x).join('\n') : 'None evidenced.';
  const audit = (r) => [
    '# Card audit: '+r.kind.primary+(r.kind.secondary?' + '+r.kind.secondary:''),
    'App version: **'+(r.appVersion||'unknown')+'** | Overall: **'+(r.overallScore===null?'Withheld — incomplete criteria':number(r.overallScore)+'/10')+'** | Slop: **'+(r.slop?r.slop.score+'/100 (higher worse)':'Unavailable')+'**',
    ...(r.validationWarnings?.length?['## Incomplete audit\n'+bullets(r.validationWarnings)]:[]),
    r.summary,'## Universal criteria',
    ...Object.entries(r.core).map(([name,v])=>'### '+name+': '+v.score+'/10\n'+v.rationale),
    ...Object.entries(r.specialists).flatMap(([id,criteria])=>['## '+id,
      ...Object.entries(criteria).map(([name,v])=>'### '+name+': '+v.score+'/10\n'+v.rationale)]),
    ...(r.slop?['## Slop\n'+r.slop.evidence]:[]),
    ...(r.strengths != null ? ['## Strengths\n'+bullets(r.strengths)] : []),
    ...(r.weaknesses != null ? ['## Weaknesses\n'+bullets(r.weaknesses)] : []),
    ...(r.tradeoffs!=null?['## Tradeoffs\n'+bullets(r.tradeoffs)]:[]),
    ...(r.firstMessageSynergy!=null?['## First message synergy\n'+r.firstMessageSynergy]:[]),
    ...(r.profileGreetingCoverage != null ? ['## Profile → all greetings\n'+r.profileGreetingCoverage] : []),
    ...(r.exampleDialogueAssessment != null ? ['## Example dialogue and lasting voice\n'+r.exampleDialogueAssessment] : []),
    ...(r.visual ? ['## Visual match: '+r.visual.score+'/100\n'+r.visual.notes,'### Matches\n'+bullets(r.visual.matches),'### Mismatches\n'+bullets(r.visual.mismatches)] : []),
    ...(optionalSections(r).length || r.optionalWarnings?.length ? [
      '## Optional extras\nIllustrative interpretations, not canon or scoring evidence. Greeting grades are module-local.',
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
