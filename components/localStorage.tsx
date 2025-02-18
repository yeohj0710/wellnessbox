"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface LocalStorageContextProps {
  getValue: <T = any>(key: string) => T | null;
  setValue: <T = any>(key: string, newValue: T) => void;
}

const LocalStorageContext = createContext<LocalStorageContextProps | undefined>(
  undefined
);

export const LocalStorageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [storage, setStorage] = useState<Record<string, any>>({});
  useEffect(() => {
    const handleChunkError = (e: ErrorEvent) => {
      if (e.message && e.message.includes("ChunkLoadError")) {
        window.location.reload();
      }
    };
    window.addEventListener("error", handleChunkError);
    return () => window.removeEventListener("error", handleChunkError);
  }, []);
  useEffect(() => {
    const allKeys = Object.keys(localStorage);
    const initialStorage: Record<string, any> = {};
    allKeys.forEach((key) => {
      try {
        const value = JSON.parse(localStorage.getItem(key) || "null");
        if (value !== null) {
          initialStorage[key] = value;
        }
      } catch {
        initialStorage[key] = localStorage.getItem(key);
      }
    });
    setStorage(initialStorage);
  }, []);
  const getValue = <T = any,>(key: string): T | null => {
    return storage[key] || null;
  };
  const setValue = <T = any,>(key: string, newValue: T) => {
    setStorage((prev) => ({ ...prev, [key]: newValue }));
    localStorage.setItem(key, JSON.stringify(newValue));
  };
  return (
    <LocalStorageContext.Provider value={{ getValue, setValue }}>
      {children}
    </LocalStorageContext.Provider>
  );
};

export const useLocalStorage = () => {
  const context = useContext(LocalStorageContext);
  if (!context) {
    throw new Error(
      "useLocalStorage must be used within a LocalStorageProvider"
    );
  }
  return context;
};
