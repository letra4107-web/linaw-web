export function normalizeChildEnrollmentName(value:string){return value.normalize('NFKC').replace(/\s+/gu,' ').trim();}
export function hasDuplicateChildEnrollment(children:readonly {name:string;grade_level:number}[],name:string,grade:number){
 const key=normalizeChildEnrollmentName(name).toLowerCase();
 return Boolean(key)&&children.some(child=>child.grade_level===grade&&normalizeChildEnrollmentName(child.name).toLowerCase()===key);
}
