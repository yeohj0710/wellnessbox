"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getCategories } from "@/lib/product";
import { useLoading } from "@/components/common/loadingContext.client";
import { refreshClientIdCookieIfNeeded } from "@/lib/client-id";
import { CODE_TO_LABEL } from "@/lib/categories";

const QUESTIONS = [
  "I feel tired even after waking up and get exhausted easily during the day. (I feel foggy in the afternoon and have trouble focusing.)",
  "My knees, lower back, or wrists feel stiff, and I feel pain or stiffness when going up or down stairs.",
  "I am stressed and have trouble falling asleep or wake up often.",
  "I often feel bloated or have gas, constipation, or diarrhea.",
  "I frequently catch colds or get mouth sores, or I recover slowly.",
  "My skin is dry and I often break out, or my hair and nails have weakened.",
  "My eyes feel tired often and my vision is blurry.",
  "I feel very tired or hungover after drinking, or I take medication long-term.",
  "I have gained weight recently, or I have been told I have high blood pressure, blood sugar, or cholesterol.",
  "I sometimes feel dizzy or look pale, and my hands and feet are cold.",
];

const OPTIONS = [
  { value: 1, label: "Strongly disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly agree" },
];

const EN_CATEGORY_LABELS: Record<string, string> = {
  vitc: "Vitamin C",
  omega3: "Omega-3",
  ca: "Calcium",
  lutein: "Lutein",
  vitd: "Vitamin D",
  milkthistle: "Milk Thistle",
  probiotics: "Probiotics",
  vitb: "Vitamin B",
  mg: "Magnesium",
  garcinia: "Garcinia",
  multivitamin: "Multivitamin",
  zn: "Zinc",
  psyllium: "Psyllium Husk",
  minerals: "Minerals",
  vita: "Vitamin A",
  fe: "Iron",
  ps: "Phosphatidylserine",
  folate: "Folic Acid",
  arginine: "Arginine",
  chondroitin: "Chondroitin",
  coq10: "Coenzyme Q10",
  collagen: "Collagen",
};

const MODEL_URL = "/simple_model.onnx";
const CAT_ORDER_URL = "/assess-model/c-section-scorer-v1.cats.json";

type Result = { code: string; label: string; prob: number };

let sessionPromise: Promise<any> | null = null;
let catOrderPromise: Promise<string[]> | null = null;

async function loadCatOrder(): Promise<string[]> {
  if (!catOrderPromise) {
    catOrderPromise = fetch(CAT_ORDER_URL)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to load category order.");
        }
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data?.cat_order)) {
          throw new Error("Invalid category order format.");
        }
        return data.cat_order as string[];
      });
  }
  return catOrderPromise;
}

async function loadSession() {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const ort = await import("onnxruntime-web");
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.proxy = false;
      ort.env.wasm.wasmPaths = "/onnx/";
      return ort.InferenceSession.create(MODEL_URL);
    })();
  }
  return sessionPromise;
}

function clampAnswer(value: number) {
  const numeric = Number(value);
  const clamped = Math.max(1, Math.min(5, Number.isFinite(numeric) ? numeric : 3));
  return (clamped - 1) / 4;
}

async function runPrediction(responses: number[]): Promise<Result[]> {
  const ort = await import("onnxruntime-web");
  const [session, catOrder] = await Promise.all([loadSession(), loadCatOrder()]);
  const normalized = responses.map(clampAnswer);
  const input = new ort.Tensor("float32", Float32Array.from(normalized), [
    1,
    normalized.length,
  ]);

  const output = await session.run({ input });
  const outputName = session.outputNames[0];
  const logits = output[outputName].data as Float32Array;

  if (logits.length !== catOrder.length) {
    throw new Error(
      `Model output (${logits.length}) does not match categories (${catOrder.length}).`
    );
  }

  const percents = Array.from(logits, (x) => {
    const prob = 1 / (1 + Math.exp(-x));
    return Math.round(prob * 1000) / 10;
  });

  return percents
    .map((percent, i) => ({
      code: catOrder[i],
      label: CODE_TO_LABEL[catOrder[i]] ?? catOrder[i],
      prob: percent / 100,
    }))
    .sort((a, b) => b.prob - a.prob)
    .slice(0, 3);
}

