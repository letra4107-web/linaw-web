import { useSearchParams } from 'react-router-dom';
import { Heart, Lightbulb } from 'lucide-react';
import classroom from '../../assets/teacher/Teacher Home Hero Banner Background.png';
import teacher from '../../assets/teacher/Teacher Illustration.png';
import Lessons from './Lessons';
import { TeacherHomework } from './TeacherHomework';
import './lessons-reference.css';

export default function LessonsHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const homework = searchParams.get('tab') === 'homework';
  return <div className="teacher-lessons-design">
    <header className="tl-hero"><img className="tl-hero-background" src={classroom} alt="" aria-hidden="true" /><div className="tl-hero-copy"><p>MGA ARALIN</p><h1>Gumawa at Magbahagi<br /> ng Makabuluhang Aralin</h1><p>Magdisenyo ng mga aktibidad na angkop sa pangangailangan ng iyong mga mag-aaral.</p></div><span className="tl-hero-bulb" aria-hidden="true"><Lightbulb /></span><img className="tl-hero-teacher" src={teacher} alt="" aria-hidden="true" /><blockquote>Magandang<br /> aralin ngayon,<br /> mas magandang<br /> kinabukasan!<Heart aria-hidden /></blockquote><aside aria-hidden="true"><p>Teach<br />Create<br />Inspire<br />Grow <span>♥</span></p></aside></header>
    <nav className="hw-tabs" aria-label="Mga ibinibigay ng guro"><button type="button" aria-pressed={!homework} onClick={() => { const params = new URLSearchParams(searchParams); params.delete('tab'); setSearchParams(params); }}>Mga Aralin</button><button type="button" aria-pressed={homework} onClick={() => { const params = new URLSearchParams(searchParams); params.set('tab', 'homework'); setSearchParams(params); }}>Takdang-Aralin</button></nav>
    {homework ? <TeacherHomework /> : <Lessons />}
  </div>;
}
