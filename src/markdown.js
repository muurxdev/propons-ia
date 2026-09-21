/* ================= MARKDOWN simples ================= */
function inline(s){
  return s.replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/(^|[^*])\*([^*\n]+)\*/g,'$1<i>$2</i>');
}
function md(src){
  const parts=src.split(/```/); let html='';
  parts.forEach((p,idx)=>{
    if(idx%2){ html+='<pre><code>'+esc(p.replace(/^[a-zA-Z]*\n/,''))+'</code></pre>'; return; }
    const lines=esc(p).split('\n'); let list=null, table=[];
    const flushT=()=>{ if(!table.length) return; html+='<table>'+table.map((r,i)=>'<tr>'+r.replace(/^\||\|$/g,'').split('|').map(c=>i?`<td>${inline(c.trim())}</td>`:`<th>${inline(c.trim())}</th>`).join('')+'</tr>').join('')+'</table>'; table=[]; };
    const flushL=()=>{ if(list){ html+=`</${list}>`; list=null; } };
    for(const ln of lines){
      if(/^\s*\|/.test(ln)){ flushL(); if(!/^[\s|:-]+$/.test(ln)) table.push(ln.trim()); continue; } else flushT();
      let m;
      if((m=ln.match(/^(#{1,4})\s+(.*)/))){ flushL(); const h=Math.min(m[1].length+1,4); html+=`<h${h}>${inline(m[2])}</h${h}>`; }
      else if((m=ln.match(/^\s*[-*]\s+(.*)/))){ if(list!=='ul'){flushL();html+='<ul>';list='ul';} html+=`<li>${inline(m[1])}</li>`; }
      else if((m=ln.match(/^\s*\d+[.)]\s+(.*)/))){ if(list!=='ol'){flushL();html+='<ol>';list='ol';} html+=`<li>${inline(m[1])}</li>`; }
      else if(ln.trim()===''){ flushL(); }
      else { flushL(); html+=`<p>${inline(ln)}</p>`; }
    }
    flushL(); flushT();
  });
  return html;
}
