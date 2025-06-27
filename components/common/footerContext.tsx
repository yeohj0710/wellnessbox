"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import Footer from "@/components/common/footer";

type FooterContextType = {
  isFooterVisible: boolean;
  showFooter: () => void;
  hideFooter: () => void;
};

const FooterContext = createContext<FooterContextType | undefined>(undefined);

export function FooterProvider({ children }: { children: ReactNode }) {
  const [isFooterVisible, setFooterVisible] = useState(true);
  const showFooter = () => setFooterVisible(true);
  const hideFooter = () => setFooterVisible(false);
  return (
    <FooterContext.Provider value={{ isFooterVisible, showFooter, hideFooter }}>
      {children}
      {isFooterVisible && <Footer />}
    </FooterContext.Provider>
  );
}

export function useFooter() {
  const context = useContext(FooterContext);
  if (!context) {
    throw new Error("useFooter must be used within a FooterProvider");
  }
  return context;
}
