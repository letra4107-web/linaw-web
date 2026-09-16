/** Conservative eligibility heuristic, not a Filipino phonological parser. */
export function countFilipinoSyllables(text: string): number {
  const cleaned = text.trim();
  // Initialisms/abbreviations have no dependable text-only pronunciation.
  if (!cleaned || /^[A-Z.\s]+$/.test(cleaned)) return 0;
  const normalized = cleaned
    .toLocaleLowerCase('fil-PH')
    // “mga” is normally pronounced with two syllabic units (ma-nga).
    .replace(/\bmga\b/g, 'ma nga');
  return (normalized.match(/[aeiouáéíóú]+/g) ?? []).length;
}

export function needsSlowFilipinoPronunciation(text: string): boolean {
  return countFilipinoSyllables(text) >= 2;
}
