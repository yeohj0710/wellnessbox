import { promises as fs } from "fs";
import path from "path";
import { MARKDOWN_EXTENSION } from "./columns-content-utils";

export async function collectMarkdownFiles(dir: string): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const paths = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return collectMarkdownFiles(absolutePath);
      }
      return MARKDOWN_EXTENSION.test(entry.name) ? [absolutePath] : [];
    })
  );

  return paths.flat().sort();
}
