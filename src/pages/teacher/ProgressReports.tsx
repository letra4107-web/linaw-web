import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowUpRight, BarChart3, ChevronLeft, ChevronRight, Crown, Heart, Info, Lightbulb, MoreHorizontal, Search, ShieldCheck, Target, Trophy, UsersRound, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { QueryErrorNotice } from '../../components/QueryErrorNotice';
import { buildReportRows, reportCohort, reportDistribution, reportGraph, startOfManilaWeek } from '../../lib/teacher/reportSummary';
import type { ReportProgress, ReportRoster, ReportSession } from '../../lib/teacher/reportSummary';
import { TeacherStudentDetails } from './TeacherStudentDetails';
import { ReportArtwork, ReportPortrait } from './ReportArtwork';
import classroom from '../../assets/teacher/Teacher Home Hero Banner Background.png';
import teacher from '../../assets/teacher/Teacher Illustration.png';
import './students-reference.css';
import './progress-reference.css';

const GRADE_COLORS = ['#8b5ae7', '#ffbf28', '#3ebc98', '#38a5e5', '#ed79b2', '#a49a33', '#7675bb'];
const gradeName = (grade: number) => grade < 0 ? 'Walang baitang' : grade === 0 ? 'Kindergarten' : `Grade ${grade}`;
const date = (value?: string) => value ? new Intl.DateTimeFormat('fil-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' }).format(new Date(value)) : 'Wala pa';
function ReportCheckbox({ checked, mixed = false, disabled = false, label, onChange }: { checked: boolean; mixed?: boolean; disabled?: boolean; label: string; onChange: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = mixed; }, [mixed]);
  return <input ref={ref} type="checkbox" checked={checked} disabled={disabled} aria-label={label} onChange={onChange} />;
}

