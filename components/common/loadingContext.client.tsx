'use client';

import Image from "next/image";
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useRef,
  useEffect,
} from "react";

interface LoadingContextType {
  showLoading: () => void;
  hideLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showLoading = () => {
    setIsLoading(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsLoading(false);
      timeoutRef.current = null;
    }, 1000);
  };

  const hideLoading = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsLoading(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading }}>
      {children}
      {isLoading && (
        <>
          <div className="pointer-events-none fixed left-0 right-0 top-14 z-[10000] h-[2px] overflow-hidden">
            <div className="h-full w-1/3 bg-gradient-to-r from-sky-400 via-indigo-500 to-sky-400 animate-[wb-route-loading-progress_1s_ease-in-out_infinite]" />
          </div>
          <div className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center bg-white/18 backdrop-blur-[2px]">
            <div className="relative h-16 w-16">
              <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-sky-400/30 to-indigo-400/30 blur-xl animate-[wb-route-loading-glow_1.6s_ease-in-out_infinite]" />
              <div className="absolute inset-0 rounded-full bg-white/60 shadow-lg backdrop-blur-md" />
              <div className="absolute inset-0 animate-spin">
                <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-sky-500 shadow" />
              </div>
              <Image
                src="/logo.png"
                alt="웰니스박스 로딩"
                width={28}
                height={28}
                sizes="28px"
                className="absolute inset-0 m-auto h-7 w-7 animate-pulse"
                priority
              />
            </div>
          </div>
          <style jsx global>{`
            @keyframes wb-route-loading-progress {
              0% {
                transform: translateX(-100%);
              }
              100% {
                transform: translateX(300%);
              }
            }
            @keyframes wb-route-loading-glow {
              0%,
              100% {
                opacity: 0.55;
                filter: blur(14px);
              }
              50% {
                opacity: 0.9;
                filter: blur(22px);
              }
            }
          `}</style>
        </>
      )}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used within LoadingProvider");
  }
  return context;
}
