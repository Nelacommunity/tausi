// HSK 1–2 (HSK 2.0 syllabus). Knowledge points follow the public syllabus
// categories: vocabulary themes, tones/pinyin, measure words, core grammar and
// social expressions. All questions are ORIGINAL — vocabulary items are built
// from templates over the public word lists, grammar items are hand-written.
// Nothing here is copied from real HSK papers.

import type { SeedCurriculum, SeedKnowledgePoint, SeedLevel, SeedQuestion } from "./types.ts";
import { pick, pinyin, rng, shuffle, toneVariants } from "./util.ts";

type Word = [hanzi: string, numbered: string, english: string, kp: string];

// ── HSK 1 ────────────────────────────────────────────────────────────────
const HSK1_KPS: SeedKnowledgePoint[] = [
  { code: "H1-VOC-PEOPLE", name: "People & family",               category: "vocabulary", isCore: true,  description: "Family members, jobs and people words." },
  { code: "H1-VOC-TIME",   name: "Numbers, dates & time",          category: "vocabulary", isCore: true,  description: "Numbers, days, parts of the day, telling time." },
  { code: "H1-VOC-FOOD",   name: "Food & drink",                   category: "vocabulary", isCore: true,  description: "Common food, drinks and eating words." },
  { code: "H1-VOC-PLACE",  name: "Places, objects & transport",    category: "vocabulary", isCore: true,  description: "Places in town, everyday objects, getting around." },
  { code: "H1-VOC-VERB",   name: "Everyday verbs",                 category: "vocabulary", isCore: true,  description: "High-frequency action verbs." },
  { code: "H1-VOC-DESC",   name: "Descriptions & weather",         category: "vocabulary", isCore: false, description: "Adjectives, degree adverbs and weather words." },
  { code: "H1-TONE",       name: "Tones & pinyin",                 category: "pronunciation", isCore: true, description: "Recognising the four tones and the neutral tone in pinyin." },
  { code: "H1-MW",         name: "Basic measure words",            category: "grammar",    isCore: true,  description: "个, 本, 口, 块, 杯 between a number and a noun." },
  { code: "H1-GR-SHI",     name: "是 sentences",                   category: "grammar",    isCore: true,  description: "A 是 B to identify or classify." },
  { code: "H1-GR-MA",      name: "Yes/no questions with 吗",       category: "grammar",    isCore: true,  description: "Turning a statement into a question with 吗." },
  { code: "H1-GR-QW",      name: "Question words",                 category: "grammar",    isCore: true,  description: "什么, 谁, 哪儿, 几, 多少, 怎么 stay in the answer's position." },
  { code: "H1-GR-DE",      name: "的 for possession",              category: "grammar",    isCore: true,  description: "我的书; dropping 的 with close family (我妈妈)." },
  { code: "H1-GR-NEG",     name: "Negation: 不 vs 没",             category: "grammar",    isCore: true,  description: "不 for habits/future/adjectives, 没 for past actions and 有." },
  { code: "H1-GR-LE",      name: "了 for completed actions",       category: "grammar",    isCore: false, description: "Marking that an action has happened." },
  { code: "H1-GR-ZAI",     name: "在: location & ongoing action",  category: "grammar",    isCore: true,  description: "在 + place; 在 + verb for actions in progress." },
  { code: "H1-GR-HUI",     name: "会 / 能 / 想",                   category: "grammar",    isCore: false, description: "Learned ability, possibility, and wanting to do something." },
  { code: "H1-GR-ORDER",   name: "Word order: time & place first", category: "grammar",    isCore: true,  description: "Subject + time + place + verb + object." },
  { code: "H1-CULT",       name: "Greetings & social expressions", category: "culture",    isCore: false, description: "你好, 谢谢, 不客气, 对不起, 没关系 and when to use them." },
];