export default function ProgressReports() {
  const { user } = useAuth();
  const [gradeFilter, setGradeFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [view, setView] = useState('all');
  const [query, setQuery] = useState('');
  const [period, setPeriod] = useState('7');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [onlySelected, setOnlySelected] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const roster = useQuery({ queryKey: ['teacher-roster', user?.id], queryFn: async () => {
    const { data, error } = await supabase.from('teacher_student_links').select('id, student_id, assigned_at, children(id, name, grade_level, username)').eq('teacher_id', user!.id).order('assigned_at', { ascending: false });
    if (error) throw error;
    return data as unknown as ReportRoster[];
  }, enabled: Boolean(user) });
  const studentIds = (roster.data ?? []).map((row) => row.student_id);
  const progress = useQuery({ queryKey: ['teacher-progress-reports', user?.id, studentIds], queryFn: async () => {
    const { data, error } = await supabase.from('child_progress').select('child_id, xp, streak, level, accuracy_sum, total_attempts, activities_completed, achievements, badges').in('child_id', studentIds);
    if (error) throw error;
    return data as ReportProgress[];
  }, enabled: studentIds.length > 0 });
  const recent = useQuery({ queryKey: ['teacher-progress-recent', user?.id, studentIds], queryFn: async () => {
    const result: ReportSession[] = [];
    for (let start = 0; ; start += 500) {
      const { data, error } = await supabase.from('pronunciation_practice_sessions').select('student_id, created_at').in('student_id', studentIds).order('created_at', { ascending: false }).order('id', { ascending: false }).range(start, start + 499);
      if (error) throw error;
      result.push(...data);
      if (data.length < 500 || studentIds.every((id) => result.some((session) => session.student_id === id))) return result;
    }
  }, enabled: studentIds.length > 0 });
  const rows = useMemo(() => buildReportRows(roster.data ?? [], progress.data ?? [], recent.data ?? []), [roster.data, progress.data, recent.data]);
  const dataError = roster.error || progress.error;
  const pending = roster.isLoading || progress.isLoading;
  const active = rows.filter((row) => row.item?.total_attempts);
  const targets = active.filter((row) => row.accuracy >= 80);
  const attention = active.filter((row) => row.needsAttention);
  const now = Date.now();
  const weekCount = rows.filter((row) => row.lastActivity && Date.parse(row.lastActivity) >= startOfManilaWeek(now) && Date.parse(row.lastActivity) <= now).length;
  const cohort = reportCohort(rows, period, now);
  const graph = reportGraph(cohort);
  const distribution = reportDistribution(rows);
  const grades = [...new Set(rows.map((row) => row.children?.grade_level ?? -1))].sort((a, b) => a - b);
  const levels = distribution.map((item) => item.name);
  const validSelected = selectedIds.filter((id) => studentIds.includes(id));
  const filtered = rows.filter((row) => (gradeFilter === 'all' || String(row.children?.grade_level ?? -1) === gradeFilter)
    && (levelFilter === 'all' || row.level.toLowerCase() === levelFilter)
    && (view === 'all' || view === 'active' && Boolean(row.item?.total_attempts) || view === 'target' && Boolean(row.item?.total_attempts) && row.accuracy >= 80 || view === 'support' && row.needsAttention)
    && (!query.trim() || [row.children?.name, row.children?.username, row.student_id].some((value) => value?.toLowerCase().includes(query.trim().toLowerCase())))
    && (!onlySelected || validSelected.includes(row.student_id)));
  const pages = Math.max(1, Math.ceil(filtered.length / 5));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * 5, currentPage * 5);
  const pageStart = Math.max(1, Math.min(currentPage - 2, pages - 4));
  const allChecked = visible.length > 0 && visible.every((row) => validSelected.includes(row.student_id));
  const mixed = !allChecked && visible.some((row) => validSelected.includes(row.student_id));
  const selected = rows.find((row) => row.student_id === detailId);
  const ranked = [...active].sort((a, b) => b.accuracy - a.accuracy).slice(0, 3);
  const value = (number: number, basic = false) => roster.error || !basic && progress.error ? '—' : roster.isLoading || !basic && progress.isLoading ? '…' : String(number);
  function resetFilters() { setGradeFilter('all'); setLevelFilter('all'); setView('all'); setQuery(''); setOnlySelected(false); setPage(1); }
  function changeView(next: string) { resetFilters(); setView(next); document.getElementById('tr-students')?.scrollIntoView({ block: 'nearest', behavior: 'auto' }); }
  const metrics = [
    { Icon: UsersRound, label: 'Kabuuang Mag-aaral', count: value(rows.length, true), detail: recent.error ? 'Hindi makuha ang aktibidad' : recent.isLoading ? 'Kinukuha ang aktibidad…' : `${weekCount} may aktibidad ngayong linggo`, tone: 'purple', next: 'all' },
    { Icon: BarChart3, label: 'Aktibong Mag-aaral', count: value(active.length), detail: dataError ? 'Hindi makuha ang mga marka' : pending ? 'Kinukuha ang mga marka…' : `${rows.length ? Math.round(active.length / rows.length * 100) : 0}% ng kabuuan`, tone: 'green', next: 'active' },
    { Icon: Trophy, label: 'Naaabot ang Target', count: value(targets.length), detail: '80% pataas ang marka', tone: 'gold', next: 'target' },
    { Icon: Target, label: 'Kailangan ng Suporta', count: value(attention.length), detail: 'Mas mababa sa 70%', tone: 'pink', next: 'support' },
  ];

  return <div className="teacher-progress-design">
    <header className="tr-hero"><img className="tr-hero-background" src={classroom} alt="" aria-hidden="true" /><div className="tr-hero-copy"><p>ULAT NG PAG-UNLAD</p><h1>Mas Maliwanag na<br /><span>Pag-unlad <BarChart3 aria-hidden /></span></h1><p>Subaybayan ang progreso ng bawat mag-aaral at<br className="tr-wide-break" /> tukuyin ang mga lugar na kailangan ng suporta.</p></div><img className="tr-hero-teacher" src={teacher} alt="" aria-hidden="true" /><blockquote>“Mas maunlad<br /> na mag-aaral,<br /> mas makabuluhang<br /> kinabukasan.”<Heart aria-hidden /><Lightbulb aria-hidden /></blockquote></header>
    <QueryErrorNotice error={dataError || recent.error} onRetry={() => { void roster.refetch(); if (studentIds.length) { void progress.refetch(); void recent.refetch(); } }} />
    <section className="tr-metrics" aria-label="Buod ng pag-unlad">{metrics.map(({ Icon, label, count, detail, tone, next }, index) => <button type="button" className={`tr-metric ${tone}`} key={label} disabled={pending || Boolean(dataError)} onClick={() => changeView(next)}><span className="tr-metric-icon"><Icon aria-hidden /></span><span><b>{count}</b><strong>{label}</strong><small>{detail}</small></span>{index === 0 ? <UsersRound className="tr-metric-decor" aria-hidden /> : index === 2 ? <Target className="tr-metric-decor" aria-hidden /> : <ReportArtwork item={2} className="tr-metric-reader" />}</button>)}</section>
    <section className="tr-charts">
      <article className="tr-panel tr-overview"><header className="tr-heading"><span className="tr-heading-icon"><BarChart3 aria-hidden /></span><div><h2>Pangkalahatang Pag-unlad</h2><p>Average na marka batay sa aktuwal na records ng klase.</p></div><label className="sr-only" htmlFor="tr-period">Panahon ng pagiging aktibo</label><select id="tr-period" value={period} onChange={(event) => setPeriod(event.target.value)}><option value="7">Huling 7 araw</option><option value="30">Huling 30 araw</option><option value="all">Lahat ng panahon</option></select></header>
        <div className="tr-chart" aria-busy={pending || recent.isLoading}><div className="tr-y-labels" aria-hidden="true">{[100, 75, 50, 25, 0].map((number) => <span key={number}>{number}%</span>)}</div><div className="tr-chart-plot"><div className="tr-chart-lines" aria-hidden="true">{[0, 25, 50, 75, 100].map((number) => <i key={number} style={{ bottom: `${number}%` }} />)}</div>
          {pending || recent.isLoading ? <p className="tr-chart-message" role="status">Binubuo ang ulat ng pag-unlad…</p> : dataError || recent.error && period !== 'all' ? <p className="tr-chart-message">Hindi makuha ang graph. Subukan muli sa itaas.</p> : !cohort.length ? <div className="tr-chart-empty"><ReportArtwork item={0} /><strong>Wala pang sapat na datos</strong><p>Magkakaroon ng grap sa sandaling may magawa<br /> na aktibidad ang mga mag-aaral.</p></div> : <div className="tr-bar-groups">{graph.map((entry) => <div className="tr-bar-group" key={entry.metric}>{entry.groups.map((group, index) => <span key={group.grade} className="tr-bar" role="img" aria-label={`${entry.metric}, ${gradeName(group.grade)}: ${group.value}%`} title={`${gradeName(group.grade)} · ${entry.metric}: ${group.value}%`} style={{ '--report-bar-height': `${Math.max(0, Math.min(100, group.value))}%`, '--report-bar-color': GRADE_COLORS[index % GRADE_COLORS.length] } as CSSProperties} />)}</div>)}</div>}
        </div><div className="tr-x-labels" aria-hidden="true"><span>Accuracy</span><span>Completion</span><span>Practice</span></div></div>
        <div className="tr-chart-footer"><details><summary aria-label="Paliwanag sa graph"><Info aria-hidden /> Ano ang sinusukat?</summary><p>Ang panahon ay pumipili ng mga mag-aaral na may kamakailang aktibidad. Ang marka ay mula sa kanilang kabuuang records. Accuracy ang average na marka. Completion at Practice ang bilang ng natapos na gawain at attempts, kumpara sa pinakamataas na bilang sa aktibong klase; hindi ito porsiyento ng natapos na curriculum.</p></details>{cohort.length > 0 && !dataError && <div className="tr-legend">{graph[0].groups.map((group, index) => <span key={group.grade}><i style={{ background: GRADE_COLORS[index % GRADE_COLORS.length] }} />{gradeName(group.grade)}</span>)}</div>}</div>
      </article>
      <article className="tr-panel tr-levels"><header className="tr-heading"><span className="tr-heading-icon"><Crown aria-hidden /></span><div><h2>Antas ng Pagbasa</h2><p>Bilang ng mga mag-aaral sa bawat antas.</p></div></header><div className="tr-donut" role="img" aria-label={dataError ? 'Hindi makuha ang antas ng pagbasa' : `${rows.length} mag-aaral. ${distribution.map((item) => `${item.name}: ${item.value}`).join(', ')}`}><svg viewBox="0 0 180 180" aria-hidden="true"><circle cx="90" cy="90" r="67" fill="none" stroke="var(--tr-track)" strokeWidth="24" />{!pending && !dataError && distribution.map((item, index) => { const before = distribution.slice(0, index).reduce((sum, entry) => sum + entry.value, 0); const length = rows.length ? item.value / rows.length * 420.973 : 0; return <circle key={item.name} cx="90" cy="90" r="67" fill="none" stroke={item.color} strokeWidth="24" strokeDasharray={`${length} ${420.973 - length}`} strokeDashoffset={rows.length ? -before / rows.length * 420.973 : 0} transform="rotate(-90 90 90)" />; })}</svg><strong>{value(rows.length)}<small>Mag-aaral</small></strong></div><ul className="tr-distribution">{distribution.map((item) => <li key={item.name}><i style={{ background: item.color }} /><span>{item.name}</span><b>{dataError || pending ? '—' : `${item.value} (${rows.length ? Math.round(item.value / rows.length * 100) : 0}%)`}</b></li>)}</ul></article>
    </section>
    <section className="tr-highlights"><article className="tr-panel"><header className="tr-heading"><span className="tr-heading-icon"><Crown aria-hidden /></span><div><h2>Nangungunang Mag-aaral</h2><p>Pinakamataas na kabuuang marka</p></div></header>{pending ? <p className="tr-state" role="status">Kinukuha ang mga marka…</p> : dataError ? <p className="tr-state">Hindi makuha ang mga marka.</p> : ranked.length ? <div className="tr-highlight-list">{ranked.map((row, index) => <button type="button" key={row.student_id} onClick={() => setDetailId(row.student_id)}><em>{index + 1}</em><ReportPortrait index={rows.indexOf(row)} /><span><b>{row.children?.name ?? 'Mag-aaral'}</b><small>{row.accuracy}% na marka</small></span><ArrowUpRight aria-hidden /></button>)}</div> : <div className="tr-highlight-empty"><ReportArtwork item={1} /><p>Wala pang sapat na activity record.</p></div>}</article><article className="tr-panel"><header className="tr-heading"><span className="tr-heading-icon pink"><AlertTriangle aria-hidden /></span><div><h2>Kailangang Tutukan</h2><p>Mga mag-aaral na mababa ang marka</p></div></header>{pending ? <p className="tr-state" role="status">Sinusuri ang mga marka…</p> : dataError ? <p className="tr-state">Hindi makuha ang mga marka.</p> : attention.length ? <div className="tr-highlight-list">{attention.slice(0, 3).map((row) => <button type="button" key={row.student_id} onClick={() => setDetailId(row.student_id)}><ReportPortrait index={rows.indexOf(row)} /><span><b>{row.children?.name ?? 'Mag-aaral'}</b><small>{row.accuracy}% · Kailangan ng suporta</small></span><ArrowUpRight aria-hidden /></button>)}</div> : <div className="tr-highlight-empty"><ReportArtwork item={2} /><p>Walang mag-aaral na nangangailangan ng agarang suporta.</p></div>}</article></section>
    <section className="tr-panel tr-student-panel" id="tr-students"><header className="tr-heading"><span className="tr-heading-icon"><ShieldCheck aria-hidden /></span><div><h2>Detalye ng Pag-unlad ng Mag-aaral</h2><p>Tingnan ang indibidwal na progreso ng bawat mag-aaral.</p></div><div className="tr-filters"><label className="sr-only" htmlFor="tr-grade">Baitang</label><select id="tr-grade" aria-label="Baitang" value={gradeFilter} onChange={(event) => { setGradeFilter(event.target.value); setPage(1); }}><option value="all">Lahat ng Baitang</option>{grades.map((grade) => <option key={grade} value={grade}>{gradeName(grade)}</option>)}</select><label className="sr-only" htmlFor="tr-level">Antas ng pagbasa</label><select id="tr-level" aria-label="Antas ng pagbasa" disabled={Boolean(dataError)} value={levelFilter} onChange={(event) => { setLevelFilter(event.target.value); setPage(1); }}><option value="all">Lahat ng Antas</option>{levels.map((level) => <option key={level} value={level.toLowerCase()}>{level}</option>)}</select><label className="tr-search"><Search aria-hidden /><span className="sr-only">Hanapin ang mag-aaral</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Hanapin ang mag-aaral..." /></label></div></header>
      {(view !== 'all' || validSelected.length > 0) && <div className="tr-selection">{view !== 'all' && <span>Ipinapakita: {view === 'active' ? 'Aktibong Mag-aaral' : view === 'target' ? 'Naaabot ang Target' : 'Kailangan ng Suporta'}<button type="button" onClick={resetFilters} aria-label="Ipakita ang buong klase"><X aria-hidden /></button></span>}{validSelected.length > 0 && <><span>{validSelected.length} mag-aaral ang napili</span><button type="button" aria-pressed={onlySelected} onClick={() => { setOnlySelected((value) => !value); setPage(1); }}>{onlySelected ? 'Ipakita ang lahat' : 'Tingnan ang napili'}</button><button type="button" onClick={() => { setSelectedIds([]); setOnlySelected(false); }}>Alisin ang pagpili</button></>}</div>}
      <div className="tr-table-scroll" tabIndex={0} role="region" aria-label="Talahanayan ng progreso"><table><thead><tr><th scope="col"><ReportCheckbox checked={allChecked} mixed={mixed} disabled={!visible.length || roster.isLoading} label="Piliin ang lahat sa pahinang ito" onChange={() => setSelectedIds((ids) => allChecked ? ids.filter((id) => !visible.some((row) => row.student_id === id)) : [...new Set([...ids, ...visible.map((row) => row.student_id)])])} /></th><th scope="col">MAG-AARAL</th><th scope="col">BAITANG</th><th scope="col">ANTAS NG PAGBASA</th><th scope="col">KABUUANG MARKA</th><th scope="col">HULING AKTIBIDAD</th><th scope="col">KATAYUAN</th><th scope="col">AKSYON</th></tr></thead><tbody>{roster.isLoading ? <tr><td colSpan={8} className="tr-state" role="status">Kinukuha ang mga mag-aaral…</td></tr> : roster.error ? <tr><td colSpan={8} className="tr-state">Hindi makuha ang roster. Subukan muli sa itaas.</td></tr> : visible.map((row) => <tr key={row.student_id} className={validSelected.includes(row.student_id) ? 'is-selected' : ''}><td><ReportCheckbox checked={validSelected.includes(row.student_id)} label={`Piliin si ${row.children?.name ?? 'mag-aaral'}`} onChange={() => setSelectedIds((ids) => ids.includes(row.student_id) ? ids.filter((id) => id !== row.student_id) : [...ids, row.student_id])} /></td><td><button type="button" className="tr-student" onClick={() => setDetailId(row.student_id)}><ReportPortrait index={rows.indexOf(row)} /><span><b>{row.children?.name ?? 'Mag-aaral'}</b><small title={row.children?.username}>{row.children?.username || 'Walang username'}</small></span></button></td><td>{gradeName(row.children?.grade_level ?? -1)}</td><td><span className={`tr-level ${row.level.toLowerCase().replace(/[^a-z]/g, '')}`}>{progress.error ? '—' : row.level}</span></td><td><span className="tr-score"><i><u style={{ width: `${progress.error ? 0 : Math.max(0, Math.min(100, row.accuracy))}%` }} /></i><b>{progress.error || !row.item?.total_attempts ? '—' : `${row.accuracy}%`}</b></span></td><td><span className="tr-activity-date"><b>{recent.error ? 'Hindi makuha' : date(row.lastActivity)}</b><small>{progress.error ? 'Hindi makuha ang mga gawain' : `${row.item?.activities_completed ?? 0} natapos na gawain`}</small></span></td><td>{progress.error ? '—' : <span className={`tr-status ${row.needsAttention ? 'attention' : ''}`}>{row.needsAttention ? 'Tutukan' : 'Aktibo'}</span>}</td><td><button type="button" className="tr-more" aria-label={`Tingnan ang progreso ni ${row.children?.name ?? 'mag-aaral'}`} onClick={() => setDetailId(row.student_id)}><MoreHorizontal aria-hidden /></button></td></tr>)}{!roster.isLoading && !roster.error && !visible.length && <tr><td colSpan={8} className="tr-state"><strong>{rows.length ? 'Walang mag-aaral na tugma sa mga filter.' : 'Wala pang mag-aaral sa iyong roster.'}</strong>{rows.length > 0 && <button type="button" onClick={resetFilters}>I-reset ang mga filter</button>}</td></tr>}</tbody></table></div>
      <footer className="tr-pagination"><p>Showing {filtered.length ? (currentPage - 1) * 5 + 1 : 0}–{Math.min(currentPage * 5, filtered.length)} of {filtered.length} mag-aaral</p><nav aria-label="Mga pahina ng ulat"><button type="button" aria-label="Nakaraang pahina" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft aria-hidden /></button>{Array.from({ length: Math.min(5, pages) }, (_, index) => pageStart + index).map((number) => <button type="button" key={number} aria-label={`Pahina ${number}`} aria-current={currentPage === number ? 'page' : undefined} onClick={() => setPage(number)}>{number}</button>)}<button type="button" aria-label="Susunod na pahina" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}><ChevronRight aria-hidden /></button></nav></footer>
    </section>
    {selected && <TeacherStudentDetails key={selected.student_id} student={selected} progressUnavailable={Boolean(progress.error)} onClose={() => setDetailId(null)} />}
  </div>;
}
