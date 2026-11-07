import test from 'node:test';
import assert from 'node:assert/strict';
import {FOUNDATION,CORE_CRITERIA} from '../src/rubrics/core.js';
import {SPECIALISTS} from '../src/rubrics/specialists.js';
import {rubricPrompt,singlePrompt,comparePrompt} from '../src/rubrics/assemble.js';

const assassin=JSON.stringify({data:{
  name:'Physical assassin',
  description:'Physical fighter with low magical aptitude and stable personal habits.',
  scenario:'This world has magic soft-caps, level scaling and healing rules applying to NPCs and player characters.',
  first_mes:'The assassin leaves local flowers at the door.'
}});
const kind={primary:'character',secondary:null};

test('world systems can matter without personal use and are not automatic bloat',()=>{
  assert.match(FOUNDATION,/SCENARIO & WORLD RULES/);
  assert.match(FOUNDATION,/NOT restricted to the featured character/);
  assert.match(FOUNDATION,/physical combatant, never casts spells/);
  assert.match(FOUNDATION,/INFORMATION ECONOMY/);
  assert.match(FOUNDATION,/Speculative token crowding or a rule not used in the greeting is not evidence of bloat/);
  assert.match(CORE_CRITERIA.inference,/World rules governing other actors or possible future interactions/);
  assert.match(SPECIALISTS.characterScenario.criteria.sceneIntegration,/Setting-wide constraints/);
  assert.match(SPECIALISTS.scenarioCharacter.criteria.premiseFunction,/NPCs, enemies, user abilities or later scenes/);
});

test('world-rule protection reaches single, comparison, and specialist prompts',()=>{
  for(const prompt of [singlePrompt(assassin,kind),comparePrompt(assassin,kind,assassin,kind)]){
    assert.match(prompt,/SCENARIO & WORLD RULES/);
    assert.match(prompt,/INFORMATION ECONOMY/);
    assert.match(prompt,/World rules governing other actors or possible future interactions/);
  }
  for(const primary of ['character','characterScenario','scenarioCharacter','rpg']){
    const prompt=rubricPrompt({primary,secondary:null});
    assert.match(prompt,/SCENARIO & WORLD RULES/);
    assert.match(prompt,/INFORMATION ECONOMY/);
  }
});
