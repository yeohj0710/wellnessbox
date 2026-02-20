"use client";

import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  EMPTY_LOGIN_STATUS,
  getLoginStatus,
  normalizeLoginStatusResponse,
  type LoginStatus,
} from "@/lib/useLoginStatus";
import { readClientCartItems } from "@/lib/client/cart-storage";
import { consumeCartScrollRestoreForPath } from "@/lib/client/cart-navigation";

export function useTopBarLoginStatus(
  pathname: string | null,
  isDrawerOpen: boolean
) {
  const [loginStatus, setLoginStatus] = useState<LoginStatus | null>(null);
  const reqSeqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const refreshLoginStatus = useCallback(async () => {
    reqSeqRef.current += 1;
    const seq = reqSeqRef.current;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const status = await getLoginStatus(ac.signal);
      if (ac.signal.aborted) return;
      if (seq !== reqSeqRef.current) return;
      setLoginStatus(normalizeLoginStatusResponse(status));
    } catch {
      if (ac.signal.aborted) return;
      if (seq !== reqSeqRef.current) return;
      setLoginStatus(EMPTY_LOGIN_STATUS);
    }
  }, []);

  useEffect(() => {
    refreshLoginStatus();
    return () => {
      abortRef.current?.abort();
    };
  }, [refreshLoginStatus]);

  useEffect(() => {
    refreshLoginStatus();
  }, [pathname, refreshLoginStatus]);

  useEffect(() => {
    const onFocus = () => refreshLoginStatus();
    const onVisibilityChange = () => {
      if (!document.hidden) refreshLoginStatus();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refreshLoginStatus]);

  useEffect(() => {
    if (!isDrawerOpen) return;
    refreshLoginStatus();
  }, [isDrawerOpen, refreshLoginStatus]);

  return { loginStatus, refreshLoginStatus };
}

export function useTopBarCartCount() {
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const updateCartCount = () => {
      setTimeout(() => {
        if (typeof window === "undefined") return;
        try {
          setCartCount(readClientCartItems().length);
        } catch {
          setCartCount(0);
        }
      }, 0);
    };

    updateCartCount();
    window.addEventListener("cartUpdated", updateCartCount);
    return () => {
      window.removeEventListener("cartUpdated", updateCartCount);
    };
  }, []);

  return cartCount;
}

export function useTopBarLogoBounce(logoRef: RefObject<HTMLImageElement | null>) {
  useEffect(() => {
    const interval = setInterval(() => {
      if (!logoRef.current) return;
      logoRef.current.classList.add("animate-bounce-custom");
      setTimeout(() => {
        logoRef.current?.classList.remove("animate-bounce-custom");
      }, 1200);
    }, 30000);

    return () => clearInterval(interval);
  }, [logoRef]);
}

export function useTopBarCartScrollRestore(
  pathname: string | null,
  searchParamsString: string
) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const pathWithSearch = `${pathname || "/"}${
      searchParamsString ? `?${searchParamsString}` : ""
    }`;
    const restoreY = consumeCartScrollRestoreForPath(pathWithSearch);
    if (typeof restoreY !== "number") return;

    const restore = () => {
      window.scrollTo(0, restoreY);
      requestAnimationFrame(() => window.scrollTo(0, restoreY));
    };
    requestAnimationFrame(restore);
  }, [pathname, searchParamsString]);
}
