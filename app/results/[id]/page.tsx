import { Suspense } from "react";
import { ResultsClient } from "./ResultsClient";

export default function ResultsPage() {
  return (
    <Suspense>
      <ResultsClient />
    </Suspense>
  );
}
