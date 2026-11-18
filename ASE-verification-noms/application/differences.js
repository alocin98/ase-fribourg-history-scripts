// Word-level alignment. Keep source offsets so display and CSV retain the original text.
// Whitespace-only changes are ignored; case, accents and punctuation are compared.
(function(root) {
  'use strict';
  function tokens(text) {
    return Array.from(text.matchAll(/[\p{L}\p{M}\p{N}]+|[^\s]/gu), m=>({text:m[0].normalize('NFC'),start:m.index,end:m.index+m[0].length}));
  }
  function compare(reference,prediction) {
    const a=tokens(reference),b=tokens(prediction),width=b.length+1;
    const distance=Array.from({length:a.length+1},()=>new Uint32Array(width));
    for(let i=0;i<=a.length;i++)distance[i][0]=i;
    for(let j=0;j<=b.length;j++)distance[0][j]=j;
    for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){
      distance[i][j]=Math.min(distance[i-1][j-1]+(a[i-1].text===b[j-1].text?0:1),distance[i-1][j]+1,distance[i][j-1]+1);
    }
    const steps=[];let i=a.length,j=b.length;
    while(i||j){
      if(i&&j&&a[i-1].text===b[j-1].text&&distance[i][j]===distance[i-1][j-1]){steps.push('equal');i--;j--;}
      else if(i&&j&&distance[i][j]===distance[i-1][j-1]+1){steps.push('replace');i--;j--;}
      else if(i&&distance[i][j]===distance[i-1][j]+1){steps.push('delete');i--;}
      else{steps.push('insert');j--;}
    }
    steps.reverse();
    const groups=[];let start=null; i=0;j=0;
    const range=(list,from,to,text)=>from===to?{start:list[from]?.start??text.length,end:list[from]?.start??text.length}:{start:list[from].start,end:list[to-1].end};
    function flush(){
      if(!start)return;
      groups.push({type:i===start.i?'insert':j===start.j?'delete':'replace',reference:range(a,start.i,i,reference),prediction:range(b,start.j,j,prediction)});start=null;
    }
    for(const step of steps){
      if(step==='equal'){flush();i++;j++;continue;}
      if(!start)start={i,j};
      if(step!=='insert')i++;
      if(step!=='delete')j++;
    }
    flush();return groups;
  }
  root.ASEDifferences={compare};
})(typeof window==='undefined'?globalThis:window);
