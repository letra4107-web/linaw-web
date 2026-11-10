const {compareReading}=require('../lib/readingAccuracy');
const checked=result=>{if(result.error)throw result.error;return result.data;};
function attempt({id,expected,transcript,accuracy,createdAt}){
  const comparison=compareReading(expected,transcript||'');
  return {id,expectedText:expected,transcript:transcript||'',accuracy,createdAt,issues:comparison.issues,letterIssues:comparison.letterIssues,issuesSource:'transcript-comparison'};
}
async function practiceHistory(client,studentId,sessionId,{offset=0,limit=25}={}){
  const session=checked(await client.from('pronunciation_practice_sessions').select('id,word,spoken_text,accuracy_percentage,created_at,progress_event_id').eq('id',sessionId).eq('student_id',studentId).maybeSingle());
  if(!session)return null;
  const event=session.progress_event_id?checked(await client.from('student_progress_events').select('id,content_id,expected_text').eq('id',session.progress_event_id).eq('student_id',studentId).maybeSingle()):null;
  const verified=Boolean(event?.content_id),table=verified?'student_progress_events':'pronunciation_practice_sessions';
  const select=verified?'id,expected_text,accuracy,request,issued_at':'id,word,spoken_text,accuracy_percentage,created_at';
  const order=verified?'issued_at':'created_at';
  const query=()=>{
    let q=client.from(table).select(select,{count:'exact'}).eq('student_id',studentId);
    if(verified)q=q.eq('content_id',event.content_id).eq('source','practice').not('response','is',null);
    else q=q.eq('word',session.word).is('progress_event_id',null);
    return q;
  };
  const [page,first,last]=await Promise.all([
    query().order(order,{ascending:true}).order('id',{ascending:true}).range(offset,offset+limit-1),
    query().order(order,{ascending:true}).order('id',{ascending:true}).limit(1),
    query().order(order,{ascending:false}).order('id',{ascending:false}).limit(1),
  ]);
  const rows=checked(page)||[],oldest=(checked(first)||[])[0],latest=(checked(last)||[])[0];
  const map=row=>verified?attempt({id:row.id,expected:row.expected_text,transcript:row.request?.transcript,accuracy:row.accuracy,createdAt:row.issued_at}):attempt({id:row.id,expected:row.word,transcript:row.spoken_text,accuracy:row.accuracy_percentage,createdAt:row.created_at});
  const total=page.count??rows.length;
  return {selected:attempt({id:event?.id||session.id,expected:event?.expected_text||session.word,transcript:session.spoken_text,accuracy:session.accuracy_percentage,createdAt:session.created_at}),
    history:rows.map(map),scope:verified?'verified-content':'legacy-text',
    summary:{attemptCount:total,firstScore:oldest?map(oldest).accuracy:null,latestScore:latest?map(latest).accuracy:null},
    nextOffset:offset+rows.length<total?offset+rows.length:null};
}
module.exports={practiceHistory};
