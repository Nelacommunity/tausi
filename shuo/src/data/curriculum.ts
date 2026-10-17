export interface Unit {
  id: string;
  level: number;
  title: string;
  topic: string;
  grammar: string;
  canDo: string;
}

const u = (level: number, n: number, title: string, topic: string, grammar: string, canDo: string): Unit => ({
  id: `hsk${level}-${n}`,
  level,
  title,
  topic,
  grammar,
  canDo,
});

export const CURRICULUM: Unit[] = [
  u(1, 1, 'Hello!', 'greetings, names, nationality', '是 sentences; 吗 questions; 呢', 'Greet people and introduce yourself'),
  u(1, 2, 'Numbers & Age', 'numbers 0–99, age, phone numbers', '几 / 多大; 岁', 'Say your age and phone number'),
  u(1, 3, 'My Family', 'family members, pets', '有 / 没有; measure word 个', 'Describe your family'),
  u(1, 4, 'Dates & Time', 'days, dates, telling time', 'time words before verbs; 点/分', 'Make plans for a specific time'),
  u(1, 5, 'Food & Drink', 'ordering food and drinks', '想 / 要; 什么', 'Order in a restaurant'),
  u(1, 6, 'Where Is It?', 'places, location words', '在 + place; 哪儿', 'Ask and give simple locations'),
  u(1, 7, 'Shopping', 'money, prices, buying things', '多少钱; 块/毛', 'Ask prices and buy things'),
  u(1, 8, 'Weather', 'weather and temperature', '太…了; 很 + adjective', 'Talk about the weather'),
  u(1, 9, 'Getting Around', 'transport', '怎么 + verb; 坐', 'Say how you get places'),
  u(1, 10, 'What Did You Do?', 'past activities, weekend', 'completed-action 了', 'Talk about what you did'),
  u(2, 1, 'Daily Routine', 'daily schedule', '时间 + 做; 的时候', 'Describe your day'),
  u(2, 2, 'Have You Ever…?', 'experiences, travel', '过 (experience)', 'Talk about past experiences'),
  u(2, 3, 'Comparisons', 'comparing people, prices, cities', '比 comparisons; 没有…那么', 'Compare two things'),
  u(2, 4, 'Right Now', 'ongoing actions, phone calls', '正在…呢; 着', 'Say what you are doing now'),
  u(2, 5, 'Because… So…', 'reasons and excuses', '因为…所以; 虽然…但是', 'Explain reasons'),
  u(2, 6, 'How Well?', 'skills, hobbies, sports', 'degree complement 得', 'Describe how well someone does something'),
  u(2, 7, 'Health', 'feeling sick, doctor visit', '要…了; 别…了', 'Describe symptoms'),
  u(2, 8, 'Directions', 'finding your way', '离; 往 + direction; 从…到', 'Give and follow directions'),
  u(3, 1, 'Getting Things Done', 'errands, chores', '把 sentences', 'Say what you did to something'),
  u(3, 2, 'It Happened To Me', 'accidents, bad luck', '被 passive', 'Describe what happened to you'),
  u(3, 3, 'Changes', 'trends, getting better/worse', '越来越; 变得', 'Describe change over time'),
  u(3, 4, 'As Soon As', 'habits, sequences', '一…就…; 先…再…', 'Describe sequences of events'),
  u(3, 5, 'Results', 'studying, finishing tasks', 'result complements 完/好/懂/到', 'Say whether you managed to do something'),
  u(3, 6, 'Up & Down, In & Out', 'moving, directions', 'directional complements 上来/下去', 'Describe movement'),
  u(3, 7, 'Besides…', 'hobbies, preferences', '除了…以外; 连…都', 'Add information and emphasize'),
  u(3, 8, 'Conditions', 'plans, conditions', '只要…就; 如果…就', 'Talk about conditions'),
  u(4, 1, 'Opinions', 'social topics, lifestyle', '不管…都; 对…来说', 'Give and support an opinion'),
  u(4, 2, 'Work Life', 'jobs, office, colleagues', '即使…也; 尽管', 'Discuss work situations'),
  u(4, 3, 'Money & Consumption', 'shopping habits, saving', '与其…不如; 何况', 'Discuss spending decisions'),
  u(4, 4, 'Relationships', 'friendship, dating, family', '于是; 究竟; 甚至', 'Tell a story about people'),
  u(4, 5, 'Culture & Customs', 'festivals, etiquette', '按照; 通过; 随着', 'Explain customs'),
  u(4, 6, 'Common Idioms', 'everyday 成语', '四字成语 in context', 'Use common idioms naturally'),
  u(5, 1, 'News & Society', 'current events', 'formal connectors: 然而, 此外, 因此', 'Summarize news'),
  u(5, 2, 'Business Meetings', 'meetings, proposals', 'formal requests & polite register', 'Participate in meetings'),
  u(5, 3, 'Negotiation', 'deals, prices, contracts', 'concessions: 固然…但, 既然…就', 'Negotiate and persuade'),
  u(5, 4, 'Technology', 'internet, AI, apps', 'nominalization with 的; 所 + V', 'Discuss technology'),
  u(5, 5, 'Environment', 'climate, cities', 'cause & effect: 导致, 由于', 'Argue about an issue'),
  u(6, 1, 'Debate', 'controversial topics', 'rhetorical questions: 难道…吗; 岂不是', 'Debate persuasively'),
  u(6, 2, 'Literary Chinese in Modern Use', 'written style, 书面语', '之, 其, 以, 于 in modern text', 'Read formal writing'),
  u(6, 3, 'Chengyu Mastery', 'idioms and their stories', 'chengyu as predicates/modifiers', 'Use advanced idioms'),
  u(6, 4, 'Professional Presentations', 'reports, pitches', 'structuring: 首先, 其次, 综上所述', 'Give a presentation'),
];
