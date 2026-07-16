import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(__dirname, "../../../src");
const DISALLOWED_VARIANTS: string[] = [];

function getSourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return getSourceFiles(fullPath);
    }
    return fullPath.endsWith(".tsx") ? [fullPath] : [];
  });
}

describe("Button guardrails", () => {
  it("does not use removed button variants", () => {
    const violations: string[] = [];

    for (const filePath of getSourceFiles(srcRoot)) {
      const sourceText = fs.readFileSync(filePath, "utf8");
      const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

      const visit = (node: ts.Node) => {
        if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
          const tagName = node.tagName.getText(sourceFile);
          if (tagName === "Button") {
            const attributes = node.attributes.properties.filter(ts.isJsxAttribute);
            const variantAttribute = attributes.find((attribute) => attribute.name.text === "variant");

            if (variantAttribute?.initializer) {
              const variantText = variantAttribute.initializer.getText(sourceFile);
              const disallowed = DISALLOWED_VARIANTS.find((variant) => variantText.includes(`"${variant}"`) || variantText.includes(`'${variant}'`));
              if (disallowed) {
                const { line } = sourceFile.getLineAndCharacterOfPosition(variantAttribute.getStart(sourceFile));
                violations.push(`${path.relative(srcRoot, filePath)}:${line + 1} uses removed variant "${disallowed}"`);
              }
            }
          }
        }

        ts.forEachChild(node, visit);
      };

      visit(sourceFile);
    }

    expect(violations).toEqual([]);
  });
});
