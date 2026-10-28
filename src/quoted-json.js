// A narrow fallback for otherwise structured JSON containing prose quotations.
// Unlike general JSON repair, this pass only inserts escapes before embedded
// double quotes. It never adds fields, values, commas, or closing brackets.
// Property names and every non-string token must already be valid JSON.
export function escapeProseQuotes(text) {
  let i=0,depth=0;
  const insertions=[];
  const skip=()=>{while(/[ \t\r\n]/.test(text[i]||'!'))i++;};
  const fail=()=>{throw new Error('Not an unambiguous prose-quote repair.');};
  const keyAfterComma=position=>/^\s*"(?:[^"\\\x00-\x1f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"\s*:/.test(text.slice(position));
  function string(parent,key=false) {
    if(text[i++]!=='"')fail();
    const start=i-1;
    for(;i<text.length;i++) {
      if(text[i]==='\\'){i++;continue;}
      if(text[i]!== '"')continue;
      let next=i+1;while(/[ \t\r\n]/.test(text[next]||'!'))next++;
      let terminal=key?text[next]===':':parent==='object'
        ?text[next]==='}' || text[next]===','&&keyAfterComma(next+1)
        :parent==='array'?(text[next]===']'||text[next]===','&&/^(?:"|\{|\[|-?\d|true\b|false\b|null\b)/.test(text.slice(next+1).trimStart()))
        :next===text.length;
      if(terminal) {
        i++;
        if(key)JSON.parse(text.slice(start,i));
        return;
      }
      if(key)fail();
      insertions.push(i);
    }
    fail();
  }
  function value(parent) {
    skip();
    if(++depth>128)fail();
    const ch=text[i];
    if(ch==='"')string(parent);
    else if(ch==='{'||ch==='[') {
      const object=ch==='{',end=object?'}':']';i++;skip();
      if(text[i]!==end)for(;;) {
        if(object){string('object',true);skip();if(text[i++]!==':')fail();}
        value(object?'object':'array');skip();
        if(text[i]===end)break;
        if(text[i++]!==',')fail();skip();
      }
      if(text[i++]!==end)fail();
    }else {
      const token=/^(?:-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/.exec(text.slice(i));
      if(!token)fail();i+=token[0].length;
    }
    depth--;
  }
  try {
    value('root');skip();
    if(i!==text.length||!insertions.length)return null;
    let previous=0;
    const parts=[];
    for(const position of insertions){parts.push(text.slice(previous,position),'\\');previous=position;}
    parts.push(text.slice(previous));
    const repaired=parts.join('');
    // Reject ambiguity or any additional defect instead of guessing again.
    JSON.parse(repaired);
    return repaired;
  }catch{return null;}
}
