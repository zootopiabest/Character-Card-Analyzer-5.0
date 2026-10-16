import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import vm from 'node:vm';
import {APP_VERSION} from '../src/version.js';
import {initPwa} from '../src/pwa.js';

const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const scope='https://example.github.io/Character-Card-Analyzer-5.0/';
function worker() {
  const handlers={}, stores=new Map();let claimed=0,skipped=0,network=0;
  const caches={
    async open(name) {
      if(!stores.has(name)) stores.set(name,new Map());
      const cache=stores.get(name);
      return {async addAll(urls){for(const url of urls) cache.set(url,new Response(url));},async match(url){return cache.get(url);}};
    },
    async keys(){return [...stores.keys()]}, async delete(name){return stores.delete(name)}
  };
  const self={registration:{scope},clients:{async claim(){claimed++}},async skipWaiting(){skipped++},addEventListener:(type,fn)=>handlers[type]=fn};
  const context=vm.createContext({self,caches,URL,Set,fetch:async()=>{network++;return new Response('network')}});
  vm.runInContext(read('sw.js')+'\nglobalThis.state={CACHE,PREFIX,SHELL,INDEX,VERSION};',context);
  async function dispatch(type,props={}) {
    let lifetime=Promise.resolve(),response;
    handlers[type]({...props,waitUntil(p){lifetime=p},respondWith(p){response=p}});
    await lifetime;return response ? await response : null;
  }
  return {state:context.state,stores,dispatch,counts:()=>({claimed,skipped,network})};
}

