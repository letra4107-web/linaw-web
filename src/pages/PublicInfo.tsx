import { Link, useLocation } from 'react-router-dom';
import logo from '../assets/Logo.jpg';

const LAST_REVIEWED = 'Setyembre 1, 2026';

const CONTENT: Record<string, { title: string; intro: string; sections: { heading: string; body: string }[] }> = {
  '/privacy': {
    title: 'Patakaran sa Privacy',
    intro: 'Ipinapaliwanag dito kung anong impormasyon ang kailangan ng LinawLetra at kung paano ito ginagamit.',
    sections: [
      { heading: 'Impormasyong ginagamit', body: 'Maaaring gamitin ang account details, student profile, reading activity, progress, accessibility settings, at teacher-provided learning materials upang maibigay ang serbisyo. Hindi ginagamit ang password o authentication token para sa analytics.' },
      { heading: 'Layunin', body: 'Ginagamit ang impormasyon para sa authentication, reading practice, progress reports, assignments, account support, seguridad, at pagpapahusay ng serbisyo.' },
      { heading: 'Pagbabahagi at pag-iingat', body: 'Ang access ay nililimitahan ayon sa tungkulin ng admin, guro, magulang, at mag-aaral. Hindi inilalagay sa product analytics ang raw voice recording o hindi kailangang personal na impormasyon.' },
      { heading: 'Mga kahilingan', body: 'Para magtanong, humiling ng kopya, pagwawasto, o deletion ng account data, sumulat sa linawletra@gmail.com.' },
    ],
  },
  '/terms': {
    title: 'Mga Tuntunin ng Serbisyo',
    intro: 'Mga pangunahing tuntunin para sa ligtas at wastong paggamit ng LinawLetra.',
    sections: [
      { heading: 'Wastong paggamit', body: 'Gamitin lamang ang serbisyo para sa lehitimong pag-aaral at pangangasiwa ng account. Huwag subukang pasukin ang account ng iba, abusuhin ang speech service, o mag-upload ng mapaminsalang file.' },
      { heading: 'Mga account', body: 'Responsibilidad ng account holder na protektahan ang login details at ipaalam agad kung may pinaghihinalaang hindi awtorisadong access.' },
      { heading: 'Learning support', body: 'Ang LinawLetra ay pantulong sa pag-aaral. Hindi ito kapalit ng propesyonal na pagsusuri, diagnosis, o payong medikal at pang-edukasyon.' },
      { heading: 'Pagbabago', body: 'Maaaring baguhin ang serbisyo at mga tuntunin upang mapanatili ang seguridad at kalidad. Ang mahahalagang pagbabago ay dapat ipaalam sa mga account holder.' },
    ],
  },
  '/child-data': {
    title: 'Data ng Bata at Pahintulot ng Magulang',
    intro: 'Dinisenyo ang LinawLetra para gamitin ng mga bata sa ilalim ng paggabay ng magulang, guardian, o paaralan.',
    sections: [
      { heading: 'Pahintulot at pangangasiwa', body: 'Ang magulang, guardian, o awtorisadong paaralan ang dapat gumawa o mag-apruba ng student account at mangasiwa sa paggamit nito.' },
      { heading: 'Kinokolektang learning data', body: 'Maaaring itala ang reading attempts, accuracy, progress, achievements, assignments, at accessibility preferences para maipakita ang pag-unlad at susunod na pagsasanay.' },
      { heading: 'Voice data', body: 'Maaaring iproseso ang pagsasalita para sa pronunciation feedback. Hindi dapat gamitin ang raw student voice recording bilang product analytics data.' },
      { heading: 'Kontrol ng magulang', body: 'Maaaring humiling ang magulang o guardian ng access, correction, o deletion sa pamamagitan ng account settings o pakikipag-ugnayan sa linawletra@gmail.com.' },
    ],
  },
  '/account-deletion': {
    title: 'Pag-delete ng Account',
    intro: 'Narito ang paraan para humiling ng ligtas na account at data deletion.',
    sections: [
      { heading: 'Paano humiling', body: 'Gamitin ang email na nakakonekta sa account at sumulat sa linawletra@gmail.com na may subject na “Account Deletion Request.” Sabihin kung parent, student, teacher, o admin account ang sakop.' },
      { heading: 'Pagpapatunay', body: 'Maaaring humingi ng karagdagang verification bago kumilos upang hindi mabura ng ibang tao ang account o student record.' },
      { heading: 'Saklaw', body: 'Ipapaliwanag kung aling account at learning records ang maaaring burahin at kung may impormasyong kailangang pansamantalang panatilihin para sa seguridad o lehitimong record-keeping.' },
      { heading: 'Huwag magpadala ng password', body: 'Hindi kailanman kailangan ang iyong password, access token, o service key upang magsumite ng deletion request.' },
    ],
  },
  '/accessibility': {
    title: 'Pahayag sa Accessibility',
    intro: 'Layunin ng LinawLetra na maging malinaw, magagamit, at angkop sa iba’t ibang pangangailangan sa pagbasa.',
    sections: [
      { heading: 'Mga kasalukuyang tulong', body: 'Kasama sa app ang keyboard focus indicators, text-to-speech, adjustable speech speed, Lexend font option, high-contrast mode, at reading guide.' },
      { heading: 'Motion at readability', body: 'Iginagalang ng interface ang reduced-motion preference at gumagamit ng malinaw na labels, responsive layouts, at malalaking interactive controls.' },
      { heading: 'Feedback', body: 'Kung may bahagi na mahirap gamitin gamit ang keyboard, screen reader, zoom, o ibang assistive technology, makipag-ugnayan sa linawletra@gmail.com at ilarawan ang page at problema.' },
      { heading: 'Patuloy na pagpapabuti', body: 'Regular na sinusuri ang accessibility, ngunit maaaring may natitirang limitasyon. Hindi ito pahayag ng sertipikasyon sa anumang partikular na pamantayan.' },
    ],
  },
};

export default function PublicInfo() {
  const { pathname } = useLocation();
  const page = CONTENT[pathname] ?? CONTENT['/privacy'];

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/" aria-label="Bumalik sa LinawLetra home"><img src={logo} alt="LinawLetra" className="h-14 w-auto rounded-lg" /></Link>
          <Link to="/" className="rounded-full border border-[var(--color-border)] px-4 py-2 font-medium hover:border-[var(--color-primary)]">Bumalik sa bahay</Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-sm font-semibold text-[var(--color-primary)]">Huling nirepaso: {LAST_REVIEWED}</p>
        <h1 className="mt-2 text-3xl sm:text-4xl">{page.title}</h1>
        <p className="mt-4 text-lg text-[var(--color-text-muted)]">{page.intro}</p>
        <aside className="mt-6 rounded-2xl border border-[var(--color-warning)]/40 bg-[var(--color-warning-soft)] p-4 text-sm">
          Draft para sa malinaw na product communication. Iparepaso sa kwalipikadong legal professional bago ituring na final legal text.
        </aside>
        <div className="mt-10 space-y-8">
          {page.sections.map((section) => <section key={section.heading}><h2 className="text-2xl">{section.heading}</h2><p className="mt-2 text-[var(--color-text-muted)]">{section.body}</p></section>)}
        </div>
      </main>
    </div>
  );
}
