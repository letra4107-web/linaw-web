import {api} from './api';

export function getAsiaManilaDate(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export interface WordOfDayLog {
  id: string;
  child_id: string;
  word: string;
  date: string;
  correct: boolean | null;
  attempts: number;
  accuracy: number | null;
  xp_awarded: number;
  completed_at: string | null;
}

const MAX_ATTEMPTS = 3;
export { MAX_ATTEMPTS };

// Daily target selection and initialization are server-owned on both platforms.
export async function getOrCreateWordOfDay(_childId:string,_level:string):Promise<WordOfDayLog|null>{
 const result=await api<{success:boolean;log:WordOfDayLog|null}>('/student/word-of-day',{auth:true});
 if(result.success!==true)throw new Error('Hindi ma-load ang Salita ng Araw.');return result.log;
}
