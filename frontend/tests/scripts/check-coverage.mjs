import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const summaryPath = path.join(root, "coverage", "coverage-summary.json");

if (!fs.existsSync(summaryPath)) {
  console.error("Coverage summary not found:", summaryPath);
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));

const globalThresholds = {
  lines: 80,
  functions: 82,
  statements: 80,
  branches: 72,
};

const criticalFiles = {
  "src/api/api.ts": { lines: 84, functions: 75, statements: 84, branches: 68 },
  "src/components/auth/auth.tsx": { lines: 55, functions: 55, statements: 55, branches: 50 },
  "src/hooks/useLocalStorage.tsx": { lines: 100, functions: 100, statements: 100, branches: 95 },
  "src/hooks/periodisation/useSplits.ts": { lines: 90, functions: 83, statements: 90, branches: 75 },
  "src/hooks/periodisation/useProgramme.ts": { lines: 90, functions: 100, statements: 90, branches: 75 },
  "src/hooks/workout/useProgressAnalytics.ts": { lines: 0, functions: 0, statements: 0, branches: 0 },
};

const failures = [];

function assertThreshold(label, actual, expected) {
  if (actual < expected) {
    failures.push(`${label} ${actual}% < ${expected}%`);
  }
}

for (const [metric, threshold] of Object.entries(globalThresholds)) {
  assertThreshold(`Global ${metric}`, summary.total[metric].pct, threshold);
}

for (const [file, thresholds] of Object.entries(criticalFiles)) {
  const stats =
    summary[path.join(root, file)] ??
    summary[file] ??
    Object.entries(summary).find(([key]) => key.endsWith(file))?.[1];

  if (!stats) {
    failures.push(`Missing coverage entry for ${file}`);
    continue;
  }

  for (const [metric, threshold] of Object.entries(thresholds)) {
    assertThreshold(`${file} ${metric}`, stats[metric].pct, threshold);
  }
}

if (failures.length > 0) {
  console.error("Coverage check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Coverage thresholds satisfied.");
