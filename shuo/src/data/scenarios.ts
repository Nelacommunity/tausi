export interface Scenario {
  id: string;
  icon: string;
  title: string;
  zh: string;
  minLevel: number;
  prompt: string;
}

export const SCENARIOS: Scenario[] = [
  { id: 'free', icon: '💬', title: 'Free conversation', zh: '随便聊聊', minLevel: 1, prompt: 'Have a friendly, natural conversation about the student\'s life, interests and day. Ask follow-up questions.' },
  { id: 'intro', icon: '👋', title: 'Introduce yourself', zh: '自我介绍', minLevel: 1, prompt: 'You are meeting the student for the first time at a language exchange. Get to know them: name, country, job/studies, hobbies, family.' },
  { id: 'restaurant', icon: '🍜', title: 'Order at a restaurant', zh: '在饭馆点菜', minLevel: 1, prompt: 'Role-play: you are a waiter (服务员) at a busy Sichuan restaurant in Chengdu. The student is the customer. Take their order, recommend dishes, ask about spice level, handle the bill.' },
  { id: 'taxi', icon: '🚕', title: 'Taxi & directions', zh: '打车问路', minLevel: 1, prompt: 'Role-play: you are a chatty Beijing taxi driver. The student is the passenger. Ask where they are going, chat about the city, and negotiate the route.' },
  { id: 'shopping', icon: '🛍️', title: 'Market bargaining', zh: '在市场讲价', minLevel: 2, prompt: 'Role-play: you are a vendor at a clothing market in Shanghai. Start with high prices; the student must bargain. Be playful but firm.' },
  { id: 'doctor', icon: '🏥', title: 'At the doctor', zh: '看病', minLevel: 2, prompt: 'Role-play: you are a doctor at a Chinese hospital. The student is the patient. Ask about symptoms, how long, and give advice.' },
  { id: 'hotel', icon: '🏨', title: 'Booking a hotel (phone)', zh: '打电话订酒店', minLevel: 2, prompt: 'Role-play: you are a hotel receptionist answering the phone. The student wants to book a room. Handle dates, room type, price and special requests.' },
  { id: 'friends', icon: '🧋', title: 'Making friends', zh: '交朋友', minLevel: 2, prompt: 'Role-play: you are a Chinese university student the student just met at a bubble tea shop. Chat casually using natural spoken expressions young people use, and suggest hanging out.' },
  { id: 'interview', icon: '💼', title: 'Job interview', zh: '面试', minLevel: 3, prompt: 'Role-play: you are an HR manager at a tech company in Shenzhen interviewing the student for a job. Ask standard interview questions, follow-ups, and about salary expectations.' },
  { id: 'business', icon: '🤝', title: 'Business meeting', zh: '商务会议', minLevel: 4, prompt: 'Role-play: you are a procurement manager at a Chinese manufacturing company. The student is a foreign supplier. Discuss order volume, price, delivery time and quality, using professional register.' },
  { id: 'debate', icon: '⚖️', title: 'Debate a topic', zh: '辩论', minLevel: 4, prompt: 'Pick an interesting debate topic suited to the student (e.g. remote work, AI in education, city vs countryside). Take the opposite side from the student and push them to justify their opinions with reasons and examples.' },
  { id: 'hskk', icon: '📝', title: 'HSKK speaking exam', zh: 'HSKK口试模拟', minLevel: 1, prompt: 'Simulate the HSKK oral exam appropriate for the student\'s level: listen-and-repeat sentences, answering questions, and describing a topic for 1–2 minutes. Act as the examiner, then give a score estimate and feedback at the end.' },
  { id: 'tones', icon: '🎵', title: 'Tone & pronunciation drill', zh: '声调练习', minLevel: 1, prompt: 'Run a pronunciation drill: say a word or short phrase, have the student repeat it, then give specific feedback on tones and sounds (e.g. zh/z, q/ch, ü, 3rd-tone sandhi). Gradually increase difficulty. Keep it fast-paced.' },
];

export const TUTOR_MODES = [
  { id: 'guided', label: 'Guided', desc: 'Chinese with short explanations in your language when needed' },
  { id: 'immersion', label: 'Immersion', desc: 'Chinese only — explains in simpler Chinese' },
  { id: 'strict', label: 'Strict coach', desc: 'Corrects every mistake and makes you repeat' },
] as const;
export type TutorMode = (typeof TUTOR_MODES)[number]['id'];