const HSK1_WORDS: Word[] = [
  ["爸爸", "ba4 ba5", "dad", "H1-VOC-PEOPLE"], ["妈妈", "ma1 ma5", "mum", "H1-VOC-PEOPLE"],
  ["儿子", "er2 zi5", "son", "H1-VOC-PEOPLE"], ["女儿", "nv3 er2", "daughter", "H1-VOC-PEOPLE"],
  ["朋友", "peng2 you5", "friend", "H1-VOC-PEOPLE"], ["老师", "lao3 shi1", "teacher", "H1-VOC-PEOPLE"],
  ["学生", "xue2 sheng5", "student", "H1-VOC-PEOPLE"], ["医生", "yi1 sheng1", "doctor", "H1-VOC-PEOPLE"],
  ["同学", "tong2 xue2", "classmate", "H1-VOC-PEOPLE"], ["先生", "xian1 sheng5", "Mr.; sir", "H1-VOC-PEOPLE"],
  ["小姐", "xiao3 jie5", "Miss; young lady", "H1-VOC-PEOPLE"], ["人", "ren2", "person", "H1-VOC-PEOPLE"],
  ["今天", "jin1 tian1", "today", "H1-VOC-TIME"], ["明天", "ming2 tian1", "tomorrow", "H1-VOC-TIME"],
  ["昨天", "zuo2 tian1", "yesterday", "H1-VOC-TIME"], ["上午", "shang4 wu3", "morning (before noon)", "H1-VOC-TIME"],
  ["中午", "zhong1 wu3", "noon", "H1-VOC-TIME"], ["下午", "xia4 wu3", "afternoon", "H1-VOC-TIME"],
  ["年", "nian2", "year", "H1-VOC-TIME"], ["月", "yue4", "month", "H1-VOC-TIME"],
  ["星期", "xing1 qi1", "week", "H1-VOC-TIME"], ["点", "dian3", "o'clock", "H1-VOC-TIME"],
  ["分钟", "fen1 zhong1", "minute", "H1-VOC-TIME"], ["现在", "xian4 zai4", "now", "H1-VOC-TIME"],
  ["时候", "shi2 hou5", "time; moment", "H1-VOC-TIME"], ["九", "jiu3", "nine", "H1-VOC-TIME"],
  ["十", "shi2", "ten", "H1-VOC-TIME"], ["八", "ba1", "eight", "H1-VOC-TIME"],
  ["米饭", "mi3 fan4", "cooked rice", "H1-VOC-FOOD"], ["菜", "cai4", "dish; vegetable", "H1-VOC-FOOD"],
  ["水果", "shui3 guo3", "fruit", "H1-VOC-FOOD"], ["苹果", "ping2 guo3", "apple", "H1-VOC-FOOD"],
  ["茶", "cha2", "tea", "H1-VOC-FOOD"], ["水", "shui3", "water", "H1-VOC-FOOD"],
  ["杯子", "bei1 zi5", "cup", "H1-VOC-FOOD"], ["吃", "chi1", "to eat", "H1-VOC-FOOD"],
  ["喝", "he1", "to drink", "H1-VOC-FOOD"], ["饭馆", "fan4 guan3", "restaurant", "H1-VOC-FOOD"],
  ["中国", "zhong1 guo2", "China", "H1-VOC-PLACE"], ["北京", "bei3 jing1", "Beijing", "H1-VOC-PLACE"],
  ["学校", "xue2 xiao4", "school", "H1-VOC-PLACE"], ["医院", "yi1 yuan4", "hospital", "H1-VOC-PLACE"],
  ["商店", "shang1 dian4", "shop", "H1-VOC-PLACE"], ["火车站", "huo3 che1 zhan4", "train station", "H1-VOC-PLACE"],
  ["出租车", "chu1 zu1 che1", "taxi", "H1-VOC-PLACE"], ["飞机", "fei1 ji1", "aeroplane", "H1-VOC-PLACE"],
  ["家", "jia1", "home; family", "H1-VOC-PLACE"], ["桌子", "zhuo1 zi5", "table", "H1-VOC-PLACE"],
  ["椅子", "yi3 zi5", "chair", "H1-VOC-PLACE"], ["电脑", "dian4 nao3", "computer", "H1-VOC-PLACE"],
  ["电视", "dian4 shi4", "television", "H1-VOC-PLACE"], ["书", "shu1", "book", "H1-VOC-PLACE"],
  ["钱", "qian2", "money", "H1-VOC-PLACE"], ["衣服", "yi1 fu5", "clothes", "H1-VOC-PLACE"],
  ["看", "kan4", "to look; to watch", "H1-VOC-VERB"], ["听", "ting1", "to listen", "H1-VOC-VERB"],
  ["说", "shuo1", "to speak", "H1-VOC-VERB"], ["读", "du2", "to read aloud", "H1-VOC-VERB"],
  ["写", "xie3", "to write", "H1-VOC-VERB"], ["学习", "xue2 xi2", "to study", "H1-VOC-VERB"],
  ["工作", "gong1 zuo4", "to work; job", "H1-VOC-VERB"], ["买", "mai3", "to buy", "H1-VOC-VERB"],
  ["开", "kai1", "to open; to drive", "H1-VOC-VERB"], ["坐", "zuo4", "to sit; to take (transport)", "H1-VOC-VERB"],
  ["住", "zhu4", "to live (somewhere)", "H1-VOC-VERB"], ["来", "lai2", "to come", "H1-VOC-VERB"],
  ["去", "qu4", "to go", "H1-VOC-VERB"], ["回", "hui2", "to return", "H1-VOC-VERB"],
  ["睡觉", "shui4 jiao4", "to sleep", "H1-VOC-VERB"], ["打电话", "da3 dian4 hua4", "to make a phone call", "H1-VOC-VERB"],
  ["认识", "ren4 shi5", "to know (a person)", "H1-VOC-VERB"], ["喜欢", "xi3 huan5", "to like", "H1-VOC-VERB"],
  ["做", "zuo4", "to do; to make", "H1-VOC-VERB"], ["叫", "jiao4", "to be called", "H1-VOC-VERB"],
  ["大", "da4", "big", "H1-VOC-DESC"], ["小", "xiao3", "small", "H1-VOC-DESC"],
  ["多", "duo1", "many; much", "H1-VOC-DESC"], ["少", "shao3", "few; little", "H1-VOC-DESC"],
  ["冷", "leng3", "cold", "H1-VOC-DESC"], ["热", "re4", "hot", "H1-VOC-DESC"],
  ["高兴", "gao1 xing4", "happy; glad", "H1-VOC-DESC"], ["漂亮", "piao4 liang5", "pretty", "H1-VOC-DESC"],
  ["好", "hao3", "good", "H1-VOC-DESC"], ["很", "hen3", "very", "H1-VOC-DESC"],
  ["太", "tai4", "too; extremely", "H1-VOC-DESC"], ["天气", "tian1 qi4", "weather", "H1-VOC-DESC"],
  ["下雨", "xia4 yu3", "to rain", "H1-VOC-DESC"], ["猫", "mao1", "cat", "H1-VOC-DESC"],
  ["狗", "gou3", "dog", "H1-VOC-DESC"], ["汉语", "han4 yu3", "Chinese language", "H1-VOC-DESC"],
];

