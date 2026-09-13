"use client";

import { useState } from "react";
import { useChallengeProgress } from "@/hooks/useChallengeProgress";
import type { Challenge, ChallengeQuestion } from "@/types";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { QuestionCard, type ResolvedReference } from "./QuestionCard";

interface ChallengePlayerProps {
  challenge: Challenge;
  questions: ChallengeQuestion[];
  references: Record<string, ResolvedReference>;
}

export function ChallengePlayer({ challenge, questions, references }: ChallengePlayerProps) {
  const progress = useChallengeProgress();
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const done = index >= questions.length;
  const correctCount = Object.values(results).filter(Boolean).length;

  if (questions.length === 0) {
    return <p className="text-sm text-muted">This challenge has no questions yet.</p>;
  }

  if (done) {
    const pct = Math.round((correctCount / questions.length) * 100);
    return (
      <div className="rounded-md border border-line bg-surface px-5 py-8 text-center">
        <Icon name="trophy" className="mx-auto h-6 w-6 text-accent" />
        <p className="mt-3 text-lg font-semibold text-ink">
          {correctCount} of {questions.length} correct
        </p>
        <p className="mt-1 text-sm text-muted">{pct >= 80 ? "Strong result." : pct >= 50 ? "Solid — review the explanations for the ones you missed." : "Worth revisiting the references for this topic."}</p>
        <div className="mx-auto mt-4 h-1.5 max-w-xs overflow-hidden rounded-full bg-line">
          <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={() => { setIndex(0); setResults({}); }} icon="refresh">
            Retake
          </Button>
          <ButtonLink href="/challenges" variant="primary">
            All challenges
          </ButtonLink>
        </div>
        <p className="mt-4 text-2xs text-muted">Points are awarded on your first attempt at each question. Total score: {progress.score}</p>
      </div>
    );
  }

  const question = questions[index];
  const answered = question.id in results;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <p className="font-mono text-xs text-muted">
          Question {index + 1} / {questions.length}
        </p>
        <div className="flex flex-1 gap-1" aria-hidden>
          {questions.map((q, i) => (
            <span key={q.id} className={`h-1 flex-1 rounded-full ${q.id in results ? (results[q.id] ? "bg-good" : "bg-bad") : i === index ? "bg-accent" : "bg-line"}`} />
          ))}
        </div>
      </div>
      <div className="rounded-md border border-line bg-surface p-4 sm:p-5">
        <QuestionCard
          key={question.id}
          question={question}
          references={question.references.map((r) => references[r.sourceDocumentId]).filter((r): r is ResolvedReference => Boolean(r))}
          onAnswered={(selected, correct) => {
            setResults((prev) => ({ ...prev, [question.id]: correct }));
            progress.record(question.id, selected, correct);
          }}
          footer={
            answered && (
              <div className="flex justify-end">
                <Button variant="primary" iconRight="arrowRight" onClick={() => setIndex((i) => i + 1)}>
                  {index + 1 === questions.length ? `Finish ${challenge.title}` : "Next question"}
                </Button>
              </div>
            )
          }
        />
      </div>
    </div>
  );
}
