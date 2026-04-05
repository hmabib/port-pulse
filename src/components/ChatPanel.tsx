"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code2,
  Copy,
  Check,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  Table2,
  Download,
  Trash2,
  Workflow,
} from "lucide-react";
import MarkdownRenderer from "@/components/chat/MarkdownRenderer";
import QueryInsights from "@/components/chat/QueryInsights";
import { downloadExcel } from "@/lib/exports";

/* ────────── Types ────────── */

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sql?: string | null;
  rows?: Record<string, unknown>[];
  rowCount?: number;
  timestamp: Date;
  topic?: string;
}

type ParsedAssistantContent = {
  natural: string;
  detailed: string | null;
};

type ProgressStep = {
  key: string;
  label: string;
};

const STORAGE_KEY = "port-pulse-chat-session-v2";

const PROGRESS_STEPS: ProgressStep[] = [
  { key: "analyse", label: "Analyse en cours" },
  { key: "intent", label: "Interpretation de la question" },
  { key: "domain", label: "Qualification du domaine metier" },
  { key: "sql", label: "Generation de la requete" },
  { key: "query", label: "Interrogation des donnees" },
  { key: "synthesis", label: "Synthese et mise en forme" },
];

const TOPIC_RULES: Array<{ label: string; patterns: RegExp[] }> = [
  { label: "Pilotage du jour", patterns: [/pilotage/i, /\bjour\b/i, /\baujourd/i, /\bquotid/i] },
  { label: "Cumul annuel", patterns: [/cumul/i, /\bannuel/i, /\bannee\b/i] },
  { label: "Operations navires", patterns: [/operation/i, /navire/i] },
  { label: "Bulletins mensuels", patterns: [/bulletin/i, /mensuel/i] },
  { label: "Flotte & parc", patterns: [/flotte/i, /\bparc\b/i, /conteneur/i] },
  { label: "Analyses KPIs", patterns: [/\bkpi\b/i, /performance/i] },
  { label: "Correlations", patterns: [/correlation/i, /relation/i] },
  { label: "Aide a la decision", patterns: [/decision/i, /recommande/i, /alerte/i] },
  { label: "Vue source globale", patterns: [/vue source/i, /globale/i, /synthese/i] },
  { label: "Trafic & EVP", patterns: [/trafic/i, /\bevp\b/i, /\bteu\b/i] },
  { label: "Gate & camions", patterns: [/gate/i, /camion/i, /\bttt\b/i] },
  { label: "Escales lignes", patterns: [/escale/i, /ligne/i, /armateur/i] },
  { label: "Stock par ligne", patterns: [/stock/i, /ligne/i] },
  { label: "KPIs terminal", patterns: [/terminal/i, /\bkpi\b/i] },
  { label: "Navires attendus", patterns: [/attendu/i] },
  { label: "Navires appareilles", patterns: [/appareill/i] },
  { label: "Navires en operation", patterns: [/en operation/i, /operation/i] },
  { label: "Flux par escale", patterns: [/flux/i, /escale/i] },
  { label: "Capacite parc", patterns: [/capacite/i, /\bparc\b/i, /occupation/i] },
  { label: "Rapports source", patterns: [/rapport/i, /source/i] },
];

/* ────────── Suggestion chips ────────── */

const SUGGESTIONS = [
  "Combien de navires sont en operation aujourd'hui ?",
  "Quels sont les 5 derniers navires arrives ?",
  "Donne-moi les KPIs de la derniere semaine",
  "Quel est l'etat du parc conteneurs ?",
  "Combien de camions sont passes au gate aujourd'hui ?",
  "Quels sont les escales du mois en cours ?",
  "Montre-moi le rapport quotidien le plus recent",
  "Quel est le volume TEU de ce mois ?",
];

function buildSessionSummary(messages: ChatMessage[]): string {
  if (messages.length === 0) return "";

  return messages
    .slice(-10)
    .map((message) => {
      const compact = message.content.replace(/\s+/g, " ").trim();
      const shortened = compact.length > 220 ? `${compact.slice(0, 217)}...` : compact;
      if (message.role === "user") {
        return `Question: ${shortened}`;
      }

      const topic = message.topic ? ` | Theme: ${message.topic}` : "";
      return `Reponse${topic}: ${shortened}`;
    })
    .join("\n");
}

