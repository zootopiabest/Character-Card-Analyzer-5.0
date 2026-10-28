// All raw responses and edits stay in memory. Only the repair button invokes
// issue.repair; rendering, opening Review and local validation do not use fetch.
export function mountOutputReview({getElement,status,onShow=()=>{}}) {
  const $=getElement,queue=[];
  let active=null;
  function controls(item) {
    $('repairModelOutput').disabled=Boolean(item?.sending);
    $('applyReviewedOutput').disabled=Boolean(item?.sending);
    $('keepPartialOutput').disabled=Boolean(item?.sending);
    $('skipModelOutput').disabled=Boolean(item?.sending);
    $('outputReviewText').disabled=Boolean(item?.sending);
    $('repairModelOutput').textContent=item?.sending?'Repairing…':'Send off for repair?';
  }
  function showNext() {
    active=queue[0]||null;
    $('outputRecovery').hidden=!active;
    if(!active)return;
    const {issue}=active;
    $('outputRecoveryMessage').textContent=issue.label+': '+issue.message;
    $('outputReviewEditor').hidden=true;
    $('reviewModelOutput').setAttribute('aria-expanded','false');
    $('outputReviewText').value=issue.rawResponse;
    $('outputRecoveryFeedback').textContent=issue.warnings.join('\n');
    $('keepPartialOutput').hidden=!active.partial;
    $('skipModelOutput').hidden=!issue.allowSkip;
    controls(active);onShow(issue);
    status('Response needs review. No repair request has been sent.',true);
  }
  function remove(item) {
    const wasActive=active===item,index=queue.indexOf(item);
    if(index>=0)queue.splice(index,1);
    item.signal?.removeEventListener('abort',item.abort);
    if(wasActive)showNext();
  }
  function accept(item,checked,method) {
    remove(item);item.resolve({value:checked.value,method});
    if(!active)status('Response accepted. Continuing the captured audit…');
  }
  function inspect(item,text) {
    item.partial=null;$('keepPartialOutput').hidden=true;
    const checked=item.issue.check(text);
    if(checked.warnings.length) {
      item.partial=checked;$('keepPartialOutput').hidden=false;
      $('outputRecoveryFeedback').textContent='Still incomplete:\n'+checked.warnings.join('\n');
      return null;
    }
    return checked;
  }
  $('reviewModelOutput').addEventListener('click',()=>{
    if(!active)return;
    const open=$('outputReviewEditor').hidden;
    $('outputReviewEditor').hidden=!open;
    $('reviewModelOutput').setAttribute('aria-expanded',String(open));
    if(open)$('outputReviewText').focus();
  });
  $('applyReviewedOutput').addEventListener('click',()=>{
    const item=active;if(!item||item.sending)return;
    try {
      const checked=inspect(item,$('outputReviewText').value);
      if(checked)accept(item,checked,item.modelDraft===$('outputReviewText').value?'model':'manual');
    }catch(error){$('outputRecoveryFeedback').textContent=error.message;}
  });
  $('outputReviewText').addEventListener('input',()=>{
    if(!active)return;
    active.partial=null;$('keepPartialOutput').hidden=true;
    $('outputRecoveryFeedback').textContent='Edits have not been validated. Choose “Validate & continue” to check them locally.';
  });
  $('repairModelOutput').addEventListener('click',async()=>{
    const item=active;if(!item||item.sending)return;
    item.sending=true;controls(item);
    status('Sending one JSON repair request…');
    $('outputRecoveryFeedback').textContent='Sending one repair request using this run’s provider and model…';
    try {
      const raw=await item.issue.repair($('outputReviewText').value);
      if(active!==item||item.signal?.aborted)return;
      $('outputReviewText').value=raw;item.modelDraft=raw;
      $('outputReviewEditor').hidden=false;$('reviewModelOutput').setAttribute('aria-expanded','true');
      // A successful LLM repair is shown for review before it is applied.
      const checked=inspect(item,raw);
      if(checked)$('outputRecoveryFeedback').textContent='Repair passed validation. Review it, then choose “Validate & continue”.';
      status(checked?'Repair returned. Review the response before continuing.':'Repair returned, but some fields still need review.',!checked);
    }catch(error) {
      if(active!==item||item.signal?.aborted)return;
      if(typeof error.rawResponse==='string') {
        $('outputReviewText').value=error.rawResponse;item.modelDraft=error.rawResponse;
        item.partial=null;$('keepPartialOutput').hidden=true;
      }
      $('outputReviewEditor').hidden=false;$('reviewModelOutput').setAttribute('aria-expanded','true');
      $('outputRecoveryFeedback').textContent='Repair did not succeed: '+error.message+' No further request was sent.';
      status('Repair did not succeed. The response is available for review; no further request was sent.',true);
    }finally{item.sending=false;if(active===item)controls(item);}
  });
  $('keepPartialOutput').addEventListener('click',()=>{
    const item=active;if(!item?.partial||item.sending)return;
    // Revalidate the current text rather than applying an earlier cached draft.
    try {accept(item,item.issue.check($('outputReviewText').value),'partial');}
    catch(error){item.partial=null;$('keepPartialOutput').hidden=true;$('outputRecoveryFeedback').textContent=error.message;}
  });
  $('skipModelOutput').addEventListener('click',()=>{
    const item=active;if(!item||item.sending||!item.issue.allowSkip)return;
    remove(item);item.reject(Object.assign(new Error('Diagnostic skipped after output validation failed.'),{rawResponse:item.issue.rawResponse}));
  });
  return {
    review(issue,signal) {
      signal?.throwIfAborted();
      return new Promise((resolve,reject)=>{
        const item={issue,signal,resolve,reject,partial:issue.partial,sending:false};
        item.abort=()=>{remove(item);reject(signal.reason);};
        signal?.addEventListener('abort',item.abort,{once:true});
        queue.push(item);if(!active)showNext();
      });
    }
  };
}
