// Award eligibility is computed transactionally from verified database receipts.
async function checkAndAwardBadges(client,studentId){
 const {data,error}=await client.rpc('reconcile_verified_student_badges',{p_student_id:studentId});
 if(error||!Array.isArray(data?.awarded_badge_ids))throw Object.assign(new Error('Verified badge service unavailable.'),{status:503});
 return data.awarded_badge_ids;
}

module.exports = { checkAndAwardBadges };
