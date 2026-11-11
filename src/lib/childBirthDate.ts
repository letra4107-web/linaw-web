export function latestChildBirthDate(now = new Date()): string {
  const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const [year,month,day]=today.split('-').map(Number),cutoffYear=year-7;
  const lastDay=new Date(Date.UTC(cutoffYear,month,0)).getUTCDate();
  return `${cutoffYear}-${String(month).padStart(2,'0')}-${String(Math.min(day,lastDay)).padStart(2,'0')}`;
}
export function validOptionalChildBirthDate(value: string, now = new Date()): boolean {
  return !value || /^\d{4}-\d{2}-\d{2}$/.test(value) && value>='1900-01-01' && value<=latestChildBirthDate(now) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value;
}