function inferTopic(question: string, rows?: Record<string, unknown>[]): string {
  for (const rule of TOPIC_RULES) {
    if (rule.patterns.every((pattern) => pattern.test(question))) {
      return rule.label;
    }
  }

  for (const rule of TOPIC_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(question))) {
      return rule.label;
    }
  }

  const keys = Object.keys(rows?.[0] ?? {}).join(" ");
  if (/gate|camion|ttt/i.test(keys)) return "Gate & camions";
  if (/navire|voyage|eta|etb|atb|atd/i.test(keys)) return "Operations navires";
  if (/teu|forecast|realisation/i.test(keys)) return "Trafic & EVP";
  if (/parc|reefer|occupation/i.test(keys)) return "Flotte & parc";
  return "Vue source globale";
}

function parseAssistantContent(content: string): ParsedAssistantContent {
  const marker = "## Detail structure";
  const normalized = content.replace("## Détail structuré", marker);
  const index = normalized.indexOf(marker);

  if (index === -1) {
    return { natural: content.trim(), detailed: null };
  }

  const natural = normalized.slice(0, index).trim();
  const detailed = normalized.slice(index + marker.length).trim();

  return {
    natural,
    detailed: detailed || null,
  };
}

function shouldHideColumn(key: string): boolean {
  const normalized = key.toLowerCase();
  return normalized === "id" || normalized === "rapport_id" || normalized === "date_id" || normalized.endsWith("_id");
}

