import { Suspense } from "react";
import { HostClient } from "./HostClient";

export default function HostEventPage() {
  return (
    <Suspense>
      <HostClient />
    </Suspense>
  );
}
