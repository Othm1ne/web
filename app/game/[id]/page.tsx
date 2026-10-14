import { Suspense } from "react";
import { GameClient } from "./GameClient";

export default function GamePage() {
  return (
    <Suspense>
      <GameClient />
    </Suspense>
  );
}