test('manifest has a separate project identity, standalone launch, and real PNG sizes',()=>{
  const m=JSON.parse(read('manifest.webmanifest'));
  assert.equal(new URL(m.id,scope).href,scope);
  assert.equal(new URL(m.start_url,scope).href,scope);
  assert.equal(new URL(m.scope,scope).href,scope);
  assert.equal(m.display,'standalone');assert.equal(m.short_name,'Analyzer 5');
  for(const size of [192,512]) {
    const icon=m.icons.find(i=>i.sizes===`${size}x${size}` && i.purpose==='any');assert.ok(icon);
    const bytes=readFileSync(new URL(icon.src,root));assert.equal(bytes.subarray(1,4).toString(),'PNG');
    assert.equal(bytes.readUInt32BE(16),size);assert.equal(bytes.readUInt32BE(20),size);
  }
  assert.match(read('index.html'),/rel="manifest" href="\.\/manifest.webmanifest"/);
  assert.match(read('index.html'),/apple-touch-icon/);
});
test('precache is a complete matching release under the GitHub Pages subpath',()=>{
  const {state}=worker();assert.equal(state.VERSION,APP_VERSION);
  function files(dir){return readdirSync(new URL(dir,root),{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(dir+e.name+'/'):[dir+e.name]);}
  for(const file of files('src/').filter(f=>f.endsWith('.js'))) assert.ok(state.SHELL.includes(new URL(file+'?v='+APP_VERSION,scope).href),file);
  for(const url of state.SHELL) {
    assert.ok(url.startsWith(scope));const path=new URL(url).pathname.slice(new URL(scope).pathname.length);
    assert.ok(readFileSync(new URL(path,root)).length,path);
  }
  for(const match of read('index.html').matchAll(/(?:src|href)="\.\/([^"?]+)\?v=([^\"]+)"/g)) {
    assert.equal(match[2],APP_VERSION);assert.ok(state.SHELL.includes(new URL(match[1]+'?v='+match[2],scope).href));
  }
});
test('offline navigations and modules use one cached release, without automatic activation',async()=>{
  const w=worker();await w.dispatch('install');assert.equal(w.counts().skipped,0);
  const response=await w.dispatch('fetch',{request:{url:scope+'?source=home',method:'GET',mode:'navigate'}});
  assert.equal(await response.text(),w.state.INDEX);
  const asset=w.state.SHELL.find(s=>s.includes('/src/app.js'));
  const js=await w.dispatch('fetch',{request:{url:asset,method:'GET',mode:'cors'}});
  assert.equal(await js.text(),asset);assert.equal(w.counts().network,0);
});
test('service worker never intercepts provider traffic, uploads, other projects or unknown requests',async()=>{
  const w=worker();await w.dispatch('install');
  for(const request of [
    {url:'https://api.openai.com/v1/chat/completions',method:'POST'},
    {url:'https://openrouter.ai/api/v1/models',method:'GET'},
    {url:scope+'api',method:'POST'},
    {url:'https://example.github.io/Character-card-Analyzer/',method:'GET',mode:'navigate'},
    {url:scope+'private-report.json',method:'GET'},
    {url:scope+'README.md',method:'GET',mode:'navigate'},
    {url:scope+'src/app.js?v=old',method:'GET'}
  ]) assert.equal(await w.dispatch('fetch',{request}),null,request.url);
  assert.equal(w.counts().network,0);
});
test('activation removes only this project’s obsolete caches; update requires explicit message',async()=>{
  const w=worker();await w.dispatch('install');
  const old=w.state.PREFIX+'5.1.0';w.stores.set(old,new Map());
  const unrelated=['workbox-old-analyzer','card-analyzer-5:https://example.github.io/other/:5.1.0'];
  for(const key of unrelated)w.stores.set(key,new Map());
  await w.dispatch('activate');assert.ok(!w.stores.has(old));assert.ok(w.stores.has(w.state.CACHE));
  for(const key of unrelated)assert.ok(w.stores.has(key));assert.equal(w.counts().claimed,1);
  await w.dispatch('message',{data:{type:'unrelated'}});assert.equal(w.counts().skipped,0);
  await w.dispatch('message',{data:{type:'SKIP_WAITING'}});assert.equal(w.counts().skipped,1);
});

const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function withUi(run,{installed=false,failRegistration=false}={}) {
  class El extends EventTarget {hidden=true;disabled=false;textContent='';}
  const elements=Object.fromEntries(['installApp','pwaNotice','pwaMessage','updateApp','analyzeButton'].map(id=>[id,new El()]));
  const win=new EventTarget(),doc=new EventTarget(),sw=new EventTarget(),media=new EventTarget(),reg=new EventTarget();
  let reloads=0,posted=[],registered;
  media.matches=installed;win.matchMedia=()=>media;win.isSecureContext=true;win.location={reload(){reloads++}};
  doc.getElementById=id=>elements[id];reg.waiting=null;
  sw.register=async(url,options)=>{registered={url,options};if(failRegistration)throw Error('offline');return reg};
  const prior={};for(const [key,value] of Object.entries({window:win,document:doc,navigator:{serviceWorker:sw}})) {
    prior[key]=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{value,configurable:true});
  }
  try {
    initPwa();await tick();
    await run({elements,win,sw,reg,registered,posted,reloads:()=>reloads,
      waiting(){reg.waiting={postMessage:m=>posted.push(m)};reg.installing=new EventTarget();reg.installing.state='installed';reg.dispatchEvent(new Event('updatefound'));reg.installing.dispatchEvent(new Event('statechange'));}
    });
  } finally {for(const key of Object.keys(prior))if(prior[key])Object.defineProperty(globalThis,key,prior[key]);else delete globalThis[key];}
}
test('install button handles supported prompts, dismissal, fallback and installed mode',async()=>{
  await withUi(async({elements:e,win,registered})=>{
    assert.equal(e.installApp.hidden,false);assert.equal(registered.options.updateViaCache,'none');
    assert.match(registered.url.href,/\/sw\.js$/);assert.match(registered.options.scope,/analyzer5\/$/);
    e.installApp.dispatchEvent(new Event('click'));assert.match(e.pwaMessage.textContent,/Add to Home screen/);
    let prompted=0;const event=new Event('beforeinstallprompt',{cancelable:true});
    Object.assign(event,{async prompt(){prompted++},userChoice:Promise.resolve({outcome:'dismissed'})});
    win.dispatchEvent(event);assert.equal(event.defaultPrevented,true);
    e.installApp.dispatchEvent(new Event('click'));await tick();assert.equal(prompted,1);assert.equal(e.installApp.disabled,false);assert.equal(e.installApp.hidden,false);
    win.dispatchEvent(new Event('appinstalled'));assert.equal(e.installApp.hidden,true);
  });
  await withUi(async({elements})=>assert.equal(elements.installApp.hidden,true),{installed:true});
});
test('updates never reload automatically or during an audit, but explicit idle update activates',async()=>{
  await withUi(async({elements:e,waiting,sw,posted,reloads})=>{
    waiting();assert.equal(e.updateApp.hidden,false);
    sw.dispatchEvent(new Event('controllerchange'));assert.equal(reloads(),0);
    e.analyzeButton.disabled=true;e.updateApp.dispatchEvent(new Event('click'));assert.equal(posted.length,0);assert.match(e.pwaMessage.textContent,/still running/);
    e.analyzeButton.disabled=false;e.updateApp.dispatchEvent(new Event('click'));assert.deepEqual(posted,[{type:'SKIP_WAITING'}]);
    sw.dispatchEvent(new Event('controllerchange'));assert.equal(reloads(),1);
  });
});
test('service worker registration failure leaves online auditing enabled with a useful notice',async()=>{
  await withUi(async({elements:e})=>{assert.equal(e.analyzeButton.disabled,false);assert.match(e.pwaMessage.textContent,/online analyzer still works/);},{failRegistration:true});
});
