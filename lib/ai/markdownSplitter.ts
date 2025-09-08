import crypto from "crypto";
import { MarkdownTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";

function firstHeading(text: string) {
  const lines = text.split("\n");
  for (const l of lines)
    if (l.trim().startsWith("#")) return l.replace(/^#+\s*/, "").trim();
  return "";
}

export async function splitMarkdown(text: string, file: string) {
  const splitter = new MarkdownTextSplitter({
    chunkSize: 800,
    chunkOverlap: 100,
    keepSeparator: true,
  });
  const docs = await splitter.createDocuments([text]);
  const title = firstHeading(text) || file;
  return docs.map((d, i) => {
    const section = firstHeading(d.pageContent) || title;
    const hash = crypto
      .createHash("sha256")
      .update(d.pageContent)
      .digest("hex")
      .slice(0, 12);
    return new Document({
      pageContent: d.pageContent,
      metadata: { title, section, idx: i, hash },
    });
  });
}
