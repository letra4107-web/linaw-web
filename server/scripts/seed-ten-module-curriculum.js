require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { supabaseAdmin } = require('../config/supabase');
const { READING_CURRICULUM } = require('../services/readingCurriculum');

const MODULE_META = {
  Intermediate: [
    ['Basahin ang mga pariralang gamit ang mga tunog na natutuhan mo sa Beginner.', 'phrase'],
    ['Ipagpatuloy ang pagbasa ng mga parirala.', 'phrase'],
    ['Ipagpatuloy ang pagbasa ng mga parirala.', 'phrase'],
    ['Ipagpatuloy ang pagbasa ng mga parirala.', 'phrase'],
    ['Basahin ang pinagsamang mga parirala mula sa lahat ng natutuhan.', 'phrase'],
    ['Basahin nang malinaw ang iba’t ibang parirala.', 'phrase'],
    ['Basahin nang malakas ang mga simpleng pangungusap.', 'phrase'],
    ['Basahin at sundin ang maiikling panuto.', 'phrase'],
    ['Kilalanin at basahin ang mga salitang ginagamit sa pang-araw-araw.', 'phrase'],
    ['Basahin ang maikling teksto nang may pag-unawa.', 'paragraph'],
  ],
  Advanced: Array.from({ length: 10 }, (_, index) => [
    index < 5 ? 'Basahin ang kuwento nang malinaw at may tamang paghinto.' : 'Basahin ang teksto nang malinaw at unawain ang nilalaman nito.',
    'paragraph',
  ]),
};

const ITEMS = {
  Intermediate: {
    6: ['Malinis ang mesa.', 'Mabilis tumakbo si Ana.', 'Masaya ang mga bata.'],
    7: ['Si Mila ay may aklat.', 'Naglaro kami sa parke.', 'Masarap ang hinog na mangga.'],
    8: ['Buksan ang aklat.', 'Ituro ang larawan.', 'Isulat ang iyong pangalan.'],
    9: ['Ang mabuting kaibigan ay tumutulong.', 'Masaya ang aming pamilya tuwing nagbabasa.', 'Malinis at maaliwalas ang aming paaralan.'],
    10: ['Maagang pumasok si Lino sa paaralan. Dala niya ang kaniyang aklat at lapis.', 'Nakinig siya sa guro at masayang nakibahagi sa pagbasa kasama ang kaniyang mga kaklase.'],
  },
  Advanced: {
    2: ['Maagang dumating si Ana sa kaniyang paaralan. Binati niya ang guro at mga kaklase.', 'Sa silid-aralan, natuto siyang magbasa nang may tiwala sa sarili.'],
    3: ['Magkaibigan sina Lito at Mara. Nagkakaisa sila sa pag-aaral at paglalaro.', 'Kapag may nahihirapan, nagtutulungan silang magkaibigan.'],
    4: ['Naglinis ang mga bata sa tabi ng ilog. Pinulot nila ang mga kalat at inilagay sa tamang basurahan.', 'Natutuhan nilang mahalaga ang pag-aalaga sa kalikasan.'],
    5: ['Nagtipon ang mga kapitbahay upang ayusin ang maliit na hardin sa kanilang lugar.', 'Sa pagtutulungan, naging mas maaliwalas at masaya ang kanilang pamayanan.'],
    6: ['Maingat na binasa ni Rosa ang mahabang pangungusap bago niya ito sinabi nang malakas.', 'Huminto siya sa wastong bantas upang maging malinaw ang kaniyang pagbasa.'],
    7: ['Si Ben ay may munting tindahan sa tabi ng kanilang bahay. Tuwing umaga, tinutulungan niya ang kaniyang nanay sa pag-aayos ng mga paninda.', 'Pagkatapos ng klase, nagbabasa siya ng kuwento bago gumawa ng takdang-aralin.'],
    8: ['Nais ni Lira na malaman kung bakit mahalaga ang pagtitipid ng tubig. Nagtanong siya sa guro at natutong patayin ang gripo kapag hindi ginagamit.', 'Ibinahagi niya ang natutuhan sa kaniyang pamilya upang sabay-sabay silang makatipid.'],
    9: ['Nagpasya ang klase na magtanim ng gulay sa bakanteng bahagi ng paaralan. Araw-araw ay may nagdidilig at nag-aalis ng damo.', 'Pagkalipas ng ilang linggo, masayang namitas ang mga bata ng unang ani.'],
    10: ['Basahin nang mabuti ang kuwento. Tukuyin ang pangunahing ideya, mahahalagang detalye, at aral na makukuha rito.', 'Ibahagi sa sariling salita ang iyong naunawaan pagkatapos magbasa.'],
  },
};

