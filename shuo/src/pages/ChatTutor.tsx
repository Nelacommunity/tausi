import { useEffect, useRef, useState } from 'react';
import { AddCardButton, ErrorBox, PageHeader, SpeakButton, Zh, useWordPopup } from '../components/ui';
import { SCENARIOS } from '../data/scenarios';
import { errorText, generateJSON, type Content } from '../lib/gemini';
import { LEVEL_GUIDE } from '../lib/prompts';
import { addMistakes, award, settingsStore } from '../lib/state';
import { persisted, uid } from '../lib/store';

interface TutorTurn {
  correction: { hasErrors: boolean; corrected: string; explanation: string };
  reply: string;
  translation: string;
  vocab: { hanzi: string; pinyin: string; meaning: string }[];
}

interface Msg {
  id: string;
  role: 'user' | 'model';
  text: string;
  turn?: TutorTurn;
  showEn?: boolean;
}

const chatStore = persisted<{ scenario: string; messages: Msg[] }>('chat', { scenario: 'free', messages: [] });

function systemPrompt(scenarioId: string) {
  const s = settingsStore.get();
  const sc = SCENARIOS.find((x) => x.id === scenarioId) ?? SCENARIOS[0];
  return `You are 李老师, a friendly native Mandarin tutor chatting by text with a student.
Student: ${LEVEL_GUIDE[s.level]}. Native language: ${s.nativeLanguage}. Goal: ${s.goal}.
Scenario: ${sc.title} — ${sc.prompt}

For EVERY student message, respond with JSON:
{
  "correction": {
    "hasErrors": true/false,
    "corrected": "the student's message rewritten as natural, correct Chinese (if they wrote ${s.nativeLanguage} or pinyin, give the Chinese they should have written)",
    "explanation": "brief ${s.nativeLanguage} explanation of each fix (empty string if no errors)"
  },
  "reply": "your in-character reply in simplified Chinese, 1–3 sentences, matched to the student's level, ending with a question to keep the conversation going",
  "translation": "${s.nativeLanguage} translation of your reply",
  "vocab": [{"hanzi": "", "pinyin": "", "meaning": ""}]
}
"vocab" lists 0–3 words from your reply that are likely new for this student.
Be encouraging. Treat pinyin or ${s.nativeLanguage} input as an attempt the student wants help turning into Chinese.`;
}

