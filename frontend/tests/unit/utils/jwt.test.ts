import { decodeJwt } from "@/utils/auth/jwt";

describe("decodeJwt", () => {
  it("decodes base64url JWT payloads safely", () => {
    const payload = btoa(JSON.stringify({ sub: "user-123", role: "member" }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
    const token = `header.${payload}.signature`;

    expect(decodeJwt(token)).toEqual({
      sub: "user-123",
      role: "member",
    });
  });

  it("returns null for non-object payloads", () => {
    const payload = btoa(JSON.stringify("nope"))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
    const token = `header.${payload}.signature`;

    expect(decodeJwt(token)).toBeNull();
  });
});
