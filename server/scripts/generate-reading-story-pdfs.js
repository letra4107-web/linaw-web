const fs = require('fs');
const path = require('path');

const outputDir = path.resolve(__dirname, '../../docs/reading-stories');
fs.mkdirSync(outputDir, { recursive: true });

const stories = [
  {
    file: 'beginner-01-aso-ni-ana', level: 'Beginner', modules: 'Modules 1–17 · Patinig at mga Hanay ng Pantig',
    title: 'Ang Aso ni Ana', preview: ['ANA', 'ASO', 'BOLA', 'BAHAY'],
    lines: ['Si Ana ay may aso.', 'Ang aso ay si Bibo.', 'May bola si Bibo.', 'Takbo si Bibo sa bahay.', 'Tawa si Ana.', 'Masaya ang aso ni Ana.'],
  },
  {
    file: 'beginner-02-kubo-ni-lino', level: 'Beginner', modules: 'Modules 1–17 · Patinig at mga Hanay ng Pantig',
    title: 'Ang Kubo ni Lino', preview: ['LINO', 'KUBO', 'MESA', 'ILAW'],
    lines: ['May kubo si Lino.', 'Maliit ang kubo.', 'May mesa sa kubo.', 'May ilaw sa mesa.', 'Uwi si Lino sa kubo.', 'Gusto ni Lino ang kubo.'],
  },
  {
    file: 'intermediate-01-baboy-sa-bukid', level: 'Intermediate', modules: 'Intermediate · Pantig, mahahabang salita, at meaning',
    title: 'Ang Baboy sa Bukid', preview: ['BABOY', 'BUKID', 'BAWANG', 'TUBIG'],
    lines: ['May baboy sa bukid.', 'Kumakain ito ng pagkain.', 'May tubig sa tabi ng puno.', 'May bawang ang pagkain ng baboy.', 'Masaya ang baboy sa bukid.', 'Uwi ito bago gumabi.'],
  },
  {
    file: 'intermediate-02-araw-ni-maria', level: 'Intermediate', modules: 'Intermediate · Pantig, mahahabang salita, at meaning',
    title: 'Ang Araw ni Maria', preview: ['MARIA', 'PALENGKE', 'PAGKAIN', 'PAMILYA'],
    lines: ['Maaga gumising si Maria.', 'Pumunta siya sa palengke.', 'Bumili siya ng pagkain.', 'May prutas at gulay sa mesa.', 'Kumain ang pamilya ni Maria.', 'Masaya ang araw nila.'],
  },
  {
    file: 'advanced-01-klase-ni-gloria', level: 'Advanced', modules: 'Advanced · Clusters, mas mahahabang salita, at pag-unawa',
    title: 'Ang Klase ni Gloria', preview: ['KLASE', 'GLORIA', 'PLANO', 'PROYEKTO'],
    lines: ['Maaga dumating si Gloria sa klase.', 'May plano ang guro para sa proyekto.', 'Nagbasa si Gloria ng kuwento.', 'Nagbigay siya ng magandang sagot.', 'Pumalakpak ang buong klase.', 'Masaya si Gloria sa proyekto.'],
  },
  {
    file: 'advanced-02-prutas-sa-hardin', level: 'Advanced', modules: 'Advanced · Clusters, mas mahahabang salita, at pag-unawa',
    title: 'Ang Prutas sa Hardin', preview: ['PRUTAS', 'HARDIN', 'PRINSIPE', 'PLANO'],
    lines: ['May hardin sa tabi ng paaralan.', 'May prutas at halamang mabango.', 'May plano ang klase na maglinis.', 'Nagtrabaho ang bawat bata.', 'Nagpasalamat ang prinsipe ng hardin.', 'Malinis at masaya ang hardin.'],
  },
];

const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
for (const story of stories) {
  const sentenceCards = story.lines.map((line, index) => `<section class="sentence"><span class="step">Bahagi ${index + 1}</span><p>${escape(line)}</p></section>`).join('\n');
  const preview = story.preview.map((word) => `<span>${escape(word)}</span>`).join('');
  const html = `<!doctype html><html lang="fil"><head><meta charset="utf-8"><title>${escape(story.title)}</title><style>
    @page { size: A4; margin: 15mm; } * { box-sizing: border-box; } body { font-family: Lexend, Arial, sans-serif; color:#2f2a27; line-height:1.55; } .cover { min-height:255mm; border:5px solid #7c6fcf; border-radius:20px; padding:24mm 18mm; background:linear-gradient(145deg,#f2ecff,#fff7df); } .level { display:inline-block; border-radius:999px; padding:5px 12px; color:#fff; background:#7c6fcf; font-weight:700; font-size:13pt; } h1 { font-size:32pt; line-height:1.16; color:#473f83; margin:24mm 0 8mm; } .guide { font-size:15pt; } .guide strong { color:#473f83; } .preview { margin-top:15mm; } .preview span { display:inline-block; margin:5px; padding:8px 13px; border-radius:12px; background:#fff; border:2px solid #e6b849; font-weight:800; font-size:16pt; } .note { margin-top:24mm; color:#5f5751; font-size:12pt; } .sentence { break-inside:avoid; min-height:53mm; border:2px solid #d9d1f2; border-radius:18px; padding:12mm; margin:0 0 10mm; background:#fff; } .step { display:inline-block; border-radius:999px; padding:3px 10px; color:#fff; background:#e6973b; font-weight:700; font-size:11pt; } .sentence p { margin:8mm 0 0; font-size:27pt; font-weight:700; letter-spacing:.02em; line-height:1.45; } .footer { color:#645d57; font-size:11pt; text-align:center; } </style></head><body>
    <main class="cover"><span class="level">${escape(story.level)}</span><h1>${escape(story.title)}</h1><p class="guide"><strong>Target:</strong> ${escape(story.modules)}</p><section class="preview"><strong>Mga salitang paghahandaan:</strong><div>${preview}</div></section><p class="note">Teacher guide: Basahin ang isang bahagi sa bawat pagkakataon. Pindutin ang “Pakinggan,” saka “Ako Naman.”</p></main>
    ${sentenceCards}<p class="footer">LinawLetra · Gabay na Pagbasa</p></body></html>`;
  fs.writeFileSync(path.join(outputDir, `${story.file}.html`), html, 'utf8');
}
console.log(`Created ${stories.length} story HTML files in ${outputDir}`);
