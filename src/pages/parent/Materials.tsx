import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, CheckCircle2, ChevronDown, Download, FileText, Heart, Lightbulb, LoaderCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth/AuthContext';
import parentBackground from '../../assets/parent/parent-bg.png';
import readingArt from '../../assets/parent/reading.png';
import './materials-reference.css';

interface Child { id: string; name: string; grade_level: number; }
interface Assignment {
  id: string;
  status: 'assigned' | 'in_progress' | 'submitted' | 'reviewed' | 'needs_review' | 'completed';
  due_date: string | null;
  assigned_at: string;
  pdf_materials: { id: string; title: string; grade_level: number | null; level: string | null };
}
const statuses: Record<Assignment['status'], string> = {
  assigned: 'Nakatakda',
  in_progress: 'Isinasagawa',
  submitted: 'Naisumite',
  reviewed: 'Nasuri',
  needs_review: 'Kailangan ng Gabay',
  completed: 'Tapos na',
};

export default function Materials() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [childId, setChildId] = useState('');
  const [filter, setFilter] = useState('all');
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [openError, setOpenError] = useState('');
  const [materialLink, setMaterialLink] = useState<{ id: string; url: string } | null>(null);
  const childrenQuery = useQuery({ queryKey: ['parent-materials-children', user?.id], queryFn: () => api<{ children: Child[] }>('/parent/children', { auth: true }), enabled: !!user });
  const children = childrenQuery.data?.children ?? [];
  const selected = children.find((child) => child.id === (childId || searchParams.get('child'))) ?? children[0];
  const materialsQuery = useQuery({ queryKey: ['parent-materials', selected?.id], queryFn: () => api<{ assignments: Assignment[] }>(`/parent/children/${selected!.id}/materials`, { auth: true }), enabled: !!selected });
  const assignments = materialsQuery.data?.assignments ?? [];
  const shown = assignments.filter((assignment) => filter === 'all' || assignment.status === filter);

  async function openMaterial(assignment: Assignment) {
    setOpeningId(assignment.id);
    setOpenError('');
    try {
      const result = await api<{ url: string | null }>(`/parent/children/${selected!.id}/materials/${assignment.id}/access-url`, { auth: true });
      if (!result.url || !/^https?:\/\//.test(result.url)) throw new Error('Wala pang available na file para sa materyal na ito.');
      setMaterialLink({ id: assignment.id, url: result.url });
    } catch (error) {
      setOpenError(error instanceof Error ? error.message : 'Hindi mabuksan ang materyal ngayon.');
    } finally {
      setOpeningId(null);
    }
  }

  return <div className="parent-materials-reference">
    <header className="materials-hero" style={{ backgroundImage: `linear-gradient(90deg,#f5fcfa 0%,#f5fcfae8 34%,#f5fcfa00 65%),url("${parentBackground}")` }}>
      <div><p>SUPORTA SA PAGKATUTO</p><h1>Mga Materyales <BookOpen aria-hidden="true" /></h1><span>Mga aralin at reading materials mula sa guro. Sama-sama tayong magbasa at matuto sa bahay!</span></div>
      <aside><Heart size={17} fill="currentColor" /><b>Bawat pahina, bagong kaalaman!</b></aside>
    </header>
    <section className="materials-child-picker"><div><b>Piliin ang Anak</b><label><i>{selected?.name.charAt(0) ?? 'A'}</i><span><strong>{selected?.name ?? 'Piliin ang Anak'}</strong><small>{selected ? `Grade ${selected.grade_level}` : 'Magdagdag ng anak upang magsimula'}</small></span><ChevronDown size={18} /><select aria-label="Piliin ang anak" value={selected?.id ?? ''} onChange={(event) => { setChildId(event.target.value); setMaterialLink(null); }}>{children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}</select></label></div><Link to="/parent/children">Tingnan ang Mga Anak</Link></section>
    <section className="materials-metrics"><article><i><BookOpen /></i><div><b>{assignments.length}</b><span>Mga Materyales</span></div></article><article><i><FileText /></i><div><b>{assignments.filter((item) => item.status === 'assigned' || item.status === 'in_progress').length}</b><span>Ipagpapatuloy</span></div></article><article><i><CheckCircle2 /></i><div><b>{assignments.filter((item) => item.status === 'reviewed' || item.status === 'completed').length}</b><span>Nasuri / Nakumpleto</span></div></article></section>
    <div className="materials-grid"><section className="materials-library"><header><h2><BookOpen size={22} /> Aking Reading Materials</h2><nav aria-label="I-filter ang mga materyales">{[['all', 'Lahat'], ...Object.entries(statuses)].map(([value, label]) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</nav></header>
      {(childrenQuery.isPending || (!!selected && materialsQuery.isPending)) ? <p className="materials-empty"><LoaderCircle className="animate-spin" /> Nilo-load ang mga materyales...</p> : childrenQuery.isError || materialsQuery.isError ? <div className="materials-empty" role="alert"><p>Hindi ma-load ang mga materyales ngayon.</p><button type="button" onClick={() => { void childrenQuery.refetch(); void materialsQuery.refetch(); }}>Subukan Muli</button></div> : shown.length ? <div className="materials-list">{shown.map((item) => <article key={item.id}><span className="material-document"><FileText size={28} /></span><div><h3>{item.pdf_materials.title}</h3><p>{item.pdf_materials.grade_level ? `Grade ${item.pdf_materials.grade_level}` : 'Reading material'}{item.pdf_materials.level ? ` · ${item.pdf_materials.level}` : ''}</p><small>{item.due_date ? `Takdang petsa: ${new Date(`${item.due_date}T00:00:00`).toLocaleDateString('fil-PH', { dateStyle: 'medium' })}` : `Itinalaga: ${new Date(item.assigned_at).toLocaleDateString('fil-PH', { dateStyle: 'medium' })}`}</small></div><em className={item.status}>{statuses[item.status]}</em>{materialLink?.id === item.id ? <a href={materialLink.url} target="_blank" rel="noopener noreferrer"><BookOpen size={16} /> Buksan ang PDF</a> : <button type="button" disabled={openingId === item.id} onClick={() => void openMaterial(item)}>{openingId === item.id ? <LoaderCircle className="animate-spin" size={16} /> : <Download size={16} />} Tingnan</button>}</article>)}</div> : <div className="materials-empty"><BookOpen size={34} /><h3>{selected ? 'Wala pang materyal sa kategoryang ito' : 'I-enroll muna ang iyong anak'}</h3><p>{selected ? 'Lalabas dito ang reading materials na itatalaga ng guro.' : 'Makikita rito ang mga materyales na para sa kanilang pag-aaral.'}</p></div>}
      {openError && <p role="alert" className="materials-error">{openError}</p>}
    </section><aside className="materials-reading-tip"><div><h2><Lightbulb size={22} /> Magbasa nang Magkasama</h2><p>Gawing bahagi ng araw ang pagbabasa. Pumili ng isang materyal, magtanong tungkol sa kuwento, at ipagdiwang ang bawat bagong salita.</p><Link to="/parent/schedule">Magplano ng Oras sa Pagbasa</Link></div><img src={readingArt} alt="" /></aside></div>
  </div>;
}
