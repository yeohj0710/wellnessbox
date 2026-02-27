const fs = require("node:fs");

function captureFileSnapshot(filePath) {
  const exists = fs.existsSync(filePath);
  if (!exists) {
    return {
      filePath,
      exists: false,
      content: null,
    };
  }

  return {
    filePath,
    exists: true,
    content: fs.readFileSync(filePath, "utf8"),
  };
}

function restoreFileSnapshot(snapshot) {
  if (!snapshot || !snapshot.filePath) return;

  if (snapshot.exists) {
    fs.writeFileSync(snapshot.filePath, snapshot.content ?? "", "utf8");
    return;
  }

  if (fs.existsSync(snapshot.filePath)) {
    fs.rmSync(snapshot.filePath);
  }
}

module.exports = {
  captureFileSnapshot,
  restoreFileSnapshot,
};
