"use client";

import clsx from "clsx";
import { useState, type FormEvent } from "react";
import type { ChallengeQuestion } from "@/types";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { DemoContentLabel } from "@/components/ui/SourceLabels";

export interface ResolvedReference {
  id: string;
  title: string;
  sourceShortName: string;
  url: string;
}

interface QuestionCardProps {
  question: ChallengeQuestion;
  references: ResolvedReference[];
  onAnswered: (selectedOptionId: string, correct: boolean) => void;
  /** Show a previously recorded answer instead of an interactive question. */
  previousSelection?: string | null;
  footer?: React.ReactNode;
}

export function QuestionCard({ question, references, onAnswered, previousSelection = null, footer }: QuestionCardProps) {
  const [selected, setSelected] = useState<string | null>(previousSelection);
  const [submitted, setSubmitted] = useState(previousSelection !== null);
  const correct = selected === question.correctOptionId;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!selected || submitted) return;
    setSubmitted(true);
    onAnswered(selected, selected === question.correctOptionId);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {question.scenario && (
        <div className="overflow-hidden rounded-md border border-line">
          <div className="border-b border-line bg-navy px-3 py-2 text-white">
            <p className="font-mono text-2xs uppercase tracking-widest text-slate-400">Scenario</p>
            <p className="text-sm font-semibold">{question.scenario.title}</p>
          </div>
          <p className="border-b border-line bg-canvas/60 px-3 py-2 text-xs text-body">{question.scenario.context}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-canvas/40 text-2xs uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-3 py-1.5 font-semibold">Field</th>
                  <th scope="col" className="px-3 py-1.5 font-semibold">Reported value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line font-mono">
                {question.scenario.fields.map((f) => {
                  const reveal = submitted && f.issue;
                  return (
                    <tr key={f.name} className={clsx(reveal && "bg-bad-soft/60")}>
                      <th scope="row" className="whitespace-nowrap px-3 py-2 font-sans font-medium text-ink">{f.name}</th>
                      <td className="px-3 py-2 text-body">
                        <span className="break-all">{f.value}</span>
                        {reveal && <span className="mt-1 block font-sans text-2xs text-bad">{f.issue}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <fieldset>
        <legend className="text-sm font-semibold text-ink">{question.prompt}</legend>
        <div className="mt-3 grid gap-2">
          {question.options.map((opt) => {
            const isSelected = selected === opt.id;
            const isAnswer = opt.id === question.correctOptionId;
            return (
              <label
                key={opt.id}
                className={clsx(
                  "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors",
                  !submitted && (isSelected ? "border-accent bg-accent-soft/60" : "border-line hover:border-muted/40"),
                  submitted && isAnswer && "border-good/50 bg-good-soft",
                  submitted && isSelected && !isAnswer && "border-bad/40 bg-bad-soft",
                  submitted && !isSelected && !isAnswer && "border-line opacity-60",
                  submitted && "cursor-default",
                )}
              >
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  value={opt.id}
                  checked={isSelected}
                  disabled={submitted}
                  onChange={() => setSelected(opt.id)}
                  className="h-3.5 w-3.5 accent-accent"
                />
                <span className="font-mono text-2xs uppercase text-muted">{opt.id}</span>
                <span className="flex-1 text-ink">{opt.label}</span>
                {submitted && isAnswer && <Icon name="check" className="text-good" title="Correct answer" />}
                {submitted && isSelected && !isAnswer && <Icon name="x" className="text-bad" title="Your answer" />}
              </label>
            );
          })}
        </div>
      </fieldset>

      {!submitted ? (
        <div className="flex items-center justify-between gap-3">
          {question.isDemo ? <DemoContentLabel /> : <span />}
          <Button type="submit" variant="primary" disabled={!selected}>
            Submit answer
          </Button>
        </div>
      ) : (
        <div role="status" className={clsx("rounded-md border px-4 py-3", correct ? "border-good/30 bg-good-soft/60" : "border-bad/25 bg-bad-soft/60")}>
          <p className={clsx("text-sm font-semibold", correct ? "text-good" : "text-bad")}>{correct ? "Correct" : "Not quite"}</p>
          <p className="mt-1 text-sm text-body">{question.explanation}</p>
          {references.length > 0 && (
            <div className="mt-3 border-t border-ink/10 pt-2">
              <p className="text-2xs font-semibold uppercase tracking-wide text-muted">References</p>
              <ul className="mt-1 space-y-0.5">
                {references.map((r) => (
                  <li key={r.id}>
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-strong">
                      <span className="font-mono font-semibold">{r.sourceShortName}</span> {r.title}
                      <Icon name="external" className="h-3 w-3" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {question.isDemo && <DemoContentLabel className="mt-3" />}
          {footer && <div className="mt-3">{footer}</div>}
        </div>
      )}
    </form>
  );
}
