// Shared pool of varied, always-encouraging pronunciation feedback -- used anywhere a student
// gets a right/wrong result (Word of the Day, Practice, Module reading) so the tone stays
// consistent and doesn't repeat the same line every single attempt.

export const CORRECT_MESSAGES = [
  'Magaling! Tama ka!',
  'Ang galing mo!',
  'Binabati kita!',
  'Perpekto ang bigkas mo!',
  'Husay mo talaga!',
  'Ang galing, tama iyan!',
];

export const ENCOURAGE_MESSAGES = [
  'Salamat sa pagsubok! Kaya mong matutuhan ito.',
  'Mahusay ang iyong pagsisikap! Subukan natin muli.',
  'Ang sipag mong magbasa! Patuloy lang tayo.',
  'Magaling ang iyong pagsubok! Magsanay pa tayo.',
  'Kaya mo iyan! Tutulungan kitang magsanay.',
  'Bawat pagsubok ay mahalaga. Ipagpatuloy mo!',
];

export function randomFrom(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)];
}