const HSK1_GRAMMAR: SeedQuestion[] = [
  // 是
  { type: "mcq", prompt: "我___学生。", options: ["是", "在", "有", "很"], answer: "是", difficulty: 1, kps: ["H1-GR-SHI"] },
  { type: "mcq", prompt: "Which sentence means “He is not a teacher”?", options: ["他不是老师。", "他没是老师。", "他是不老师。", "他不老师是。"], answer: "他不是老师。", difficulty: 2, kps: ["H1-GR-SHI", "H1-GR-NEG"] },
  { type: "true_false", prompt: "True or false: 「我是很高兴。」 is a correct way to say “I am very happy”.", options: ["True", "False"], answer: "False", difficulty: 2, kps: ["H1-GR-SHI"] },
  { type: "fill_blank", prompt: "Fill in one character: 她___中国人。(She is Chinese.)", options: [], answer: "是", difficulty: 1, kps: ["H1-GR-SHI"] },
  // 吗
  { type: "mcq", prompt: "Turn 「你是老师。」 into a yes/no question.", options: ["你是老师吗？", "你吗是老师？", "吗你是老师？", "你是吗老师？"], answer: "你是老师吗？", difficulty: 1, kps: ["H1-GR-MA"] },
  { type: "mcq", prompt: "你喝茶吗？ — Which answer is natural?", options: ["喝，我喝茶。", "吗，我喝茶。", "是喝茶吗。", "我茶喝。"], answer: "喝，我喝茶。", difficulty: 2, kps: ["H1-GR-MA"] },
  { type: "true_false", prompt: "True or false: 「你叫什么名字吗？」 is correct.", options: ["True", "False"], answer: "False", difficulty: 2, kps: ["H1-GR-MA", "H1-GR-QW"] },
  { type: "fill_blank", prompt: "Fill in one character: 你喜欢猫___？(Do you like cats?)", options: [], answer: "吗", difficulty: 1, kps: ["H1-GR-MA"] },
  // Question words
  { type: "mcq", prompt: "你叫___名字？", options: ["什么", "谁", "哪儿", "几"], answer: "什么", difficulty: 1, kps: ["H1-GR-QW"] },
  { type: "mcq", prompt: "你去___？ — 我去学校。", options: ["哪儿", "什么", "谁", "多少"], answer: "哪儿", difficulty: 1, kps: ["H1-GR-QW"] },
  { type: "mcq", prompt: "这个苹果___钱？", options: ["多少", "几", "什么", "哪"], answer: "多少", difficulty: 2, kps: ["H1-GR-QW"] },
  { type: "mcq", prompt: "你家有___口人？(expected answer under ten)", options: ["几", "多少", "什么", "谁"], answer: "几", difficulty: 2, kps: ["H1-GR-QW", "H1-MW"] },
  { type: "mcq", prompt: "他是___？ — 他是我的老师。", options: ["谁", "哪儿", "几", "怎么"], answer: "谁", difficulty: 1, kps: ["H1-GR-QW"] },
  { type: "mcq", prompt: "这个字___读？ (How is this character read?)", options: ["怎么", "什么", "谁", "几"], answer: "怎么", difficulty: 2, kps: ["H1-GR-QW"] },
  // 的
  { type: "mcq", prompt: "Which means “my book”?", options: ["我的书", "书的我", "我书的", "的我书"], answer: "我的书", difficulty: 1, kps: ["H1-GR-DE"] },
  { type: "true_false", prompt: "True or false: 「我妈妈」 (my mum) is correct without 的.", options: ["True", "False"], answer: "True", difficulty: 2, kps: ["H1-GR-DE"] },
  { type: "mcq", prompt: "这是谁___杯子？", options: ["的", "是", "吗", "了"], answer: "的", difficulty: 1, kps: ["H1-GR-DE"] },
  { type: "fill_blank", prompt: "Fill in one character: 那是老师___电脑。(That is the teacher's computer.)", options: [], answer: "的", difficulty: 1, kps: ["H1-GR-DE"] },
  // Negation
  { type: "mcq", prompt: "昨天我___去学校。", options: ["没", "不", "没有不", "别"], answer: "没", difficulty: 2, kps: ["H1-GR-NEG"] },
  { type: "mcq", prompt: "我___喜欢喝茶。", options: ["不", "没", "没有", "别"], answer: "不", difficulty: 1, kps: ["H1-GR-NEG"] },
  { type: "mcq", prompt: "我___有钱。", options: ["没", "不", "是", "很"], answer: "没", difficulty: 1, kps: ["H1-GR-NEG"] },
  { type: "true_false", prompt: "True or false: 「明天我没去。」 is the right way to say “I won't go tomorrow”.", options: ["True", "False"], answer: "False", difficulty: 2, kps: ["H1-GR-NEG"] },
  { type: "fill_blank", prompt: "Fill in one character: 今天不冷，___热。(Today isn't cold and isn't hot.)", options: [], answer: "不", difficulty: 2, kps: ["H1-GR-NEG"] },
  // 了
  { type: "mcq", prompt: "我买___三本书。", options: ["了", "的", "吗", "在"], answer: "了", difficulty: 2, kps: ["H1-GR-LE"] },
  { type: "mcq", prompt: "Which sentence says the action already happened?", options: ["他去医院了。", "他去医院。", "他要去医院。", "他会去医院。"], answer: "他去医院了。", difficulty: 2, kps: ["H1-GR-LE"] },
  { type: "true_false", prompt: "True or false: 「我昨天没去了学校。」 is correct.", options: ["True", "False"], answer: "False", difficulty: 3, kps: ["H1-GR-LE", "H1-GR-NEG"] },
  // 在
  { type: "mcq", prompt: "我妈妈___医院工作。", options: ["在", "是", "有", "去"], answer: "在", difficulty: 1, kps: ["H1-GR-ZAI", "H1-GR-ORDER"] },
  { type: "mcq", prompt: "他___看电视呢。 (He is watching TV.)", options: ["在", "是", "了", "的"], answer: "在", difficulty: 2, kps: ["H1-GR-ZAI"] },
  { type: "mcq", prompt: "猫在哪儿？ — 猫在___。", options: ["桌子下面", "下面桌子", "在桌子", "桌子是下面"], answer: "桌子下面", difficulty: 2, kps: ["H1-GR-ZAI"] },
  { type: "fill_blank", prompt: "Fill in one character: 我___家。(I am at home.)", options: [], answer: "在", difficulty: 1, kps: ["H1-GR-ZAI"] },
  // 会 / 能 / 想
  { type: "mcq", prompt: "我___说汉语。(I can speak Chinese — a learned skill.)", options: ["会", "想", "是", "在"], answer: "会", difficulty: 2, kps: ["H1-GR-HUI"] },
  { type: "mcq", prompt: "我___喝水。(I want to drink water.)", options: ["想", "会", "是", "在"], answer: "想", difficulty: 1, kps: ["H1-GR-HUI"] },
  { type: "mcq", prompt: "明天你___来吗？(Are you able to come tomorrow?)", options: ["能", "是", "的", "了"], answer: "能", difficulty: 2, kps: ["H1-GR-HUI"] },
  { type: "true_false", prompt: "True or false: 会 can mean both “know how to” and “will (likely)”.", options: ["True", "False"], answer: "True", difficulty: 3, kps: ["H1-GR-HUI"] },
  // Word order
  { type: "mcq", prompt: "Choose the correct word order.", options: ["我明天去北京。", "我去北京明天。", "明天去我北京。", "去北京我明天。"], answer: "我明天去北京。", difficulty: 2, kps: ["H1-GR-ORDER"] },
  { type: "mcq", prompt: "Choose the correct word order.", options: ["他在学校学习汉语。", "他学习汉语在学校。", "他汉语在学校学习。", "在他学校学习汉语。"], answer: "他在学校学习汉语。", difficulty: 2, kps: ["H1-GR-ORDER", "H1-GR-ZAI"] },
  { type: "mcq", prompt: "Choose the correct word order.", options: ["我下午三点回家。", "我回家下午三点。", "三点我回下午家。", "我回下午三点家。"], answer: "我下午三点回家。", difficulty: 3, kps: ["H1-GR-ORDER", "H1-VOC-TIME"] },
  { type: "true_false", prompt: "True or false: In Chinese, time words usually come after the verb.", options: ["True", "False"], answer: "False", difficulty: 1, kps: ["H1-GR-ORDER"] },
  // Culture & expressions
  { type: "mcq", prompt: "Someone says 「谢谢！」 The most natural reply is:", options: ["不客气。", "没关系。", "对不起。", "再见。"], answer: "不客气。", difficulty: 1, kps: ["H1-CULT"] },
  { type: "mcq", prompt: "Someone says 「对不起！」 The most natural reply is:", options: ["没关系。", "不客气。", "谢谢。", "你好。"], answer: "没关系。", difficulty: 1, kps: ["H1-CULT"] },
  { type: "mcq", prompt: "Which phrase do you use when leaving?", options: ["再见。", "你好。", "请坐。", "没关系。"], answer: "再见。", difficulty: 1, kps: ["H1-CULT"] },
  { type: "mcq", prompt: "A guest arrives at your home. You say 「请___。」 (Please sit.)", options: ["坐", "去", "回", "开"], answer: "坐", difficulty: 2, kps: ["H1-CULT", "H1-VOC-VERB"] },
  { type: "true_false", prompt: "True or false: Chinese names are usually written family name first, e.g. 王小明 — family name 王.", options: ["True", "False"], answer: "True", difficulty: 2, kps: ["H1-CULT"] },
];

