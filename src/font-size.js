// Text-only scaling. A separate preference cannot change a captured audit run.
const STORAGE_KEY='card-analyzer-5-font-size';
const MIN=80,MAX=200,STEP=10;
const $=id=>document.getElementById(id);
const range=$('fontSizeRange'),output=$('fontSizeValue');
const decrease=$('fontSizeDecrease'),increase=$('fontSizeIncrease'),reset=$('fontSizeReset');
function normalize(value) {
  const number=Number(value);
  return value!==null&&value!==''&&Number.isFinite(number)
    ?Math.max(MIN,Math.min(MAX,Math.round(number/STEP)*STEP)):100;
}
let size=100;
try{size=normalize(localStorage.getItem(STORAGE_KEY));}catch{}
function apply(value,save=true) {
  size=normalize(value);
  document.documentElement.style.setProperty('--text-scale',String(size/100));
  range.value=String(size);range.setAttribute('aria-valuetext',size+' percent');
  output.textContent=size+'%';
  decrease.disabled=size<=MIN;increase.disabled=size>=MAX;reset.disabled=size===100;
  if(save)try{localStorage.setItem(STORAGE_KEY,String(size));}catch{}
}
range.addEventListener('input',()=>apply(range.value));
decrease.addEventListener('click',()=>apply(size-STEP));
increase.addEventListener('click',()=>apply(size+STEP));
reset.addEventListener('click',()=>apply(100));
apply(size,false);
