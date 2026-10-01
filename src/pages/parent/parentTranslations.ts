const exact: Record<string, string> = {
  'Magandang araw,': 'Good morning,',
  'Magsimula sa pag-enroll ng anak': 'Start by enrolling a child',
  'Idagdag ang account ng iyong anak upang makita ang kaniyang progreso at mga gawain.': 'Add your child’s account to view their progress and activities.',
  'I-enroll ang Unang Anak': 'Enroll Your First Child',
  'Piliin ang Anak': 'Select Child',
  'Magdagdag ng Anak': 'Add Child',
  'Kabuuang Progreso': 'Overall Progress',
  'Mga Aktibidad': 'Activities',
  'Kasalukuyang Level': 'Current Level',
  'Kasalukuyang Modyul': 'Current Module',
  'Magpatuloy': 'Continue',
  'Progreso sa Bawat Modyul': 'Progress by Module',
  'Tingnan Lahat': 'View All',
  'Tapos na': 'Complete',
  'Isinasagawa': 'In Progress',
  'Hindi Pa Nagsisimula': 'Not Started',
  'Iskedyul ng Pag-aaral': 'Learning Schedule',
  'Buksan ang Kalendaryo': 'Open Calendar',
  'Mga Naka-iskedyul na Gawain': 'Scheduled Activities',
  'Wala pang naka-iskedyul na gawain.': 'No activities are scheduled yet.',
  'Mga Kamakailang Nakamit': 'Recent Achievements',
  'Mahusay na Simula': 'Great Start',
  'Patuloy na Pagsisikap': 'Keep Going',
  'Mabilis na Pagkilos': 'Quick Actions',
  'Tingnan ang Buong Progreso': 'View Full Progress',
  'Tingnan ang Iskedyul': 'View Schedule',
  'Mga Gawain at PDF': 'Activities & PDFs',
  'Mga Rekomendasyon': 'Recommendations',
  'Kamakailang Aktibidad': 'Recent Activity',
  'Wala pang aktibidad.': 'No activities yet.',
  'Karagdagang Practice': 'Extra Practice',
  'Review sa Bahay': 'Review at Home',
  'Mga Karagdagang Resources': 'Additional Resources',
  'Mga Flashcards': 'Flashcards',
  'Gabay sa Magulang': 'Parent Guide',
  'Mga Video': 'Videos',
  'Ulat ng Progreso': 'Progress Report',
  'Malinaw na buod ng pag-unlad sa pagbasa.': 'A clear summary of reading progress.',
  'Pag-unlad sa Bawat Modyul': 'Progress by Module',
  'Mga Nakuhang Resulta': 'Results Earned',
  'Mga Tala sa Pagsasanay': 'Practice Time',
  'Mga Nakuha na Badge': 'Badges Earned',
  'Kabuuang Oras ng Pagsasanay': 'Total Practice Time',
  'Pagsasanay ngayong Linggo': 'Practice This Week',
  'Kalendaryo at Iskedyul': 'Calendar & Schedule',
  'Mga Paparating na Aktibidad': 'Upcoming Activities',
  'Wala pang paparating na aktibidad.': 'No upcoming activities.',
  'Mga Paalala': 'Reminders',
  'Mga Detalye ng Aktibidad': 'Activity Details',
  'Magdagdag': 'Add',
  'Wala pang aktibidad. I-click ang “Magdagdag” upang gumawa ng iskedyul.': 'No activities yet. Click “Add” to create a schedule.',
  'Mga Anak Ko': 'My Children',
  'Aking mga Anak': 'My Children',
  'I-edit ang Impormasyon': 'Edit Information',
  'Huling aktibo: Kamakailan lang': 'Last active: Recently',
  'Reading Support': 'Reading Support',
  'Mga Mensahe': 'Messages',
  'Bagong Mensahe': 'New Message',
  'Maghanap ng mensahe...': 'Search messages...',
  'Lahat': 'All',
  'Mula sa Guro': 'From Teacher',
  'Anunsyo': 'Announcements',
  'Wala pang mensahe': 'No messages yet',
  'Sumulat ng mensahe...': 'Write a message...',
  'Mag-attach ng file': 'Attach a file',
  'Ipadala': 'Send',
  'Mga Setting': 'Settings',
  'Pamahala ng Data': 'Data Management',
  'Privacy at Seguridad': 'Privacy & Security',
  'Baguhin ang Password': 'Change Password',
  'I-download ang Data': 'Download Data',
  'Aking Detalye': 'My Profile',
  'Mga Abiso': 'Notifications',
  'Mag-sign out': 'Sign out',
  'Buwan': 'Month',
  'Linggo': 'Week',
  'Araw': 'Day',
  'Lun': 'Mon', 'Mar': 'Tue', 'Miy': 'Wed', 'Huw': 'Thu', 'Huy': 'Thu', 'Biy': 'Fri', 'Sab': 'Sat', 'Lin': 'Sun',
};

function translate(value: string) {
  const trimmed = value.trim();
  const replacement = exact[trimmed];
  if (replacement) return value.replace(trimmed, replacement);
  return value
    .replace(/^Suportahan natin ang pagkatuto ni (.+)\.$/, 'Let’s support $1’s learning.')
    .replace(/^Narito ang kanyang kasalukuyang progreso\.$/, 'Here is their current progress.')
    .replace(/^Bawat maliit na hakbang ay malaking pag-unlad\.$/, 'Every small step is meaningful progress.')
    .replace(/^Modyul (\d+) • (.+) aktibidad$/, 'Module $1 • $2 activities')
    .replace(/^Grade (\d+) • (.+) Level$/, 'Grade $1 • $2 Level')
    .replace(/^para kay (.+)$/, 'for $1')
    .replace(/^Natapos na ang Practice$/, 'Practice Completed')
    .replace(/^Sinimulan ang Practice$/, 'Practice Started')
    .replace(/^Magpatuloy sa (.+)$/, 'Continue with $1')
    .replace(/^Tapusin ang mga natitirang aktibidad\.$/, 'Finish the remaining activities.')
    .replace(/^Magkaroon ng 10 minuto araw-araw na pagbasa\.$/, 'Spend 10 minutes reading each day.')
    .replace(/^Magbalik sa ilang natapos na gawain para mas tumibay ang pagkatuto\.$/, 'Review completed activities to reinforce learning.')
    .replace(/^Mga materyal na makakatulong sa pagkatuto ni (.+) sa bahay\.$/, 'Materials to support $1’s learning at home.')
    .replace(/^I-download ang mga practice worksheets\.$/, 'Download practice worksheets.')
    .replace(/^Para sa mas masayang pag-aaral\.$/, 'For more engaging learning.')
    .replace(/^Maikling aralin at gabay\.$/, 'Short lessons and guides.');
}

function translateElement(element: Element) {
  for (const attribute of ['aria-label', 'placeholder', 'title']) {
    const value = element.getAttribute(attribute);
    if (value) element.setAttribute(attribute, translate(value));
  }
}

export function enableParentEnglish(root: HTMLElement, english: boolean) {
  if (!english) return undefined;
  const apply = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE && node.textContent) node.textContent = translate(node.textContent);
    if (node.nodeType === Node.ELEMENT_NODE) {
      translateElement(node as Element);
      node.childNodes.forEach(apply);
    }
  };
  apply(root);
  const observer = new MutationObserver((mutations) => mutations.forEach((mutation) => mutation.addedNodes.forEach(apply)));
  observer.observe(root, { childList: true, subtree: true });
  return () => observer.disconnect();
}
