"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import type { WriteDocument } from "@/app/lib/types";
import { downloadPDF } from "@/app/lib/download-pdf";

interface WritePageProps {
  document: WriteDocument;
  userTier: "free" | "premium";
}

type SaveStatus = "saved" | "saving" | "unsaved";
type AIMode = "write" | "continue" | "improve" | "summarize" | "ask";
type ChatMsg  = { id: string; role: "user" | "assistant"; content: string };

const AI_MODES: { id: AIMode; label: string }[] = [
  { id: "write",     label: "Write"     },
  { id: "continue",  label: "Continue"  },
  { id: "improve",   label: "Improve"   },
  { id: "summarize", label: "Summarize" },
  { id: "ask",       label: "Ask"       },
];

const MODE_HINTS: Record<AIMode, string> = {
  write:     "Write new content for me…",
  continue:  "Continue writing from where I left off…",
  improve:   "Improve my selected text…",
  summarize: "Summarize my document or selection…",
  ask:       "Ask anything about the document…",
};

function Icon({ d, size = 4 }: { d: string; size?: number }) {
  return (
    <svg className={`w-${size} h-${size} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} />
    </svg>
  );
}

const ICONS = {
  back:    "M10 19l-7-7m0 0l7-7m-7 7h18",
  undo:    "M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3",
  redo:    "M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3",
  alignL:  "M4 6h16M4 12h10M4 18h14",
  alignC:  "M4 6h16M7 12h10M5 18h14",
  alignR:  "M4 6h16M10 12h10M6 18h14",
  list:    "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  listOl:  "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  quote:   "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z",
  table:   "M3 10h18M3 14h18M10 3v18M6 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2h-1",
  pdf:     "M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  sparkle: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z",
  trash:   "M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0",
  code:    "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
  close:   "M6 18L18 6M6 6l12 12",
  send:    "M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5",
  insert:  "M12 4v16m8-8H4",
  replace: "M4 4l16 16M4 20L20 4",
  pencil:  "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125",
  check:   "M4.5 12.75l6 6 9-13.5",
  clear:   "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
};

function ToolbarBtn({ active, disabled, onClick, title, children }: {
  active?: boolean; disabled?: boolean; onClick: () => void; title?: string; children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      className={`flex items-center justify-center w-7 h-7 rounded transition-colors text-sm font-medium
        ${active ? "bg-indigo-100 text-indigo-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}
        disabled:opacity-30 disabled:cursor-not-allowed`}>
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-gray-200 mx-1 shrink-0" />;
}

export function WritePage({ document: initialDoc, userTier }: WritePageProps) {
  const router = useRouter();
  const [title, setTitle]                   = useState(initialDoc.title);
  const [editingTitle, setEditingTitle]     = useState(false);
  const [saveStatus, setSaveStatus]         = useState<SaveStatus>("saved");
  const [showAI, setShowAI]                 = useState(false);
  const [aiMode, setAIMode]                 = useState<AIMode>("write");
  const [chatHistory, setChatHistory]       = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput]           = useState("");
  const [isStreaming, setIsStreaming]       = useState(false);
  const [lastAiMsgId, setLastAiMsgId]       = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting]         = useState(false);

  const titleRef    = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSaving    = useRef(false);
  const pendingSave = useRef<string | null>(null);

  // Stable ref so the editor onUpdate closure never goes stale
  const persistRef = useRef(async (_html: string) => {});

  async function persistContent(html: string) {
    if (isSaving.current) { pendingSave.current = html; return; }
    isSaving.current = true;
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/write/${initialDoc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: html }),
      });
      if (!res.ok) throw new Error();
      setSaveStatus("saved");
    } catch {
      setSaveStatus("unsaved");
    } finally {
      isSaving.current = false;
      if (pendingSave.current !== null) {
        const next = pendingSave.current;
        pendingSave.current = null;
        await persistContent(next);
      }
    }
  }
  persistRef.current = persistContent;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight,
      TextStyle,
      Placeholder.configure({ placeholder: "Start writing, or ask the AI assistant on the right…" }),
      CharacterCount,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initialDoc.content || "",
    editorProps: {
      attributes: { class: "tiptap-content min-h-[600px] focus:outline-none" },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      setSaveStatus("unsaved");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => persistRef.current(html), 1200);
    },
  });

  // Scroll chat to bottom on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Save on tab/window close
  useEffect(() => {
    const handler = () => {
      if (saveTimer.current && editor) {
        clearTimeout(saveTimer.current);
        const html = editor.getHTML();
        navigator.sendBeacon(
          `/api/write/${initialDoc.id}`,
          new Blob([JSON.stringify({ content: html })], { type: "application/json" })
        );
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [editor, initialDoc.id]);

  useEffect(() => {
    if (editingTitle && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [editingTitle]);

  const saveTitle = async (newTitle: string) => {
    const t = newTitle.trim() || "Untitled Document";
    setTitle(t);
    setEditingTitle(false);
    await fetch(`/api/write/${initialDoc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: t }),
    });
  };

  const sendMessage = async () => {
    const text = chatInput.trim();
    if (!text || isStreaming) return;
    setChatInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsgId = `u-${Date.now()}`;
    const aiMsgId   = `a-${Date.now()}`;

    setChatHistory((prev) => [
      ...prev,
      { id: userMsgId, role: "user", content: text },
      { id: aiMsgId,   role: "assistant", content: "" },
    ]);
    setIsStreaming(true);
    setLastAiMsgId(aiMsgId);

    const selection = editor?.state.selection
      ? editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, " ")
      : "";

    // Build conversation history for context (last 10 messages)
    const history = chatHistory.slice(-10).map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`).join("\n");
    const contextPrompt = history ? `Previous conversation:\n${history}\n\nUser: ${text}` : text;

    try {
      const res = await fetch("/api/write/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: aiMode,
          prompt: contextPrompt,
          document: editor?.getText() ?? "",
          selection,
        }),
      });
      if (!res.ok) throw new Error("AI request failed");
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        full += chunk;
        setChatHistory((prev) =>
          prev.map((m) => m.id === aiMsgId ? { ...m, content: full } : m)
        );
      }
    } catch {
      setChatHistory((prev) =>
        prev.map((m) => m.id === aiMsgId ? { ...m, content: "Sorry, something went wrong. Please try again." } : m)
      );
    } finally {
      setIsStreaming(false);
      setLastAiMsgId(null);
    }
  };

  const insertLastResponse = () => {
    const last = [...chatHistory].reverse().find((m) => m.role === "assistant" && m.content);
    if (!last || !editor) return;
    editor.chain().focus().insertContent(markdownToHtml(last.content)).run();
  };

  const replaceSelectionWithLastResponse = () => {
    const last = [...chatHistory].reverse().find((m) => m.role === "assistant" && m.content);
    if (!last || !editor) return;
    const { from, to } = editor.state.selection;
    const chain = editor.chain().focus();
    if (from !== to) chain.deleteRange({ from, to });
    chain.insertContent(markdownToHtml(last.content)).run();
  };

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setChatInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const deleteDocument = async () => {
    setIsDeleting(true);
    const res = await fetch(`/api/write/${initialDoc.id}`, { method: "DELETE" });
    if (res.ok) router.push("/write");
    else { setIsDeleting(false); setShowDeleteConfirm(false); }
  };

  const words = editor?.storage.characterCount?.words() ?? 0;
  const chars = editor?.storage.characterCount?.characters() ?? 0;
  const lastAiMsg = [...chatHistory].reverse().find((m) => m.role === "assistant" && m.content);

  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-gray-800 bg-gray-950/95 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3 px-4 py-2.5 min-w-0">
          <Link href="/write" className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors shrink-0">
            <Icon d={ICONS.back} />
            <span className="font-bold text-indigo-400 hidden sm:block text-sm">Tausi</span>
          </Link>
          <span className="text-gray-700">/</span>

          {editingTitle ? (
            <form className="flex-1 min-w-0"
              onSubmit={(e) => { e.preventDefault(); saveTitle((new FormData(e.currentTarget).get("t") as string) ?? ""); }}>
              <input ref={titleRef} name="t" defaultValue={title}
                onBlur={(e) => saveTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") setEditingTitle(false); }}
                className="w-full bg-gray-800 border border-indigo-600 rounded-lg px-3 py-1 text-sm text-white outline-none" />
            </form>
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-sm font-semibold text-gray-200 truncate">{title}</span>
              <button onClick={() => setEditingTitle(true)} className="text-gray-600 hover:text-gray-400 shrink-0">
                <Icon d={ICONS.pencil} size={3} />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <span className={`hidden md:flex items-center gap-1 text-xs ${
              saveStatus === "saved"   ? "text-emerald-500"
              : saveStatus === "saving" ? "text-yellow-500"
              : "text-gray-500"
            }`}>
              {saveStatus === "saving" && <span className="w-2.5 h-2.5 border-2 border-yellow-500/40 border-t-yellow-400 rounded-full animate-spin" />}
              {saveStatus === "saved" && <Icon d={ICONS.check} size={3} />}
              {saveStatus === "saved" ? "Saved" : saveStatus === "saving" ? "Saving…" : "Unsaved"}
            </span>
            <span className="hidden lg:block text-xs text-gray-600">{words} words</span>

            <button onClick={() => setShowAI((v) => !v)}
              className={`flex items-center gap-1.5 text-xs border rounded-lg px-2.5 py-1.5 transition-colors ${
                showAI ? "text-indigo-300 border-indigo-700 bg-indigo-950/50"
                       : "text-gray-400 border-gray-700 hover:border-gray-500 hover:text-white"
              }`}>
              <Icon d={ICONS.sparkle} size={3} />
              <span className="hidden sm:block">AI</span>
            </button>

            <button onClick={() => downloadPDF({ title, html: editor?.getHTML() ?? "", isFree: userTier === "free" })}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg px-2.5 py-1.5 transition-colors">
              <Icon d={ICONS.pdf} size={3} />
              <span className="hidden sm:block">PDF</span>
            </button>

            {!showDeleteConfirm ? (
              <button onClick={() => setShowDeleteConfirm(true)}
                className="text-xs text-red-500 hover:text-red-400 border border-red-900 hover:border-red-700 rounded-lg px-2 py-1.5 transition-colors">
                <Icon d={ICONS.trash} size={3} />
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-red-400">Delete?</span>
                <button onClick={deleteDocument} disabled={isDeleting}
                  className="text-xs text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg px-2.5 py-1 transition-colors">
                  {isDeleting ? "…" : "Yes"}
                </button>
                <button onClick={() => setShowDeleteConfirm(false)}
                  className="text-xs text-gray-400 border border-gray-700 rounded-lg px-2.5 py-1 transition-colors">
                  No
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="flex items-center gap-0.5 px-4 py-1.5 border-t border-gray-800 bg-white/[0.02] overflow-x-auto">
          <ToolbarBtn onClick={() => editor?.chain().focus().undo().run()} title="Undo" disabled={!editor?.can().undo()}>
            <Icon d={ICONS.undo} size={3} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor?.chain().focus().redo().run()} title="Redo" disabled={!editor?.can().redo()}>
            <Icon d={ICONS.redo} size={3} />
          </ToolbarBtn>
          <ToolbarDivider />

          {([1, 2, 3] as const).map((level) => (
            <ToolbarBtn key={level}
              active={editor?.isActive("heading", { level }) ?? false}
              onClick={() => editor?.chain().focus().toggleHeading({ level }).run()}
              title={`Heading ${level}`}>
              <span className="text-xs font-bold">H{level}</span>
            </ToolbarBtn>
          ))}
          <ToolbarBtn active={editor?.isActive("paragraph") ?? false}
            onClick={() => editor?.chain().focus().setParagraph().run()} title="Paragraph">
            <span className="text-xs">¶</span>
          </ToolbarBtn>
          <ToolbarDivider />

          <ToolbarBtn active={editor?.isActive("bold") ?? false}
            onClick={() => editor?.chain().focus().toggleBold().run()} title="Bold (Ctrl+B)">
            <span className="text-xs font-bold">B</span>
          </ToolbarBtn>
          <ToolbarBtn active={editor?.isActive("italic") ?? false}
            onClick={() => editor?.chain().focus().toggleItalic().run()} title="Italic (Ctrl+I)">
            <span className="text-xs italic">I</span>
          </ToolbarBtn>
          <ToolbarBtn active={editor?.isActive("underline") ?? false}
            onClick={() => editor?.chain().focus().toggleUnderline().run()} title="Underline (Ctrl+U)">
            <span className="text-xs underline">U</span>
          </ToolbarBtn>
          <ToolbarBtn active={editor?.isActive("strike") ?? false}
            onClick={() => editor?.chain().focus().toggleStrike().run()} title="Strikethrough">
            <span className="text-xs line-through">S</span>
          </ToolbarBtn>
          <ToolbarBtn active={editor?.isActive("highlight") ?? false}
            onClick={() => editor?.chain().focus().toggleHighlight().run()} title="Highlight">
            <span className="text-xs font-semibold" style={{ background: "#fef08a", padding: "0 2px", color: "#111" }}>H</span>
          </ToolbarBtn>
          <ToolbarDivider />

          <ToolbarBtn active={editor?.isActive("bulletList") ?? false}
            onClick={() => editor?.chain().focus().toggleBulletList().run()} title="Bullet list">
            <Icon d={ICONS.list} size={3} />
          </ToolbarBtn>
          <ToolbarBtn active={editor?.isActive("orderedList") ?? false}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()} title="Numbered list">
            <Icon d={ICONS.listOl} size={3} />
          </ToolbarBtn>
          <ToolbarBtn active={editor?.isActive("blockquote") ?? false}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()} title="Blockquote">
            <Icon d={ICONS.quote} size={3} />
          </ToolbarBtn>
          <ToolbarBtn active={editor?.isActive("code") ?? false}
            onClick={() => editor?.chain().focus().toggleCode().run()} title="Inline code">
            <Icon d={ICONS.code} size={3} />
          </ToolbarBtn>
          <ToolbarDivider />

          <ToolbarBtn active={editor?.isActive({ textAlign: "left" }) ?? false}
            onClick={() => editor?.chain().focus().setTextAlign("left").run()} title="Align left">
            <Icon d={ICONS.alignL} size={3} />
          </ToolbarBtn>
          <ToolbarBtn active={editor?.isActive({ textAlign: "center" }) ?? false}
            onClick={() => editor?.chain().focus().setTextAlign("center").run()} title="Align center">
            <Icon d={ICONS.alignC} size={3} />
          </ToolbarBtn>
          <ToolbarBtn active={editor?.isActive({ textAlign: "right" }) ?? false}
            onClick={() => editor?.chain().focus().setTextAlign("right").run()} title="Align right">
            <Icon d={ICONS.alignR} size={3} />
          </ToolbarBtn>
          <ToolbarDivider />

          <ToolbarBtn onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert table">
            <Icon d={ICONS.table} size={3} />
          </ToolbarBtn>

          <div className="ml-auto hidden lg:block pl-2 shrink-0">
            <span className="text-xs text-gray-600">{chars} chars</span>
          </div>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Editor pane — hidden on mobile when AI sidebar is open */}
        <div className={`overflow-y-auto bg-gray-100 ${showAI ? "hidden md:flex md:flex-1" : "flex-1"}`}>
          <div className="min-h-full py-10 px-4 sm:px-8 flex justify-center">
            {/* White "document" sheet */}
            <div className="w-full max-w-[780px] bg-white rounded-lg shadow-sm border border-gray-200 px-10 py-12 min-h-[900px]"
              style={{ color: "#111827" }}>
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>

        {/* ── AI Chatbot Sidebar — full-width on mobile, 320px on desktop ── */}
        {showAI && (
          <div className="flex-1 w-full md:flex-none md:w-80 md:shrink-0 min-h-0 flex flex-col overflow-hidden border-l border-gray-800 bg-gray-950">

            {/* Sidebar header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
              {/* Mobile: back arrow; Desktop: sparkle icon + label */}
              <div className="flex items-center gap-2">
                <button onClick={() => setShowAI(false)}
                  className="md:hidden flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm">
                  <Icon d={ICONS.back} size={4} />
                  <span>Editor</span>
                </button>
                <div className="hidden md:flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Icon d={ICONS.sparkle} size={3} />
                  </div>
                  <span className="text-sm font-semibold text-gray-200">AI Assistant</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {chatHistory.length > 0 && (
                  <button onClick={() => setChatHistory([])} title="Clear chat"
                    className="text-gray-600 hover:text-gray-400 transition-colors p-1">
                    <Icon d={ICONS.clear} size={3} />
                  </button>
                )}
                <button onClick={() => setShowAI(false)} className="hidden md:flex text-gray-600 hover:text-gray-400 transition-colors">
                  <Icon d={ICONS.close} size={4} />
                </button>
              </div>
            </div>

            {/* Mode selector */}
            <div className="flex gap-1 px-3 pt-2.5 pb-2 border-b border-gray-800/60 shrink-0 overflow-x-auto">
              {AI_MODES.map((m) => (
                <button key={m.id}
                  onClick={() => setAIMode(m.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                    aiMode === m.id
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                  }`}>
                  {m.label}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              {chatHistory.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-8">
                  <div className="w-10 h-10 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center">
                    <Icon d={ICONS.sparkle} size={4} />
                  </div>
                  <p className="text-sm text-gray-400 font-medium">AI Writing Assistant</p>
                  <p className="text-xs text-gray-600 max-w-[200px]">
                    Select a mode above, then type your request below. I can write, improve, or answer questions about your document.
                  </p>
                  <div className="w-full space-y-1.5 mt-1">
                    {[
                      "Write an introduction about climate change",
                      "Improve my selected paragraph",
                      "Continue writing from here",
                    ].map((s) => (
                      <button key={s} onClick={() => { setChatInput(s); textareaRef.current?.focus(); }}
                        className="w-full text-left text-xs text-gray-500 hover:text-gray-300 border border-gray-800 hover:border-gray-600 rounded-lg px-3 py-1.5 transition-colors">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatHistory.map((msg) => {
                const isUser = msg.role === "user";
                const isStreamingThis = msg.id === lastAiMsgId;
                return (
                  <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                    {!isUser && (
                      <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 mt-1 mr-2">
                        <Icon d={ICONS.sparkle} size={3} />
                      </div>
                    )}
                    <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                      isUser
                        ? "bg-indigo-600 text-white rounded-br-sm"
                        : "bg-gray-800 text-gray-200 rounded-bl-sm"
                    }`}>
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : msg.content ? (
                        <p className="whitespace-pre-wrap">
                          {msg.content}
                          {isStreamingThis && (
                            <span className="inline-block w-1.5 h-3 bg-indigo-400 animate-pulse ml-0.5 rounded-sm" />
                          )}
                        </p>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          {[0,1,2].map((i) => (
                            <span key={i} className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce"
                              style={{ animationDelay: `${i * 0.15}s` }} />
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={chatBottomRef} />
            </div>

            {/* Insert/Replace buttons — show after last AI message */}
            {lastAiMsg && !isStreaming && (
              <div className="flex gap-2 px-3 pb-2 shrink-0">
                <button onClick={insertLastResponse}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg transition-colors">
                  <Icon d={ICONS.insert} size={3} /> Insert
                </button>
                <button onClick={replaceSelectionWithLastResponse}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
                  <Icon d={ICONS.replace} size={3} /> Replace
                </button>
              </div>
            )}

            {/* Input area */}
            <div className="border-t border-gray-800 p-3 shrink-0">
              <div className="flex items-end gap-2">
                <textarea ref={textareaRef} value={chatInput} onChange={autoResize}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  disabled={isStreaming}
                  placeholder={MODE_HINTS[aiMode]}
                  rows={1}
                  className="flex-1 bg-gray-900 border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-xl px-3 py-2 text-xs text-gray-200 placeholder-gray-600 resize-none overflow-hidden outline-none transition-colors disabled:opacity-50"
                  style={{ minHeight: "36px", maxHeight: "120px" }} />
                <button onClick={sendMessage} disabled={!chatInput.trim() || isStreaming}
                  className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 text-white transition-colors shrink-0"
                  aria-label="Send">
                  {isStreaming
                    ? <span className="w-3.5 h-3.5 border-2 border-gray-500 border-t-indigo-400 rounded-full animate-spin" />
                    : <Icon d={ICONS.send} size={3} />}
                </button>
              </div>
              <p className="text-xs text-gray-700 mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Minimal markdown → Tiptap HTML
function markdownToHtml(md: string): string {
  const out: string[] = [];
  let inUl = false, inOl = false;
  const flush = () => {
    if (inUl) { out.push("</ul>"); inUl = false; }
    if (inOl) { out.push("</ol>"); inOl = false; }
  };
  for (const raw of md.split("\n")) {
    const ulM = raw.match(/^\s*[-*+]\s+(.+)/);
    const olM = raw.match(/^\s*\d+\.\s+(.+)/);
    if (ulM) {
      if (!inUl) { flush(); out.push("<ul>"); inUl = true; }
      out.push(`<li>${inline(ulM[1])}</li>`);
    } else if (olM) {
      if (!inOl) { flush(); out.push("<ol>"); inOl = true; }
      out.push(`<li>${inline(olM[1])}</li>`);
    } else {
      flush();
      if      (raw.startsWith("### ")) out.push(`<h3>${inline(raw.slice(4))}</h3>`);
      else if (raw.startsWith("## "))  out.push(`<h2>${inline(raw.slice(3))}</h2>`);
      else if (raw.startsWith("# "))   out.push(`<h1>${inline(raw.slice(2))}</h1>`);
      else if (raw.startsWith("> "))   out.push(`<blockquote><p>${inline(raw.slice(2))}</p></blockquote>`);
      else if (/^---+$/.test(raw))     out.push("<hr>");
      else if (raw.trim() === "")      out.push("<p></p>");
      else                             out.push(`<p>${inline(raw)}</p>`);
    }
  }
  flush();
  return out.join("");
}
function inline(t: string): string {
  return t
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/_(.+?)_/g,   "<em>$1</em>")
    .replace(/`(.+?)`/g,   "<code>$1</code>")
    .replace(/~~(.+?)~~/g, "<s>$1</s>");
}
