"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import { AskRegBotButton } from "@/components/regbot/AskRegBot";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/States";
import { MAX_BASE_XP, useDailyChallenge, XP_PER_CORRECT } from "@/hooks/useDailyChallenge";
import type { DailyQuestion, DailyQuestionResult } from "@/types";

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

function regBotPrompt(question: DailyQuestion, result: DailyQuestionResult): string {
  const userAnswer = `${OPTION_LETTERS[result.selectedIndex]}. ${question.options[result.selectedIndex]}`;
  const correctAnswer = `${OPTION_LETTERS[question.correctIndex]}. ${question.options[question.correctIndex]}`;
  return `Daily Reg Challenge question (${question.category}): "${question.prompt}"\n\nI answered: ${userAnswer}\nCorrect answer: ${correctAnswer}\nExplanation given: ${question.explanation}\n\nCan you help me understand this in more depth?`;
}

function ProgressDots({ total, answeredCount, currentIndex }: { total: number; answeredCount: number; currentIndex: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={clsx(
            "h-2 w-2 rounded-full transition-colors",
            i < answeredCount ? "bg-accent" : i === currentIndex ? "bg-accent/40 ring-2 ring-accent/30" : "bg-line",
          )}
        />
      ))}
    </div>
  );
}

function QuestionView({ question, index, total, onSubmit }: { question: DailyQuestion; index: number; total: number; onSubmit: (selectedIndex: number, timeMs: number) => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [startedAt] = useState(() => Date.now());

  function submit() {
    if (selected === null || submitted) return;
    setSubmitted(true);
    onSubmit(selected, Date.now() - startedAt);
  }

  const correct = selected === question.correctIndex;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="font-mono text-xs text-muted">
          Question {index + 1} of {total}
        </p>
        <span className="rounded border border-line bg-canvas px-2 py-0.5 font-mono text-2xs font-semibold uppercase tracking-wide text-body">{question.category}</span>
      </div>

      <fieldset disabled={submitted}>
        <legend className="text-sm font-semibold leading-relaxed text-ink">{question.prompt}</legend>
        <div className="mt-3 grid gap-2">
          {question.options.map((option, i) => {
            const isSelected = selected === i;
            const isAnswer = i === question.correctIndex;
            return (
              <label
                key={i}
                className={clsx(
                  "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors",
                  !submitted && (isSelected ? "border-accent bg-accent-soft/60" : "border-line hover:border-muted/40"),
                  submitted && isAnswer && "border-good/50 bg-good-soft",
                  submitted && isSelected && !isAnswer && "border-bad/40 bg-bad-soft",
                  submitted && !isSelected && !isAnswer && "border-line opacity-60",
                  submitted && "cursor-default",
                )}
              >
                <input
                  type="radio"
                  name={`daily-${question.id}`}
                  checked={isSelected}
                  disabled={submitted}
                  onChange={() => setSelected(i)}
                  className="mt-0.5 h-3.5 w-3.5 accent-accent"
                />
                <span className="font-mono text-2xs uppercase text-muted">{OPTION_LETTERS[i]}.</span>
                <span className="flex-1 text-ink">{option}</span>
                {submitted && isAnswer && <Icon name="check" className="mt-0.5 text-good" title="Correct answer" />}
                {submitted && isSelected && !isAnswer && <Icon name="x" className="mt-0.5 text-bad" title="Your answer" />}
              </label>
            );
          })}
        </div>
      </fieldset>

      {!submitted ? (
        <div className="mt-4 flex justify-end">
          <Button variant="primary" disabled={selected === null} onClick={submit}>
            Submit answer
          </Button>
        </div>
      ) : (
        <div role="status" className={clsx("mt-4 rounded-md border px-4 py-3", correct ? "border-good/30 bg-good-soft/60" : "border-bad/25 bg-bad-soft/60")}>
          <p className={clsx("text-sm font-semibold", correct ? "text-good" : "text-bad")}>{correct ? `Correct — +${XP_PER_CORRECT} XP` : "Not quite"}</p>
          <p className="mt-1 text-sm text-body">{question.explanation}</p>
          <p className="mt-2 text-2xs text-muted">
            Source: {question.source}
            {question.sourceUrl && (
              <>
                {" · "}
                <a href={question.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-strong">
                  View source
                </a>
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

function ReviewRow({ question, result, index }: { question: DailyQuestion; result: DailyQuestionResult; index: number }) {
  return (
    <li className="border-b border-line px-4 py-3 last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-ink">
          Q{index + 1} — {question.category}
        </p>
        {result.correct ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-good">
            <Icon name="check" className="h-3.5 w-3.5" /> Correct
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-bad">
            <Icon name="x" className="h-3.5 w-3.5" /> Incorrect
          </span>
        )}
      </div>
      <p className="mt-1.5 text-sm text-body">{question.prompt}</p>
      {!result.correct && (
        <p className="mt-1.5 text-xs text-ink">
          Correct answer: <span className="font-semibold">{OPTION_LETTERS[question.correctIndex]}. {question.options[question.correctIndex]}</span>
        </p>
      )}
      <p className="mt-1.5 text-xs leading-relaxed text-muted">{question.explanation}</p>
      <div className="mt-2">
        <AskRegBotButton question={regBotPrompt(question, result)} size="sm" variant="secondary">
          Ask RegBot
        </AskRegBotButton>
      </div>
    </li>
  );
}

export function DailyRegChallenge() {
  const daily = useDailyChallenge();
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (daily.isComplete) setStarted(true);
  }, [daily.isComplete]);

  if (!daily.loaded) return <Skeleton className="h-72" />;

  const { questions, answeredCount, isComplete, correctCountToday, totalXpToday, streakDays, record } = daily;

  if (!started) {
    return (
      <div>
        <p className="font-mono text-2xs uppercase tracking-widest text-accent">🔥 {streakDays > 0 ? `${streakDays} Day Streak` : "Start your streak today"}</p>
        <p className="mt-2 text-sm text-body">5 Questions · 90–120 seconds</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {questions.map((q, i) => (
            <span key={q.id} className="rounded border border-line bg-canvas px-2 py-0.5 font-mono text-2xs font-medium uppercase tracking-wide text-body">
              {q.category}
              {i < 3 && " ✓"}
            </span>
          ))}
        </div>
        <div className="mt-4">
          <Button
            variant="primary"
            iconRight="arrowRight"
            onClick={() => {
              daily.ensureRecord();
              setStarted(true);
              setIndex(0);
            }}
          >
            Start Today's Challenge
          </Button>
        </div>
      </div>
    );
  }

  if (isComplete && record) {
    const pct = Math.round((correctCountToday / questions.length) * 100);
    return (
      <div>
        <div className="rounded-md border border-good/30 bg-good-soft/40 px-4 py-4 text-center">
          <Icon name="trophy" className="mx-auto h-6 w-6 text-good" />
          <p className="mt-2 text-lg font-semibold text-ink">🎉 Daily Challenge Complete</p>
          <p className="mt-1 text-sm text-body">
            {correctCountToday} / {questions.length} correct · {pct}% accuracy
          </p>
          <p className="mt-1 font-mono text-sm font-semibold text-accent">{totalXpToday} XP</p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-signal">
            <Icon name="flame" className="h-3.5 w-3.5" /> {streakDays} Day Streak
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {questions.map((q) => {
              const r = record.results[q.id];
              return (
                <span key={q.id} className={clsx("rounded border px-2 py-0.5 font-mono text-2xs font-medium uppercase tracking-wide", r?.correct ? "border-good/30 bg-good-soft text-good" : "border-bad/30 bg-bad-soft text-bad")}>
                  {q.category} {r?.correct ? "✓" : "✕"}
                </span>
              );
            })}
          </div>
          <p className="mt-3 text-2xs text-muted">
            Base XP {Math.min(record.baseXp, MAX_BASE_XP)} · Speed bonus +{record.speedBonus} · Streak bonus +{record.streakBonus}
          </p>
        </div>

        <h3 className="mb-1 mt-5 text-sm font-semibold text-ink">Answer review</h3>
        <ul className="rounded-md border border-line bg-surface">
          {questions.map((q, i) => {
            const r = record.results[q.id];
            if (!r) return null;
            return <ReviewRow key={q.id} question={q} result={r} index={i} />;
          })}
        </ul>
        <p className="mt-3 text-2xs text-muted">Next challenge available tomorrow.</p>
      </div>
    );
  }

  const current = questions[index];
  if (!current) return null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <ProgressDots total={questions.length} answeredCount={answeredCount} currentIndex={index} />
        <p className="font-mono text-2xs text-muted">Up to {MAX_BASE_XP} XP</p>
      </div>
      <QuestionView
        key={current.id}
        question={current}
        index={index}
        total={questions.length}
        onSubmit={(selectedIndex, timeMs) => {
          daily.submitAnswer(current, selectedIndex, timeMs);
        }}
      />
      {record?.results[current.id] && index + 1 < questions.length && (
        <div className="mt-4 flex justify-end">
          <Button variant="primary" iconRight="arrowRight" onClick={() => setIndex((i) => i + 1)}>
            Next question
          </Button>
        </div>
      )}
    </div>
  );
}
