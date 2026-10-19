import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptClip, encryptClip } from "./clip";

const key = () => randomBytes(32).toString("base64url");

describe("clip encryption", () => {
  it("round-trips a clip and hides its bytes", async () => {
    const k = key();
    const clip = new Uint8Array(randomBytes(4096)).buffer;
    const sealed = await encryptClip(clip, k);
    expect(Buffer.from(sealed).includes(Buffer.from(new Uint8Array(clip).subarray(0, 64)))).toBe(false);
    expect(new Uint8Array(await decryptClip(sealed.slice().buffer, k))).toEqual(new Uint8Array(clip));
  });

  it("refuses the wrong key", async () => {
    const sealed = await encryptClip(new Uint8Array([1, 2, 3]).buffer, key());
    await expect(decryptClip(sealed.slice().buffer, key())).rejects.toThrow();
  });
});
