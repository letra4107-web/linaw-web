import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

type Destination = { to: string; label: string };

export function AdminNavigationSearch({ destinations }: { destinations: Destination[] }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const term = query.trim().toLowerCase();
  const matches = term ? destinations.filter(item => item.label.toLowerCase().includes(term)) : [];
  return <form className="relative" role="search" onSubmit={event => {
    event.preventDefault();
    if (matches[0]) { navigate(matches[0].to); setQuery(''); }
  }}>
    <label className="admin-global-search"><span aria-hidden="true">⌕</span><input type="search" aria-label="Search admin pages" placeholder="Search pages... (e.g. students, parents, teachers)" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') setQuery(''); }} /></label>
    {term && <div className="absolute top-full left-0 z-30 mt-2 w-full rounded-xl border bg-white p-2 shadow-lg">
      {matches.length ? <nav aria-label="Admin search results">{matches.map(item => <Link key={item.to} to={item.to} onClick={() => setQuery('')} className="block rounded-lg px-3 py-2 text-sm font-bold hover:bg-slate-100 focus-visible:outline-2">{item.label}</Link>)}</nav> : <p role="status" className="px-3 py-2 text-sm">No matching pages.</p>}
    </div>}
  </form>;
}