function formatDisplayValue(key: string, value: unknown): string {
  if (value == null) return "—";

  const normalizedKey = key.toLowerCase();
  if (normalizedKey === "date_rapport" || normalizedKey.endsWith("_date")) {
    const text = String(value);
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
  }

  if (normalizedKey.includes("date") && typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
  }

  if (typeof value === "number") {
    return value.toLocaleString("fr-FR");
  }

  if (value instanceof Date) {
    return value.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return String(value);
}

/* ────────── Component ────────── */

export default function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
  const [expandedSql, setExpandedSql] = useState<Set<string>>(new Set());
  const [expandedTable, setExpandedTable] = useState<Set<string>>(new Set());
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Array<Omit<ChatMessage, "timestamp"> & { timestamp: string }>;
      setMessages(
        parsed.map((message) => ({
          ...message,
          timestamp: new Date(message.timestamp),
        })),
      );
    } catch (error) {
      console.error("Failed to restore chat session:", error);
    }
  }, []);

  useEffect(() => {
    if (!messages.length) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return;
    }

    const serialized = messages.map((message) => ({
      ...message,
      timestamp: message.timestamp.toISOString(),
    }));
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  }, [messages]);

  useEffect(() => {
    if (!isLoading) {
      setProgressIndex(0);
      return;
    }

    setProgressIndex(0);
    const interval = window.setInterval(() => {
      setProgressIndex((current) => Math.min(current + 1, PROGRESS_STEPS.length - 1));
    }, 850);

    return () => window.clearInterval(interval);
  }, [isLoading]);

  const toggleSql = (id: string) => {
    setExpandedSql((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTable = (id: string) => {
    setExpandedTable((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleDetails = (id: string) => {
    setExpandedDetails((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copySql = async (id: string, sql: string) => {
    await navigator.clipboard.writeText(sql);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const startNewSession = () => {
    setMessages([]);
    setExpandedSql(new Set());
    setExpandedTable(new Set());
    setExpandedDetails(new Set());
    setInput("");
    window.sessionStorage.removeItem(STORAGE_KEY);
    inputRef.current?.focus();
  };

  const exportChat = () => {
    if (messages.length === 0) return;

    const content = messages
      .map((message) => {
        const header = `[${message.timestamp.toLocaleString("fr-FR")}] ${message.role === "user" ? "Utilisateur" : "Port Pulse IA"}`;
        return `${header}\n${message.content}\n`;
      })
      .join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const dateLabel = new Date().toISOString().slice(0, 10);
    anchor.href = url;
    anchor.download = `port-pulse-chat-${dateLabel}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportRowsToExcel = (message: ChatMessage) => {
    if (!message.rows || message.rows.length === 0) return;
    const dateLabel = new Date().toISOString().slice(0, 10);
    downloadExcel(`port-pulse-chat-resultats-${dateLabel}.xlsx`, [
      {
        name: "Resultats",
        rows: message.rows,
        columns: Object.keys(message.rows[0] ?? {}).filter((key) => !shouldHideColumn(key)),
      },
    ]);
  };

  const sendMessage = useCallback(
    async (text?: string) => {
      const question = (text ?? input).trim();
      if (!question || isLoading) return;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: question,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsLoading(true);

      try {
        const conversation = messages.slice(-8).map((message) => ({
          role: message.role,
          content: message.content,
        }));
        const sessionSummary = buildSessionSummary(messages);

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, conversation, sessionSummary }),
        });

        const data = await res.json();

        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.answer ?? data.error ?? "Erreur inconnue.",
          sql: data.sql ?? null,
          rows: data.rows ?? [],
          rowCount: data.rowCount ?? 0,
          timestamp: new Date(),
          topic: inferTopic(question, data.rows),
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: "Erreur de connexion au serveur. Verifiez que le service est demarre.",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [input, isLoading, messages],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  /* ────────── Render helpers ────────── */

  function renderDataPreview(msg: ChatMessage) {
    if (!msg.rows || msg.rows.length === 0) return null;
    const isExpanded = expandedTable.has(msg.id);
    const preview = isExpanded ? msg.rows : msg.rows.slice(0, 5);
    const keys = Object.keys(preview[0] ?? {}).filter((key) => !shouldHideColumn(key));

    if (keys.length === 0) return null;

    return (
      <div className="mt-3">
        <button
          type="button"
          onClick={() => toggleTable(msg.id)}
          className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--cyan)] hover:underline"
        >
          <Table2 className="h-3 w-3" />
          {isExpanded ? "Masquer" : "Voir"} les donnees ({msg.rowCount} ligne{(msg.rowCount ?? 0) > 1 ? "s" : ""})
          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        <button
          type="button"
          onClick={() => exportRowsToExcel(msg)}
          className="mb-2 ml-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <Download className="h-3 w-3" />
          Exporter Excel
        </button>

        {(isExpanded || preview.length <= 5) && preview.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-[var(--card-border)]">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-[var(--line)] bg-[var(--surface-hover)]">
                  {keys.map((key) => (
                    <th key={key} className="px-2 py-1.5 text-left font-medium text-[var(--text-muted)] whitespace-nowrap">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-b border-[var(--line)] last:border-0">
                    {keys.map((key) => (
                      <td key={key} className="px-2 py-1 text-[var(--text-secondary)] whitespace-nowrap max-w-[200px] truncate">
                        {formatDisplayValue(key, row[key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {!isExpanded && (msg.rowCount ?? 0) > preview.length && (
              <div className="border-t border-[var(--line)] bg-[var(--surface-hover)] px-2 py-1 text-center text-[10px] text-[var(--text-muted)]">
                {(msg.rowCount ?? 0) - preview.length} ligne(s) supplementaire(s) non affichee(s)
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  /* ────────── Main render ────────── */

  return (
    <div className="flex h-full flex-col rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-[var(--cyan)]">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">Chat Intelligence</h3>
            <p className="text-[11px] text-[var(--text-muted)]">Interrogez vos donnees en langage naturel</p>
          </div>
        </div>
        {messages.length > 0 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={exportChat}
              className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--cyan)]"
              title="Exporter le chat en TXT"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={startNewSession}
              className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[#f43f5e]"
              title="Nouvelle session"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 sm:px-5" style={{ minHeight: "46vh", maxHeight: "min(72vh, 860px)" }}>
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10">
              <Sparkles className="h-8 w-8 text-[var(--cyan)]" />
            </div>
            <h4 className="text-[15px] font-semibold text-[var(--text-primary)]">
              Posez une question sur vos donnees
            </h4>
            <p className="mt-1 max-w-md text-[12px] text-[var(--text-secondary)]">
              L&apos;IA interprete votre question, relance le calcul a partir des donnees utiles,
              puis vous presente une lecture claire et exploitable.
            </p>

            {/* Suggestions */}
            <div className="mt-6 flex max-w-lg flex-wrap justify-center gap-2">
              {SUGGESTIONS.slice(0, 6).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => sendMessage(s)}
                  className="rounded-full border border-[var(--card-border)] bg-[var(--surface-hover)] px-3 py-1.5 text-[11px] text-[var(--text-secondary)] transition hover:border-[var(--cyan)] hover:text-[var(--cyan)]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-[var(--cyan)] text-slate-950"
                  : "border border-[var(--card-border)] bg-[var(--surface-hover)]"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <MessageSquare className="h-3 w-3 text-[var(--cyan)]" />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--cyan)]">
                    Port Pulse IA
                  </span>
                  {msg.topic ? (
                    <span className="rounded-full border border-[var(--cyan)]/20 bg-[var(--badge-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--badge-text)]">
                      {msg.topic}
                    </span>
                  ) : null}
                </div>
              )}

              <div
                className={`text-[13px] leading-relaxed ${
                  msg.role === "user" ? "font-medium" : "text-[var(--text-primary)]"
                }`}
              >
                {msg.role === "assistant" ? (
                  (() => {
                    const parsed = parseAssistantContent(msg.content);
                    const hasDetails = Boolean(parsed.detailed || (msg.rows && msg.rows.length > 0) || msg.sql);
                    return (
                      <div className="space-y-3">
                        <MarkdownRenderer content={parsed.natural} />
                        {hasDetails ? (
                          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-hover)]/60">
                            <button
                              type="button"
                              onClick={() => toggleDetails(msg.id)}
                              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[12px] font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                            >
                              <span>Reponse structuree et detaillee</span>
                              {expandedDetails.has(msg.id) ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </button>
                            {expandedDetails.has(msg.id) ? (
                              <div className="border-t border-[var(--line)] px-3 py-3 space-y-3">
                                {parsed.detailed ? <MarkdownRenderer content={parsed.detailed} /> : null}
                                <QueryInsights rows={msg.rows ?? []} rowCount={msg.rowCount ?? 0} />

                                {msg.sql ? (
                                  <div className="mt-2">
                                    <button
                                      type="button"
                                      onClick={() => toggleSql(msg.id)}
                                      className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                                    >
                                      <Code2 className="h-3 w-3" />
                                      {expandedSql.has(msg.id) ? "Masquer SQL" : "Voir SQL"}
                                    </button>

                                    {expandedSql.has(msg.id) && (
                                      <div className="mt-1.5 relative rounded-lg bg-slate-900 p-3">
                                        <button
                                          type="button"
                                          onClick={() => copySql(msg.id, msg.sql!)}
                                          className="absolute right-2 top-2 rounded p-1 text-slate-500 transition hover:text-slate-300"
                                          title="Copier"
                                        >
                                          {copiedId === msg.id ? (
                                            <Check className="h-3 w-3 text-emerald-400" />
                                          ) : (
                                            <Copy className="h-3 w-3" />
                                          )}
                                        </button>
                                        <code className="block whitespace-pre-wrap text-[11px] leading-5 text-cyan-300 font-mono">
                                          {msg.sql}
                                        </code>
                                      </div>
                                    )}
                                  </div>
                                ) : null}

                                {renderDataPreview(msg)}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })()
                ) : msg.content}
              </div>

              <div
                className={`mt-2 text-[10px] ${
                  msg.role === "user" ? "text-slate-700" : "text-[var(--text-muted)]"
                }`}
              >
                {msg.timestamp.toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface-hover)] px-4 py-3">
              <div className="flex items-center gap-2">
                <Workflow className="h-4 w-4 text-[var(--cyan)]" />
                <span className="text-[12px] font-medium text-[var(--text-secondary)]">
                  Progression analytique de la session
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {PROGRESS_STEPS.map((step, index) => {
                  const isDone = index < progressIndex;
                  const isActive = index === progressIndex;
                  return (
                    <div
                      key={step.key}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1 text-[10px] ${
                        isActive
                          ? "bg-[var(--badge-bg)] text-[var(--badge-text)]"
                          : isDone
                            ? "text-emerald-400"
                            : "text-[var(--text-muted)]"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : isActive ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-current opacity-60" />
                      )}
                      <span>{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[var(--line)] px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Posez votre question sur les donnees du terminal..."
              disabled={isLoading}
              rows={1}
              className="w-full resize-none rounded-xl border border-[var(--card-border)] bg-[var(--input-bg,var(--surface-hover))] px-4 py-3 pr-12 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--cyan)] focus:outline-none focus:ring-1 focus:ring-[var(--cyan)] disabled:opacity-50"
              style={{ minHeight: "44px", maxHeight: "120px" }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "44px";
                target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
              }}
            />
          </div>
          <div className="flex items-center gap-2 sm:flex-shrink-0">
            {messages.length > 0 ? (
              <button
                type="button"
                onClick={startNewSession}
                className="inline-flex h-[44px] items-center justify-center rounded-xl border border-[var(--card-border)] bg-[var(--surface-hover)] px-3 text-[12px] font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
              >
                Nouvelle session
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
              className="flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-xl bg-[var(--cyan)] text-slate-950 transition hover:bg-cyan-400 disabled:opacity-30 disabled:hover:bg-[var(--cyan)]"
              title="Envoyer"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
        <p className="mt-2 text-center text-[10px] text-[var(--text-muted)]">
          Session continue • Reponses structurees • Export TXT
        </p>
      </div>
    </div>
  );
}
