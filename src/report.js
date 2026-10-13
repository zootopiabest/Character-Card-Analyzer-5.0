const safe = (v) => String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const number = (n) => Number(n).toFixed(1);
const criterion = (name, val) => '<article class="criterion"><div class="criterion-head"><b>' +
  safe(name.replace(/([A-Z])/g, " $1").replace(/^./, (c)=>c.toUpperCase())) +
  '</b><strong>' + number(val.score) + '/10</strong></div><p>' + safe(val.evidence) +
  '</p><small>' + safe(val.effect) + '</small></article>';
const listBlock = (title, items) => '<section class="report-section"><h4>' + safe(title) +
  '</h4>' + (items.length ? '<ul>' + items.map((x)=>'<li>'+safe(x)+'</li>').join("")+'</ul>' :
  '<p class="muted">None evidenced.</p>') + '</section>';

export function renderAudit(report) {
  return '<div class="report">' +
    '<header class="result-header"><span class="eyebrow">' + safe(report.kind.primary) +
    (report.kind.secondary ? ' + ' + safe(report.kind.secondary) : '') +
    '</span><div class="result-score"><span>' + number(report.overallScore) +
    '<small>/10</small></span><div><b>Overall quality</b><p>Deterministically weighted from applicable rubrics</p></div></div>' +
    '<p>' + safe(report.summary) + '</p></header>' +
    '<div class="score-strip"><div><small>Slop severity</small><strong>' + Math.round(report.slop.score) +
    '<span>/100 ↑ worse</span></strong></div><div><small>Core dimensions</small><strong>' +
    Object.keys(report.core).length + '</strong></div><div><small>Specialist modules</small><strong>' +
    Object.keys(report.specialists).length + '</strong></div></div>' +
    '<details open><summary>Universal foundation</summary><div class="criteria-grid">' +
    Object.entries(report.core).map(([key,val])=>criterion(key,val)).join("")+'</div></details>' +
    Object.entries(report.specialists).map(([id,section])=>
      '<details open><summary>Specialist: '+safe(id)+'</summary><div class="criteria-grid">'+
      Object.entries(section).map(([key,val])=>criterion(key,val)).join("")+'</div></details>').join("") +
    '<section class="report-section"><h4>Slop analysis</h4><p>' + safe(report.slop.evidence) + '</p></section>' +
    listBlock("What it does well",report.strengths) + listBlock("Construction defects",report.weaknesses) +
    listBlock("Intentional tradeoffs, not defects",report.tradeoffs) +
    '<section class="report-section"><h4>First message synergy</h4><p>' + safe(report.firstMessageSynergy) + '</p></section>' +
    '<section class="report-section"><h4>Profile → all greetings</h4><p>' + safe(report.profileGreetingCoverage) + '</p></section>' +
    '<section class="report-section"><h4>Example dialogue &amp; lasting voice</h4><p>' + safe(report.exampleDialogueAssessment) + '</p></section>' +
    (report.visual ? '<section class="report-section"><h4>Visual continuity: ' +
      Math.round(report.visual.score) + '/100</h4><p>' + safe(report.visual.notes) + '</p>' +
      listBlock('Matches', report.visual.matches) + listBlock('Mismatches',report.visual.mismatches)+'</section>' : '') +
    '</div>';
}
export function renderComparison(data) {
  const c=data.comparison;
  return '<div class="comparison-summary"><h3>Head-to-head verdict</h3><p>'+safe(c.verdict)+'</p><div class="compare-cols">' +
    listBlock("Card A advantages",c.aAdvantages)+listBlock("Card B advantages",c.bAdvantages)+'</div>' +
    listBlock("Shared ground",c.sharedGround)+listBlock("Scope differences",c.scopeDifferences)+
    '</div><div class="compare-cols"><section><h3>Card A</h3>'+renderAudit(data.cardA)+
    '</section><section><h3>Card B</h3>'+renderAudit(data.cardB)+'</section></div>';
}
export function reportToMarkdown(result, mode="single") {
  const audit = (r) => [
    "# Card audit: " + r.kind.primary + (r.kind.secondary ? " + " + r.kind.secondary : ""),
    "Overall: **"+number(r.overallScore)+"/10** | Slop: **"+r.slop.score+"/100 (higher worse)**",
    r.summary,
    "## Universal criteria",
    ...Object.entries(r.core).map(([name,v])=> "### "+name+": "+v.score+"/10\n"+v.evidence+"\n"+v.effect),
    ...Object.entries(r.specialists).flatMap(([id,criteria]) => ["## "+id, ...Object.entries(criteria).map(([name,v])=> "### "+name+": "+v.score+"/10\n"+v.evidence+"\n"+v.effect)]),
    "## Slop\n"+r.slop.evidence,
    "## Strengths\n"+r.strengths.map(x=>"- "+x).join("\n"),
    "## Weaknesses\n"+(r.weaknesses.length?r.weaknesses.map(x=>"- "+x).join("\n"):"None evidenced."),
    "## Tradeoffs\n"+r.tradeoffs.map(x=>"- "+x).join("\n"),
    "## First message synergy\n"+r.firstMessageSynergy,
    "## Profile → all greetings\n"+r.profileGreetingCoverage,
    "## Example dialogue and lasting voice\n"+r.exampleDialogueAssessment,
    ...(r.visual ? ["## Visual match: "+r.visual.score+"/100\n"+r.visual.notes] : [])
  ].join("\n\n");
  if(mode==="single") return audit(result);
  return [
    "# Card comparison", result.comparison.verdict,
    "## A advantages\n"+result.comparison.aAdvantages.map(x=>"- "+x).join("\n"),
    "## B advantages\n"+result.comparison.bAdvantages.map(x=>"- "+x).join("\n"),
    "## Shared ground\n"+result.comparison.sharedGround.map(x=>"- "+x).join("\n"),
    "## Differences in scope\n"+result.comparison.scopeDifferences.map(x=>"- "+x).join("\n"),
    "\n---\n",audit(result.cardA),"\n---\n",audit(result.cardB)
  ].join("\n\n");
}
export function downloadText(name, data, mime) {
  const blob = new Blob([data],{type:mime});
  const url = URL.createObjectURL(blob);
  const anchor=document.createElement("a"); anchor.href=url;anchor.download=name;
  anchor.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
