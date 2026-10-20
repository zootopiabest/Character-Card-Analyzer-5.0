import {parseCard,renderCard,greetingsOf} from './card-context.js?v=5.2.0';
export function isolateGreetings(input) {
  const card=parseCard(input),greetings=greetingsOf(card);
  const persistent=card.sections.filter(s=>!s.greetingId);
  const activeCard=index=>{
    if(!Number.isInteger(index)||index<0||index>=greetings.length)throw new RangeError('Unknown greeting index.');
    const greeting=greetings[index];let override=null;
    const sections=persistent.map(s=>{
      if(s.name?.toLowerCase()!=='extensions')return {...s};
      let ext;try{ext=JSON.parse(s.body);}catch{return {...s};}
      if(ext?.wyvern&&Array.isArray(ext.wyvern.greetings)){
        override=Number.isInteger(greeting.originalIndex)?ext.wyvern.greetings[greeting.originalIndex]:null;
        const wyvern={...ext.wyvern};delete wyvern.greetings;ext={...ext,wyvern};
      }
      return {...s,body:JSON.stringify(ext)};
    });
    if(override&&typeof override==='object'){
      if(typeof override.scenario==='string'&&override.scenario.trim()){
        const scene=sections.find(s=>s.name?.toLowerCase()==='scenario');
        if(scene)scene.body=override.scenario;else sections.push({name:'Scenario',body:override.scenario});
      }
      const rest={...override};delete rest.scenario;
      if(Object.keys(rest).length)sections.push({name:'Active Greeting Runtime Settings',body:JSON.stringify(rest)});
    }
    if(greeting.groupOnly)sections.push({name:'Active Greeting Scope',body:'This opening is a group-chat start.'});
    sections.push({name:'First Message',body:greeting.text,greetingId:greeting.id,originalIndex:greeting.originalIndex});
    return {cardContext:true,sections,warnings:card.warnings,format:card.format};
  };
  const baseCard=greetings.length?activeCard(0):{...card,sections:persistent};
  return {greetings,baseCard,base:renderCard(baseCard),activeCard,active:index=>renderCard(activeCard(index)),warnings:card.warnings};
}