function displayLabel(code: string, fallback: string) {
  return EN_CATEGORY_LABELS[code] ?? fallback;
}

function disableGoogleTranslate() {
  if (typeof window === "undefined") return;
  const wbWindow = window as typeof window & {
    __wbEnglishModeActive?: boolean;
    __wbDisconnectTranslateObserver?: () => void;
  };

  try {
    wbWindow.__wbEnglishModeActive = false;
  } catch {}

  try {
    wbWindow.__wbDisconnectTranslateObserver?.();
  } catch {}

  try {
    document.documentElement.removeAttribute("data-wb-translate-state");
    document.documentElement.classList.remove("translated-ltr", "translated-rtl");
    document.documentElement.setAttribute("lang", "en");
  } catch {}

  const expireDate = new Date(0).toUTCString();
  const clearCookie = (domain?: string) => {
    const base = `googtrans=; expires=${expireDate}; path=/`;
    document.cookie = domain ? `${base}; domain=${domain}` : base;
  };
  try {
    clearCookie();
    const hostname = window.location.hostname;
    if (hostname.includes(".")) {
      clearCookie(hostname);
      clearCookie(`.${hostname}`);
    }
  } catch {}

  try {
    document
      .querySelectorAll(
        'script[src*="translate.google.com/translate_a/element.js"], #google-translate-script, #google-translate-script-tag'
      )
      .forEach((node) => node.parentNode?.removeChild(node));
  } catch {}

  try {
    document
      .querySelectorAll(
        ".goog-te-banner-frame, .goog-te-menu-frame, .goog-tooltip, .goog-te-balloon-frame, body > .skiptranslate"
      )
      .forEach((node) => node.parentNode?.removeChild(node));
  } catch {}
}

