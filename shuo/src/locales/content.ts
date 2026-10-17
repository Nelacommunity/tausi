import type { Unit } from '../data/curriculum';
import type { Scenario } from '../data/scenarios';
import type { Lang } from '../lib/i18n';

type T3 = [title: string, topic: string, canDo: string];

/** Curriculum unit titles, topics and can-do goals in Kiswahili and Chinese (English lives in curriculum.ts). */
const UNITS: Record<string, { sw: T3; zh: T3 }> = {
  'hsk1-1': { sw: ['Habari!', 'salamu, majina, uraia', 'Salimia watu na ujitambulishe'], zh: ['你好！', '问候、名字、国籍', '和别人打招呼并介绍自己'] },
  'hsk1-2': { sw: ['Namba na Umri', 'namba 0–99, umri, namba za simu', 'Sema umri wako na namba yako ya simu'], zh: ['数字和年龄', '0–99 的数字、年龄、电话号码', '说出自己的年龄和电话号码'] },
  'hsk1-3': { sw: ['Familia Yangu', 'wanafamilia, wanyama wa nyumbani', 'Eleza familia yako'], zh: ['我的家', '家庭成员、宠物', '介绍你的家人'] },
  'hsk1-4': { sw: ['Tarehe na Saa', 'siku, tarehe, kutaja saa', 'Panga mipango kwa saa maalum'], zh: ['日期和时间', '星期、日期、几点', '约定具体的时间'] },
  'hsk1-5': { sw: ['Chakula na Vinywaji', 'kuagiza chakula na vinywaji', 'Agiza kwenye mgahawa'], zh: ['吃的和喝的', '点餐、点饮料', '在饭馆点菜'] },
  'hsk1-6': { sw: ['Kiko Wapi?', 'mahali, maneno ya mahali', 'Uliza na ueleze mahali kwa urahisi'], zh: ['在哪儿？', '地点、方位词', '问路并说出简单的位置'] },
  'hsk1-7': { sw: ['Kununua', 'pesa, bei, kununua vitu', 'Uliza bei na ununue vitu'], zh: ['买东西', '钱、价格、购物', '问价格并买东西'] },
  'hsk1-8': { sw: ['Hali ya Hewa', 'hali ya hewa na joto', 'Zungumzia hali ya hewa'], zh: ['天气', '天气和温度', '谈论天气'] },
  'hsk1-9': { sw: ['Kusafiri Mjini', 'usafiri', 'Sema unavyofika mahali'], zh: ['出行', '交通工具', '说说你怎么去某个地方'] },
  'hsk1-10': { sw: ['Ulifanya Nini?', 'shughuli zilizopita, wikendi', 'Zungumzia ulichofanya'], zh: ['你做了什么？', '过去的活动、周末', '说说你做过的事'] },
  'hsk2-1': { sw: ['Ratiba ya Kila Siku', 'ratiba ya siku', 'Eleza siku yako'], zh: ['日常作息', '一天的安排', '描述你的一天'] },
  'hsk2-2': { sw: ['Umewahi…?', 'uzoefu, safari', 'Zungumzia uzoefu wa zamani'], zh: ['你……过吗？', '经历、旅行', '谈论过去的经历'] },
  'hsk2-3': { sw: ['Kulinganisha', 'kulinganisha watu, bei, miji', 'Linganisha vitu viwili'], zh: ['比较', '比较人、价格、城市', '比较两样东西'] },
  'hsk2-4': { sw: ['Sasa Hivi', 'vitendo vinavyoendelea, simu', 'Sema unachofanya sasa'], zh: ['正在做什么', '进行中的动作、打电话', '说出你现在正在做的事'] },
  'hsk2-5': { sw: ['Kwa Sababu… Kwa Hiyo…', 'sababu na visingizio', 'Eleza sababu'], zh: ['因为……所以……', '原因和借口', '解释原因'] },
  'hsk2-6': { sw: ['Kwa Kiasi Gani?', 'ujuzi, burudani, michezo', 'Eleza mtu anavyofanya jambo vizuri'], zh: ['做得怎么样？', '技能、爱好、运动', '描述某人做某事做得怎么样'] },
  'hsk2-7': { sw: ['Afya', 'kuumwa, kwenda kwa daktari', 'Eleza dalili'], zh: ['健康', '生病、看医生', '描述症状'] },
  'hsk2-8': { sw: ['Maelekezo', 'kutafuta njia', 'Toa na ufuate maelekezo'], zh: ['问路', '找路', '指路并按指示走'] },
  'hsk3-1': { sw: ['Kumaliza Kazi', 'shughuli, kazi za nyumbani', 'Sema ulichofanyia kitu'], zh: ['把事情做好', '跑腿、家务', '说说你对某物做了什么'] },
  'hsk3-2': { sw: ['Ilinitokea', 'ajali, bahati mbaya', 'Eleza kilichokutokea'], zh: ['我遇到的事', '意外、倒霉的事', '描述发生在你身上的事'] },
  'hsk3-3': { sw: ['Mabadiliko', 'mwenendo, kuwa bora/mbaya zaidi', 'Eleza mabadiliko kwa muda'], zh: ['变化', '趋势、变好或变差', '描述随时间发生的变化'] },
  'hsk3-4': { sw: ['Mara Tu', 'mazoea, mfuatano', 'Eleza mfuatano wa matukio'], zh: ['一……就……', '习惯、先后顺序', '描述事情的先后顺序'] },
  'hsk3-5': { sw: ['Matokeo', 'kusoma, kumaliza kazi', 'Sema kama ulifanikiwa kufanya jambo'], zh: ['结果', '学习、完成任务', '说出你是否做成了某事'] },
  'hsk3-6': { sw: ['Juu na Chini, Ndani na Nje', 'kusogea, mielekeo', 'Eleza mwendo'], zh: ['上下进出', '移动、方向', '描述移动的方向'] },
  'hsk3-7': { sw: ['Mbali na…', 'burudani, mapendeleo', 'Ongeza taarifa na usisitize'], zh: ['除了……', '爱好、偏好', '补充信息并加以强调'] },
  'hsk3-8': { sw: ['Masharti', 'mipango, masharti', 'Zungumzia masharti'], zh: ['条件', '计划、条件', '谈论条件'] },
  'hsk4-1': { sw: ['Maoni', 'mada za kijamii, mtindo wa maisha', 'Toa maoni na uyatetee'], zh: ['观点', '社会话题、生活方式', '表达并支持你的观点'] },
  'hsk4-2': { sw: ['Maisha ya Kazini', 'kazi, ofisi, wafanyakazi wenzako', 'Jadili hali za kazini'], zh: ['职场生活', '工作、办公室、同事', '讨论工作中的情况'] },
  'hsk4-3': { sw: ['Pesa na Matumizi', 'tabia za ununuzi, kuweka akiba', 'Jadili maamuzi ya matumizi'], zh: ['金钱与消费', '购物习惯、存钱', '讨论消费决定'] },
  'hsk4-4': { sw: ['Mahusiano', 'urafiki, uchumba, familia', 'Simulia hadithi kuhusu watu'], zh: ['人际关系', '友谊、恋爱、家庭', '讲一个关于人的故事'] },
  'hsk4-5': { sw: ['Utamaduni na Desturi', 'sikukuu, adabu', 'Eleza desturi'], zh: ['文化与习俗', '节日、礼仪', '解释风俗习惯'] },
  'hsk4-6': { sw: ['Nahau za Kawaida', '成语 za kila siku', 'Tumia nahau za kawaida kwa ufasaha'], zh: ['常用成语', '日常成语', '自然地使用常用成语'] },
  'hsk5-1': { sw: ['Habari na Jamii', 'matukio ya sasa', 'Fupisha habari'], zh: ['新闻与社会', '时事', '概括新闻内容'] },
  'hsk5-2': { sw: ['Mikutano ya Biashara', 'mikutano, mapendekezo', 'Shiriki kwenye mikutano'], zh: ['商务会议', '会议、提案', '参与会议讨论'] },
  'hsk5-3': { sw: ['Majadiliano', 'mikataba, bei, makubaliano', 'Jadiliana na ushawishi'], zh: ['谈判', '交易、价格、合同', '谈判与说服'] },
  'hsk5-4': { sw: ['Teknolojia', 'intaneti, AI, programu', 'Jadili teknolojia'], zh: ['科技', '互联网、人工智能、应用', '讨论科技话题'] },
  'hsk5-5': { sw: ['Mazingira', 'tabianchi, miji', 'Jenga hoja kuhusu suala'], zh: ['环境', '气候、城市', '就某个问题展开论证'] },
  'hsk6-1': { sw: ['Mdahalo', 'mada zenye utata', 'Jadili kwa ushawishi'], zh: ['辩论', '有争议的话题', '有说服力地辩论'] },
  'hsk6-2': { sw: ['Kichina cha Kale katika Matumizi ya Leo', 'mtindo wa maandishi, 书面语', 'Soma maandishi rasmi'], zh: ['现代文中的文言', '书面语风格', '读懂正式的书面文字'] },
  'hsk6-3': { sw: ['Umahiri wa Chengyu', 'nahau na hadithi zake', 'Tumia nahau za hali ya juu'], zh: ['成语精通', '成语及其故事', '运用高级成语'] },
  'hsk6-4': { sw: ['Mawasilisho ya Kitaaluma', 'ripoti, mawasilisho', 'Toa wasilisho'], zh: ['专业演讲', '报告、推介', '做一次演讲'] },
};

