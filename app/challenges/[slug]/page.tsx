import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChallengePlayer } from "@/components/challenges/ChallengePlayer";
import type { ResolvedReference } from "@/components/challenges/QuestionCard";
import { TopicBadge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { DemoContentLabel } from "@/components/ui/SourceLabels";
import { getChallengeWithQuestions } from "@/lib/repositories/challenges";
import { getDocuments, getSourceSync } from "@/lib/repositories/sources";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const result = await getChallengeWithQuestions(params.slug);
  return { title: result?.challenge.title ?? "Challenge not found" };
}

export default async function ChallengePage({ params }: { params: { slug: string } }) {
  const result = await getChallengeWithQuestions(params.slug);
  if (!result) notFound();
  const { challenge, questions } = result;

  const docs = await getDocuments(questions.flatMap((q) => q.references.map((r) => r.sourceDocumentId)));
  const references: Record<string, ResolvedReference> = Object.fromEntries(
    docs.map((d) => [d.id, { id: d.id, title: d.title, url: d.url, sourceShortName: getSourceSync(d.sourceId).shortName }]),
  );

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/challenges" className="mb-3 inline-flex items-center gap-1 text-xs text-muted hover:text-ink">
        <Icon name="chevronRight" className="h-3 w-3 rotate-180" />
        All challenges
      </Link>
      <PageHeader
        eyebrow="Reg Reporting Challenge"
        title={challenge.title}
        description={challenge.description}
        meta={
          <>
            <TopicBadge topic={challenge.topic} />
            <span className="font-mono text-2xs text-muted">
              {questions.length} questions · ~{challenge.estimatedMinutes} min
            </span>
            <DemoContentLabel />
          </>
        }
      />
      <ChallengePlayer challenge={challenge} questions={questions} references={references} />
    </div>
  );
}
