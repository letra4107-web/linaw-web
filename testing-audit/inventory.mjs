import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import ts from 'typescript';

// Read source and example configuration only. Never load private env files.
const root = process.cwd(), out = path.join(root, 'testing-audit');
fs.mkdirSync(out, { recursive: true });
const excluded = new Set(['.git', 'node_modules', 'dist', '.qa', 'testing-audit', '.codex', '.agents', '.aws']);
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    if (excluded.has(e.name) || /^\.env(?:\.|$)/.test(e.name) && !e.name.endsWith('.example')) return [];
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p.replaceAll('\\', '/')];
  });
}
const all = walk('.'), tests = all.filter(f => /(?:^|\/)tests\/.*\.(?:js|mjs)$/.test(f));
const testSources = new Map(tests.map(file => [file, fs.readFileSync(file, 'utf8')]));
const inventory = { date: '2026-10-21', generatedAt: new Date().toISOString(), files: [], functions: [], routes: [], controls: [], dataAccess: [], migrations: [], imports: [], configuration: [], secretFindings: [], documentationArtifacts: all.filter(file => file.startsWith('docs/')).map(file => ({ file, status: 'NOT RUN', actual: 'Historical/reference artifact; not fresh execution evidence.' })) };
const short = node => node?.getText().replace(/\s+/g, ' ').slice(0, 200) || '';
function area(file) { return file.match(/(?:pages|routes)\/(admin|teacher|parent|student|auth)(?:\/|\.)/)?.[1] || 'shared/public'; }
const sourceFiles = all.filter(f => /^(src|server|scripts|tests|migrations|\.github|public)\//.test(f) || /^(?:package.*\.json|vite.config.ts|tsconfig.*\.json|index.html|README.md|\.env.example|\.gitignore)$/.test(f));
for (const file of sourceFiles) {
  const buffer = fs.readFileSync(file), source = buffer.toString('utf8');
  const isCode = /\.(?:tsx?|[cm]?js)$/.test(file);
  inventory.files.push({ file, area: area(file), bytes: buffer.length, sha256: createHash('sha256').update(buffer).digest('hex'), kind: file.includes('/tests/') || file.startsWith('tests/') ? 'test' : /\.sql$/.test(file) ? 'migration' : isCode ? 'source' : 'asset/configuration', status: 'NOT RUN', actual: 'Indexed from working tree; file presence is not functional verification.' });
  if (/\.sql$/.test(file)) {
    inventory.migrations.push({ file, tables: [...source.matchAll(/CREATE TABLE(?: IF NOT EXISTS)?\s+(?:public\.)?([a-z_]+)/gi)].map(m => m[1]), policies: [...source.matchAll(/CREATE POLICY\s+"?([^"\s]+)"?/gi)].map(m => m[1]), mutatesData: /^\s*(?:INSERT|UPDATE|DELETE)\b/im.test(source), status: 'BLOCKED', actual: 'Not applied to shared Supabase; full schema baseline unavailable.' });
    continue;
  }
  if (file.endsWith('.env.example')) {
    for (const [i, line] of source.split(/\r?\n/).entries()) {
      const match = line.match(/^\s*([A-Z][A-Z0-9_]*)=(.*)$/);
      if (match) inventory.configuration.push({ file, line: i + 1, name: match[1], documented: true });
    }
  }
  // Findings contain category/location only, never the matched credential.
  if (/\.(?:tsx?|[cm]?js|json|md|ya?ml|example|html|txt)$/.test(file)) {
    for (const [i, line] of source.split(/\r?\n/).entries()) {
      if (/\b(?:xkeysib-[a-zA-Z0-9-]{30,}|sk_[a-f0-9]{32,}|eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,})/.test(line)) inventory.secretFindings.push({ file, line: i + 1, category: 'Potential credential literal; manual private review required', status: 'FAIL' });
    }
  }
  if (!isCode) continue;
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : file.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.JS);
  const line = node => tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1;
  function attributes(node) { return Object.fromEntries(node.attributes.properties.filter(ts.isJsxAttribute).map(a => [a.name.getText(), a.initializer ? short(a.initializer) : 'true'])); }
  function inspect(node) {
    if (ts.isImportDeclaration(node)) inventory.imports.push({ file, target: node.moduleSpecifier.text });
    if (ts.isCallExpression(node)) {
      const expr = short(node.expression);
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword && ts.isStringLiteral(node.arguments[0] || {})) inventory.imports.push({ file, target: node.arguments[0].text });
      if (expr === 'require' && ts.isStringLiteral(node.arguments[0] || {})) inventory.imports.push({ file, target: node.arguments[0].text });
      if ((file === 'server/server.js' || file.startsWith('server/routes/')) && /^(?:router|app)\.(get|post|put|patch|delete)$/.test(expr) && ts.isStringLiteral(node.arguments[0] || {})) {
        const prefix = file.match(/^server\/routes\/(.+)\.js$/)?.[1];
        inventory.routes.push({ id: `API-${inventory.routes.filter(r => r.kind === 'API').length + 1}`, kind: 'API', file, line: line(node), method: expr.split('.')[1].toUpperCase(), path: prefix ? `/api/${prefix === 'authEvents' ? 'auth' : prefix}${node.arguments[0].text === '/' ? '' : node.arguments[0].text}` : node.arguments[0].text, middleware: node.arguments.slice(1).filter(n => !ts.isFunctionLike(n)).map(short), status: 'BLOCKED', actual: 'Full successful/owner/forbidden/persistence workflow requires isolated Supabase; local middleware subcases reported separately.' });
      }
      if (/\.(from|rpc)$/.test(expr) || expr === 'api' || expr.endsWith('fetch')) inventory.dataAccess.push({ file, line: line(node), expression: expr, target: short(node.arguments[0]), status: 'BLOCKED' });
    }
    if (ts.isFunctionLike(node) && node.body) {
      const parent = node.parent;
      let name = node.name?.getText() || (ts.isVariableDeclaration(parent) || ts.isPropertyAssignment(parent) ? short(parent.name) : ts.isJsxExpression(parent) && ts.isJsxAttribute(parent.parent) ? short(parent.parent.name) : `callback@${line(node)}`);
      const calls = [], validation = [], errors = [];
      function inner(n) {
        if (n !== node && ts.isFunctionLike(n)) return;
        if (ts.isCallExpression(n)) calls.push(short(n.expression));
        if (ts.isIfStatement(n)) validation.push(short(n.expression));
        if (ts.isThrowStatement(n) || ts.isCatchClause(n)) errors.push(`${ts.isCatchClause(n) ? 'catch' : 'throw'}@${line(n)}`);
        ts.forEachChild(n, inner);
      }
      inner(node);
      const doc = ts.getJSDocCommentsAndTags(node).map(short).join(' ');
      inventory.functions.push({ id: `FN-${inventory.functions.length + 1}`, name, file, line: line(node), area: area(file), purpose: doc || (name.startsWith('callback@') ? 'Inline callback; inspect enclosing expression at this location.' : `${name} implementation in ${file}.`), expectedBehavior: `Inputs: ${node.parameters.map(short).join(', ') || '(none)'}. Declared operations: ${[...new Set(calls)].slice(0, 25).join(', ') || 'local transformation/render'}. Source-derived contract requires branch review; no universal correctness assertion.`, actualBehavior: 'Definition inspected by AST; individual behavioral coverage is not inferred from file-level test execution.', dependencies: [...new Set(calls)], validationRequirements: validation, errorHandling: errors.length ? errors : ['No local catch/throw; delegates or returns normally.'], testingStatus: 'NOT RUN', testReferences: tests.filter(t => !name.startsWith('callback@') && new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(testSources.get(t))) });
    }
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(), attrs = attributes(node);
      if (tag === 'Route') {
        const prefix = file.match(/src\/routes\/(Admin|Teacher|Parent|Student)Area\.tsx/)?.[1].toLowerCase();
        const value = attrs.path?.replace(/^['"]|['"]$/g, '') || '';
        inventory.routes.push({ id: `UI-${inventory.routes.filter(r => r.kind === 'UI').length + 1}`, kind: 'UI', file, line: line(node), path: prefix ? `/${prefix}${value ? '/' + value : ''}` : value || '(layout/index)', element: attrs.element || '(layout)', status: prefix ? 'BLOCKED' : 'NOT RUN', actual: prefix ? 'Authenticated workflow blocked; anonymous guard tests are a separate assertion.' : 'See public browser case results.' });
      }
      if (['button', 'input', 'select', 'textarea', 'a', 'Link', 'NavLink', 'form'].includes(tag) || Object.keys(attrs).some(k => /^on(Click|Submit|Change|KeyDown)$/.test(k))) {
        inventory.controls.push({ id: `CTRL-${inventory.controls.length + 1}`, file, line: line(node), tag, attributes: attrs, status: /pages\/(?:admin|teacher|parent|student)\//.test(file) ? 'BLOCKED' : 'NOT RUN', actual: 'Source expression inventoried; handler presence does not prove working interaction. Includes mapped templates and conditionally rendered controls.' });
      }
    }
    ts.forEachChild(node, inspect);
  }
  inspect(tree);
}
// Reachability distinguishes legacy source modules from routed application features.
const imported = new Map();
for (const { file, target } of inventory.imports) {
  if (!target.startsWith('.')) continue;
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(file), target));
  const resolved = [base, base + '.ts', base + '.tsx', base + '.js', base + '/index.ts', base + '/index.tsx'].find(f => inventory.files.some(row => row.file === f));
  if (resolved) imported.set(resolved, [...(imported.get(resolved) || []), file]);
}
for (const row of inventory.files) row.importedBy = imported.get(row.file) || [];
const healthEvidence = fs.existsSync('testing-audit/evidence/final-verification/gates-release-review/backend.tap') ? 'testing-audit/evidence/final-verification/gates-release-review/backend.tap' : fs.existsSync('testing-audit/evidence/resolution/gates/backend.tap') ? 'testing-audit/evidence/resolution/gates/backend.tap' : 'testing-audit/evidence/final/backend.tap';
if (fs.existsSync(healthEvidence) && /^ok \d+ - local HTTP health returns compatibility, security headers, and correlation ID$/m.test(fs.readFileSync(healthEvidence, 'utf8'))) {
  const health = inventory.routes.find(row => row.kind === 'API' && row.path === '/api/health');
  if (health) Object.assign(health, { status: 'PASS', actual: `Executed real local HTTP health contract and headers; see ${healthEvidence.replace(/^testing-audit\//, '')}. No database dependency.` });
}
if (fs.existsSync(healthEvidence)) {
  const outcomes = fs.readFileSync(healthEvidence, 'utf8');
  if (/^ok \d+ - WOD actual route retries a lost commit acknowledgement without duplicating XP$/m.test(outcomes) && /^# fail 0$/m.test(outcomes)) {
    const daily = inventory.functions.find(row => row.file === 'server/services/wordOfDayAttempt.js' && row.name === 'recordWordOfDayAttempt');
    if (daily) Object.assign(daily, { testingStatus: 'PASS', testingScope: 'Named unit/route cases using an explicit atomic-RPC contract model only; SQL and deployment BLOCKED', actualBehavior: 'Actual function executed in passing WOD input, failure, replay, lost-response, ownership, streak and concurrency-model cases. Does not certify proposed SQL transaction behavior.' });
  }
}
fs.writeFileSync(path.join(out, 'inventory.json'), JSON.stringify(inventory, null, 2) + '\n');
const csv = (name, rows) => {
  const keys = [...new Set(rows.flatMap(Object.keys))];
  const escape = v => '"' + (Array.isArray(v) || v && typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')).replaceAll('"', '""') + '"';
  fs.writeFileSync(path.join(out, name), [keys.map(escape).join(','), ...rows.map(r => keys.map(k => escape(r[k])).join(','))].join('\n') + '\n');
};
csv('FUNCTION_INVENTORY.csv', inventory.functions);
csv('CONTROL_INVENTORY.csv', inventory.controls);
csv('API_AND_ROUTE_INVENTORY.csv', inventory.routes);
csv('DATABASE_DEPENDENCIES.csv', inventory.dataAccess);
console.log(JSON.stringify(Object.fromEntries(Object.entries(inventory).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, v.length]))));
