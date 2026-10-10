import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import ts from 'typescript';

test('parent async button callbacks invoke actions instead of discarding function references', () => {
  const directory = new URL('../src/pages/parent/', import.meta.url);
  const inertHandlers = [];
  for (const filename of readdirSync(directory).filter((name) => name.endsWith('.tsx'))) {
    const source = ts.createSourceFile(filename, readFileSync(new URL(filename, directory), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node) {
      if (ts.isJsxAttribute(node) && node.name.getText(source) === 'onClick' && node.initializer && ts.isJsxExpression(node.initializer)) {
        const handler = node.initializer.expression;
        if (handler && ts.isArrowFunction(handler) && ts.isVoidExpression(handler.body)
          && (ts.isIdentifier(handler.body.expression) || ts.isPropertyAccessExpression(handler.body.expression))) {
          inertHandlers.push(`${filename}: ${handler.getText(source)}`);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  assert.deepEqual(inertHandlers, [], 'A void callback must call its action, not merely reference it.');
});
