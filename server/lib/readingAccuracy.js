// Transcript comparison, not an acoustic pronunciation diagnosis. Short reading
// units use letters; longer reading uses aligned words so length cannot hide a
// missed short word. Stored historical scores are never rewritten.
function normalizeReadingText(value) {
  return String(value || '').normalize('NFC').toLocaleLowerCase('fil-PH')
    .replace(/[àáâä]/g,'a').replace(/[èéêë]/g,'e').replace(/[ìíîï]/g,'i').replace(/[òóôö]/g,'o').replace(/[ùúûü]/g,'u')
    .replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
}
function align(expected, heard) {
  const matrix=Array.from({length:expected.length+1},(_,i)=>Array.from({length:heard.length+1},(_,j)=>i===0?j:j===0?i:0));
  for(let i=1;i<=expected.length;i++)for(let j=1;j<=heard.length;j++)matrix[i][j]=Math.min(matrix[i-1][j]+1,matrix[i][j-1]+1,matrix[i-1][j-1]+(expected[i-1]===heard[j-1]?0:1));
  const issues=[];let i=expected.length,j=heard.length;
  while(i||j){
    if(i&&j&&expected[i-1]===heard[j-1]&&matrix[i][j]===matrix[i-1][j-1]){i--;j--;}
    else if(i&&j&&matrix[i][j]===matrix[i-1][j-1]+1){issues.push({kind:'substitution',expected:expected[i-1],heard:heard[j-1],position:i});i--;j--;}
    else if(i&&matrix[i][j]===matrix[i-1][j]+1){issues.push({kind:'missing',expected:expected[i-1],heard:'',position:i});i--;}
    else{issues.push({kind:'extra',expected:'',heard:heard[j-1],position:i+1});j--;}
  }
  return {distance:matrix[expected.length][heard.length],issues:issues.reverse()};
}
function compareReading(expectedText, transcript) {
  const expected=normalizeReadingText(expectedText),heard=normalizeReadingText(transcript);
  const expectedWords=expected?expected.split(' '):[],heardWords=heard?heard.split(' '):[];
  const shortUnit=String(expectedText||'').trim().split(/\s+/).length===1;
  const vowels={a:['a','ah'],e:['e','eh'],i:['i','ee'],o:['o','oh'],u:['u','oo']};
  const vowelMatch=shortUnit&&vowels[expected]?.includes(heard);
  const left=shortUnit?Array.from(expected.replace(/ /g,'')):expectedWords;
  const right=shortUnit?Array.from(heard.replace(/ /g,'')):heardWords;
  const result=align(left,right),complete=Boolean(left.length&&right.length&&(vowelMatch||result.distance===0));
  const accuracy=complete?100:Math.max(0,Math.min(99,Math.round(100*(1-result.distance/Math.max(left.length,right.length,1)))));
  const wordIssues=complete?[]:align(expectedWords,heardWords).issues;
  return {accuracy,correct:complete,basis:shortUnit?'letters':'words',expectedUnitCount:left.length,heardUnitCount:right.length,
    issues:wordIssues,letterIssues:shortUnit&&!complete?result.issues:[],version:'reading-text-v1'};
}
module.exports={normalizeReadingText,compareReading};
