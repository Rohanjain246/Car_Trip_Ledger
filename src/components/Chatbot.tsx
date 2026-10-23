import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import { request } from "../utils/api";
import "./Chatbot.css";

type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

type ChatMessage = {
  id: number;
  role: "assistant" | "user";
  text: string;
  usage?: TokenUsage;
};

type ChatResponse = {
  answer: string;
  usage: TokenUsage;
};

function RobotCarMark() {
  return (
    <svg viewBox="0 0 96 82" aria-hidden="true">
      <path className="robot-antenna" d="M48 12V6" />
      <circle className="robot-signal" cx="48" cy="5" r="3" />
      <rect className="robot-head" x="29" y="10" width="38" height="28" rx="10" />
      <rect className="robot-face" x="35" y="16" width="26" height="16" rx="6" />
      <circle className="robot-eye" cx="42" cy="24" r="2.2" />
      <circle className="robot-eye" cx="54" cy="24" r="2.2" />
      <path className="robot-smile" d="M43 29h10" />
      <path className="robot-ear" d="M26 20v8M70 20v8" />
      <path className="car-body" d="M17 48h8l7-12h32l8 12h7a5 5 0 0 1 5 5v13H14V53a5 5 0 0 1 3-5Z" />
      <path className="car-window" d="m36 40-5 8h31l-5-8H36Z" />
      <path className="car-grille" d="M39 57h18" />
      <circle className="car-light" cx="22" cy="55" r="3" />
      <circle className="car-light" cx="74" cy="55" r="3" />
      <circle className="car-wheel" cx="29" cy="66" r="7" />
      <circle className="car-wheel" cx="67" cy="66" r="7" />
      <circle className="car-hub" cx="29" cy="66" r="2.5" />
      <circle className="car-hub" cx="67" cy="66" r="2.5" />
    </svg>
  );
}

