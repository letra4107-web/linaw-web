/** Gmail dots and + tags refer to one inbox; other providers keep their aliases. */
export function canonicalAccountEmail(value: string): string {
 const email=value.trim().toLowerCase(),[local,domain]=email.split('@');
 return ['gmail.com','googlemail.com'].includes(domain)?local.split('+')[0].replace(/\./g,'')+'@gmail.com':email;
}