const SCENARIOS_SW: Record<string, string> = {
  free: 'Mazungumzo huru', intro: 'Jitambulishe', restaurant: 'Agiza kwenye mgahawa', taxi: 'Teksi na maelekezo',
  shopping: 'Kupatana sokoni', doctor: 'Kwa daktari', hotel: 'Kuweka chumba hotelini (simu)', friends: 'Kupata marafiki',
  interview: 'Usaili wa kazi', business: 'Mkutano wa biashara', debate: 'Jadili mada', hskk: 'Mtihani wa kuzungumza HSKK',
  tones: 'Zoezi la toni na matamshi',
};

/** A unit's title, topic and can-do goal in the interface language. */
export function unitText(unit: Unit, lang: Lang) {
  const t = lang === 'en' ? undefined : UNITS[unit.id]?.[lang];
  return t ? { title: t[0], topic: t[1], canDo: t[2] } : { title: unit.title, topic: unit.topic, canDo: unit.canDo };
}

/** A scenario's title in the interface language. */
export function scenarioTitle(sc: Scenario, lang: Lang) {
  if (lang === 'zh') return sc.zh;
  if (lang === 'sw') return SCENARIOS_SW[sc.id] ?? sc.title;
  return sc.title;
}

/** The scenario's second line (Chinese name, or English for zh users). */
export function scenarioSub(sc: Scenario, lang: Lang) {
  return lang === 'zh' ? sc.title : sc.zh;
}
