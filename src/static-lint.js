import {parseCard} from './card-context.js?v=5.5';

// Mechanical warnings only. JSON extension/lorebook/metadata payloads are not
// prose: nested JSON objects legitimately contain adjacent closing braces "}}".
const STRUCTURED_FIELD=/^(?:Extensions|Lorebook|Additional Card Metadata|Card Format Metadata|Card Metadata(?:\s*\(.*\))?)$/i;
function isSerializedData(section){
  if(STRUCTURED_FIELD.test(section.name||''))return true;
  try{
    const value=JSON.parse(section.body||'');
    return value!==null&&typeof value==='object';
  }catch{return false;}
}
export function lintCard(input){
  const card=parseCard(input),warnings=[...card.warnings];
  for(const section of card.sections){
    if(isSerializedData(section))continue;
    const body=section.body||'',label=section.name||'Unstructured text';
    const open=(body.match(/{{/g)||[]).length,close=(body.match(/}}/g)||[]).length;
    if(open!==close)warnings.push(label+': mismatched double-brace delimiter ('+open+' opening, '+close+' closing).');
    if(/{{(?:char|user)}(?!})/.test(body))
      warnings.push(label+': possible malformed {{char}}/{{user}} macro; check closing braces.');
  }
  return [...new Set(warnings)];
}
