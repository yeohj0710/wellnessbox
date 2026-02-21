const fs = require("node:fs") as typeof import("node:fs");
const pathUtil = require("node:path") as typeof import("node:path");

type SkillEntry = {
  name: string;
  description: string;
  relativePath: string;
};

const REPO_ROOT = process.cwd();
const SKILLS_ROOT = pathUtil.join(REPO_ROOT, ".agents", "skills");
const OUTPUT_PATH = pathUtil.join(REPO_ROOT, "AGENT_SKILLS_CATALOG.md");

function walkDirs(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const out: string[] = [];

  for (const entry of entries) {
    const fullPath = pathUtil.join(dir, entry.name);
    if (!entry.isDirectory()) continue;
    const skillFile = pathUtil.join(fullPath, "SKILL.md");
    if (fs.existsSync(skillFile)) {
      out.push(skillFile);
      continue;
    }
    out.push(...walkDirs(fullPath));
  }

  return out;
}

function readFrontmatter(markdown: string): Record<string, string> {
  if (!markdown.startsWith("---")) return {};
  const end = markdown.indexOf("\n---", 3);
  if (end < 0) return {};
  const block = markdown.slice(3, end).trim();
  const lines = block.split("\n");
  const out: Record<string, string> = {};

  for (const line of lines) {
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line
      .slice(idx + 1)
      .trim()
      .replace(/^"(.*)"$/, "$1")
      .replace(/^'(.*)'$/, "$1");
    out[key] = value;
  }
  return out;
}

function extractEntry(skillFile: string): SkillEntry {
  const raw = fs.readFileSync(skillFile, "utf8");
  const frontmatter = readFrontmatter(raw);
  const fallbackName = pathUtil.basename(pathUtil.dirname(skillFile));
  const name = frontmatter.name || fallbackName;
  const description =
    frontmatter.description || "No description found in frontmatter.";
  const relativePath = pathUtil
    .relative(REPO_ROOT, skillFile)
    .replace(/\\/g, "/");
  return { name, description, relativePath };
}

function toMarkdown(entries: SkillEntry[]) {
  const lines: string[] = [];
  lines.push("# Agent Skills Catalog");
  lines.push("");
  lines.push(
    "Auto-generated from `.agents/skills/**/SKILL.md`. Regenerate with:"
  );
  lines.push("```bash");
  lines.push("npx ts-node scripts/agent/generate-skill-catalog.cts");
  lines.push("```");
  lines.push("");
  lines.push(`Generated at: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("| Skill | Description | Path |");
  lines.push("|---|---|---|");
  for (const entry of entries) {
    lines.push(
      `| \`${entry.name}\` | ${entry.description.replace(/\|/g, "\\|")} | \`${entry.relativePath}\` |`
    );
  }
  lines.push("");
  return lines.join("\n");
}

function main() {
  if (!fs.existsSync(SKILLS_ROOT)) {
    throw new Error(`Skills root not found: ${SKILLS_ROOT}`);
  }
  const files = walkDirs(SKILLS_ROOT);
  const entries = files
    .map(extractEntry)
    .sort((a, b) => a.name.localeCompare(b.name));
  fs.writeFileSync(OUTPUT_PATH, toMarkdown(entries), "utf8");
  console.log(
    `Wrote ${entries.length} skills to ${pathUtil.relative(REPO_ROOT, OUTPUT_PATH)}`
  );
}

main();
