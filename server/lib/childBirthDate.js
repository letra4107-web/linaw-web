function latestChildBirthDate(now=new Date()){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const [year,month,day]=today.split('-').map(Number),y=year-7,last=new Date(Date.UTC(y,month,0)).getUTCDate();
 return `${y}-${String(month).padStart(2,'0')}-${String(Math.min(day,last)).padStart(2,'0')}`;
}
function validOptionalChildBirthDate(value,now=new Date()){
 return value==null||value===''||typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&value>='1900-01-01'&&value<=latestChildBirthDate(now)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
}
module.exports={latestChildBirthDate,validOptionalChildBirthDate};