export default function ChatTutor() {
  const { scenario, messages } = chatStore.use();
  const settings = settingsStore.use();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<{ zh: string; en: string }[] | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const { open: openWord, popup } = useWordPopup();

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages.length, busy]);

  const setMessages = (fn: (m: Msg[]) => Msg[]) => chatStore.set((s) => ({ ...s, messages: fn(s.messages) }));

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setError(null);
    setIdeas(null);
    const userMsg: Msg = { id: uid(), role: 'user', text: text.trim() };
    const history = [...messages, userMsg].slice(-30);
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setBusy(true);
    try {
      const contents: Content[] = history.map((m) => ({ role: m.role, parts: [{ text: m.role === 'model' ? m.turn?.reply ?? m.text : m.text }] }));
      if (contents[0]?.role === 'model') contents.unshift({ role: 'user', parts: [{ text: '(The student opened the chat.)' }] });
      const turn = await generateJSON<TutorTurn>(contents, { system: systemPrompt(scenario), temperature: 0.8 });
      setMessages((m) => [...m.map((x) => (x.id === userMsg.id ? { ...x, turn } : x)), { id: uid(), role: 'model', text: turn.reply, turn }]);
      if (turn.correction?.hasErrors) {
        addMistakes([{ source: 'chat', said: userMsg.text, correct: turn.correction.corrected, explanation: turn.correction.explanation }]);
      }
      award(2, 'chats');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const turn = await generateJSON<TutorTurn>(
        [{ role: 'user', parts: [{ text: '(The student has opened the chat. Start the conversation with a greeting and a first question. Set correction.hasErrors to false.)' }] }],
        { system: systemPrompt(scenario) },
      );
      setMessages(() => [{ id: uid(), role: 'model', text: turn.reply, turn }]);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function suggest() {
    setError(null);
    try {
      const last = messages.slice(-6).map((m) => `${m.role === 'model' ? 'Tutor' : 'Student'}: ${m.turn?.reply ?? m.text}`).join('\n');
      const r = await generateJSON<{ ideas: { zh: string; en: string }[] }>(
        `Conversation:\n${last}\n\nSuggest 3 possible replies for the HSK ${settings.level} student (varying difficulty). JSON: {"ideas":[{"zh":"","en":""}]}`,
      );
      setIdeas(r.ideas);
    } catch (e) {
      setError(errorText(e));
    }
  }

  return (
    <div className="chat-page">
      <PageHeader
        title="Chat Tutor"
        zh="文字聊天"
        subtitle="Write in Chinese (or pinyin / English when stuck). Every message is corrected, and you can tap any word."
        actions={
          <>
            <select className="input" value={scenario} onChange={(e) => chatStore.set({ scenario: e.target.value, messages: [] })}>
              {SCENARIOS.filter((s) => s.id !== 'tones').map((s) => (
                <option key={s.id} value={s.id}>
                  {s.icon} {s.title}
                </option>
              ))}
            </select>
            <button className="btn" onClick={() => chatStore.set((s) => ({ ...s, messages: [] }))}>
              New chat
            </button>
          </>
        }
      />
      <ErrorBox error={error} />
      <section className="card chat-window">
        {messages.length === 0 && !busy && (
          <div className="empty">
            <p>Start a written conversation with your tutor.</p>
            <button className="btn btn-primary" onClick={start}>
              开始 · Start chatting
            </button>
          </div>
        )}
        {messages.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="bubble user">
              <span lang="zh-CN">{m.text}</span>
              {m.turn?.correction &&
                (m.turn.correction.hasErrors ? (
                  <div className="inline-correction">
                    <div>
                      ✓ <Zh text={m.turn.correction.corrected} pinyin={false} /> <SpeakButton text={m.turn.correction.corrected} />
                    </div>
                    <small>{m.turn.correction.explanation}</small>
                  </div>
                ) : (
                  <div className="inline-ok">✓ Perfect!</div>
                ))}
            </div>
          ) : (
            <div key={m.id} className="bubble model">
              <Zh text={m.text} onWord={openWord} />
              <div className="bubble-tools">
                <SpeakButton text={m.text} />
                <SpeakButton text={m.text} slow />
                <button className="btn-link" onClick={() => setMessages((all) => all.map((x) => (x.id === m.id ? { ...x, showEn: !x.showEn } : x)))}>
                  {m.showEn ? 'Hide' : 'Translate'}
                </button>
              </div>
              {m.showEn && <div className="translation">{m.turn?.translation}</div>}
              {m.turn?.vocab?.length ? (
                <div className="vocab-chips">
                  {m.turn.vocab.map((v) => (
                    <span key={v.hanzi} className="vocab-chip">
                      <b lang="zh-CN">{v.hanzi}</b> {v.pinyin} · {v.meaning}
                      <AddCardButton word={v} deck="Chat" />
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ),
        )}
        {busy && (
          <div className="bubble model typing">
            <span />
            <span />
            <span />
          </div>
        )}
        <div ref={end} />
      </section>

      {ideas && (
        <div className="ideas">
          {ideas.map((i, k) => (
            <button key={k} className="idea" onClick={() => setInput(i.zh)}>
              <span lang="zh-CN">{i.zh}</span>
              <small>{i.en}</small>
            </button>
          ))}
        </div>
      )}

      <div className="composer">
        <button className="btn" title="Suggest replies" onClick={suggest} disabled={!messages.length || busy}>
          💡
        </button>
        <textarea
          className="input"
          rows={1}
          placeholder="用中文写… (Enter to send, Shift+Enter for new line)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void send(input);
            }
          }}
        />
        <button className="btn btn-primary" onClick={() => send(input)} disabled={busy || !input.trim()}>
          Send
        </button>
      </div>
      {popup}
    </div>
  );
}
