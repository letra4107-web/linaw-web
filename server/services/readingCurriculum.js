const READING_CURRICULUM = Object.freeze({
  Intermediate: Object.freeze([
    'Mga Parirala: A/B/K/D',
    'Mga Parirala: G/H/L/M',
    'Mga Parirala: N/NG/P/R',
    'Mga Parirala: S/T/W/Y',
    'Pagsasanib ng mga Parirala',
    'Pagbasa ng Parirala',
    'Simpleng Pangungusap',
    'Pagsunod sa Panuto',
    'Bokabularyo sa Konteksto',
    'Maikling Teksto at Pag-unawa',
  ]),
  Advanced: Object.freeze([
    'Kwento 1: Isang Araw sa Bahay',
    'Kwento 2: Ang Aking Paaralan',
    'Kwento 3: Magkaibigang Tapat',
    'Kwento 4: Alaga sa Kalikasan',
    'Kwento 5: Sama-samang Bayanihan',
    'Mahahabang Pangungusap',
    'Pagbasa ng Talata',
    'Pangunahing Ideya',
    'Mahahalagang Detalye',
    'Reading Comprehension Challenge',
  ]),
});

function requiredModuleCount(level) {
  return READING_CURRICULUM[level]?.length ?? null;
}

module.exports = { READING_CURRICULUM, requiredModuleCount };
