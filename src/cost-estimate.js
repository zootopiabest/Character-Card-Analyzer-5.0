import {CACHE_KEY,toBrowserModels} from './openrouter-models.js?v=5.5';
import {parseCard,greetingsOf,renderCard} from './card-context.js?v=5.5';
import {isolateGreetings} from './greeting-context.js?v=5.5';
// Character heuristics are not tokenizer-accurate. Output is a ceiling, not a forecast.
export function priceForModel(provider,model){if(provider!=='openrouter')return null;try{const saved=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');const match=toBrowserModels(saved?.models).find(m=>m.id===model);return match&&match.inputPrice!==null&&match.outputPrice!==null?{input:match.inputPrice,output:match.outputPrice}:null;}catch{return null;}}
export function planEstimate({cards,mode='single',separateGreetings=false,perGreeting=[],autoClassifications=0,baseOutput=16384}){let mainChars=11000,diagnosticChars=0,diagnosticCalls=0,bonus=0;
  for(let i=0;i<cards.length;i++){const card=parseCard(cards[i]),n=greetingsOf(card).length;mainChars+=renderCard(card).length;const split=separateGreetings&&n>1;if(perGreeting[i]&&!split)bonus+=250*n;if(split){const isolation=isolateGreetings(card);diagnosticCalls+=n;for(let j=0;j<n;j++)diagnosticChars+=2200+isolation.active(j).length;}}
  const classificationChars=cards.reduce((sum,c)=>sum+1600+renderCard(parseCard(c)).length,0);
  const inputs=Math.ceil(mainChars/3.8)+Math.ceil(diagnosticChars/3.8)+(autoClassifications?Math.ceil(classificationChars/3.8):0);
  const mainOutput=Math.max(1024,baseOutput+bonus),diagnosticOutput=Math.min(baseOutput,4096);
  return {inputTokens:inputs,mainOutput,diagnosticCalls,requestCount:1+autoClassifications+diagnosticCalls,maxOutputTokens:mainOutput+diagnosticCalls*diagnosticOutput+autoClassifications*Math.min(1024,baseOutput),extraGreetingTokens:bonus};
}
export function estimatePricing(plan,price){if(!price)return null;return {input:plan.inputTokens/1e6*price.input,ceiling:plan.inputTokens/1e6*price.input+plan.maxOutputTokens/1e6*price.output};}
export function formatUSD(value){return '$'+value.toFixed(value<0.01?5:3);}
