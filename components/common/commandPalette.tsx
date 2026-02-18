"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowTopRightOnSquareIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  ShoppingCartIcon,
} from "@heroicons/react/24/outline";

type PaletteAction = {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  run: () => void;
};

const OPEN_COMMAND_PALETTE_EVENT = "wb:open-command-palette";

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

export default function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const openPalette = useCallback(() => {
    setOpen(true);
  }, []);

  const openCartOverlay = useCallback(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event("wb:chat-close-dock"));
    sessionStorage.setItem("wbGlobalCartOpen", "1");
    localStorage.setItem("openCart", "true");
    window.dispatchEvent(new Event("openCart"));
  }, []);

  const focusHomeProducts = useCallback(() => {
    if (typeof window === "undefined") return;
    const target = document.getElementById("home-products");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    router.push("/#home-products");
  }, [router]);

  const actions = useMemo<PaletteAction[]>(
    () => [
      {
        id: "go-home",
        title: "홈으로 이동",
        description: "메인 페이지로 이동합니다.",
        keywords: ["home", "메인", "홈", "랜딩"],
        run: () => router.push("/"),
      },
      {
        id: "focus-products",
        title: "상품 섹션 보기",
        description: "건강기능식품 상품 목록으로 이동합니다.",
        keywords: ["products", "상품", "섹션", "home-products"],
        run: focusHomeProducts,
      },
      {
        id: "package-7",
        title: "7일 패키지 보기",
        description: "7일 패키지 필터를 적용합니다.",
        keywords: ["7day", "7일", "패키지"],
        run: () => router.push("/?package=7#home-products"),
      },
      {
        id: "package-30",
        title: "30일 패키지 보기",
        description: "30일 패키지 필터를 적용합니다.",
        keywords: ["30day", "30일", "패키지"],
        run: () => router.push("/?package=30#home-products"),
      },
      {
        id: "open-cart",
        title: "장바구니 열기",
        description: "현재 장바구니를 바로 엽니다.",
        keywords: ["cart", "장바구니", "checkout"],
        run: openCartOverlay,
      },
      {
        id: "open-agent",
        title: "AI 에이전트 열기",
        description: "우측 하단 AI 도크를 엽니다.",
        keywords: ["agent", "chat", "ai", "에이전트"],
        run: () => window.dispatchEvent(new Event("wb:chat-open-dock")),
      },
      {
        id: "go-chat",
        title: "채팅 페이지 이동",
        description: "AI 채팅 전용 페이지로 이동합니다.",
        keywords: ["chat", "채팅", "대화"],
        run: () => router.push("/chat"),
      },
      {
        id: "go-check-ai",
        title: "빠른검사 시작",
        description: "빠른검사 문진 페이지로 이동합니다.",
        keywords: ["check-ai", "빠른검사", "문진"],
        run: () => router.push("/check-ai"),
      },
      {
        id: "go-my-orders",
        title: "주문 조회 이동",
        description: "주문 조회 화면으로 이동합니다.",
        keywords: ["orders", "주문", "my-orders"],
        run: () => router.push("/my-orders"),
      },
      {
        id: "go-me",
        title: "내 정보 이동",
        description: "프로필 및 계정 설정 화면으로 이동합니다.",
        keywords: ["profile", "me", "내정보", "설정"],
        run: () => router.push("/me"),
      },
    ],
    [focusHomeProducts, openCartOverlay, router]
  );

  const filteredActions = useMemo(() => {
    const q = normalizeText(query);
    if (!q) return actions;
    return actions.filter((action) => {
      const haystacks = [action.title, action.description, ...action.keywords];
      return haystacks.some((value) => normalizeText(value).includes(q));
    });
  }, [actions, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  useEffect(() => {
    const onOpenFromEvent = () => openPalette();
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpenFromEvent);
    return () => {
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpenFromEvent);
    };
  }, [openPalette]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isMetaK =
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k";
      if (isMetaK) {
        event.preventDefault();
        setOpen((prev) => !prev);
        return;
      }

      if (!open) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closePalette();
        return;
      }

      if (filteredActions.length === 0) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((prev) => (prev + 1) % filteredActions.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex(
          (prev) => (prev - 1 + filteredActions.length) % filteredActions.length
        );
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const action =
          filteredActions[Math.min(activeIndex, filteredActions.length - 1)];
        if (!action) return;
        closePalette();
        action.run();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeIndex, closePalette, filteredActions, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[180] flex items-start justify-center bg-slate-950/45 px-3 pt-[max(4.5rem,8vh)] backdrop-blur-sm"
      onClick={closePalette}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(2,6,23,0.28)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2.5">
          <MagnifyingGlassIcon className="h-5 w-5 text-slate-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="명령 또는 페이지를 검색하세요..."
            className="h-8 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
          <kbd className="hidden rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-500 sm:inline-block">
            ESC
          </kbd>
        </div>

        <div className="max-h-[58vh] overflow-y-auto py-1.5">
          {filteredActions.length === 0 ? (
            <div className="px-4 py-7 text-sm text-slate-500">
              검색 결과가 없습니다.
            </div>
          ) : (
            filteredActions.map((action, index) => {
              const isActive = index === activeIndex;
              return (
                <button
                  key={action.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => {
                    closePalette();
                    action.run();
                  }}
                  className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition ${
                    isActive ? "bg-sky-50" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {action.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {action.description}
                    </p>
                  </div>
                  <ArrowTopRightOnSquareIcon
                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                      isActive ? "text-sky-600" : "text-slate-400"
                    }`}
                  />
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/70 px-3 py-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5">
                Ctrl
              </kbd>
              +
              <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5">
                K
              </kbd>
            </span>
            <span className="inline-flex items-center gap-1">
              <ShoppingCartIcon className="h-3.5 w-3.5" />
              장바구니/에이전트 바로 실행
            </span>
          </div>
          <span className="hidden items-center gap-1 sm:inline-flex">
            <ChatBubbleLeftRightIcon className="h-3.5 w-3.5" />
            현재 경로: {pathname}
          </span>
        </div>
      </div>
    </div>
  );
}

