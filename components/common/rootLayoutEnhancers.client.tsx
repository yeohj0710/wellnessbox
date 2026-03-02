"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const AppBackHandler = dynamic(() => import("./appBackHandler"), {
  ssr: false,
});
const TopBar = dynamic(() => import("./topBar"), {
  ssr: false,
});
const GlobalCartHost = dynamic(() => import("@/components/order/globalCartHost"), {
  ssr: false,
});
const ChatCartActionHost = dynamic(
  () => import("@/components/chat/ChatCartActionHost"),
  {
    ssr: false,
  }
);
const DesktopChatDock = dynamic(() => import("@/components/chat/DesktopChatDock"), {
  ssr: false,
});
const CommandPalette = dynamic(() => import("./commandPalette"), {
  ssr: false,
});
const RouteChangeLoading = dynamic(() => import("./routeChangeLoading"), {
  ssr: false,
});
const RouteScrollPolicy = dynamic(() => import("./routeScrollPolicy"), {
  ssr: false,
});

function isPdfExportViewPath(pathname: string | null) {
  if (!pathname) return false;
  if (pathname === "/employee-report/export-view") return true;
  return pathname.startsWith("/admin/b2b-reports/export-view/");
}

export default function RootLayoutEnhancers() {
  const pathname = usePathname();
  if (isPdfExportViewPath(pathname)) {
    return null;
  }

  return (
    <>
      <RouteChangeLoading />
      <RouteScrollPolicy />
      <AppBackHandler />
      <TopBar />
      <GlobalCartHost />
      <ChatCartActionHost />
      <DesktopChatDock />
      <CommandPalette />
    </>
  );
}
