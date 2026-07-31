export const ACCESS_COOKIE_NAME = "port-pulse-access";
export const ACCESS_SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

const encoder = new TextEncoder();

export async function createAccessToken(accessKey: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`port-pulse:${accessKey}`),
  );

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function isValidAccessToken(
  token: string | undefined,
  accessKey: string,
): Promise<boolean> {
  if (!token) return false;

  const expected = await createAccessToken(accessKey);
  if (token.length !== expected.length) return false;

  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= token.charCodeAt(index) ^ expected.charCodeAt(index);
  }

  return difference === 0;
}

export function sanitizeReturnPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
