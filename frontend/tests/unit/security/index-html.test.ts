import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("index.html security metadata", () => {
  it("includes CSP, referrer, and permissions policies", () => {
    const html = fs.readFileSync(
      path.resolve(__dirname, "../../../index.html"),
      "utf-8",
    );

    expect(html).toContain("Content-Security-Policy");
    expect(html).toContain("strict-origin-when-cross-origin");
    expect(html).toContain("Permissions-Policy");
    expect(html).toContain("script-src 'self'");
    expect(html).toContain('<script src="/env.js"></script>');
    expect(html).not.toContain("unsafe-eval");
  });
});
