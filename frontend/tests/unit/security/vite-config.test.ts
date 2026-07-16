import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("vite PWA runtime caching", () => {
  it("keeps runtime caching scoped to shell navigation and lazy chunks while proxying API calls under /api", () => {
    const viteConfig = fs.readFileSync(
      path.resolve(__dirname, "../../../vite.config.ts"),
      "utf-8",
    );

    expect(viteConfig).toContain('cacheName: "lazy-route-chunks"');
    expect(viteConfig).toContain('cacheName: "app-documents"');
    expect(viteConfig).toContain('"/api/auth"');
    expect(viteConfig).toContain('"/api/service-status"');
    expect(viteConfig).toContain('requestPath.replace(/^\\/api/, "")');
  });

  it("normalizes the runtime config entrypoint script for Linux containers", () => {
    const dockerfile = fs.readFileSync(
      path.resolve(__dirname, "../../../docker/Dockerfile"),
      "utf-8",
    );

    expect(dockerfile).toContain("sed -i 's/\\r$//'");
    expect(dockerfile).toContain("chmod +x /docker-entrypoint.d/40-env-js.sh");
  });
});
