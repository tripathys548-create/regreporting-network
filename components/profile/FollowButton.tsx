"use client";

import { useState } from "react";
import { api, goToSignIn } from "@/lib/api/client";
import type { FollowTargetType, ViewerStatus } from "@/types";
import { Button } from "@/components/ui/Button";

export function FollowButton({
  targetType,
  targetId,
  initialFollowing,
  viewerStatus,
  label = "Follow",
}: {
  targetType: FollowTargetType;
  targetId: string;
  initialFollowing: boolean;
  viewerStatus: ViewerStatus;
  label?: string;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (viewerStatus === "signed-out") return goToSignIn();
    setBusy(true);
    setError(null);
    try {
      const res = await api.toggleFollow(targetType, targetId);
      setFollowing(res.following);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Button size="sm" variant={following ? "secondary" : "primary"} icon={following ? "check" : "plus"} aria-pressed={following} disabled={busy} onClick={toggle}>
        {following ? "Following" : label}
      </Button>
      {error && (
        <p className="mt-1 text-2xs text-bad" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
