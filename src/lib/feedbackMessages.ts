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
  'Magaling sinubukan!',
  "Ayos lang 'yan.",
  'Bawi na lang.',
  'Malapit na iyan!',
  'Kaya mo pa yan!',
  'Huwag susuko!',
];

export function randomFrom(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)];
}
