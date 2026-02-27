import { mkdirSync, readdirSync, rmSync, writeFileSync } from "fs";
import path from "path";
import type { LayoutDocument } from "@/lib/b2b/export/layout-types";

export function persistGeneratedLayout(layout: LayoutDocument) {
  const generatedDir = path.join(process.cwd(), "src", "generated");
  mkdirSync(generatedDir, { recursive: true });

  clearGeneratedLayoutArtifacts(generatedDir);

  const outputPath = path.join(generatedDir, "layout.json");
  writeFileSync(outputPath, `${JSON.stringify(layout, null, 2)}\n`, "utf8");
  return outputPath;
}

export function clearGeneratedLayoutArtifacts(existingGeneratedDir?: string) {
  const generatedDir =
    existingGeneratedDir ?? path.join(process.cwd(), "src", "generated");
  mkdirSync(generatedDir, { recursive: true });
  for (const entry of readdirSync(generatedDir)) {
    if (entry.startsWith("layout.")) {
      rmSync(path.join(generatedDir, entry), { force: true });
    }
  }
}
