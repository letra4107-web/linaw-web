// A requested lang alone can still fall back to the device's English voice.
// Only use browser synthesis when a Filipino/Tagalog voice is installed.
export function createFilipinoUtterance(text: string, rate: number): SpeechSynthesisUtterance | null {
  if (typeof window === 'undefined' || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') return null;
  const voice = window.speechSynthesis.getVoices().find(item => /^(fil|tl)(-|_|$)/i.test(item.lang));
  if (!voice) return null;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = rate;
  return utterance;
}