const HSK1_MW: SeedQuestion[] = [
  ["一___书", "本"], ["三___人", "个"], ["两___茶", "杯"], ["我家有五___人。", "口"], ["这个苹果五___钱。", "块"],
  ["一___学生", "个"], ["这___杯子很漂亮。", "个"], ["两___汉语书", "本"],
].map(([prompt, answer], i): SeedQuestion => ({
  type: "mcq", prompt: `Choose the measure word: ${prompt}`,
  options: shuffle(["个", "本", "口", "块", "杯"].filter((x) => x !== answer).slice(0, 3).concat(answer), rng(100 + i)),
  answer, difficulty: i < 3 ? 1 : 2, kps: ["H1-MW"],
}));
HSK1_MW.push(
  { type: "true_false", prompt: "True or false: Before a measure word, “two” is usually 两, not 二 (两个人).", options: ["True", "False"], answer: "True", difficulty: 2, kps: ["H1-MW"] },
  { type: "fill_blank", prompt: "Fill in one character: 我有三___朋友。(I have three friends.)", options: [], answer: "个", difficulty: 1, kps: ["H1-MW"] },
);

// ── HSK 2 ────────────────────────────────────────────────────────────────
const HSK2_KPS: SeedKnowledgePoint[] = [
  { code: "H2-VOC-PEOPLE",   name: "Family, people & the body",        category: "vocabulary", isCore: true,  description: "Extended family, service jobs, body words." },
  { code: "H2-VOC-TIME",     name: "Time & routine",                    category: "vocabulary", isCore: true,  description: "Parts of the day, durations, birthdays." },
  { code: "H2-VOC-FOOD",     name: "Food & shopping",                   category: "vocabulary", isCore: true,  description: "More food words, prices, buying and selling." },
  { code: "H2-VOC-PLACE",    name: "Places, travel & directions",       category: "vocabulary", isCore: true,  description: "Travel, transport, left/right/next to." },
  { code: "H2-VOC-VERB",     name: "Activities & verbs",                category: "vocabulary", isCore: true,  description: "Sports, daily routine and communication verbs." },
  { code: "H2-VOC-DESC",     name: "Descriptions, colours & weather",   category: "vocabulary", isCore: false, description: "Feelings, colours, distances, weather." },
  { code: "H2-TONE",         name: "Tones & pinyin (HSK 2 words)",       category: "pronunciation", isCore: true, description: "Tones on two- and three-syllable words." },
  { code: "H2-MW",           name: "More measure words",                category: "grammar",    isCore: true,  description: "件, 张, 次 and choosing the right measure word." },
  { code: "H2-GR-BI",        name: "Comparison with 比",                category: "grammar",    isCore: true,  description: "A 比 B + adjective; no 很 inside a 比 sentence." },
  { code: "H2-GR-GUO",       name: "Experience with 过",                category: "grammar",    isCore: true,  description: "Verb + 过 for having done something before; 没 + verb + 过." },
  { code: "H2-GR-DE3",       name: "Degree complement 得",              category: "grammar",    isCore: true,  description: "Verb + 得 + description: 他说得很好." },
  { code: "H2-GR-YAOLE",     name: "要…了 (about to happen)",           category: "grammar",    isCore: false, description: "Something is going to happen soon." },
  { code: "H2-GR-ZHENGZAI",  name: "正在…呢 (in progress)",             category: "grammar",    isCore: false, description: "An action happening right now." },
  { code: "H2-GR-YINWEI",    name: "因为…所以 (because…so)",            category: "grammar",    isCore: true,  description: "Cause and result clauses." },
  { code: "H2-GR-SUIRAN",    name: "虽然…但是 (although…but)",          category: "grammar",    isCore: false, description: "Contrast between two clauses." },
  { code: "H2-GR-RANG",      name: "让 (let / make someone do)",        category: "grammar",    isCore: false, description: "A 让 B + verb." },
  { code: "H2-GR-LI",        name: "离 / 从 (distance & starting point)", category: "grammar",  isCore: true,  description: "A 离 B 很远/近; 从…到…." },
  { code: "H2-CULT",         name: "Polite & cultural expressions",     category: "culture",    isCore: false, description: "吃了吗, 慢走, 请问, 哪里哪里, 生日快乐, 加油." },
];