function formatTokens(value: number) {
  return value.toLocaleString();
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(/(\*\*.+?\*\*|`[^`]+`|\*.+?\*)/g).map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={key}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function splitTableRow(line: string) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function isTableSeparator(line: string) {
  return splitTableRow(line).every((cell) => /^:?-{3,}:?$/.test(cell));
}

function isBlockStart(lines: string[], index: number) {
  const line = lines[index].trim();
  return !line
    || /^#{1,3}\s/.test(line)
    || /^\s*[-*]\s+/.test(line)
    || /^\s*\d+[.)]\s+/.test(line)
    || (line.includes("|") && index + 1 < lines.length && isTableSeparator(lines[index + 1]));
}

function renderMarkdown(text: string): ReactNode[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }

    const tableSeparatorIndex = index + 1;
    if (line.includes("|")
      && tableSeparatorIndex < lines.length
      && isTableSeparator(lines[tableSeparatorIndex])) {
      const headers = splitTableRow(line);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && lines[index].trim().includes("|")) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      blocks.push(
        <div className="chatbot-table-wrap" key={`table-${blocks.length}`}>
          <table>
            <thead><tr>{headers.map((header, cellIndex) => (
              <th key={`head-${cellIndex}`}>{renderInline(header, `table-head-${cellIndex}`)}</th>
            ))}</tr></thead>
            <tbody>{rows.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                {headers.map((_, cellIndex) => (
                  <td key={`cell-${cellIndex}`}>
                    {renderInline(row[cellIndex] || "", `table-${rowIndex}-${cellIndex}`)}
                  </td>
                ))}
              </tr>
            ))}</tbody>
          </table>
        </div>,
      );
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      blocks.push(
        <h3 key={`heading-${blocks.length}`}>
          {renderInline(heading[2], `heading-${blocks.length}`)}
        </h3>,
      );
      index += 1;
      continue;
    }

    const unorderedItem = line.match(/^[-*]\s+(.+)$/);
    const orderedItem = line.match(/^\d+[.)]\s+(.+)$/);
    if (unorderedItem || orderedItem) {
      const ordered = Boolean(orderedItem);
      const items: string[] = [];
      while (index < lines.length) {
        const item = lines[index].trim().match(ordered ? /^\d+[.)]\s+(.+)$/ : /^[-*]\s+(.+)$/);
        if (!item) break;
        items.push(item[1]);
        index += 1;
      }
      const List = ordered ? "ol" : "ul";
      blocks.push(
        <List key={`list-${blocks.length}`}>
          {items.map((item, itemIndex) => (
            <li key={`item-${itemIndex}`}>{renderInline(item, `list-${blocks.length}-${itemIndex}`)}</li>
          ))}
        </List>,
      );
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (index < lines.length && !isBlockStart(lines, index)) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push(
      <p key={`paragraph-${blocks.length}`}>
        {renderInline(paragraph.join(" "), `paragraph-${blocks.length}`)}
      </p>,
    );
  }
  return blocks;
}

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [totalTokens, setTotalTokens] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: 0,
    role: "assistant",
    text: "Hi! I can help find trip and CNG details from your tracker. Ask about a date, month, or total.",
  }]);
  const [nextId, setNextId] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else launcherRef.current?.focus();
  }, [open]);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const question = input.trim();
    if (!question || sending) return;

    const questionId = nextId;
    setNextId((id) => id + 1);
    setMessages((current) => [...current, { id: questionId, role: "user", text: question }]);
    setInput("");
    setSending(true);
    try {
      const response = await request<ChatResponse>("/api/chat", {
        method: "POST",
        body: JSON.stringify({ question }),
      });
      const responseId = questionId + 1;
      setNextId((id) => Math.max(id, responseId + 1));
      setMessages((current) => [...current, {
        id: responseId,
        role: "assistant",
        text: response.answer,
        usage: response.usage,
      }]);
      setTotalTokens((total) => total + response.usage.totalTokens);
    } catch (error) {
      const responseId = questionId + 1;
      setNextId((id) => Math.max(id, responseId + 1));
      setMessages((current) => [...current, {
        id: responseId,
        role: "assistant",
        text: error instanceof Error ? error.message : "Could not get an answer. Please try again.",
      }]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const closeOnEscape = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") setOpen(false);
  };

  return (
    <div className="chatbot" onKeyDown={closeOnEscape}>
      {open && (
        <section className="chatbot-panel" role="dialog" aria-modal="true" aria-labelledby="chatbot-title">
          <header className="chatbot-header">
            <span className="chatbot-avatar"><RobotCarMark /></span>
            <div className="chatbot-heading">
              <h2 id="chatbot-title">DriveLog assistant</h2>
              <span><i /> Trip data helper</span>
            </div>
            <button className="chatbot-close" type="button" onClick={() => setOpen(false)} aria-label="Close chat">
              ×
            </button>
          </header>
          <div className="chatbot-messages" ref={messagesRef} aria-live="polite">
            {messages.map((message) => (
              <article className={`chatbot-message ${message.role}`} key={message.id}>
                {message.role === "assistant"
                  ? <div className="chatbot-answer">{renderMarkdown(message.text)}</div>
                  : <p>{message.text}</p>}
                {message.usage && (
                  <small>
                    Tokens: {formatTokens(message.usage.totalTokens)}
                    {" "}({formatTokens(message.usage.promptTokens)} prompt · {formatTokens(message.usage.completionTokens)} response)
                  </small>
                )}
              </article>
            ))}
            {sending && (
              <div className="chatbot-loading" role="status" aria-label="Getting your answer">
                <span className="chatbot-loading-car"><i /><b /><em /></span>
                <span>Checking your trips…</span>
              </div>
            )}
          </div>
          <div className="chatbot-footer">
            <span className="chatbot-token-total">Conversation tokens: {formatTokens(totalTokens)}</span>
            <form onSubmit={sendMessage} className="chatbot-composer">
              <input
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about your trips…"
                maxLength={1000}
                aria-label="Your question"
                disabled={sending}
              />
              <button type="submit" disabled={sending || !input.trim()} aria-label="Send question">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 12 16-8-5 16-3-6-8-2Zm8 2 8-10" /></svg>
              </button>
            </form>
          </div>
        </section>
      )}
      <button
        ref={launcherRef}
        className={`chatbot-launcher ${open ? "active" : ""}`}
        type="button"
        aria-label={open ? "Close trip assistant" : "Open trip assistant"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <RobotCarMark />
      </button>
    </div>
  );
}
