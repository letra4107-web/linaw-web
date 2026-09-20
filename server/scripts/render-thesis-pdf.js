const fs = require('fs');
const path = require('path');

const source = path.resolve(__dirname, '../../docs/THESIS_SYSTEM_DOCUMENTATION.md');
const output = path.resolve(__dirname, '../../docs/THESIS_SYSTEM_DOCUMENTATION_PRINT.html');
const markdown = fs.readFileSync(source, 'utf8');

const escape = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (value) => escape(value).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

let html = '';
let inCode = false;
let inList = false;
for (const line of markdown.split(/\r?\n/)) {
  if (line.startsWith('```')) {
    if (!inCode) { if (inList) { html += '</ul>'; inList = false; } html += '<pre class="diagram"><code>'; }
    else html += '</code></pre>';
    inCode = !inCode;
  } else if (inCode) html += `${escape(line)}\n`;
  else if (/^### /.test(line)) { if (inList) { html += '</ul>'; inList = false; } html += `<h3>${inline(line.slice(4))}</h3>`; }
  else if (/^## /.test(line)) { if (inList) { html += '</ul>'; inList = false; } html += `<h2>${inline(line.slice(3))}</h2>`; }
  else if (/^# /.test(line)) { if (inList) { html += '</ul>'; inList = false; } html += `<h1>${inline(line.slice(2))}</h1>`; }
  else if (/^!\[([^\]]*)\]\(([^)]+)\)$/.test(line)) { const [, alt, src] = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/); html += `<figure><img class="diagram-image" src="${escape(src)}" alt="${escape(alt)}"></figure>`; }
  else if (/^- /.test(line)) { if (!inList) { html += '<ul>'; inList = true; } html += `<li>${inline(line.slice(2))}</li>`; }
  else if (line.trim() === '') { if (inList) { html += '</ul>'; inList = false; } }
  else if (!line.startsWith('|') && !line.startsWith('---')) html += `<p>${inline(line)}</p>`;
}
if (inList) html += '</ul>';

const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>LinawLetra System Documentation</title><style>
@page { size: A4; margin: 16mm; }
body { color:#1f2937; font-family: Arial, sans-serif; font-size:10.5pt; line-height:1.55; }
h1 { color:#4338ca; font-size:23pt; margin:0 0 16pt; border-bottom:3px solid #7c3aed; padding-bottom:8pt; }
h2 { color:#3730a3; font-size:16pt; margin:24pt 0 9pt; break-after:avoid; }
h3 { color:#4f46e5; font-size:12pt; margin:16pt 0 6pt; break-after:avoid; }
p { margin:0 0 8pt; } ul { margin:0 0 10pt; padding-left:20pt; } li { margin:3pt 0; }
code { font-family:"Cascadia Mono", Consolas, monospace; background:#f3f4f6; padding:1pt 3pt; border-radius:2pt; }
pre.diagram { white-space:pre-wrap; overflow-wrap:anywhere; background:#f8fafc; border:1px solid #c7d2fe; border-left:4px solid #7c3aed; border-radius:5pt; padding:10pt; font:7.2pt/1.3 "Cascadia Mono", Consolas, monospace; break-inside:avoid; }
figure { margin:10pt 0 14pt; break-inside:avoid; } .diagram-image { display:block; width:100%; max-height:245mm; object-fit:contain; border:1px solid #c7d2fe; }
strong { color:#312e81; } 
</style></head><body>${html}</body></html>`;
fs.writeFileSync(output, page, 'utf8');
process.stdout.write(`${output}\n`);
