"use client";

import React from "react";

function parseInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];

    if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(<strong key={`${match.index}-strong`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`") && token.endsWith("`")) {
      nodes.push(
        <code
          key={`${match.index}-code`}
          className="rounded-md bg-slate-950/70 px-1.5 py-0.5 font-mono text-[0.92em] text-cyan-300"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("[") && token.includes("](") && token.endsWith(")")) {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (linkMatch) {
        nodes.push(
          <a
            key={`${match.index}-link`}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer"
            className="text-[var(--cyan)] underline decoration-[rgba(6,182,212,0.35)] underline-offset-4 hover:text-cyan-300"
          >
            {linkMatch[1]}
          </a>,
        );
      } else {
        nodes.push(token);
      }
    } else if (token.startsWith("*") && token.endsWith("*")) {
      nodes.push(<em key={`${match.index}-em`}>{token.slice(1, -1)}</em>);
    } else {
      nodes.push(token);
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export default function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length && lines[i].trim().startsWith("```")) {
        i += 1;
      }

      blocks.push(
        <pre
          key={`code-${i}`}
          className="overflow-x-auto rounded-xl border border-[var(--card-border)] bg-slate-950/85 p-3 text-[12px] leading-6 text-cyan-200"
        >
          <code>{codeLines.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    if (/^#{1,3}\s/.test(trimmed)) {
      const level = trimmed.match(/^#+/)?.[0].length ?? 1;
      const text = trimmed.replace(/^#{1,3}\s+/, "");
      const classes =
        level === 1
          ? "text-[15px] font-semibold text-[var(--text-primary)]"
          : level === 2
            ? "text-[14px] font-semibold text-[var(--text-primary)]"
            : "text-[13px] font-semibold text-[var(--text-primary)]";

      blocks.push(
        <div key={`heading-${i}`} className={classes}>
          {parseInline(text)}
        </div>,
      );
      i += 1;
      continue;
    }

    if (/^>\s/.test(trimmed)) {
      blocks.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-2 border-[var(--cyan)]/45 pl-3 text-[12px] italic text-[var(--text-secondary)]"
        >
          {parseInline(trimmed.replace(/^>\s+/, ""))}
        </blockquote>,
      );
      i += 1;
      continue;
    }

    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const tableRows: string[][] = [];
      while (i < lines.length) {
        const current = lines[i].trim();
        if (!(current.startsWith("|") && current.endsWith("|"))) break;
        if (/^\|(?:\s*-+\s*\|)+$/.test(current)) {
          i += 1;
          continue;
        }
        tableRows.push(current.split("|").slice(1, -1).map((cell) => cell.trim()));
        i += 1;
      }

      if (tableRows.length > 0) {
        const [header, ...body] = tableRows;
        blocks.push(
          <div key={`table-${i}`} className="overflow-x-auto rounded-xl border border-[var(--card-border)]">
            <table className="min-w-full text-left text-[12px]">
              <thead className="bg-[var(--surface-hover)]">
                <tr>
                  {header.map((cell, index) => (
                    <th key={`${cell}-${index}`} className="px-3 py-2 font-semibold text-[var(--text-secondary)]">
                      {parseInline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, rowIndex) => (
                  <tr key={`row-${rowIndex}`} className="border-t border-[var(--line)]">
                    {row.map((cell, cellIndex) => (
                      <td key={`cell-${rowIndex}-${cellIndex}`} className="px-3 py-2 text-[var(--text-primary)]">
                        {parseInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
      }
      continue;
    }

    if (/^[-*]\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i += 1;
      }

      blocks.push(
        <ul key={`ul-${i}`} className="space-y-1.5 pl-4 text-[13px] text-[var(--text-primary)]">
          {items.map((item, index) => (
            <li key={`li-${index}`} className="list-disc marker:text-[var(--cyan)]">
              {parseInline(item)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i += 1;
      }

      blocks.push(
        <ol key={`ol-${i}`} className="space-y-1.5 pl-4 text-[13px] text-[var(--text-primary)]">
          {items.map((item, index) => (
            <li key={`oli-${index}`} className="list-decimal marker:text-[var(--cyan)]">
              {parseInline(item)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    const paragraphLines = [trimmed];
    i += 1;
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|>\s|[-*]\s|\d+\.\s|\|.*\||```)/.test(lines[i].trim())) {
      paragraphLines.push(lines[i].trim());
      i += 1;
    }

    blocks.push(
      <p key={`p-${i}`} className="text-[13px] leading-6 text-[var(--text-primary)]">
        {parseInline(paragraphLines.join(" "))}
      </p>,
    );
  }

  return <div className="space-y-3">{blocks}</div>;
}
