import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Isolated units only: dependencies are explicit substitutions, never live services.
export function loadTs(relative, overrides = {}, globals = {}, { transformSource = (source) => source } = {}) {
  const filename = new URL(relative, new URL('../../', import.meta.url));
  const actualRequire = createRequire(filename);
  const original = fileURLToPath(filename);
  const source = ts.transpileModule(transformSource(fs.readFileSync(filename, 'utf8')), { fileName: original, compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2023, inlineSourceMap: true, inlineSources: true, sourceRoot: path.dirname(original).replaceAll('\\', '/') + '/' } }).outputText;
  let executedFilename = filename.pathname;
  if (process.env.QA_FRONTEND_COVERAGE_DIR) {
    executedFilename = path.resolve(process.env.QA_FRONTEND_COVERAGE_DIR, relative + '.cjs');
    fs.mkdirSync(path.dirname(executedFilename), { recursive: true });
    fs.writeFileSync(executedFilename, source);
  }
  const module = { exports: {} };
  vm.runInNewContext(source, { module, exports: module.exports, console, ...globals, require(name) {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (/\.(png|jpg|css)$/.test(name)) return 'test-asset';
    return actualRequire(name);
  } }, { filename: executedFilename });
  return module.exports;
}