export default function EnglishCheckAI() {
  const { showLoading } = useLoading();
  const [answers, setAnswers] = useState<number[]>(
    Array(QUESTIONS.length).fill(0)
  );
  const [results, setResults] = useState<Result[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [animateBars, setAnimateBars] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  const completion = useMemo(() => {
    const answered = answers.filter((v) => v > 0).length;
    return Math.round((answered / QUESTIONS.length) * 100);
  }, [answers]);

  useEffect(() => {
    refreshClientIdCookieIfNeeded();
  }, []);

  useEffect(() => {
    disableGoogleTranslate();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("wb-locale-change"));
    }
  }, []);

  useEffect(() => {
    getCategories()
      .then((cats) => setCategories(cats))
      .catch(() => {});
  }, []);

  const recommendedIds = useMemo(() => {
    if (!results || categories.length === 0) return [];
    const ids = results
      .map((r) => categories.find((c: any) => c.name === r.label)?.id)
      .filter((id): id is number => typeof id === "number");
    return Array.from(new Set(ids)).slice(0, 3);
  }, [results, categories]);

  useEffect(() => {
    if (modalOpen) {
      setAnimateBars(false);
      const t = setTimeout(() => setAnimateBars(true), 120);
      return () => clearTimeout(t);
    } else {
      setAnimateBars(false);
    }
  }, [modalOpen]);

  const handleChange = (idx: number, val: number) => {
    const next = [...answers];
    next[idx] = val;
    setAnswers(next);
  };

  const handleSubmit = async () => {
    setLoading(true);
    const start = Date.now();
    const filled = answers.map((v) => (v > 0 ? v : 3));

    let normalized: Result[];
    try {
      normalized = await runPrediction(filled);
    } catch {
      setLoading(false);
      return;
    }

    const elapsed = Date.now() - start;
    if (elapsed < 3000) {
      await new Promise((r) => setTimeout(r, 3000 - elapsed));
    }
    setResults(normalized);

    try {
      const top = normalized.slice(0, 3).map((r) => r.label);
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "wb_check_ai_result_v1",
          JSON.stringify({ topLabels: top, savedAt: Date.now() })
        );
      }
    } catch {}

    setLoading(false);
    setModalOpen(true);
  };

  return (
    <div className="w-full max-w-[760px] mx-auto px-2 sm:px-4 pb-28">
      <div className="relative mt-6 sm:mt-10 overflow-visible sm:overflow-hidden sm:rounded-3xl sm:bg-white/70 sm:ring-1 sm:ring-black/5 sm:shadow-[0_10px_40px_rgba(2,6,23,0.08)] sm:backdrop-blur">
        <div className="hidden sm:block pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-gradient-to-br from-sky-400/30 via-indigo-400/20 to-fuchsia-300/20 blur-3xl" />
        <div className="hidden sm:block pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-gradient-to-tr from-sky-400/30 via-indigo-400/20 to-fuchsia-300/20 blur-3xl" />
        <div className="relative p-4 sm:p-10">
          <div className="flex items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-12 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white grid place-items-center text-sm font-extrabold">
                AI
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
                  Supplement Recommendation Self-Check
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-gray-600">
                  Wellnessbox&apos;s supplement recommendation AI runs on an ONNX Runtime
                  deep learning model.
                </p>
                <p className="mt-2 text-[11px] sm:text-xs text-gray-500">
                  ※ Please check each item even if it only partially applies.
                </p>
              </div>
            </div>
            <div className="hidden sm:block min-w-[200px]">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Progress</span>
                <span className="tabular-nums">{completion}%</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100 ring-1 ring-inset ring-black/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-[width] duration-500"
                  style={{ width: `${completion}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 sm:hidden">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Progress</span>
              <span className="tabular-nums">{completion}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100 ring-1 ring-inset ring-black/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-[width] duration-500"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>

          <form className="mt-6 sm:mt-8 space-y-6 sm:space-y-7">
            {QUESTIONS.map((q, i) => (
              <fieldset
                key={i}
                className="group rounded-2xl border border-gray-100 p-3 sm:p-5 hover:border-sky-200 transition"
              >
                <legend className="px-1 text-[15px] sm:text-base font-semibold text-gray-900">
                  {q}
                </legend>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {OPTIONS.map((opt) => {
                    const active = answers[i] === opt.value;
                    const visualActive =
                      active || (answers[i] === 0 && opt.value === 3);
                    return (
                      <label
                        key={opt.value}
                        title={opt.label}
                        className={[
                          "relative cursor-pointer select-none rounded-xl px-3 py-0.5 sm:py-1 text-center ring-1 transition",
                          "bg-white ring-gray-200 hover:bg-gray-50",
                          visualActive
                            ? "ring-2 ring-sky-400 bg-sky-50/60"
                            : "",
                        ].join(" ")}
                      >
                        <input
                          type="radio"
                          name={`q-${i}`}
                          value={opt.value}
                          checked={active}
                          onChange={() => handleChange(i, opt.value)}
                          className="sr-only"
                        />
                        <span className="block h-9 leading-9 text-xs sm:text-[13px] text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis break-keep">
                          {opt.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}

            <div className="flex flex-col items-center sticky bottom-4 sm:bottom-6 mt-8">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                aria-busy={loading}
                className="w-full sm:w-4/5 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 px-6 py-2.5 sm:py-2.5 text-base font-extrabold text-white shadow-[0_12px_30px_rgba(56,121,255,0.35)] transition-all hover:from-sky-600 hover:to-indigo-600 active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-sky-300 disabled:opacity-60"
              >
                {loading ? "AI is analyzing..." : "View AI recommendations"}
              </button>
              <p className="mt-2 text-center text-[11px] text-gray-500">
                Unanswered items are normalized to the average value for analysis.
              </p>
            </div>
          </form>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 z-40 overflow-hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="absolute inset-0 animate-[pulseGlow_4s_ease-in-out_infinite] bg-[radial-gradient(60%_60%_at_50%_50%,rgba(56,121,255,0.12),transparent_70%)]" />
          <div className="relative z-10 h-full w-full grid place-items-center p-6">
            <div className="flex flex-col items-center">
              <div className="relative h-28 w-28">
                <div className="absolute inset-0 rounded-full animate-[spin_2.8s_linear_infinite] [background:conic-gradient(from_0deg,theme(colors.sky.400),theme(colors.indigo.500),theme(colors.sky.400))] [mask:radial-gradient(farthest-side,transparent_64%,#000_65%)]" />
                <div className="absolute inset-3 rounded-2xl bg-white/10 ring-1 ring-inset ring-white/20 backdrop-blur grid place-items-center text-white text-lg font-extrabold">
                  AI
                </div>
                <div className="absolute inset-0 rounded-full ring-2 ring-sky-400/30 animate-[ping_2.2s_cubic-bezier(0,0,0.2,1)_infinite]" />
              </div>
              <p className="mt-6 text-sm text-white/90">
                AI is recommending supplements for you
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-white/90 animate-[dotBounce_1.2s_ease-in-out_infinite]" />
                <span className="h-2 w-2 rounded-full bg-white/70 animate-[dotBounce_1.2s_ease-in-out_infinite] [animation-delay:.15s]" />
                <span className="h-2 w-2 rounded-full bg-white/60 animate-[dotBounce_1.2s_ease-in-out_infinite] [animation-delay:.3s]" />
              </div>
            </div>
          </div>
        </div>
      )}

      {modalOpen && Array.isArray(results) && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-md scale-100 rounded-2xl bg-white p-6 shadow-[0_20px_60px_rgba(2,6,23,0.25)] ring-1 ring-black/5 animate-[fadeIn_.18s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">
                AI Recommendation Results
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="h-9 w-9 rounded-full bg-gray-100 text-gray-500 grid place-items-center hover:bg-gray-200 focus:outline-none"
              >
                ×
              </button>
            </div>

            <p className="mt-3 text-sm text-gray-600">
              Below are the <span className="font-semibold text-sky-600">recommended categories</span>
              and the expected fit.
            </p>
            <p className="mt-1 text-[11px] text-gray-500">
              Wellnessbox&apos;s recommendation AI uses an ONNX Runtime deep learning model.
            </p>

            <ul className="mt-5 space-y-3">
              {results.map((r) => (
                <li
                  key={r.code}
                  className="relative overflow-hidden rounded-xl ring-1 ring-gray-100 bg-gray-50"
                >
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-200 to-indigo-200 transition-all duration-700 ease-out"
                    style={{
                      width: animateBars
                        ? `${Math.max(8, r.prob * 100)}%`
                        : "0%",
                    }}
                  />
                  <div className="relative flex items-center justify-between px-4 py-3">
                    <span className="text-sm font-semibold text-gray-800">
                      {displayLabel(r.code, r.label)}
                    </span>
                    <span className="tabular-nums text-sm font-extrabold text-gray-900">
                      {(r.prob * 100).toFixed(1)}%
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            <Link
              href={`/explore${
                recommendedIds.length
                  ? `?categories=${recommendedIds.join(",")}`
                  : ""
              }#home-products`}
              scroll={false}
              className="mt-6 block"
              onClick={showLoading}
            >
              <button className="w-full rounded-xl bg-sky-500 px-6 py-2 text-white font-bold shadow hover:bg-sky-600 active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-sky-300">
                Shop now
              </button>
            </Link>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes pulseGlow {
          0%,
          100% {
            opacity: 0.7;
          }
          50% {
            opacity: 1;
          }
        }
        @keyframes dotBounce {
          0%,
          80%,
          100% {
            transform: translateY(0);
            opacity: 0.7;
          }
          40% {
            transform: translateY(-6px);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