const HSK2_WORDS: Word[] = [
  ["丈夫", "zhang4 fu5", "husband", "H2-VOC-PEOPLE"], ["妻子", "qi1 zi5", "wife", "H2-VOC-PEOPLE"],
  ["哥哥", "ge1 ge5", "older brother", "H2-VOC-PEOPLE"], ["姐姐", "jie3 jie5", "older sister", "H2-VOC-PEOPLE"],
  ["弟弟", "di4 di5", "younger brother", "H2-VOC-PEOPLE"], ["妹妹", "mei4 mei5", "younger sister", "H2-VOC-PEOPLE"],
  ["孩子", "hai2 zi5", "child", "H2-VOC-PEOPLE"], ["服务员", "fu2 wu4 yuan2", "waiter; attendant", "H2-VOC-PEOPLE"],
  ["眼睛", "yan3 jing5", "eye", "H2-VOC-PEOPLE"], ["身体", "shen1 ti3", "body; health", "H2-VOC-PEOPLE"],
  ["男人", "nan2 ren2", "man", "H2-VOC-PEOPLE"], ["女人", "nv3 ren2", "woman", "H2-VOC-PEOPLE"],
  ["早上", "zao3 shang5", "early morning", "H2-VOC-TIME"], ["晚上", "wan3 shang5", "evening", "H2-VOC-TIME"],
  ["去年", "qu4 nian2", "last year", "H2-VOC-TIME"], ["小时", "xiao3 shi2", "hour", "H2-VOC-TIME"],
  ["生日", "sheng1 ri4", "birthday", "H2-VOC-TIME"], ["时间", "shi2 jian1", "time", "H2-VOC-TIME"],
  ["已经", "yi3 jing1", "already", "H2-VOC-TIME"], ["起床", "qi3 chuang2", "to get up", "H2-VOC-TIME"],
  ["鸡蛋", "ji1 dan4", "egg", "H2-VOC-FOOD"], ["西瓜", "xi1 gua1", "watermelon", "H2-VOC-FOOD"],
  ["咖啡", "ka1 fei1", "coffee", "H2-VOC-FOOD"], ["牛奶", "niu2 nai3", "milk", "H2-VOC-FOOD"],
  ["羊肉", "yang2 rou4", "mutton; lamb", "H2-VOC-FOOD"], ["面条", "mian4 tiao2", "noodles", "H2-VOC-FOOD"],
  ["便宜", "pian2 yi5", "cheap", "H2-VOC-FOOD"], ["贵", "gui4", "expensive", "H2-VOC-FOOD"],
  ["卖", "mai4", "to sell", "H2-VOC-FOOD"], ["药", "yao4", "medicine", "H2-VOC-FOOD"],
  ["机场", "ji1 chang3", "airport", "H2-VOC-PLACE"], ["公司", "gong1 si1", "company", "H2-VOC-PLACE"],
  ["教室", "jiao4 shi4", "classroom", "H2-VOC-PLACE"], ["房间", "fang2 jian1", "room", "H2-VOC-PLACE"],
  ["路", "lu4", "road", "H2-VOC-PLACE"], ["公共汽车", "gong1 gong4 qi4 che1", "bus", "H2-VOC-PLACE"],
  ["船", "chuan2", "boat", "H2-VOC-PLACE"], ["旅游", "lv3 you2", "to travel (for leisure)", "H2-VOC-PLACE"],
  ["宾馆", "bin1 guan3", "hotel", "H2-VOC-PLACE"], ["左边", "zuo3 bian1", "left side", "H2-VOC-PLACE"],
  ["右边", "you4 bian1", "right side", "H2-VOC-PLACE"], ["旁边", "pang2 bian1", "beside", "H2-VOC-PLACE"],
  ["帮助", "bang1 zhu4", "to help", "H2-VOC-VERB"], ["唱歌", "chang4 ge1", "to sing", "H2-VOC-VERB"],
  ["跳舞", "tiao4 wu3", "to dance", "H2-VOC-VERB"], ["跑步", "pao3 bu4", "to run; to jog", "H2-VOC-VERB"],
  ["游泳", "you2 yong3", "to swim", "H2-VOC-VERB"], ["踢足球", "ti1 zu2 qiu2", "to play football", "H2-VOC-VERB"],
  ["介绍", "jie4 shao4", "to introduce", "H2-VOC-VERB"], ["准备", "zhun3 bei4", "to prepare", "H2-VOC-VERB"],
  ["告诉", "gao4 su5", "to tell", "H2-VOC-VERB"], ["等", "deng3", "to wait", "H2-VOC-VERB"],
  ["找", "zhao3", "to look for", "H2-VOC-VERB"], ["懂", "dong3", "to understand", "H2-VOC-VERB"],
  ["休息", "xiu1 xi5", "to rest", "H2-VOC-VERB"], ["考试", "kao3 shi4", "exam; to take an exam", "H2-VOC-VERB"],
  ["希望", "xi1 wang4", "to hope", "H2-VOC-VERB"], ["觉得", "jue2 de5", "to feel; to think", "H2-VOC-VERB"],
  ["知道", "zhi1 dao4", "to know (a fact)", "H2-VOC-VERB"], ["生病", "sheng1 bing4", "to get sick", "H2-VOC-VERB"],
  ["快乐", "kuai4 le4", "happy; joyful", "H2-VOC-DESC"], ["累", "lei4", "tired", "H2-VOC-DESC"],
  ["忙", "mang2", "busy", "H2-VOC-DESC"], ["新", "xin1", "new", "H2-VOC-DESC"],
  ["远", "yuan3", "far", "H2-VOC-DESC"], ["近", "jin4", "near", "H2-VOC-DESC"],
  ["长", "chang2", "long", "H2-VOC-DESC"], ["高", "gao1", "tall; high", "H2-VOC-DESC"],
  ["白", "bai2", "white", "H2-VOC-DESC"], ["红", "hong2", "red", "H2-VOC-DESC"],
  ["黑", "hei1", "black", "H2-VOC-DESC"], ["好吃", "hao3 chi1", "tasty", "H2-VOC-DESC"],
  ["晴", "qing2", "sunny", "H2-VOC-DESC"], ["雪", "xue3", "snow", "H2-VOC-DESC"],
  ["手表", "shou3 biao3", "wristwatch", "H2-VOC-DESC"], ["手机", "shou3 ji1", "mobile phone", "H2-VOC-DESC"],
];

