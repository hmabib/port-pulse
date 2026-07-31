import { describe, expect, it } from "vitest";
import {
  createAccessToken,
  isValidAccessToken,
  sanitizeReturnPath,
} from "./access-control";

describe("access control", () => {
  it("valide uniquement le jeton dérivé de la bonne clé", async () => {
    const token = await createAccessToken("kct123");

    await expect(isValidAccessToken(token, "kct123")).resolves.toBe(true);
    await expect(isValidAccessToken(token, "autre-cle")).resolves.toBe(false);
  });

  it("refuse les chemins de retour externes", () => {
    expect(sanitizeReturnPath("/analyse?mois=7")).toBe("/analyse?mois=7");
    expect(sanitizeReturnPath("https://example.com")).toBe("/");
    expect(sanitizeReturnPath("//example.com")).toBe("/");
  });
});
