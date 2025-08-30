"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { usePathname } from "next/navigation";
import Footer from "@/components/common/footer";

type FooterContextType = {
  isFooterVisible: boolean;
  showFooter: () => void;
  hideFooter: () => void;
};

const FooterContext = createContext<FooterContextType | undefined>(undefined);

export function FooterProvider({ children }: { children: ReactNode }) {
  const [isFooterVisible, setFooterVisible] = useState(true);
  const pathname = usePathname();
  const forcedHidden = pathname?.startsWith("/chat");
  const showFooter = () => setFooterVisible(true);
  const hideFooter = () => setFooterVisible(false);
  const shouldRender = !forcedHidden && isFooterVisible;
  return (
    <FooterContext.Provider value={{ isFooterVisible, showFooter, hideFooter }}>
      {children}
      {shouldRender && <Footer />}
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