const HSK2_GRAMMAR: SeedQuestion[] = [
  // 比
  { type: "mcq", prompt: "Which sentence means “My older brother is taller than me”?", options: ["哥哥比我高。", "哥哥比我很高。", "我比哥哥高。", "哥哥高比我。"], answer: "哥哥比我高。", difficulty: 2, kps: ["H2-GR-BI"] },
  { type: "true_false", prompt: "True or false: 「今天比昨天很冷。」 is correct.", options: ["True", "False"], answer: "False", difficulty: 2, kps: ["H2-GR-BI"] },
  { type: "mcq", prompt: "西瓜比苹果___。", options: ["大", "很大", "太大", "大的"], answer: "大", difficulty: 2, kps: ["H2-GR-BI"] },
  { type: "mcq", prompt: "Which sentence correctly says “Coffee is a bit more expensive than tea”?", options: ["咖啡比茶贵一点儿。", "咖啡比茶一点儿贵。", "咖啡一点儿比茶贵。", "咖啡比茶很贵一点儿。"], answer: "咖啡比茶贵一点儿。", difficulty: 3, kps: ["H2-GR-BI"] },
  { type: "fill_blank", prompt: "Fill in one character: 北京___上海冷。(Beijing is colder than Shanghai.)", options: [], answer: "比", difficulty: 1, kps: ["H2-GR-BI"] },
  // 过
  { type: "mcq", prompt: "我去___中国。(I have been to China.)", options: ["过", "了", "着", "的"], answer: "过", difficulty: 2, kps: ["H2-GR-GUO"] },
  { type: "mcq", prompt: "How do you say “I have never eaten lamb”?", options: ["我没吃过羊肉。", "我不吃过羊肉。", "我没吃了羊肉。", "我吃没过羊肉。"], answer: "我没吃过羊肉。", difficulty: 3, kps: ["H2-GR-GUO"] },
  { type: "true_false", prompt: "True or false: 过 after a verb tells you someone has had the experience before.", options: ["True", "False"], answer: "True", difficulty: 1, kps: ["H2-GR-GUO"] },
  { type: "fill_blank", prompt: "Fill in one character: 你看___这个电影吗？(Have you seen this film?)", options: [], answer: "过", difficulty: 2, kps: ["H2-GR-GUO"] },
  // 得
  { type: "mcq", prompt: "他汉语说___很好。", options: ["得", "的", "地", "了"], answer: "得", difficulty: 2, kps: ["H2-GR-DE3"] },
  { type: "mcq", prompt: "Which sentence means “She runs fast”?", options: ["她跑得很快。", "她跑很快得。", "她很快跑得。", "她得跑很快。"], answer: "她跑得很快。", difficulty: 2, kps: ["H2-GR-DE3"] },
  { type: "mcq", prompt: "Choose the correct sentence.", options: ["他唱歌唱得很好。", "他唱歌得很好。", "他唱得歌很好。", "他得唱歌很好。"], answer: "他唱歌唱得很好。", difficulty: 3, kps: ["H2-GR-DE3"] },
  { type: "true_false", prompt: "True or false: In 「你来得太晚了」, 得 links the verb to a description of how it was done.", options: ["True", "False"], answer: "True", difficulty: 2, kps: ["H2-GR-DE3"] },
  // 要…了
  { type: "mcq", prompt: "飞机___起飞了。(The plane is about to take off.)", options: ["要", "过", "得", "在"], answer: "要", difficulty: 2, kps: ["H2-GR-YAOLE"] },
  { type: "mcq", prompt: "What does 「快要下雨了」 mean?", options: ["It is about to rain.", "It rained quickly.", "It doesn't rain much.", "It rained yesterday."], answer: "It is about to rain.", difficulty: 2, kps: ["H2-GR-YAOLE"] },
  { type: "fill_blank", prompt: "Fill in one character: 考试要开始___。(The exam is about to start.)", options: [], answer: "了", difficulty: 2, kps: ["H2-GR-YAOLE"] },
  // 正在…呢
  { type: "mcq", prompt: "妈妈正在做饭___。", options: ["呢", "吗", "过", "得"], answer: "呢", difficulty: 2, kps: ["H2-GR-ZHENGZAI"] },
  { type: "mcq", prompt: "你给我打电话的时候，我___休息。", options: ["正在", "已经", "过", "要"], answer: "正在", difficulty: 2, kps: ["H2-GR-ZHENGZAI"] },
  { type: "true_false", prompt: "True or false: 「他正在看书呢。」 means “He has finished reading.”", options: ["True", "False"], answer: "False", difficulty: 1, kps: ["H2-GR-ZHENGZAI"] },
  // 因为…所以
  { type: "mcq", prompt: "因为今天下雨，___我们不去跑步了。", options: ["所以", "但是", "虽然", "还是"], answer: "所以", difficulty: 1, kps: ["H2-GR-YINWEI"] },
  { type: "mcq", prompt: "___他生病了，所以没来上课。", options: ["因为", "虽然", "但是", "可是"], answer: "因为", difficulty: 1, kps: ["H2-GR-YINWEI"] },
  { type: "mcq", prompt: "Which sentence gives a reason?", options: ["因为太累了，所以我想休息。", "虽然太累了，所以我想休息。", "因为太累了，但是我想休息。", "太累了因为，所以我想休息。"], answer: "因为太累了，所以我想休息。", difficulty: 2, kps: ["H2-GR-YINWEI"] },
  { type: "fill_blank", prompt: "Fill in two characters: 因为宾馆很近，___我们走路去。", options: [], answer: "所以", difficulty: 2, kps: ["H2-GR-YINWEI"] },
  // 虽然…但是
  { type: "mcq", prompt: "虽然这件衣服很贵，___很漂亮。", options: ["但是", "所以", "因为", "就"], answer: "但是", difficulty: 1, kps: ["H2-GR-SUIRAN"] },
  { type: "mcq", prompt: "Which sentence shows contrast?", options: ["虽然很忙，但是他每天跑步。", "因为很忙，所以他每天跑步。", "很忙所以，他每天跑步。", "虽然很忙，所以他每天跑步。"], answer: "虽然很忙，但是他每天跑步。", difficulty: 2, kps: ["H2-GR-SUIRAN"] },
  { type: "true_false", prompt: "True or false: 虽然 is normally paired with 所以.", options: ["True", "False"], answer: "False", difficulty: 2, kps: ["H2-GR-SUIRAN", "H2-GR-YINWEI"] },
  // 让
  { type: "mcq", prompt: "老师___我们回答问题。(The teacher asks us to answer.)", options: ["让", "比", "得", "过"], answer: "让", difficulty: 2, kps: ["H2-GR-RANG"] },
  { type: "mcq", prompt: "What does 「妈妈不让我看电视」 mean?", options: ["Mum doesn't let me watch TV.", "Mum doesn't watch TV.", "I don't let Mum watch TV.", "Mum lets me watch TV."], answer: "Mum doesn't let me watch TV.", difficulty: 2, kps: ["H2-GR-RANG"] },
  { type: "fill_blank", prompt: "Fill in one character: 这个消息___他很高兴。(This news made him happy.)", options: [], answer: "让", difficulty: 3, kps: ["H2-GR-RANG"] },
  // 离 / 从
  { type: "mcq", prompt: "我家___学校很近。", options: ["离", "从", "比", "在"], answer: "离", difficulty: 2, kps: ["H2-GR-LI"] },
  { type: "mcq", prompt: "___机场到宾馆要一个小时。", options: ["从", "离", "比", "在"], answer: "从", difficulty: 2, kps: ["H2-GR-LI"] },
  { type: "true_false", prompt: "True or false: 「公司离这儿很远。」 means “The company is far from here.”", options: ["True", "False"], answer: "True", difficulty: 1, kps: ["H2-GR-LI"] },
  { type: "fill_blank", prompt: "Fill in one character: 火车站___这儿远吗？(Is the station far from here?)", options: [], answer: "离", difficulty: 2, kps: ["H2-GR-LI"] },
  // Culture
  { type: "mcq", prompt: "A neighbour greets you at noon with 「吃了吗？」 What do they mean?", options: ["It is a friendly greeting, like “How are you?”", "They want to invite you to lunch right now.", "They are asking if you are hungry because you look thin.", "They are asking what you ate."], answer: "It is a friendly greeting, like “How are you?”", difficulty: 2, kps: ["H2-CULT"] },
  { type: "mcq", prompt: "Someone praises your Chinese. A modest, traditional reply is:", options: ["哪里哪里。", "对，我说得很好。", "没关系。", "不客气。"], answer: "哪里哪里。", difficulty: 2, kps: ["H2-CULT"] },
  { type: "mcq", prompt: "A host sees a guest out of the door and says:", options: ["慢走。", "快走。", "请进。", "再来吃。"], answer: "慢走。", difficulty: 2, kps: ["H2-CULT"] },
  { type: "mcq", prompt: "Before asking a stranger for directions, you start with:", options: ["请问，", "对不起了，", "没关系，", "谢谢，"], answer: "请问，", difficulty: 1, kps: ["H2-CULT"] },
  { type: "mcq", prompt: "At a race, friends shout 「加油！」 It means:", options: ["Come on! / You can do it!", "Add oil to the car.", "Be careful!", "Slow down!"], answer: "Come on! / You can do it!", difficulty: 1, kps: ["H2-CULT"] },
  { type: "true_false", prompt: "True or false: 「生日快乐！」 is what you say on someone's birthday.", options: ["True", "False"], answer: "True", difficulty: 1, kps: ["H2-CULT"] },
];