async function ensureModules(level) {
  const records = READING_CURRICULUM[level].map((title, index) => ({
    level,
    module_number: index + 1,
    title,
    description: MODULE_META[level][index][0],
    instructional_content_type: MODULE_META[level][index][1],
    curriculum_version: 'presentation_beginner_mvp_v1',
  }));
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('reading_modules')
    .select('id, module_number')
    .eq('level', level);
  if (existingError) throw existingError;
  const existingByNumber = new Map((existing || []).map((module) => [module.module_number, module]));
  const modules = [];
  for (const record of records) {
    const known = existingByNumber.get(record.module_number);
    const request = known
      ? supabaseAdmin.from('reading_modules').update(record).eq('id', known.id).select('id, module_number, title').single()
      : supabaseAdmin.from('reading_modules').insert(record).select('id, module_number, title').single();
    const { data, error } = await request;
    if (error) throw error;
    modules.push(data);
  }
  return new Map(modules.map((module) => [module.module_number, module]));
}

async function seedItems(level, modules) {
  let insertedItems = 0;
  for (const [numberText, texts] of Object.entries(ITEMS[level])) {
    const moduleNumber = Number(numberText);
    const module = modules.get(moduleNumber);
    if (!module) throw new Error(`Missing ${level} module ${moduleNumber}.`);
    const { count, error: countError } = await supabaseAdmin
      .from('reading_module_items')
      .select('id', { count: 'exact', head: true })
      .eq('module_id', module.id);
    if (countError) throw countError;
    if (count) continue;

    const contentType = MODULE_META[level][moduleNumber - 1][1];
    const content = [];
    for (let index = 0; index < texts.length; index += 1) {
      const contentText = texts[index];
      const sourceSheet = `${level} ten-module curriculum`;
      const sourceRow = (moduleNumber * 100) + index + 1;
      const { data: sourceMatch, error: sourceError } = await supabaseAdmin.from('reading_content')
        .select('id').eq('source_sheet', sourceSheet).eq('source_row', sourceRow).maybeSingle();
      if (sourceError) throw sourceError;
      if (sourceMatch) {
        content.push(sourceMatch);
        continue;
      }
      const normalizedText = contentText.toLocaleLowerCase('fil-PH');
      const { data: textMatch, error: textError } = await supabaseAdmin.from('reading_content')
        .select('id').eq('normalized_text', normalizedText).eq('content_type', contentType).eq('level', level).maybeSingle();
      if (textError) throw textError;
      if (textMatch) {
        content.push(textMatch);
        continue;
      }
      const { data: inserted, error: contentError } = await supabaseAdmin.from('reading_content').insert({
        content_text: contentText,
        normalized_text: normalizedText,
        content_type: contentType,
        level,
        sequence_no: (level === 'Intermediate' ? 20_000 : 30_000) + (moduleNumber * 100) + index + 1,
        source_sheet: sourceSheet,
        source_row: sourceRow,
        pattern_note: `${level} module ${moduleNumber}: ${module.title}`,
        backend_category: 'ten_module_curriculum',
        is_assessment: false,
        is_active: true,
        syllable_hyphenation: null,
        definition: null,
        definition_needs_review: false,
      }).select('id').single();
      if (contentError) throw contentError;
      content.push(inserted);
    }
    const { error: linkError } = await supabaseAdmin.from('reading_module_items').insert(
      content.map((row, index) => ({ module_id: module.id, content_id: row.id, item_order: index + 1, role: 'instruction' })),
    );
    if (linkError) throw linkError;
    insertedItems += content.length;
  }
  return insertedItems;
}

async function main() {
  const intermediate = await ensureModules('Intermediate');
  const advanced = await ensureModules('Advanced');
  const [intermediateItems, advancedItems] = await Promise.all([
    seedItems('Intermediate', intermediate),
    seedItems('Advanced', advanced),
  ]);
  console.log(JSON.stringify({ intermediateModules: intermediate.size, advancedModules: advanced.size, intermediateItems, advancedItems }));
}

main().catch((error) => { console.error(error.message); process.exit(1); });
