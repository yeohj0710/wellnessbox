'use client';

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
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
