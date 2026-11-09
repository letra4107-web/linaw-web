import { useId, useState } from 'react';
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight, Eye, Pencil, Search, Trash2 } from 'lucide-react';

interface LibraryLesson {
  id: string; title: string; grade_level: string | null; file_name: string | null;
  pdf_url: string | null; is_published: boolean; created_at: string;
}
interface Props {
  lessons: readonly LibraryLesson[]; busy: boolean;
  onPreview: (id: string) => void; onEdit: (id: string) => void;
  onPublish: (id: string) => void; onDelete: (id: string) => void; onDetails: (id: string) => void;
}
const date = new Intl.DateTimeFormat('fil-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' });

export function LessonLibraryTable({ lessons, busy, onPreview, onEdit, onPublish, onDelete, onDetails }: Props) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const searchId = useId();
  const query = search.trim().toLocaleLowerCase('fil');
  const filtered = lessons.filter(lesson => [lesson.title, lesson.file_name, lesson.grade_level && `Grade ${lesson.grade_level}`].some(value => value?.toLocaleLowerCase('fil').includes(query)));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize;
  const rows = filtered.slice(start, start + pageSize);
  return <div className="tl-library-table">
    <label className="tl-library-search" htmlFor={searchId}><Search aria-hidden /><span className="sr-only">Maghanap sa Lesson Library</span><input id={searchId} type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Maghanap ng aralin o file..." /></label>
    <div className="tl-table-scroll" role="region" aria-label="Mga aralin sa Lesson Library" tabIndex={0}>
      <table className="tl-lessons-table">
        <caption className="sr-only">Mga aralin at mga pagkilos para pamahalaan ang mga ito</caption>
        <thead><tr><th scope="col">Aralin</th><th scope="col">Baitang</th><th scope="col">Status</th><th scope="col">Petsa</th><th scope="col">Mga Pagkilos</th></tr></thead>
        <tbody>{rows.map(lesson => <tr key={lesson.id}>
          <td><h3>{lesson.title}</h3><small>{lesson.file_name || 'Walang kalakip na file'}</small></td>
          <td>{lesson.grade_level === '0' ? 'Kindergarten' : lesson.grade_level ? `Grade ${lesson.grade_level}` : 'Walang baitang'}</td>
          <td><span className={`tl-lesson-status ${lesson.is_published ? 'is-published' : 'is-draft'}`}>{lesson.is_published ? 'Published' : 'Draft'}</span></td>
          <td><time dateTime={lesson.created_at}>{date.format(new Date(lesson.created_at))}</time></td>
          <td><div className="tl-lesson-actions">
            <button type="button" disabled={busy || !lesson.pdf_url} onClick={() => onPreview(lesson.id)} aria-label={`Tingnan ang PDF ng ${lesson.title}`} title="Tingnan ang PDF"><Eye aria-hidden /></button>
            <button type="button" disabled={busy} onClick={() => onEdit(lesson.id)} aria-label={`I-edit ang ${lesson.title}`} title="I-edit"><Pencil aria-hidden /></button>
            <button type="button" disabled={busy || (!lesson.is_published && !lesson.pdf_url)} onClick={() => onPublish(lesson.id)} aria-label={`${lesson.is_published ? 'Gawing draft ang' : 'I-publish ang'} ${lesson.title}`} title={lesson.is_published ? 'Gawing draft' : 'I-publish'}><BookOpen aria-hidden /></button>
            <button type="button" disabled={busy} onClick={() => onDelete(lesson.id)} aria-label={`Tanggalin ang ${lesson.title}`} title="Tanggalin"><Trash2 aria-hidden /></button>
            <button type="button" disabled={busy} onClick={() => onDetails(lesson.id)} aria-label={`Mga detalye ng ${lesson.title}`} title="Mga detalye"><ArrowRight aria-hidden /></button>
          </div></td>
        </tr>)}</tbody>
      </table>
      {!rows.length && <p className="tl-no-results" role="status">Walang araling tumugma sa iyong hinahanap.</p>}
    </div>
    <div className="tl-table-footer">
      <label className="tl-page-size">Aralin bawat pahina<select aria-label="Aralin bawat pahina" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}>{[5, 10, 20].map(size => <option key={size} value={size}>{size}</option>)}</select></label>
      <p role="status" aria-live="polite">{filtered.length ? `${start + 1}–${start + rows.length}` : '0'} sa {filtered.length} aralin</p>
      <nav className="tl-library-pagination" aria-label="Mga pahina ng Lesson Library">
        <button type="button" aria-label="Nakaraang pahina ng aralin" disabled={current === 1} onClick={() => setPage(current - 1)}><ChevronLeft aria-hidden /></button>
        <span>Pahina {current} sa {pages}</span>
        <button type="button" aria-label="Susunod na pahina ng aralin" disabled={current === pages} onClick={() => setPage(current + 1)}><ChevronRight aria-hidden /></button>
      </nav>
    </div>
  </div>;
}
