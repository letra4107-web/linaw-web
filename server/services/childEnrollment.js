function normalizeChildName(value){return String(value??'').normalize('NFKC').replace(/\s+/gu,' ').trim();}
const enrollmentNameKey=value=>normalizeChildName(value).toLowerCase();
const duplicateChildMessage='Student already exists';
function isDuplicateChildEnrollment(error){return error?.code==='23505'&&(error.constraint==='children_parent_enrollment_name_uidx'||String(error.message||'').includes('children_parent_enrollment_name_uidx'));}
async function childEnrollmentExists(client,parentId,name,grade){
 const key=enrollmentNameKey(name);
 for(let offset=0;;offset+=1000){
  const result=await client.from('children').select('id,name').eq('parent_id',parentId).eq('grade_level',grade).order('id').range(offset,offset+999);
  if(result.error)throw result.error;
  if((result.data||[]).some(child=>enrollmentNameKey(child.name)===key))return true;
  if(!result.data||result.data.length<1000)return false;
 }
}
module.exports={normalizeChildName,enrollmentNameKey,duplicateChildMessage,isDuplicateChildEnrollment,childEnrollmentExists};
