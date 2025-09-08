const res = await fetch("http://localhost:3000/api/rag/reindex", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ dir: "data" }),
});
console.log(await res.json());
process.exit(0);
