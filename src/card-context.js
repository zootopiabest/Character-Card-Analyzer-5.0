// Preserve card field boundaries until the final prompt is rendered.
const FIELDS = {
  Name:['name','char_name'], Description:['description','char_persona'], Personality:['personality'],
  Scenario:['scenario','world_scenario'], 'Example Dialogue':['mes_example','example_dialogue'],
  'System Prompt':['system_prompt'], 'Post History Instructions':['post_history_instructions'],
  'Creator Notes (non-runtime metadata)':['creator_notes']
};
const firstKeys=['first_mes','char_greeting','first_message'];
const alternateKeys=['alternate_greetings','alternateGreetings','alt_greetings'];
const textOf=v=>typeof v==='string'?v:typeof v?.content==='string'?v.content:typeof v?.text==='string'?v.text:'';
const openingName=/^(First Message|Alternate Greeting(?:\s+\d+)?(?:\s*\(.*\))?|Group-only Greeting\s+\d+(?:\s*\(.*\))?)$/i;
const fieldName=/^(Intended Frontend|Name|Description|Personality|Scenario|First Message|Alternate Greeting(?:\s+\d+)?(?:\s*\(.*\))?|Group-only Greeting\s+\d+(?:\s*\(.*\))?|Example Dialogue|System Prompt|Post History Instructions|Creator Notes(?:\s*\(.*\))?|Intent Tags(?:\s*\(.*\))?|Lorebook|Extensions|Additional Card Metadata|Card Format Metadata|Card Metadata(?:\s*\(.*\))?)$/i;
const fieldAliases=new Map([
  ['main prompt (description field)','Description'],
  ['main prompt','Description'],
  ['message example','Example Dialogue'],
  ['message examples','Example Dialogue'],
  ['character metadata','Card Metadata (non-runtime metadata)']
]);
function unwrapField(body) {
  const lines=body.trim().split('\n'),start=lines[0]?.match(/^ {0,3}(`{3,}|~{3,})[^\r\n]*\r?$/);
  if(start&&lines.length>1){
    const end=lines.at(-1).match(/^ {0,3}(`{3,}|~{3,})[ \t]*\r?$/);
    if(end&&end[1][0]===start[1][0]&&end[1].length>=start[1].length)return lines.slice(1,-1).join('\n').trim();
  }
  return body.trim();
}
function markdownSections(input) {
  const candidates=[];let fence=null,offset=0,alternateContainer=null;
  for(const line of input.split(/(?<=\n)/)){
    const delimiter=line.match(/^ {0,3}(`{3,}|~{3,})([^\r\n]*)\r?\n?$/);
    if(delimiter){
      if(!fence)fence=delimiter[1];
      else if(delimiter[1][0]===fence[0]&&delimiter[1].length>=fence.length&&!delimiter[2].trim())fence=null;
    }else if(!fence){
      const match=line.match(/^(#{1,6})[ \t]+([^\r\n]+)\r?\n?$/);
      if(match){
        const level=match[1].length,rawName=match[2].trim().replace(/[ \t]+#+[ \t]*$/,''),lower=rawName.toLowerCase();
        const closedContainer=alternateContainer!==null&&level<=alternateContainer;
        if(closedContainer)alternateContainer=null;
        const container=/^(?:alternate|alternative) greetings$/i.test(rawName);
        if(container)alternateContainer=level;
        const child=alternateContainer!==null&&level>alternateContainer?rawName.match(/^Greeting\s+([1-9]\d*)(?:\s*[:(—–-].*)?$/i):null;
        const name=fieldAliases.get(lower)||rawName;
        if(container||child||fieldAliases.has(lower)||fieldName.test(name)){
          const extra=child?{greetingId:'alternate:'+(Number(child[1])-1),originalIndex:Number(child[1])}:{};
          candidates.push({name,index:offset,length:line.length,level,container,...extra});
        }else if(closedContainer){
          // An unrecognized sibling still ends a greeting container. Preserve it
          // as its own field rather than attaching it to the final opening.
          candidates.push({name,index:offset,length:line.length,level});
        }
      }
    }
    offset+=line.length;
  }
  const level=Math.min(...candidates.map(m=>m.level));
  const matches=candidates.filter(m=>m.level===level||m.container||m.greetingId||openingName.test(m.name)),sections=[];
  if(!matches.length)sections.push({name:null,body:input});
  else{
    if(matches[0].index>0)sections.push({name:null,body:input.slice(0,matches[0].index).trim()});
    matches.forEach((m,i)=>{
      const body=unwrapField(input.slice(m.index+m.length,matches[i+1]?.index??input.length));
      if(m.container){
        if(body)sections.push({name:'Alternate Greeting Notes (non-runtime metadata)',body});
      }else sections.push({name:m.name,body,...(m.greetingId?{greetingId:m.greetingId,originalIndex:m.originalIndex}:{})});
    });
  }
  if(/exported from WyvernChat Character Studio/i.test(sections[0]?.name===null?sections[0].body:''))
    sections.unshift({name:'Intended Frontend',body:'Wyvern (native extensions.wyvern runtime behavior applies, including greeting-specific scenario overrides and other frontend facilities).'});
  return {sections,matches};
}
export function formatLorebook(book) {
  const entries=Array.isArray(book)?book:Array.isArray(book?.entries)?book.entries:
    book?.entries&&typeof book.entries==='object'?Object.values(book.entries):null;
  if(!entries)return JSON.stringify(book);
  const config=Array.isArray(book)?{}:Object.fromEntries(Object.entries(book).filter(([key])=>key!=='entries'));
  return ['Activation follows the intended frontend: enabled constant entries are always-on as configured; keyword entries trigger conditionally by design.',
    ...(Object.keys(config).length?['Book configuration: '+JSON.stringify(config)]:[]),
    ...entries.map((entry,i)=>{
      if(!entry||typeof entry!=='object')return 'Entry '+(i+1)+': '+String(entry);
      const state=entry.enabled===false?'disabled':entry.constant===true?'constant/always-on requested':'conditional/triggered';
      const meta=Object.fromEntries(Object.entries(entry).filter(([key])=>key!=='content'));
      return '### Entry '+(i+1)+': '+state+'\nActivation: '+JSON.stringify(meta)+'\n'+textOf(entry.content);
    })].join('\n\n');
}
function fromJson(parsed) {
  const root=parsed.data&&typeof parsed.data==='object'&&!Array.isArray(parsed.data)?parsed.data:parsed;
  const sections=[],consumed=new Set();
  const add=(name,body,extra={})=>{if(typeof body==='string'&&body.trim())sections.push({name,body,...extra});};
  if(root.extensions?.wyvern&&typeof root.extensions.wyvern==='object')
    add('Intended Frontend','Wyvern (native extensions.wyvern runtime behavior applies, including greeting-specific scenario overrides and other frontend facilities).');
  for(const [name,keys] of Object.entries(FIELDS)) {
    keys.forEach(k=>consumed.add(k));
    add(name,keys.map(k=>root[k]).find(v=>typeof v==='string'&&v.trim()));
  }
  firstKeys.forEach(k=>consumed.add(k));alternateKeys.forEach(k=>consumed.add(k));
  const first=firstKeys.map(k=>root[k]).find(v=>typeof v==='string'&&v.trim());
  add('First Message',first,{greetingId:'first',originalIndex:0});
  const alternatives=alternateKeys.map(k=>root[k]).find(Array.isArray)||[];
  alternatives.forEach((v,i)=>add('Alternate Greeting '+(i+2)+' (separate roleplay start)',textOf(v),{greetingId:'alternate:'+i,originalIndex:i+1}));
  if(Array.isArray(root.group_only_greetings))root.group_only_greetings.forEach((v,i)=>
    add('Group-only Greeting '+(i+1)+' (group start)',textOf(v),{greetingId:'group:'+i,originalIndex:null,groupOnly:true}));
  consumed.add('group_only_greetings');
  if(Array.isArray(root.tags))add('Intent Tags (non-runtime metadata)',JSON.stringify(root.tags));
  consumed.add('tags');
  if(root.character_book||root.lorebook)add('Lorebook',formatLorebook(root.character_book||root.lorebook));
  consumed.add('character_book');consumed.add('lorebook');
  if(root.extensions)add('Extensions',JSON.stringify(root.extensions));
  consumed.add('extensions');
  const rest=Object.fromEntries(Object.entries(root).filter(([key])=>!consumed.has(key)));
  if(Object.keys(rest).length)add('Additional Card Metadata',JSON.stringify(rest));
  const envelope=root!==parsed?Object.fromEntries(Object.entries(parsed).filter(([key])=>key!=='data')):{};
  if(Object.keys(envelope).length)add('Card Format Metadata',JSON.stringify(envelope));
  return {cardContext:true,sections,warnings:[],format:'structured'};
}
function markGreetings(sections) {
  let sequential=0;
  const startsAtOne=sections.some(s=>/^Alternate Greeting 1(?:$|\s*\()/i.test(s.name||''));
  return sections.map(s=>{
    if(!s.name||!openingName.test(s.name))return s;
    if(s.greetingId)return s;
    const first=/^First Message$/i.test(s.name),group=/^Group-only/i.test(s.name);
    const numbered=s.name.match(/Greeting\s+(\d+)/i);
    const index=first?0:numbered?Number(numbered[1])-(group||!startsAtOne?1:0):++sequential;
    sequential=Math.max(sequential,index);
    return {...s,greetingId:first?'first':group?'group:'+index:'alternate:'+(index-1),originalIndex:group?null:index,groupOnly:group};
  });
}
export function parseCard(input) {
  if(input?.cardContext===true&&Array.isArray(input.sections))return input;
  if(typeof input==='object'&&input&&!Array.isArray(input))return fromJson(input);
  if(typeof input!=='string'||!input.trim())throw new Error('Card content is empty.');
  try{const parsed=JSON.parse(input);if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))return fromJson(parsed);}catch{}
  const marker=input.match(/^<!-- cca-fields:(cca-boundary-\d+) -->\r?\n/);
  if(marker){
    const re=new RegExp('^<!-- '+marker[1]+' (.+) -->\\r?\\n','gm');
    const matches=[...input.matchAll(re)],sections=[];
    if(!matches.length)throw new Error('Card field markers are incomplete. Import the original card again.');
    if(input.slice(marker[0].length,matches[0].index).trim())throw new Error('Text before the first card field must be placed inside a field.');
    for(let i=0;i<matches.length;i++){
      let meta;try{meta=JSON.parse(matches[i][1]);}catch{throw new Error('A card field marker was edited. Import the original card again.');}
      if(!meta||typeof meta.name!=='string')throw new Error('Invalid card field marker.');
      let body=input.slice(matches[i].index+matches[i][0].length,matches[i+1]?.index??input.length).trim();
      const title='## '+meta.name;
      if(body.startsWith(title+'\n'))body=body.slice(title.length+1);
      else if(body===title)body='';
      sections.push({name:meta.name,body,greetingId:meta.greetingId,originalIndex:meta.originalIndex,groupOnly:meta.groupOnly});
    }
    return {cardContext:true,sections:markGreetings(sections),warnings:[],format:'marked'};
  }
  // Markdown fields include grouped Wyvern alternates; fenced headings belong
  // to their field body. Keep the inferred-boundary warning for unmarked text.
  const {sections,matches}=markdownSections(input);
  const warnings=matches.length?['Pasted Markdown uses inferred field boundaries. For reliable greeting isolation, import JSON, PNG or CharX, or paste the marked text from an import.']:[];
  return {cardContext:true,sections:markGreetings(sections),warnings,format:'markdown'};
}
export function greetingsOf(input) {
  return parseCard(input).sections.filter(s=>s.greetingId&&s.body.trim()).map(s=>({id:s.greetingId,label:s.name,text:s.body,originalIndex:s.originalIndex,groupOnly:Boolean(s.groupOnly)}));
}
export function renderCard(input,{markers=false}={}) {
  const card=parseCard(input),sections=card.sections;
  if(!markers)return sections.map(s=>s.name?'## '+s.name+'\n'+s.body:s.body).filter(Boolean).join('\n\n');
  let n=0;const contents=sections.map(s=>s.body).join('\n');
  while(contents.includes('cca-boundary-'+n))n++;
  const token='cca-boundary-'+n;
  return '<!-- cca-fields:'+token+' -->\n'+sections.map(s=>{
    const meta={name:s.name||'Unstructured Card Text',...(s.greetingId?{greetingId:s.greetingId,originalIndex:s.originalIndex,groupOnly:s.groupOnly}: {})};
    return '<!-- '+token+' '+JSON.stringify(meta)+' -->\n## '+meta.name+'\n'+s.body;
  }).join('\n\n');
}
export function extractCardText(input) {
  const card=parseCard(input);
  return card.format==='markdown'&&typeof input==='string'?input:renderCard(card,{markers:true});
}
export function cardFeatures(input) {
  const card=parseCard(input),named=pattern=>card.sections.some(s=>s.name&&pattern.test(s.name)&&s.body.trim());
  const greetings=greetingsOf(card);
  return {hasAlternates:greetings.length>1,hasExamples:named(/^Example Dialogue$/i),hasCreatorNotes:named(/^Creator Notes/i),hasLorebook:named(/^Lorebook$/i)};
}
