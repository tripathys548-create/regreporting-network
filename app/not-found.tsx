import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl rounded-md border border-line bg-surface py-8">
      <EmptyState
        icon="search"
        title="Page not found"
        description="The update, discussion or article you were looking for does not exist or is no longer published."
        action={
          <div className="flex gap-2">
            <ButtonLink href="/" variant="primary" size="sm">
              Dashboard
            </ButtonLink>
            <ButtonLink href="/search" size="sm">
              Search
            </ButtonLink>
          </div>
        }
      />
    </div>
  );
}
