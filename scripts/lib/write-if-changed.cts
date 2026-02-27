const fs = require("node:fs") as typeof import("node:fs");
const pathUtil = require("node:path") as typeof import("node:path");

type WriteIfChangedOptions = {
  outputPath: string;
  content: string;
  rootDir?: string;
  encoding?: BufferEncoding;
};

type WriteIfChangedResult = {
  changed: boolean;
  outputPath: string;
  relativePath: string;
};

function toPosixRelative(baseDir: string, filePath: string) {
  return pathUtil.relative(baseDir, filePath).replace(/\\/g, "/");
}

function writeIfChanged(options: WriteIfChangedOptions): WriteIfChangedResult {
  const rootDir = options.rootDir ?? process.cwd();
  const encoding = options.encoding ?? "utf8";
  const outputPath = options.outputPath;
  const currentContent = fs.existsSync(outputPath)
    ? fs.readFileSync(outputPath, encoding)
    : null;

  if (currentContent !== options.content) {
    fs.writeFileSync(outputPath, options.content, encoding);
    return {
      changed: true,
      outputPath,
      relativePath: toPosixRelative(rootDir, outputPath),
    };
  }

  return {
    changed: false,
    outputPath,
    relativePath: toPosixRelative(rootDir, outputPath),
  };
}

module.exports = {
  writeIfChanged,
};
