import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { GameError } from "./game/engine";

/** Wraps a route handler so domain errors become JSON error responses. */
export function route<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      // Let Next's own control-flow errors (e.g. prerender bail-outs) through.
      unstable_rethrow(err);
      if (err instanceof GameError) return Response.json({ error: err.code }, { status: err.status });
      if (err instanceof ZodError) return Response.json({ error: "invalid_request" }, { status: 400 });
      console.error(err);
      return Response.json({ error: "server_error" }, { status: 500 });
    }
  };
}

export function roundIndex(raw: string): number {
  const index = Number(raw);
  if (!Number.isInteger(index) || index < 0) throw new GameError("bad_round");
  return index;
}
