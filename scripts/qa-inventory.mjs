import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { redactConfiguredValues } from './qa-redaction.mjs';

const root = process.cwd();
const output = path.join(root, 'docs/qa');
fs.mkdirSync(output, { recursive: true });
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (['node_modules', '.git', 'dist'].includes(entry.name)) return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? files(full) : [full];
  });
}
const inventory = { generatedFor: '2026-10-17', files: [], routes: [], controls: [], dataAccess: [], environment: [], migrations: [] };
for (const file of [...files('src'), ...files('server'), ...files('migrations')]) {
  if (!/\.(tsx?|js|sql)$/.test(file)) continue;
  const source = fs.readFileSync(file, 'utf8');
  const relative = file.replaceAll('\\', '/');
  inventory.files.push({ file: relative, lines: source.split('\n').length, bytes: Buffer.byteLength(source) });
  if (file.endsWith('.sql')) { inventory.migrations.push(relative); continue; }
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const line = (node) => tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1;
  const compact = (node) => node?.getText(tree).replace(/\s+/g, ' ').slice(0, 240) ?? '';
  function visit(node) {
    if (ts.isCallExpression(node)) {
      const expression = compact(node.expression);
      if (/^router\.(get|post|put|patch|delete|use)$/.test(expression)) inventory.routes.push({ file: relative, line: line(node), method: expression.split('.')[1], path: compact(node.arguments[0]), handlers: node.arguments.slice(1, -1).map(compact) });
      if (/\.(from|rpc)$/.test(expression) || /^api$/.test(expression) || /fetch$/.test(expression)) inventory.dataAccess.push({ file: relative, line: line(node), call: expression, target: compact(node.arguments[0]) });
    }
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(tree);
      const attrs = Object.fromEntries(node.attributes.properties.filter(ts.isJsxAttribute).map((attr) => [attr.name.getText(tree), compact(attr.initializer) || 'true']));
      if (tag === 'Route') inventory.routes.push({ file: relative, line: line(node), method: 'UI', path: attrs.path || '(index/layout)', element: attrs.element });
      if (['button', 'input', 'select', 'textarea', 'a', 'Link', 'NavLink', 'form'].includes(tag) || Object.keys(attrs).some((attr) => /^on(Click|Submit|Change|KeyDown)$/.test(attr))) {
        const interactive = { file: relative, line: line(node), tag, attributes: attrs, verification: 'NOT RUN — source inventory only' };
        if (tag === 'button' && !attrs.onClick && attrs.type !== '"submit"' && !attrs.disabled) interactive.review = 'Check implicit form submission or unfinished control';
        if (tag === 'input' && attrs.type === '"checkbox"' && !attrs.onChange && !attrs.disabled && !attrs.readOnly) interactive.review = 'Check uncontrolled selection behavior';
        inventory.controls.push(interactive);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  for (const match of source.matchAll(/(?:process\.env|import\.meta\.env)\.([A-Z][A-Z0-9_]*)/g)) inventory.environment.push({ file: relative, name: match[1] });
}
fs.writeFileSync(path.join(output, 'source-inventory.json'), redactConfiguredValues(JSON.stringify(inventory, null, 2)) + '\n');
const envFiles = ['.env', '.env.production', 'server/.env'];
const configured = {};
for (const file of envFiles) {
  if (!fs.existsSync(file)) { configured[file] = { exists: false }; continue; }
  const entries = fs.readFileSync(file, 'utf8').split(/\r?\n/).map((line) => line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/)).filter(Boolean);
  configured[file] = { exists: true, variables: entries.map(([, name, value]) => ({ name, configured: Boolean(value.trim().replace(/^['"]|['"]$/g, '')) })) };
}
fs.writeFileSync(path.join(output, 'configuration-presence.json'), JSON.stringify(configured, null, 2) + '\n');
console.log(JSON.stringify({ files: inventory.files.length, routes: inventory.routes.length, controls: inventory.controls.length, dataAccess: inventory.dataAccess.length, migrations: inventory.migrations.length, controlsNeedingReview: inventory.controls.filter((item) => item.review).map(({ file, line, tag, review }) => ({ file, line, tag, review })) }, null, 2));
