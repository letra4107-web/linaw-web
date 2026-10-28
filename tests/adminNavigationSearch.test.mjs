import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/load-ts.mjs';

function harness() {
  let query = '', destination;
  const jsx = (type, props) => ({ type, props });
  const { AdminNavigationSearch } = loadTs('src/components/AdminNavigationSearch.tsx', {
    react: { useState: () => [query, value => { query = value; }] },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-router-dom': { Link: 'Link', useNavigate: () => path => { destination = path; } },
  });
  function nodes(node) {
    return node && typeof node === 'object' ? [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)] : [];
  }
  const render = () => nodes(AdminNavigationSearch({ destinations: [{ to: '/admin/students', label: 'Students' }, { to: '/admin/parents', label: 'Parents' }] }));
  return { render, enter: value => render().find(n => n.type === 'input').props.onChange({ target: { value } }), destination: () => destination };
}
test('admin navigation search filters pages and Enter opens the first matching route', () => {
  const h = harness(); h.enter('  STUDENT ');
  const nodes = h.render();
  assert.deepEqual(nodes.filter(n => n.type === 'Link').map(n => n.props.to), ['/admin/students']);
  nodes.find(n => n.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.equal(h.destination(), '/admin/students');
  assert.equal(h.render().find(n => n.type === 'input').props.value, '');
});
test('admin navigation search explains empty results and never navigates on an unmatched query', () => {
  const h = harness(); h.enter('unknown-page');
  const nodes = h.render();
  assert.equal(nodes.find(n => n.props?.role === 'status').props.children, 'No matching pages.');
  nodes.find(n => n.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.equal(h.destination(), undefined);
});
test('admin navigation search supports selecting a result and dismissing with Escape', () => {
  const h = harness(); h.enter('parent');
  const link = h.render().find(n => n.type === 'Link');
  assert.equal(link.props.to, '/admin/parents'); link.props.onClick();
  assert.equal(h.render().find(n => n.type === 'input').props.value, '');
  h.enter('student'); h.render().find(n => n.type === 'input').props.onKeyDown({ key: 'Escape' });
  assert.equal(h.render().filter(n => n.type === 'Link').length, 0);
});
