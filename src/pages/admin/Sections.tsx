import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Check, GraduationCap, Plus, RotateCcw, Search, UserRound, UsersRound, X } from 'lucide-react';
import { api } from '../../lib/api';
import hero from '../../assets/admin_design/admin-hero-background.png';
import owl from '../../assets/admin_design/owl-admin-mascot.png';
import books from '../../assets/admin_design/books-stack.png';

type Teacher = { id: string; name: string | null; email: string };
type Section = { id: string; name: string; grade_level: number; adviser_id: string; capacity: number; is_reading_support: boolean; studentCount: number };
type SectionStudent = { id: string; name: string; grade_level: number; assigned: boolean };
type SectionRoster = { section: Pick<Section, 'id' | 'name' | 'grade_level' | 'capacity'>; students: SectionStudent[]; assignedCount: number };
const sectionIconClass = (index: number) => ['violet', 'blue', 'gold', 'rose', 'mint', 'orange'][index % 6];

export default function Sections() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('1');
  const [teacher, setTeacher] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [activeSection, setActiveSection] = useState<Section | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string> | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['admin-sections'], queryFn: () => api<{ sections: Section[]; teachers: Teacher[] }>('/admin/sections', { auth: true }) });
  const rosterQuery = useQuery({ queryKey: ['admin-section-students', activeSection?.id], queryFn: () => api<SectionRoster>(`/admin/sections/${activeSection?.id}/students`, { auth: true }), enabled: Boolean(activeSection) });
  const create = useMutation({
    mutationFn: () => api('/admin/sections', { method: 'POST', auth: true, body: { name, gradeLevel: Number(grade), adviserId: teacher } }),
    onSuccess: () => { setName(''); setTeacher(''); queryClient.invalidateQueries({ queryKey: ['admin-sections'] }); },
    onError: (reason: Error) => setError(reason.message),
  });
  const assignStudents = useMutation({
    mutationFn: (studentIds: string[]) => api(`/admin/sections/${activeSection?.id}/students`, { method: 'POST', auth: true, body: { studentIds } }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-sections'] }); queryClient.invalidateQueries({ queryKey: ['admin-section-students', activeSection?.id] }); setActiveSection(null); setSelectedStudentIds(null); },
  });
  const teachers = data?.teachers ?? [];
  const sections = data?.sections ?? [];
  const visibleSections = useMemo(() => sections.filter((section) => {
    const matchesSearch = section.name.toLowerCase().includes(search.trim().toLowerCase());
    return matchesSearch && (gradeFilter === 'all' || section.grade_level === Number(gradeFilter));
  }), [sections, search, gradeFilter]);
  const roster = rosterQuery.data;
  const assignedIds = useMemo(() => new Set(roster?.students.filter((student) => student.assigned).map((student) => student.id) ?? []), [roster]);
  const currentSelection = selectedStudentIds ?? assignedIds;
  useEffect(() => { setSelectedStudentIds(null); }, [activeSection?.id]);
  const resetForm = () => { setName(''); setGrade('1'); setTeacher(''); setError(null); };
  const openRoster = (section: Section) => { setActiveSection(section); setSelectedStudentIds(null); };
  const toggleStudent = (studentId: string) => {
    if (assignedIds.has(studentId)) return;
    setSelectedStudentIds((previous) => {
      const next = new Set(previous ?? assignedIds);
      if (next.has(studentId)) next.delete(studentId); else if (next.size < (roster?.section.capacity ?? 0)) next.add(studentId);
      return next;
    });
  };

  return <main className="sections-page">
    <header className="sections-hero">
      <img className="sections-hero-scene" src={hero} alt="" />
      <div className="sections-hero-copy"><p>ROSTER MANAGEMENT</p><h1>Sections <i>&amp; Reading Support</i></h1><span>Assign advisers and create focused reading-support groups.</span></div>
      <img className="sections-owl" src={owl} alt="" />
      <aside className="sections-note">“Organized sections,<br />brighter learners!”</aside>
    </header>
    <div className="sections-grid">
      <form onSubmit={(event) => { event.preventDefault(); setError(null); create.mutate(); }} className="sections-create">
        <header><b><Plus /></b><div><h2>Create Section</h2><p>Add a new section for your students.</p></div><img src={books} alt="" /></header>
        <label>Name <em>*</em><span className="sections-field"><BookOpen /><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Grade 3-A" /></span></label>
        <label>Grade <em>*</em><span className="sections-field"><GraduationCap /><select value={grade} onChange={(event) => setGrade(event.target.value)}>{[1, 2, 3, 4, 5, 6].map((level) => <option key={level} value={level}>Grade {level}</option>)}</select></span></label>
        <label>Adviser <em>*</em><span className="sections-field"><UserRound /><select required value={teacher} onChange={(event) => setTeacher(event.target.value)}><option value="">Select a teacher/adviser</option>{teachers.map((item) => <option key={item.id} value={item.id}>{item.name || item.email}</option>)}</select></span></label>
        {error && <p className="sections-error">{error}</p>}
        <footer><button type="button" onClick={resetForm}><RotateCcw />Clear</button><button disabled={create.isPending}><Plus />{create.isPending ? 'Saving...' : 'Create Section'}</button></footer>
      </form>
      <section className="sections-list" aria-labelledby="sections-list-title">
        <header><span><BookOpen /></span><div><h2 id="sections-list-title">Sections</h2><p>List of all created sections.</p></div><div className="sections-controls"><label><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search sections..." aria-label="Search sections" /></label><select value={gradeFilter} onChange={(event) => setGradeFilter(event.target.value)} aria-label="Filter by grade"><option value="all">All Grades</option>{[1, 2, 3, 4, 5, 6].map((level) => <option key={level} value={level}>Grade {level}</option>)}</select></div></header>
        {isLoading ? <p className="sections-loading">Loading sections...</p> : <>
          <div className="sections-table" role="table" aria-label="Section list">
            <div className="head" role="row"><b>SECTION NAME</b><b>GRADE</b><b>ADVISER</b><b>STUDENTS</b></div>
            {visibleSections.map((section, index) => {
              const adviser = teachers.find((item) => item.id === section.adviser_id);
              const adviserName = adviser?.name || adviser?.email || 'Teacher';
              const initials = adviserName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
              const progress = Math.min(100, section.studentCount / section.capacity * 100);
              return <button type="button" className="row" role="row" key={section.id} onClick={() => openRoster(section)} aria-label={`Manage students in ${section.name}`}><strong><i className={sectionIconClass(index)}><BookOpen /></i><span>{section.name}</span></strong><b>{section.grade_level}</b><span className="sections-adviser"><i>{initials}</i>{adviserName}</span><span className="sections-capacity">{section.studentCount}/{section.capacity}<u><i style={{ width: `${progress}%` }} /></u></span></button>;
            })}
          </div>
          <footer>Showing {visibleSections.length ? `1–${visibleSections.length}` : '0'} of {visibleSections.length} sections</footer>
        </>}
      </section>
    </div>
    {activeSection && <div className="sections-modal-backdrop" role="presentation" onMouseDown={() => !assignStudents.isPending && setActiveSection(null)}><section className="sections-modal" role="dialog" aria-modal="true" aria-labelledby="section-roster-title" onMouseDown={(event) => event.stopPropagation()}><header><span><UsersRound /></span><div><p>GRADE {activeSection.grade_level} ROSTER</p><h2 id="section-roster-title">Assign Students to {activeSection.name}</h2><small>Select students for this section. Existing members are already assigned.</small></div><button type="button" onClick={() => setActiveSection(null)} aria-label="Close"><X /></button></header>{rosterQuery.isLoading ? <p className="sections-modal-loading">Loading eligible students...</p> : rosterQuery.isError ? <p className="sections-error">Unable to load eligible students. Please try again.</p> : <><div className="sections-roster-summary"><b>{currentSelection.size}/{roster?.section.capacity ?? activeSection.capacity} students selected</b><span>Only Grade {activeSection.grade_level} students are shown.</span></div><div className="sections-student-list">{roster?.students.length ? roster.students.map((student) => { const assigned = assignedIds.has(student.id); const selected = currentSelection.has(student.id); return <button type="button" key={student.id} disabled={assigned} className={selected ? 'selected' : ''} onClick={() => toggleStudent(student.id)}><i>{selected ? <Check /> : null}</i><span><b>{student.name}</b><small>{assigned ? 'Already assigned' : `Grade ${student.grade_level}`}</small></span></button>; }) : <p className="sections-modal-loading">No Grade {activeSection.grade_level} students are available yet.</p>}</div><footer><button type="button" onClick={() => setActiveSection(null)}>Cancel</button><button type="button" disabled={assignStudents.isPending || currentSelection.size === 0} onClick={() => assignStudents.mutate([...currentSelection])}>{assignStudents.isPending ? 'Assigning...' : `Assign ${currentSelection.size} Student${currentSelection.size === 1 ? '' : 's'}`}</button>{assignStudents.isError && <p className="sections-error">{(assignStudents.error as Error).message}</p>}</footer></>}</section></div>}
  </main>;
}
