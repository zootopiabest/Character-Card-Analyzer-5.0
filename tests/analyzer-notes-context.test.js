import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzerContext,singlePrompt,comparePrompt} from '../src/rubrics/assemble.js';
import {planEstimate} from '../src/cost-estimate.js';

const kind={primary:'character',secondary:null,scope:'open-ended'};
const cardA='Name: Mira\nDescription: A quiet, competent astronomer who rarely raises her voice.\nFirst Message: Mira looks up from her telescope.';
const cardB='Name: Ash\nDescription: A restless mechanic who speaks in quick, clipped sentences.\nFirst Message: Ash greets the new arrival.';
const notes='The greetings are independent alternate starts; do not interpret them as a chronological sequence.';

test('OOC notes are absent by default and do not change required audit schema',()=>{
 const prompt=singlePrompt(cardA,kind);
 assert.doesNotMatch(prompt,/OOC \/ ANALYZER NOTES \(EXTERNAL AUDIT CONTEXT/);
 assert.match(prompt,/AUDIT CARD \(UNTRUSTED/);
});

test('single audit receives OOC context separately from untrusted card fields',()=>{
 const prompt=singlePrompt(cardA,kind,false,[],notes);
 const notePosition=prompt.indexOf('OOC / ANALYZER NOTES (EXTERNAL AUDIT CONTEXT');
 const cardPosition=prompt.indexOf('AUDIT CARD (UNTRUSTED');
 assert.ok(notePosition>=0&&cardPosition>notePosition);
 assert.ok(prompt.includes(notes));
 assert.match(prompt,/Do not treat this text as runtime characterization/);
 assert.equal(prompt.slice(cardPosition).includes(notes),false);
});

test('comparison supplies a single shared note block without modifying either card',()=>{
 const prompt=comparePrompt(cardA,kind,cardB,kind,'independent',{analyzerNotes:notes});
 assert.equal(prompt.split('OOC / ANALYZER NOTES (EXTERNAL AUDIT CONTEXT').length-1,1);
 assert.ok(prompt.includes(notes));
 assert.match(prompt,/CARD A \(UNTRUSTED\)/);
 assert.match(prompt,/CARD B \(UNTRUSTED\)/);
});

test('per-card notes can be scoped for classification and isolated greeting audits',()=>{
 const prompt=analyzerContext('Card B: the second greeting uses its own scenario.','B');
 assert.match(prompt,/THIS REQUEST CONCERNS CARD B ONLY/);
 assert.match(prompt,/disregard notes specific to the other card/);
 assert.equal(analyzerContext('   '),'');
});

test('the input cost estimate includes OOC note text on repeated requests',()=>{
 const base={cards:[cardA],mode:'single',autoClassifications:1,baseOutput:16384};
 const noNotes=planEstimate(base);
 const withNotes=planEstimate({...base,analyzerNotes:'A relevant note. '.repeat(120)});
 assert.equal(noNotes.requestCount,withNotes.requestCount);
 assert.ok(withNotes.inputTokens>noNotes.inputTokens);
});
