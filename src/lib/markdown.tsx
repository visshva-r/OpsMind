import { Fragment } from "react";

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

export function MarkdownMessage({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-2 text-sm leading-7 text-slate-200">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={index} className="h-1" />;

        if (trimmed.startsWith("**") && trimmed.endsWith("**") && !trimmed.slice(2, -2).includes("**")) {
          return (
            <p key={index} className="font-medium text-white">
              {renderInline(trimmed)}
            </p>
          );
        }

        const numbered = trimmed.match(/^(\d+)\.\s+([\s\S]*)$/);
        if (numbered) {
          return (
            <p key={index} className="pl-1">
              <span className="mr-2 font-medium text-cyan-400">
                {numbered[1]}.
              </span>
              {renderInline(numbered[2])}
            </p>
          );
        }

        if (trimmed.startsWith("- ")) {
          return (
            <p key={index} className="pl-3">
              <span className="mr-2 text-cyan-400">•</span>
              {renderInline(trimmed.slice(2))}
            </p>
          );
        }

        return <p key={index}>{renderInline(trimmed)}</p>;
      })}
    </div>
  );
}
