"use client";

import { useEffect, useState } from "react";

/**
 * A busy flag for buttons that navigate away ("Start game", "Play again"…). Next keeps
 * visited pages alive while hidden and restores them with their state, so the flag is
 * cleared when the page is hidden (effect cleanup); otherwise coming back shows a button
 * stuck on "Building…".
 */
export function useNavigationBusy() {
  const [busy, setBusy] = useState(false);
  useEffect(() => () => setBusy(false), []);
  return [busy, setBusy] as const;
}
