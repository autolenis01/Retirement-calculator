/**
 * CopilotPanel — Full-featured AI copilot chat UI
 *
 * A sliding chat panel with message bubbles, quick actions, proactive
 * insight cards, typing animation, and suggested follow-ups.
 */

import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import { processMessage, getProactiveInsights, getQuickActions } from "./CopilotAgent.js";

// ─── Styles ──────────────────────────────────────────────────────────────────

const COLORS = {
  panelBg: "#0B1120",
  chatBg: "#111827",
  userBubble: "#1e40af",
  agentBubble: "#1f2937",
  accent: "#3b82f6",
  accentHover: "#2563eb",
  text: "#e5e7eb",
  textMuted: "#9ca3af",
  border: "#1f2937",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  insightBg: "#172135",
  inputBg: "#1f2937",
};

const styles = {
  overlay: {
    position: "fixed", top: 0, right: 0, bottom: 0,
    width: "440px", maxWidth: "100vw",
    zIndex: 10000,
    display: "flex", flexDirection: "column",
    background: COLORS.panelBg,
    borderLeft: `1px solid ${COLORS.border}`,
    boxShadow: "-8px 0 30px rgba(0,0,0,0.5)",
    fontFamily: "'DM Sans', sans-serif",
    color: COLORS.text,
    transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 20px",
    borderBottom: `1px solid ${COLORS.border}`,
    background: "linear-gradient(135deg, #1e3a5f, #0B1120)",
  },
  headerTitle: {
    display: "flex", alignItems: "center", gap: "10px",
    fontFamily: "'Playfair Display', serif",
    fontSize: "18px", fontWeight: 700, color: "#fff",
  },
  closeBtn: {
    background: "none", border: "none", color: COLORS.textMuted,
    fontSize: "22px", cursor: "pointer", padding: "4px 8px",
    borderRadius: "6px", transition: "all 0.2s",
  },
  chatArea: {
    flex: 1, overflowY: "auto", padding: "16px 16px 8px",
    display: "flex", flexDirection: "column", gap: "12px",
  },
  message: (isUser) => ({
    maxWidth: "88%",
    alignSelf: isUser ? "flex-end" : "flex-start",
    background: isUser ? COLORS.userBubble : COLORS.agentBubble,
    borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
    padding: "12px 16px",
    fontSize: "14px", lineHeight: "1.6",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
  }),
  suggestionsRow: {
    display: "flex", flexWrap: "wrap", gap: "6px",
    padding: "4px 0 8px",
  },
  suggestionBtn: {
    background: COLORS.insightBg,
    border: `1px solid ${COLORS.accent}44`,
    borderRadius: "20px",
    padding: "6px 14px",
    fontSize: "12px", color: COLORS.accent,
    cursor: "pointer", transition: "all 0.2s",
    whiteSpace: "nowrap",
  },
  quickActions: {
    display: "flex", flexWrap: "wrap", gap: "8px",
    padding: "12px 16px",
    borderBottom: `1px solid ${COLORS.border}`,
  },
  quickBtn: {
    background: COLORS.insightBg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: "10px",
    padding: "8px 14px",
    fontSize: "12px", color: COLORS.text,
    cursor: "pointer", transition: "all 0.2s",
  },
  inputArea: {
    display: "flex", gap: "8px",
    padding: "12px 16px 16px",
    borderTop: `1px solid ${COLORS.border}`,
    background: COLORS.panelBg,
  },
  input: {
    flex: 1, padding: "12px 16px",
    borderRadius: "12px",
    border: `1px solid ${COLORS.border}`,
    background: COLORS.inputBg,
    color: "#fff",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.2s",
  },
  sendBtn: {
    background: COLORS.accent,
    border: "none", borderRadius: "12px",
    padding: "12px 18px",
    color: "#fff", fontSize: "14px", fontWeight: 600,
    cursor: "pointer", transition: "all 0.2s",
    display: "flex", alignItems: "center", gap: "6px",
  },
  insightCard: (priority) => ({
    background: COLORS.insightBg,
    border: `1px solid ${
      priority === "high" ? COLORS.error + "55" :
      priority === "medium" ? COLORS.warning + "55" :
      COLORS.success + "55"
    }`,
    borderRadius: "12px",
    padding: "12px 14px",
    fontSize: "13px", lineHeight: "1.5",
    cursor: "pointer",
    transition: "all 0.2s",
  }),
  insightTitle: {
    fontWeight: 600, fontSize: "13px",
    display: "flex", alignItems: "center", gap: "6px",
    marginBottom: "4px",
  },
  insightMsg: {
    color: COLORS.textMuted, fontSize: "12px",
  },
  typingDots: {
    display: "flex", gap: "4px", padding: "12px 16px",
    alignSelf: "flex-start",
    background: COLORS.agentBubble,
    borderRadius: "16px 16px 16px 4px",
  },
  dot: (delay) => ({
    width: "8px", height: "8px",
    borderRadius: "50%",
    background: COLORS.accent,
    animation: `copilotBounce 1.2s infinite ${delay}ms`,
  }),
  badge: {
    position: "absolute", top: "-4px", right: "-4px",
    background: COLORS.error,
    borderRadius: "50%",
    width: "18px", height: "18px",
    fontSize: "11px", fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#fff",
  },
  fab: {
    position: "fixed", bottom: "24px", right: "24px",
    width: "60px", height: "60px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #3b82f6, #1e40af)",
    border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 4px 20px rgba(59,130,246,0.4)",
    transition: "all 0.3s",
    zIndex: 9999,
    fontSize: "28px",
    color: "#fff",
  },
};

