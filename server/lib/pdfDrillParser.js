const PDFParser = require('pdf2json');

// Tuned for LinawLetra's own syllable-drill template (see migrations/016):
// a 2-text-column table (syllable breakdown | resulting word), optionally
// followed by a 3rd illustration column with no text. pdf-parse alone
// flattens everything into one text stream and loses which line belongs to
// which column, so this uses pdf2json's per-run x/y coordinates instead to
// reconstruct rows and columns geometrically -- reliable as long as the
// teacher's PDF was generated from the same table-based template (typed
// text, not a scanned image), which is the scope this feature commits to.

function parsePdfBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const parser = new PDFParser();
    parser.on('pdfParser_dataError', (err) => reject(err.parserError || err));
    parser.on('pdfParser_dataReady', (data) => resolve(data));
    parser.parseBuffer(buffer);
  });
}

function decodeRun(run) {
  return run.R.map((r) => decodeURIComponent(r.T)).join('').trim();
}

// Finds the single x-position that best separates Column 1 runs from Column 2
// runs across the WHOLE page (not per-row): the two text columns line up
// vertically across every row of a table, so the gap between them recurs at
// the same x on every line, while a run-to-run gap *within* one cell (e.g.
// "sa" and "– ma" reported as separate pdf2json runs) does not. Sorting every
// distinct x on the page and taking the single largest gap finds that
// consistent boundary far more reliably than a fixed per-row distance ever
// could, since "word-internal gap" and "column gap" can be the same order of
// magnitude in absolute units depending on the PDF's font/spacing.
function findColumnBoundary(runs) {
  const xs = [...new Set(runs.map((r) => r.x))].sort((a, b) => a - b);
  if (xs.length < 2) return null;

  let bestGap = -Infinity;
  let boundary = null;
  for (let i = 1; i < xs.length; i++) {
    const gap = xs[i] - xs[i - 1];
    if (gap > bestGap) {
      bestGap = gap;
      boundary = (xs[i] + xs[i - 1]) / 2;
    }
  }
  return boundary;
}

// Groups text runs into horizontal rows by y-proximity, then splits each row
// into (at most) two cells using the page-wide column boundary above.
function extractRows(page) {
  const runs = (page.Texts || [])
    .map((t) => ({ x: t.x, y: t.y, text: decodeRun(t) }))
    .filter((r) => r.text.length > 0);
  if (runs.length === 0) return [];

  const boundary = findColumnBoundary(runs);

  runs.sort((a, b) => a.y - b.y || a.x - b.x);

  const ROW_Y_TOLERANCE = 0.4;
  const rows = [];
  for (const run of runs) {
    const currentRow = rows[rows.length - 1];
    if (currentRow && Math.abs(run.y - currentRow.y) <= ROW_Y_TOLERANCE) {
      currentRow.runs.push(run);
    } else {
      rows.push({ y: run.y, runs: [run] });
    }
  }

  return rows.map((row) => {
    row.runs.sort((a, b) => a.x - b.x);
    const left = row.runs.filter((r) => boundary === null || r.x < boundary).map((r) => r.text);
    const right = row.runs.filter((r) => boundary !== null && r.x >= boundary).map((r) => r.text);
    return { y: row.y, columns: [left.join(' ').trim(), right.join(' ').trim()] };
  });
}

// Splits Column 1's "sa – ma" style breakdown on any dash variant into a
// normalized "sa-ma" form the rest of the app already expects.
function normalizeSyllablePattern(text) {
  return text
    .split(/[-–—]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join('-');
}

function parseDrillItems(pdfData) {
  const items = [];
  let bandIndex = 0;
  let itemOrder = 0;
  const skipped = [];

  for (const page of pdfData.Pages || []) {
    const rows = extractRows(page);
    let prevY = null;
    // A row starts a new band when the vertical gap to the previous row is
    // noticeably larger than the typical within-band line spacing on this
    // page -- stacked sub-rows in one band sit closer together than two
    // different bands do.
    const gaps = [];
    for (let i = 1; i < rows.length; i++) gaps.push(rows[i].y - rows[i - 1].y);
    const avgGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
    const bandBreakThreshold = avgGap * 1.5;

    for (const row of rows) {
      if (prevY !== null && row.y - prevY > bandBreakThreshold) bandIndex += 1;
      prevY = row.y;

      const [col1, col2] = row.columns;
      if (!col1 || !col2) {
        if (col1 || col2) skipped.push({ page: page.pageIndex, text: col1 || col2 });
        continue;
      }

      const syllablePattern = normalizeSyllablePattern(col1);
      const word = col2.replace(/\s+/g, '').toLowerCase();
      if (!syllablePattern || !word) continue;

      items.push({
        band_index: bandIndex,
        item_order: itemOrder++,
        syllable_pattern: syllablePattern,
        word,
      });
    }
    bandIndex += 1; // never merge bands across a page break
  }

  return { items, skipped };
}

async function parseDrillPdf(buffer) {
  const pdfData = await parsePdfBuffer(buffer);
  return parseDrillItems(pdfData);
}

module.exports = { parseDrillPdf, parseDrillItems };
