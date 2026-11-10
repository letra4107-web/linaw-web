export const CORRECT_MESSAGES = [
  'Napakahusay! Tama ang iyong pagbasa!',
  'Binabati kita! Ang galing-galing mo!',
  'Magaling! Ipagpatuloy mo ang iyong pagsisikap!',
  'Wow! Ang husay mong bumasa!',
  'Tama! Isa kang mahusay na mag-aaral!',
  'Napakagaling! Patuloy kang natututo!',
  'Yehey! Nakuha mo ang tamang sagot!',
  'Mahusay! Nakakatuwa ang iyong pag-unlad!',
  'Ang galing! Mas gumagaling ka araw-araw!',
  'Perpekto! Napakahusay ng iyong ginawa!',
  'Tama ang iyong pagbasa! Ipagpatuloy mo!',
  'Husay! Nakikita ang iyong pagsisikap!',
  'Binabati kita! Isa na namang tagumpay!',
  'Napakagaling! Ang linaw ng iyong pagbasa!',
  'Tama! Napakaganda ng iyong ginawa!',
  'Ang husay mo! Handa ka na sa susunod!',
  'Wow! Mahusay ang iyong pagbigkas!',
  'Magaling! Natututo ka nang mabilis!',
  'Yehey! Nagawa mo nang tama!',
  'Binabati kita! Ipagmalaki mo ang iyong pagsisikap!',
];
export const MINOR_MISTAKE_MESSAGES = [
  'Binabati kita! May pagkakamali man, mas gumagaling ka!',
  'Magaling! Kaunting pagsasanay pa at mas gagaling ka!',
  'Mahusay ang iyong pagsubok! Subukan nating muli!',
  'Ayos lang magkamali! Bahagi ito ng pagkatuto!',
  'Ang galing ng iyong pagsisikap! Kaya mo iyan!',
  'Malapit na! Subukan mo pang muli!',
  'Magandang pagsubok! Mas gagaling ka sa susunod!',
  'Huwag susuko! Unti-unti kang natututo!',
  'Binabati kita sa iyong pagsisikap! Tuloy lang!',
  'Magaling! May kaunti pang kailangang pag-aralan!',
  'Ang mahalaga ay sinusubukan mo! Mahusay!',
  'Hindi man perpekto, napakaganda ng iyong pagsisikap!',
  'Malapit mo nang makuha! Kaya mo ito!',
  'Mahusay! Makinig at subukan nating muli!',
  'Maganda ang iyong ginawa! Magsanay pa tayo!',
  'Patuloy lang! Bawat pagsubok ay mahalaga!',
  'Binabati kita! Natututo ka sa bawat pagkakamali!',
  'Ayos lang! May pagkakataon ka pang bumawi!',
  'Magaling ang iyong pagsubok! Huwag mawalan ng gana!',
  'Kaya mo iyan! Dahan-dahan lang sa pagbasa!',
];
export const MANY_MISTAKE_MESSAGES = [
  'Magandang pagsubok! Magsanay pa tayo nang magkasama!',
  'Huwag mag-alala! Maaari mong subukan muli!',
  'Salamat sa iyong pagsisikap! Tuloy lang sa pag-aaral!',
  'Kaya mo ito! Magsimula tayo nang dahan-dahan!',
  'Ayos lang kung nahihirapan ka! Nandito tayo para matuto!',
  'Magaling at sinubukan mo! Subukan natin ulit!',
  'Bawat pagsubok ay isang hakbang sa pagkatuto!',
  'Huwag susuko! May oras pa para magsanay!',
  'Napakaganda ng iyong determinasyon! Tuloy lang!',
  'Hindi kailangang madaliin! Basahin natin nang paisa-isa!',
  'Mahusay ang iyong pagsisikap! Subukan nating makinig muli!',
  'Kaya mong matuto! Magsanay tayo nang paunti-unti!',
  'Ang mahalaga ay patuloy kang sumusubok!',
  'Isang hakbang muna! Kaya natin ito!',
  'Salamat sa iyong pagsubok! Handa ka bang ulitin?',
  'Huwag matakot magkamali! Lahat ay natututo!',
  'Maganda ang iyong pagsisikap! Ulitin natin nang dahan-dahan!',
  'Tuloy lang! Bawat araw ay bagong pagkakataon!',
  'Kaya mo iyan! Makinig muna at saka bumasa!',
  'Binabati kita sa iyong tapang na sumubok! Magsanay pa tayo!',
];
export const ENCOURAGE_MESSAGES = MANY_MISTAKE_MESSAGES;
export function randomFrom(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)];
}
export function readingFeedbackBand(accuracy: number): string {
  if (accuracy >= 90) return 'Excellent';
  if (accuracy >= 75) return 'Very Good';
  if (accuracy >= 50) return 'Good Effort';
  if (accuracy >= 25) return 'Keep Practicing';
  return 'Encouragement';
}
export function readingFeedbackMessage(accuracy: number): string {
  return randomFrom(accuracy >= 90 ? CORRECT_MESSAGES : accuracy >= 75 ? MINOR_MISTAKE_MESSAGES : MANY_MISTAKE_MESSAGES);
}