const HSK2_MW: SeedQuestion[] = [
  ["一___衣服", "件"], ["两___桌子", "张"], ["我去过北京三___。", "次"], ["一___手机", "个"], ["这___事情", "件"], ["一___票 (ticket)", "张"],
].map(([prompt, answer], i): SeedQuestion => ({
  type: "mcq", prompt: `Choose the measure word: ${prompt}`,
  options: shuffle(["件", "张", "次", "个", "本"].filter((x) => x !== answer).slice(0, 3).concat(answer), rng(200 + i)),
  answer, difficulty: 2, kps: ["H2-MW"],
}));
HSK2_MW.push(
  { type: "true_false", prompt: "True or false: 次 counts how many times something happens.", options: ["True", "False"], answer: "True", difficulty: 1, kps: ["H2-MW"] },
  { type: "fill_blank", prompt: "Fill in one character: 我买了一___新衣服。", options: [], answer: "件", difficulty: 2, kps: ["H2-MW"] },
);

// ── Template questions from a word list ──────────────────────────────────
function vocabQuestions(words: Word[], toneKp: string, seed: number): SeedQuestion[] {
  const rand = rng(seed);
  const out: SeedQuestion[] = [];
  words.forEach((w, i) => {
    const [hanzi, num, en, kp] = w;
    const sameCat = words.filter((x) => x[3] === kp && x[0] !== hanzi);
    const pool = sameCat.length >= 3 ? sameCat : words.filter((x) => x[0] !== hanzi);

    // 1. Meaning — every word
    out.push({
      type: "mcq",
      prompt: `What does 「${hanzi}」 (${pinyin(num)}) mean?`,
      options: shuffle([en, ...pick(pool, 3, rand).map((x) => x[2])], rand),
      answer: en, difficulty: 1, kps: [kp],
    });
    // 2. Reverse (English → hanzi) — every other word
    if (i % 2 === 0) {
      out.push({
        type: "mcq",
        prompt: `Which word means “${en}”?`,
        options: shuffle([hanzi, ...pick(pool, 3, rand).map((x) => x[0])], rand),
        answer: hanzi, difficulty: 2, kps: [kp],
      });
    }
    // 3. Tones — every other word (offset), when 3 wrong-tone variants exist
    if (i % 2 === 1) {
      const wrong = toneVariants(num, 3, rand);
      if (wrong.length === 3) {
        out.push({
          type: "mcq",
          prompt: `Choose the correct pinyin for 「${hanzi}」 (${en}).`,
          options: shuffle([pinyin(num), ...wrong], rand),
          answer: pinyin(num), difficulty: 2, kps: [toneKp],
        });
      }
    }
  });
  return out;
}

const HSK1: SeedLevel = {
  code: "HSK1", name: "HSK 1",
  knowledgePoints: HSK1_KPS,
  questions: [...vocabQuestions(HSK1_WORDS, "H1-TONE", 1), ...HSK1_MW, ...HSK1_GRAMMAR],
};

const HSK2: SeedLevel = {
  code: "HSK2", name: "HSK 2",
  knowledgePoints: HSK2_KPS,
  questions: [...vocabQuestions(HSK2_WORDS, "H2-TONE", 2), ...HSK2_MW, ...HSK2_GRAMMAR],
};

export const hsk: SeedCurriculum = {
  slug: "hsk",
  name: "HSK Chinese (Levels 1–2)",
  subject: "Chinese as a foreign language",
  description: "Vocabulary, tones, measure words, core grammar and everyday cultural expressions from the public HSK 1–2 syllabus.",
  levels: [HSK1, HSK2],
};
