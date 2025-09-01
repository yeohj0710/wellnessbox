"use client";
import { useEffect, useState } from "react";

const MODEL_OPTIONS = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4.1-mini",
  "gpt-3.5-turbo",
];

export default function ModelManager() {
  const [current, setCurrent] = useState("gpt-4o-mini");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/model")
      .then((r) => r.json())
      .then((d) => d?.model && setCurrent(d.model))
      .catch(() => {});
  }, []);

  async function updateModel(value: string) {
    setLoading(true);
    try {
      await fetch("/api/admin/model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: value }),
      });
      setCurrent(value);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        기본 모델 선택
      </label>
      <select
        className="border rounded-md px-3 py-2"
        value={current}
        onChange={(e) => updateModel(e.target.value)}
        disabled={loading}
      >
        {MODEL_OPTIONS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}
