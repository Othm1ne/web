import { describe, expect, it } from "vitest";
import { countryFrom, decodeSession, encodeSession } from "./session";
import type { User } from "./types";

const user: User = { id: "u1", handle: "NeonFox123", provider: "guest", country: "FR" };

describe("session", () => {
  it("round-trips a signed session", () => {
    expect(decodeSession(encodeSession(user, "k1"), "k1")).toEqual(user);
  });

  it("rejects tampering, wrong keys and junk", () => {
    const token = encodeSession(user, "k1");
    const forged = Buffer.from(JSON.stringify({ ...user, id: "someone-else" })).toString("base64url");
    expect(decodeSession(`${forged}.${token.split(".")[1]}`, "k1")).toBeNull();
    expect(decodeSession(token, "k2")).toBeNull();
    expect(decodeSession("garbage", "k1")).toBeNull();
    expect(decodeSession(undefined, "k1")).toBeNull();
  });

  it("reads the country from edge headers, then the browser locale", () => {
    const h = (init: Record<string, string>) => new Headers(init);
    expect(countryFrom(h({ "x-vercel-ip-country": "MA", "accept-language": "fr-FR" }))).toBe("MA");
    expect(countryFrom(h({ "cf-ipcountry": "XX", "accept-language": "fr-ca,fr;q=0.9" }))).toBe("CA");
    expect(countryFrom(h({ "accept-language": "en" }))).toBeNull();
  });
});
