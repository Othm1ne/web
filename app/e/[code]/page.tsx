import { Suspense } from "react";
import { PlayerClient } from "./PlayerClient";

export default function EventPlayerPage() {
  return (
    <Suspense>
      <PlayerClient />
    </Suspense>
  );
}
