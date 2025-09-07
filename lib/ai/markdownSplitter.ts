import crypto from "crypto";
import { MarkdownTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";

function headingOf(text: string) {
  const lines = text.split("\n");
  for (const l of lines) if (l.trim().startsWith("#")) return l.replace(/^#+\s*/, "").trim();
  return "";
}

export async function splitMarkdown(text: string, file: string) {
  const splitter = new MarkdownTextSplitter({ chunkSize: 1200, chunkOverlap: 150, keepSeparator: true });
  const docs = await splitter.createDocuments([text]);
  return docs.map((d, i) => {
    const heading = headingOf(d.pageContent);
    const hash = crypto.createHash("sha256").update(text).digest("hex");
    return new Document({ pageContent: d.pageContent, metadata: { file, heading, section: heading, idx: i, hash } });
  });
}
