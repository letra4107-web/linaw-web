import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { TTSButton } from '../components/a11y/TTSButton';
import { IconLabel } from '../components/a11y/IconLabel';
import { ScrollReveal } from '../components/ScrollReveal';
import { useAccessibility } from '../lib/a11y/AccessibilityContext';
import logo from '../assets/Logo.jpg';
import mascot from '../assets/students/mascot/owl-mascot.png';

const NAV_LINKS = [
  { label: 'Bahay', href: '/' }, { label: 'Tungkol sa Amin', href: '#phonological-dyslexia' },
  { label: 'Mga Tampok', href: '#mga-tampok' }, { label: 'Paano Gumagana', href: '#paano-gumagana' },
  { label: 'Makipag-ugnayan', href: '#contact' },
] as const;

const QUICK_BENEFITS = [
  { icon: '📖', title: 'Grade 1–6', text: 'Mga gawaing angkop sa antas ng bata', color: 'sky' },
  { icon: '🧠', title: 'Angkop na Pagkatuto', text: 'Mga araling naaayon sa pangangailangan', color: 'lavender' },
  { icon: '🔊', title: 'Basa at Pakinig', text: 'Pagsasanay gamit ang tunog at salita', color: 'peach' },
  { icon: '⭐', title: 'Masayang Pagsasanay', text: 'Matuto habang nakakakuha ng progreso at parangal', color: 'mint' },
] as const;

const TOOLS = [
  { icon: '🎙️', title: 'Pagkilala sa Boses', text: 'Sinusuri ang binibigkas na salita upang makatulong sa pagsasanay sa pagbasa.' },
  { icon: '🧠', title: 'Pagsubaybay sa mga Tunog', text: 'Tinutulungan ang bata sa pagkilala at pagsasanay ng mga tunog.' },
  { icon: '🔊', title: 'Teksto Patungong Boses', text: 'Maaaring pakinggan nang malinaw ang salita o pangungusap.' },
  { icon: '🔤', title: 'Dyslexia-Friendly na Font', text: 'Mas madaling basahin at mas komportable sa mata.' },
  { icon: '📊', title: 'Pagsubaybay sa Pag-unlad', text: 'Nakikita ang pagbabago at progreso habang nagpapatuloy ang pag-aaral.' },
  { icon: '📏', title: 'Gabay sa Pagbasa', text: 'Tumutulong upang masundan ng bata ang tamang linya habang nagbabasa.' },
] as const;

const STEPS = [
  { n: '1', icon: '✍️', title: 'Gumawa ng Account', text: 'Gumawa ng account bilang mag-aaral, magulang, o guro.' },
  { n: '2', icon: '🔎', title: 'Kilalanin ang Antas ng Pagbasa', text: 'Sa pamamagitan ng mga paunang gawain, natutukoy ang kasalukuyang pangangailangan ng bata.' },
  { n: '3', icon: '🌱', title: 'Magsimula sa Angkop na Pagkatuto', text: 'Makakatanggap ang bata ng mga gawaing naaayon sa kanyang progreso at pangangailangan.' },
] as const;

const AUDIENCES = [
  { icon: '🌟', eyebrow: 'Para sa Mag-aaral', title: 'Mas Masayang Pagbabasa', text: 'Mga gawaing simple, malinaw, at masayang sundan upang unti-unting magkaroon ng kumpiyansa sa pagbabasa.', color: 'lavender' },
  { icon: '📈', eyebrow: 'Para sa Magulang', title: 'Malinaw na Pag-unlad', text: 'Makikita ang progreso, mga natapos na gawain, at mga bahaging kailangan pa ng suporta.', color: 'peach' },
  { icon: '👩‍🏫', eyebrow: 'Para sa Guro', title: 'Mas Makabuluhang Gabay', text: 'Makikita ang mga huwaran sa pagkatuto at progreso upang makapagbigay ng mas angkop na suporta at pagsasanay.', color: 'mint' },
] as const;

function PageLink({ href, children, className, onClick }: { href: string; children: ReactNode; className?: string; onClick?: () => void }) {
  return href.startsWith('#') ? <a href={href} className={className} onClick={onClick}>{children}</a> : <Link to={href} className={className} onClick={onClick}>{children}</Link>;
}

