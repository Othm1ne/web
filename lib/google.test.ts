import { describe, expect, it } from "vitest";
import { parseIdToken, safeReturnTo } from "./google";

const token = (claims: object) => `h.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.sig`;
const valid = { iss: "https://accounts.google.com", aud: "client", sub: "123", exp: 2000, email: "a@b.c", email_verified: true };

describe("google", () => {
  it("accepts a valid ID token and only keeps verified emails", () => {
    expect(parseIdToken(token(valid), "client", 1_000_000)).toEqual({ sub: "123", email: "a@b.c" });
    expect(parseIdToken(token({ ...valid, email_verified: false }), "client", 1_000_000).email).toBeNull();
  });

  it("rejects wrong audience, issuer, expired or malformed tokens", () => {
    expect(() => parseIdToken(token(valid), "other", 1_000_000)).toThrow("google_bad_token");
    expect(() => parseIdToken(token({ ...valid, iss: "evil" }), "client", 1_000_000)).toThrow("google_bad_token");
    expect(() => parseIdToken(token(valid), "client", 3_000_000)).toThrow("google_bad_token");
    expect(() => parseIdToken("nope", "client")).toThrow("google_bad_token");
  });

  it("only returns to same-site paths", () => {
    expect(safeReturnTo("/leaderboard?x=1")).toBe("/leaderboard?x=1");
    expect(safeReturnTo("https://evil.com")).toBe("/play");
    expect(safeReturnTo("//evil.com")).toBe("/play");
    expect(safeReturnTo(null)).toBe("/play");
  });
});
