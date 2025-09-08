import "dotenv/config";

const url = "http://localhost:3000/api/rag/reindex";
const body = { dir: "data" };

const res = await fetch(url, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

const ct = res.headers.get("content-type") || "";
const text = await res.text();

if (!res.ok) {
  console.error("HTTP", res.status, text || "(no body)");
  process.exit(1);
}

if (!ct.includes("application/json")) {
  console.error("Non-JSON response:", ct, text || "(no body)");
  process.exit(1);
}

let data;
try {
  data = JSON.parse(text);
} catch {
  console.error("Bad JSON:", text || "(no body)");
  process.exit(1);
}

console.log(JSON.stringify(data, null, 2));
process.exit(0);
