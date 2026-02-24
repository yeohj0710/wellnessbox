import "server-only";

import JSZip from "jszip";

export async function createExportZip(input: {
  files: Array<{ filename: string; content: Buffer }>;
}) {
  const zip = new JSZip();
  for (const file of input.files) {
    zip.file(file.filename, file.content);
  }
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
