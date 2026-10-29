export interface ModuleReadingItem {
  module_item_id: string;
  content_id: string;
  content_text: string;
  content_type: string;
  role: string;
  completed: boolean;
}

export interface ModulePicture { sheet: 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'learn'; index: number }

const PICTURE_WORDS = {
  a: ['bata','bibe','bote','buko','aso','isda','orasan','eroplano','ubas','daga','de-lata','dibdib','domino','duyan','hipon','keso','libro','lobo','lupa','mesa'],
  b: ['pusa','niyog','ngipin','nguso','peras','pinya','rosas','relo','silya','susi','tela','tulay','yelo','yoyo','sopas','kubo','tindahan','baso','bola','oso'],
  c: ['banggera','gitara','goma','gulong','helikopter','holen','hugas','kilay','kotse','leon','mikropono','motor','mukha','negosyo','nota','nunal'],
  d: ['bungo','polo','riles','rurok','selyo','toro','kuwento','wika','yungib','sound:nge','sound:wo','sound:wu','sound:yi','lola','puno','araw'],
  e: ['puti','pula','gabi','tawa','sabi','bato','guro','hila','ngiti'],
  f: ['wala','bago','luma','laro','lasa','dami','yaya','masaya','kusina'],
  learn: ['bahay','dahon','gatas','halaman','kamay','lapis','mata','nanay','ngayon','payong','radyo','saging','tasa','walis','yaman'],
} as const;

const EXAMPLE_WORDS: Record<string,string> = {
  m:'mata',s:'saging',a:'aso',i:'isda',o:'orasan',e:'eroplano',u:'ubas',
  ba:'bata',be:'berde',bi:'bibe',bo:'bote',bu:'buko',
  da:'daga',de:'de-lata',di:'dibdib',do:'domino',du:'duyan',
  ga:'gatas',ge:'banggera',gi:'gitara',go:'goma',gu:'gulong',
  ha:'halaman',he:'helikopter',hi:'hipon',ho:'holen',hu:'hugas',
  ka:'kamay',ke:'keso',ki:'kilay',ko:'kotse',ku:'kubo',
  la:'lapis',le:'leon',li:'libro',lo:'lobo',lu:'lupa',
  ma:'mata',me:'mesa',mi:'mikropono',mo:'motor',mu:'mukha',
  na:'nanay',ne:'negosyo',ni:'niyog',no:'nota',nu:'nunal',
  nga:'ngayon',ngi:'ngipin',ngo:'bungo',ngu:'nguso',
  pa:'payong',pe:'peras',pi:'pinya',po:'polo',pu:'pusa',
  ra:'radyo',re:'relo',ri:'riles',ro:'rosas',ru:'rurok',
  sa:'saging',se:'selyo',si:'silya',so:'sopas',su:'susi',
  ta:'tasa',te:'tela',ti:'tindahan',to:'toro',tu:'tulay',
  wa:'walis',we:'kuwento',wi:'wika',ya:'yaman',ye:'yelo',yo:'yoyo',yu:'yungib',
};

export function moduleItemArt(text: string, type: string) {
  const target = text.trim().normalize('NFC').toLocaleLowerCase('fil-PH');
  const practiceIndex = type === 'phonetic' ? ['nge','wo','wu','yi'].indexOf(target) : -1;
  if (practiceIndex >= 0) return {
    picture: { sheet:'d', index:9+practiceIndex } as ModulePicture,
    exampleWord:null, color:null, practiceSound:target,
  };
  const exampleWord = type === 'phonetic' ? EXAMPLE_WORDS[target] ?? null : null;
  const word = exampleWord ?? target;
  const pictureWord = word === 'berde' ? 'dahon' : word;
  let picture: ModulePicture | null = null;
  for (const sheet of ['a','b','c','d','e','f','learn'] as const) {
    const index = (PICTURE_WORDS[sheet] as readonly string[]).indexOf(pictureWord);
    if (index >= 0) { picture = { sheet, index }; break; }
  }
  // Unmapped syllables retain their real target rather than acquiring an
  // invented Filipino word or an unrelated English illustration.
  return { picture, exampleWord, color: word === 'berde' ? '#61bc47' : null, practiceSound:null };
}

export function moduleBoardLabel(title: string, type: string, items: ModuleReadingItem[]) {
  const family = title.match(/^Hanay ng\s+([a-z]+)\b/i)?.[1];
  if (family) return family.charAt(0).toUpperCase() + family.slice(1).toLowerCase();
  if (type === 'phonetic') return items.slice(0,3).map(item=>item.content_text).join(' · ') || 'Aa';
  return type === 'word' ? 'Salita' : type === 'phrase' ? 'Parirala' : 'Kuwento';
}

export function moduleItemLocked(items: ModuleReadingItem[], index: number) {
  return index > 0 && !items[index - 1].completed;
}
