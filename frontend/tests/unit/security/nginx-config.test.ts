import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("nginx security headers", () => {
  it("serves the frontend with the required response headers", () => {
    const nginxConfig = fs.readFileSync(
      path.resolve(__dirname, "../../../docker/nginx.conf"),
      "utf-8",
    );

    expect(nginxConfig).toContain("Content-Security-Policy");
    expect(nginxConfig).toContain("strict-origin-when-cross-origin");
    expect(nginxConfig).toContain("Permissions-Policy");
    expect(nginxConfig).toContain("X-Content-Type-Options");
    expect(nginxConfig).toContain("Cross-Origin-Opener-Policy");
    expect(nginxConfig).toContain("Cross-Origin-Resource-Policy");
    expect(nginxConfig).toContain("script-src 'self'");
    expect(nginxConfig).toContain("location /api/");
    expect(nginxConfig).toContain("try_files $uri $uri/ /index.html;");
    expect(nginxConfig).not.toContain("unsafe-eval");
  });
});
