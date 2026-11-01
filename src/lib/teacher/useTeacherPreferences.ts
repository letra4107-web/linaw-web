import { useEffect, useSyncExternalStore } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useAccessibility } from '../a11y/AccessibilityContext';
import { parseTeacherPreferences, teacherPreferenceKey } from './preferences';
import type { TeacherPreferences } from './preferences';

const EVENT = 'linawletra-teacher-preferences';
const sessionFallback = new Map<string,string>();
function read(key:string) { if(sessionFallback.has(key))return sessionFallback.get(key)!;try{return localStorage.getItem(key);}catch{return null;} }
function subscribe(callback:()=>void) {
  const storage = (event:StorageEvent) => { if(event.key)sessionFallback.delete(event.key);else sessionFallback.clear();callback(); };
  window.addEventListener(EVENT,callback);window.addEventListener('storage',storage);
  return ()=>{window.removeEventListener(EVENT,callback);window.removeEventListener('storage',storage);};
}
export function useTeacherPreferences() {
  const { user } = useAuth();const key=teacherPreferenceKey(user?.id ?? 'signed-out');
  const raw=useSyncExternalStore(subscribe,()=>read(key),()=>null);
  const preferences=parseTeacherPreferences(raw);
  function update(next:TeacherPreferences) {
    if(!user)return false;
    const before=parseTeacherPreferences(read(key)),value=JSON.stringify({...before,...next,notices:{...before.notices,...next.notices}});
    let persisted=true;
    try{localStorage.setItem(key,value);sessionFallback.delete(key);}catch{sessionFallback.set(key,value);persisted=false;}
    window.dispatchEvent(new Event(EVENT));return persisted;
  }
  return {preferences,update};
}
/** Keep System mode live throughout the teacher area, including other tabs. */
export function useTeacherThemeSync() {
  const {preferences}=useTeacherPreferences(),{setTheme}=useAccessibility();
  useEffect(()=>{
    if(!preferences.theme)return;
    const media=window.matchMedia('(prefers-color-scheme: dark)');
    const apply=()=>setTheme(preferences.theme==='system' ? media.matches?'dark':'default' : preferences.theme==='dark'?'dark':'default');
    apply();if(preferences.theme==='system')media.addEventListener('change',apply);
    return()=>media.removeEventListener('change',apply);
  },[preferences.theme,setTheme]);
}
