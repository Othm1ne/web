import { Suspense } from "react";
import { LeaderboardClient } from "./LeaderboardClient";

export default function LeaderboardPage() {
  return (
    <Suspense>
      <LeaderboardClient />
    </Suspense>
  );
}