export default function Landing() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { font, setFont } = useAccessibility();
  const selectedFont = font === 'comic' ? 'comic' : 'dyslexic';
  const closeNav = () => setMobileNavOpen(false);

  return <div className="landing-page min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
    <header className="landing-nav sticky top-0 z-30 border-b border-[var(--color-border)]/70 bg-[#fffdf7]/90 backdrop-blur">
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 sm:px-6 lg:grid-cols-[1fr_auto_1fr]">
        <Link to="/" className="justify-self-start" aria-label="LinawLetra, bahay"><img src={logo} alt="LinawLetra" className="h-11 w-auto rounded-xl sm:h-14" /></Link>
        <nav className="hidden justify-self-center lg:block" aria-label="Pangunahing navigation"><ul className="flex items-center gap-6 text-sm font-semibold xl:gap-8">{NAV_LINKS.map((item) => <li key={item.label}><PageLink href={item.href} className="landing-nav-link">{item.label}</PageLink></li>)}</ul></nav>
        <div className="flex items-center gap-2 justify-self-end sm:gap-3">
          <label className="hidden items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-3 py-2 text-xs font-semibold md:flex"><span aria-hidden="true">Aa</span><span className="sr-only">Piliin ang font</span><select value={selectedFont} onChange={(event) => setFont(event.target.value as 'dyslexic' | 'comic')} aria-label="Piliin ang font" className="bg-transparent outline-none"><option value="dyslexic">OpenDyslexic</option><option value="comic">Comic Sans</option></select></label>
          <Link to="/login" className="landing-login hidden sm:inline-flex">Mag-login</Link><Link to="/signup" className="landing-primary-button hidden sm:inline-flex">Magsimula</Link>
          <button type="button" onClick={() => setMobileNavOpen((open) => !open)} aria-expanded={mobileNavOpen} aria-label={mobileNavOpen ? 'Isara ang menu' : 'Buksan ang menu'} className="grid h-11 w-11 place-items-center rounded-full border border-[var(--color-border)] bg-white text-xl lg:hidden">{mobileNavOpen ? '×' : '☰'}</button>
        </div>
      </div>
      {mobileNavOpen && <nav className="border-t border-[var(--color-border)] bg-[#fffdf7] px-6 py-5 lg:hidden" aria-label="Mobile navigation"><ul className="mx-auto flex max-w-7xl flex-col gap-4 font-semibold">{NAV_LINKS.map((item) => <li key={item.label}><PageLink href={item.href} className="landing-nav-link" onClick={closeNav}>{item.label}</PageLink></li>)}</ul><div className="mx-auto mt-5 flex max-w-7xl items-center gap-3 border-t border-[var(--color-border)] pt-4"><label className="flex flex-1 items-center justify-between gap-2 text-sm font-semibold"><span>Piliin ang font</span><select value={selectedFont} onChange={(event) => setFont(event.target.value as 'dyslexic' | 'comic')} className="rounded-full border border-[var(--color-border)] bg-white px-3 py-2"><option value="dyslexic">OpenDyslexic</option><option value="comic">Comic Sans</option></select></label><Link to="/login" className="landing-login" onClick={closeNav}>Mag-login</Link><Link to="/signup" className="landing-primary-button" onClick={closeNav}>Magsimula</Link></div></nav>}
    </header>
    <main>
      <section className="landing-hero overflow-hidden"><div className="landing-cloud landing-cloud-one" aria-hidden="true" /><div className="landing-cloud landing-cloud-two" aria-hidden="true" /><div className="relative mx-auto grid max-w-7xl items-center gap-8 px-6 py-14 sm:py-20 lg:grid-cols-[1.02fr_.98fr] lg:py-24">
        <ScrollReveal immediate className="relative z-10 max-w-2xl text-center lg:text-left"><span className="landing-badge">Para sa Grade 1–6 <span aria-hidden="true">•</span> Suporta sa Pagbasa</span><h1 className="landing-display mt-5 text-4xl leading-[1.12] sm:text-5xl xl:text-6xl">Mas malinaw na pagbasa,<br className="hidden sm:block" /> mas masayang pagkatuto.</h1><p className="mt-5 max-w-xl text-base leading-8 text-[var(--color-text-muted)] sm:text-lg">Kasama ang LinawLetra sa bawat hakbang ng bata tungo sa mas malinaw, mas kumpiyansa, at mas masayang pagbabasa.</p><div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start"><TTSButton publicAccess rate={1} className="landing-tts-button" text="Mas malinaw na pagbasa, mas masayang pagkatuto. Kasama ang LinawLetra sa bawat hakbang ng bata tungo sa mas malinaw, mas kumpiyansa, at mas masayang pagbabasa." /><Link to="/signup" className="landing-primary-button"><IconLabel icon="🚀" label="Magsimula" /></Link><a href="#paano-gumagana" className="landing-secondary-button"><IconLabel icon="▶" label="Paano Ito Gumagana" /></a></div><p className="mt-6 text-sm font-medium text-[var(--color-text-muted)]">Para sa mga mag-aaral, magulang, at guro.</p></ScrollReveal>
        <ScrollReveal className="landing-mascot-stage"><span className="landing-letter letter-a" aria-hidden="true">Aa</span><span className="landing-letter letter-b" aria-hidden="true">Bb</span><span className="landing-letter letter-k" aria-hidden="true">Kk</span><span className="landing-star star-one" aria-hidden="true">✦</span><span className="landing-star star-two" aria-hidden="true">★</span><span className="landing-book" aria-hidden="true">📖</span><div className="landing-speech">Kaya mo ’yan!<br />Tara, magbasa tayo!</div><img src={mascot} alt="Si Linaw, ang masayahing kuwago ng LinawLetra, na nagbabasa ng libro" className="landing-mascot" /></ScrollReveal>
      </div></section>
      <section className="relative z-10 mx-auto -mt-5 max-w-7xl px-6 sm:-mt-8"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{QUICK_BENEFITS.map((item) => <article key={item.title} className={`landing-quick-card ${item.color}`}><span aria-hidden="true" className="text-3xl">{item.icon}</span><div><h2>{item.title}</h2><p>{item.text}</p></div></article>)}</div></section>
      <section id="phonological-dyslexia" className="scroll-mt-24 px-6 py-20 sm:py-28"><ScrollReveal className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-center"><div><span className="landing-section-label">Ang aming pokus</span><h2 className="landing-section-title mt-4">Ano ang Phonological Dyslexia?</h2><h3 className="mt-4 text-xl font-bold text-[#2f7774]">Mas madaling maintindihan kapag malinaw ang paliwanag.</h3><p className="landing-copy mt-5">Ito ay uri ng dyslexia kung saan nahihirapang iugnay ng bata ang mga tunog sa mga letra at pantig. Kaya maaaring maging mahirap ang pagbasa ng bagong salita kahit naiintindihan ito kapag naririnig.</p><p className="landing-copy mt-4">Maaaring mapansin ang paghahalo ng magkatunog na letra, mabagal na pagbasa, o paulit-ulit na pagsubok. Sa LinawLetra, binibigyan ang bawat bata ng mahinahon at malinaw na gabay sa bawat hakbang.</p><div className="mt-6 grid gap-3 sm:grid-cols-2"><p className="landing-highlight">✓ Nakasentro sa tunog, letra, at pantig</p><p className="landing-highlight">✓ Suportadong pagsasanay sa sariling bilis</p></div></div><div className="relative"><div className="landing-reading-illustration" aria-hidden="true"><span>🔊</span><span>Ａａ</span><span>〰</span><span>📚</span><div>Ang bawat tunog ay isang hakbang pasulong.</div></div><div className="relative grid gap-4 sm:grid-cols-2">{TOOLS.map((tool, index) => <article key={tool.title} className={`landing-tool-card tool-${index % 3}`}><span aria-hidden="true">{tool.icon}</span><h3>{tool.title}</h3><p>{tool.text}</p></article>)}</div></div></ScrollReveal></section>
      <section id="paano-gumagana" className="landing-journey scroll-mt-24 px-6 py-20 sm:py-28"><ScrollReveal className="mx-auto max-w-7xl"><div className="mx-auto max-w-2xl text-center"><span className="landing-section-label">Simpleng paglalakbay</span><h2 className="landing-section-title mt-4">Paano Gumagana?</h2><p className="landing-copy mt-3">Tatlong simpleng hakbang tungo sa mas malinaw na pagbabasa.</p></div><div className="landing-steps mt-14 grid gap-8 md:grid-cols-3">{STEPS.map((step) => <article key={step.n} className="landing-step"><span className="landing-step-number">{step.n}</span><span className="text-4xl" aria-hidden="true">{step.icon}</span><h3>{step.title}</h3><p>{step.text}</p></article>)}</div><div className="mt-9 text-center text-sm font-semibold text-[#2f7774]">✦ Bawat maliit na hakbang ay mahalaga. ✦</div></ScrollReveal></section>
      <section id="mga-tampok" className="scroll-mt-24 px-6 py-20 sm:py-28"><ScrollReveal className="mx-auto max-w-7xl"><div className="mx-auto max-w-2xl text-center"><span className="landing-section-label">Para sa buong komunidad</span><h2 className="landing-section-title mt-4">Kasama Mo ang LinawLetra sa Bawat Hakbang</h2></div><div className="mt-12 grid gap-6 lg:grid-cols-3">{AUDIENCES.map((item) => <article key={item.eyebrow} className={`landing-audience-card ${item.color}`}><span className="text-4xl" aria-hidden="true">{item.icon}</span><p>{item.eyebrow}</p><h3>{item.title}</h3><div className="mt-4 h-1.5 w-16 rounded-full bg-current opacity-45" /><span className="landing-audience-orb" aria-hidden="true">✦</span><p className="landing-audience-text">{item.text}</p></article>)}</div></ScrollReveal></section>
      <section className="px-6 pb-20 sm:pb-28"><ScrollReveal className="landing-final-cta mx-auto max-w-7xl overflow-hidden"><div className="relative z-10 max-w-2xl"><span className="landing-section-label bg-white/85">Simulan ang paglalakbay</span><h2 className="landing-display mt-4 text-3xl sm:text-4xl">Handa ka na bang magsimula?</h2><p className="mt-4 text-base leading-7 text-[#315653] sm:text-lg">Simulan ang mas malinaw at mas masayang paglalakbay sa pagbabasa kasama ang LinawLetra.</p><div className="mt-7 flex flex-wrap gap-3"><Link to="/signup" className="landing-primary-button"><IconLabel icon="🚀" label="Gumawa ng Account" /></Link><Link to="/login" className="landing-secondary-button bg-white/85">Mag-login</Link></div></div><div className="landing-final-mascot"><div>Tara! Sabay tayong matuto!</div><img src={mascot} alt="Si Linaw na nag-aanyaya sa pagkatuto" /></div></ScrollReveal></section>
    </main>
    <footer id="contact" className="border-t border-[var(--color-border)] bg-[#fffdf8] px-6 py-14"><div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1fr]"><div><img src={logo} alt="LinawLetra" className="h-14 w-auto rounded-xl" /><p className="landing-copy mt-4 max-w-sm">LinawLetra — katuwang sa mas malinaw at mas masayang pagbabasa ng bawat batang Pilipino.</p><a href="mailto:linawletra@gmail.com" className="mt-4 inline-block font-semibold text-[var(--color-primary)] hover:underline">linawletra@gmail.com</a></div><FooterGroup title="Matuto" links={[['Tungkol sa Amin','#phonological-dyslexia'],['Phonological Dyslexia','#phonological-dyslexia'],['Mga Tampok','#mga-tampok'],['Paano Gumagana','#paano-gumagana']]} /><FooterGroup title="Para sa Iyo" links={[['Mag-aaral','/signup'],['Magulang','/signup'],['Guro','/signup']]} /><FooterGroup title="Impormasyon" links={[['Pagkapribado','/privacy'],['Mga Tuntunin','/terms'],['Madaling Gamitin','/accessibility'],['Makipag-ugnayan','#contact']]} /></div><div className="mx-auto mt-10 flex max-w-7xl flex-col gap-2 border-t border-[var(--color-border)] pt-6 text-sm text-[var(--color-text-muted)] sm:flex-row sm:justify-between"><p>© {new Date().getFullYear()} LinawLetra. Lahat ng karapatan ay nakalaan.</p><p>Ginawa nang may pagmamahal para sa mga batang Pilipino.</p></div></footer>
  </div>;
}

function FooterGroup({ title, links }: { title: string; links: readonly (readonly [string, string])[] }) {
  return <div><h2 className="text-sm font-bold uppercase tracking-wider text-[#2f7774]">{title}</h2><ul className="mt-4 space-y-3 text-sm font-medium">{links.map(([label, href]) => <li key={label}><PageLink href={href} className="hover:text-[var(--color-primary)] hover:underline">{label}</PageLink></li>)}</ul></div>;
}