// ─── CSS Keyframes (injected once) ───────────────────────────────────────────

const KEYFRAMES_ID = "__copilot_keyframes__";

function injectKeyframes() {
  if (document.getElementById(KEYFRAMES_ID)) return;
  const style = document.createElement("style");
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @keyframes copilotBounce {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-6px); opacity: 1; }
    }
    @keyframes copilotSlideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
    @keyframes copilotFadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .copilot-suggestion:hover {
      background: #1e3a5f !important;
      border-color: #3b82f6 !important;
    }
    .copilot-quick:hover {
      background: #1e3a5f !important;
      border-color: #3b82f6 !important;
      transform: translateY(-1px);
    }
    .copilot-close:hover { background: rgba(255,255,255,0.1); color: #fff; }
    .copilot-send:hover { background: #2563eb !important; }
    .copilot-fab:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 28px rgba(59,130,246,0.6);
    }
    .copilot-input:focus { border-color: #3b82f6 !important; }
    .copilot-insight:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .copilot-chat::-webkit-scrollbar { width: 6px; }
    .copilot-chat::-webkit-scrollbar-track { background: transparent; }
    .copilot-chat::-webkit-scrollbar-thumb { background: #374151; border-radius: 3px; }
  `;
  document.head.appendChild(style);
}

// ─── Simple Markdown Renderer ────────────────────────────────────────────────

function renderMarkdown(text) {
  if (!text) return "";

  let html = text
    // Headings
    .replace(/^### (.+)$/gm, '<h4 style="margin:8px 0 4px;font-size:14px;color:#93c5fd;">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 style="margin:10px 0 6px;font-size:16px;color:#93c5fd;">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 style="margin:10px 0 6px;font-size:20px;color:#60a5fa;">$1</h2>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em style="color:#9ca3af;">$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code style="background:#1e293b;padding:1px 5px;border-radius:4px;font-size:12px;color:#93c5fd;">$1</code>')
    // Tables
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match.split("|").filter(c => c.trim());
      const isHeader = cells.every(c => /^[-\s]+$/.test(c.trim()));
      if (isHeader) return "";
      const tag = "td";
      const row = cells.map(c =>
        `<${tag} style="padding:4px 10px;border-bottom:1px solid #1f2937;font-size:13px;">${c.trim()}</${tag}>`
      ).join("");
      return `<tr>${row}</tr>`;
    })
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote style="border-left:3px solid #3b82f6;padding:4px 12px;margin:4px 0;color:#93c5fd;font-style:italic;">$1</blockquote>')
    // Bullet list
    .replace(/^• (.+)$/gm, '<div style="padding:2px 0 2px 16px;">• $1</div>')
    // Code blocks
    .replace(/```\n?([\s\S]*?)```/g, '<pre style="background:#0f172a;padding:10px 14px;border-radius:8px;font-size:12px;overflow-x:auto;margin:6px 0;color:#93c5fd;line-height:1.4;">$1</pre>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #1f2937;margin:10px 0;"/>')
    // Line breaks
    .replace(/\n/g, "<br/>");

  // Wrap table rows
  html = html.replace(/(<tr>.*?<\/tr>(?:<br\/>)?)+/g, (match) => {
    const cleaned = match.replace(/<br\/>/g, "");
    return `<table style="width:100%;border-collapse:collapse;margin:6px 0;font-size:13px;">${cleaned}</table>`;
  });

  return html;
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

const TypingIndicator = memo(() => (
  <div style={styles.typingDots}>
    <div style={styles.dot(0)} />
    <div style={styles.dot(200)} />
    <div style={styles.dot(400)} />
  </div>
));
TypingIndicator.displayName = "TypingIndicator";

const MessageBubble = memo(({ message }) => (
  <div
    style={{
      ...styles.message(message.role === "user"),
      animation: "copilotFadeIn 0.3s ease-out",
    }}
  >
    {message.role === "user" ? (
      <span>{message.content}</span>
    ) : (
      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }} />
    )}
  </div>
));
MessageBubble.displayName = "MessageBubble";

const SuggestionChips = memo(({ suggestions, onSelect }) => {
  if (!suggestions || suggestions.length === 0) return null;
  return (
    <div style={styles.suggestionsRow}>
      {suggestions.map((s, i) => (
        <button
          key={i}
          className="copilot-suggestion"
          style={styles.suggestionBtn}
          onClick={() => onSelect(s)}
        >
          {s}
        </button>
      ))}
    </div>
  );
});
SuggestionChips.displayName = "SuggestionChips";

const InsightCard = memo(({ insight, onClick }) => (
  <div
    className="copilot-insight"
    style={styles.insightCard(insight.priority)}
    onClick={onClick}
  >
    <div style={styles.insightTitle}>
      {insight.icon} {insight.title}
    </div>
    <div style={styles.insightMsg}>{insight.message}</div>
  </div>
));
InsightCard.displayName = "InsightCard";

// ─── Main Panel ──────────────────────────────────────────────────────────────

function CopilotPanel({ calcState, isOpen, onToggle }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showInsights, setShowInsights] = useState(true);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const hasGreeted = useRef(false);

  // Inject keyframes on mount
  useEffect(() => { injectKeyframes(); }, []);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Auto-greet on first open
  useEffect(() => {
    if (isOpen && !hasGreeted.current && messages.length === 0) {
      hasGreeted.current = true;
      handleSend("hello", true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Proactive insights
  const insights = useMemo(() => {
    if (!calcState) return [];
    return getProactiveInsights(calcState);
  }, [calcState]);

  // Quick actions
  const quickActions = useMemo(() => {
    if (!calcState) return [];
    return getQuickActions(calcState);
  }, [calcState]);

  // Insight count for badge
  const highPriorityCount = useMemo(
    () => insights.filter(i => i.priority === "high").length,
    [insights],
  );

  const handleSend = useCallback((text, silent = false) => {
    const msg = (text || input).trim();
    if (!msg) return;

    // Add user message (unless silent greeting)
    if (!silent) {
      setMessages(prev => [...prev, { role: "user", content: msg }]);
    }
    setInput("");
    setIsTyping(true);
    setShowInsights(false);

    // Simulate a slight delay for natural feel
    setTimeout(() => {
      const response = processMessage(msg, calcState);
      setMessages(prev => [
        ...prev,
        {
          role: "agent",
          content: response.content,
          suggestions: response.suggestions,
          data: response.data,
          type: response.type,
        },
      ]);
      setIsTyping(false);
    }, 400 + Math.random() * 300);
  }, [input, calcState]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleSuggestion = useCallback((text) => {
    handleSend(text);
  }, [handleSend]);

  const handleInsightClick = useCallback((insight) => {
    handleSend(insight.action || `Tell me more about: ${insight.title}`);
  }, [handleSend]);

  // ── FAB Button (when panel is closed) ──────────────────────────────────
  if (!isOpen) {
    return (
      <button
        className="copilot-fab"
        style={styles.fab}
        onClick={onToggle}
        title="Open Retirement Copilot"
      >
        🧠
        {highPriorityCount > 0 && (
          <span style={styles.badge}>{highPriorityCount}</span>
        )}
      </button>
    );
  }

  // ── Panel ──────────────────────────────────────────────────────────────
  return (
    <div style={{ ...styles.overlay, animation: "copilotSlideIn 0.3s ease-out" }}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <span style={{ fontSize: "24px" }}>🧠</span>
          Retirement Copilot
        </div>
        <button
          className="copilot-close"
          style={styles.closeBtn}
          onClick={onToggle}
          title="Close"
        >
          ✕
        </button>
      </div>

      {/* Quick Actions */}
      <div style={styles.quickActions}>
        {quickActions.map((a, i) => (
          <button
            key={i}
            className="copilot-quick"
            style={styles.quickBtn}
            onClick={() => handleSend(a.message)}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* Chat Area */}
      <div className="copilot-chat" style={styles.chatArea}>
        {/* Proactive Insights (shown initially) */}
        {showInsights && insights.length > 0 && messages.length <= 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "8px" }}>
            <div style={{ fontSize: "12px", color: COLORS.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              💡 Proactive Insights
            </div>
            {insights.slice(0, 3).map((ins, i) => (
              <InsightCard key={i} insight={ins} onClick={() => handleInsightClick(ins)} />
            ))}
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <React.Fragment key={i}>
            <MessageBubble message={msg} />
            {msg.role === "agent" && msg.suggestions && (
              <SuggestionChips suggestions={msg.suggestions} onSelect={handleSuggestion} />
            )}
          </React.Fragment>
        ))}

        {/* Typing indicator */}
        {isTyping && <TypingIndicator />}

        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div style={styles.inputArea}>
        <input
          ref={inputRef}
          className="copilot-input"
          style={styles.input}
          type="text"
          placeholder="Ask anything... try: What's my score?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className="copilot-send"
          style={{
            ...styles.sendBtn,
            opacity: input.trim() ? 1 : 0.5,
          }}
          onClick={() => handleSend()}
          disabled={!input.trim()}
        >
          Send ↑
        </button>
      </div>
    </div>
  );
}

export default memo(CopilotPanel);
