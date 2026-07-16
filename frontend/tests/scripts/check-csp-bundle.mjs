import fs from "node:fs";
import path from "node:path";

const distDir = path.resolve(process.cwd(), "dist");
const disallowedPatterns = [
  /eval\s*\(/,
  /new Function\s*\(/,
  /Function\((["'])return this\1\)/,
];
const scannableExtensions = new Set([".js", ".html", ".mjs", ".cjs"]);

function collectFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectFiles(fullPath);
    }
    return scannableExtensions.has(path.extname(entry.name)) ? [fullPath] : [];
  });
}

if (!fs.existsSync(distDir)) {
  throw new Error(`Build output not found at ${distDir}`);
}

const violations = collectFiles(distDir).flatMap((filePath) => {
  const contents = fs.readFileSync(filePath, "utf8");
  const failedPattern = disallowedPatterns.find((pattern) => pattern.test(contents));
  return failedPattern ? [`${path.relative(distDir, filePath)} matched ${failedPattern}`] : [];
});

if (violations.length > 0) {
  console.error("CSP bundle check failed:");
  violations.forEach((violation) => console.error(`- ${violation}`));
  process.exit(1);
}

console.log("CSP bundle check passed.");
