import {parseCard,renderCard} from './card-context.js?v=5.5';
export function mountFieldEditor({which,onChange}){const raw=document.getElementById('card'+which),container=document.getElementById('fields'+which),toggle=document.getElementById('editorMode'+which);let open=false;
  const build=()=>{container.replaceChildren();if(!raw.value.trim()){container.textContent='Import or paste a card to edit its fields.';return;}let card;try{card=parseCard(raw.value);}catch(e){container.textContent='Cannot safely split this card: '+e.message;return;}
    const info=document.createElement('p');info.className='micro';info.textContent='Individual fields remain part of the same card. Edits preserve field boundaries and greeting identity.';container.append(info);
    card.sections.forEach((section,index)=>{const d=document.createElement('details');d.className='field-section';if(index===0)d.open=true;const title=document.createElement('summary');title.textContent=section.name||'Unstructured text';const field=document.createElement('textarea');field.spellcheck=false;field.value=section.body||'';field.setAttribute('aria-label',title.textContent);field.rows=7;
      field.addEventListener('input',()=>{section.body=field.value;raw.value=renderCard(card,{markers:true});onChange();});d.append(title,field);container.append(d);});
  };
  toggle.addEventListener('click',()=>{open=!open;raw.hidden=open;container.hidden=!open;toggle.textContent=open?'Raw editor':'Structured editor';toggle.setAttribute('aria-pressed',String(open));if(open)build();});raw.addEventListener('input',()=>{if(open)build();});return {refresh(){if(open)build();}};
}
