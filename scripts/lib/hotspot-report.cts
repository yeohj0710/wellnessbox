type FileStat = {
  file: string;
  lines: number;
};

type CodeFileRow = {
  file: string;
  lines: number;
};

function buildHotspotReport(
  rows: CodeFileRow[],
  limit: number,
  predicate?: (file: string) => boolean
): FileStat[] {
  const filtered = predicate ? rows.filter((row) => predicate(row.file)) : rows;
  const stats = filtered.map((row) => ({ file: row.file, lines: row.lines }));
  return stats.sort((a, b) => b.lines - a.lines).slice(0, limit);
}

function printHotspotSection(title: string, rows: FileStat[]) {
  console.log(title);
  for (const { file, lines } of rows) {
    const padded = String(lines).padStart(5, " ");
    console.log(`${padded}  ${file}`);
  }
}

module.exports = {
  buildHotspotReport,
  printHotspotSection,
};
