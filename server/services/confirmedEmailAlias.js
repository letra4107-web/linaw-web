async function syncConfirmedStudentEmail(client,user){
 if(!user?.id||typeof user.email!=='string'||!user.email_confirmed_at)return;
 const profile=await client.from('users').select('role').eq('id',user.id).maybeSingle();if(profile.error)throw profile.error;
 if(profile.data?.role!=='student')return;
 const children=await client.from('children').update({username:user.email}).eq('auth_uid',user.id).select('id');if(children.error)throw children.error;
 for(const child of children.data||[]){const saved=await client.from('child_credentials').update({username:user.email}).eq('child_id',child.id);if(saved.error)throw saved.error;}
}
module.exports={syncConfirmedStudentEmail};
