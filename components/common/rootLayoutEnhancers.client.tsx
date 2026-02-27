"use client";

import dynamic from "next/dynamic";

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

export default function RootLayoutEnhancers() {
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
