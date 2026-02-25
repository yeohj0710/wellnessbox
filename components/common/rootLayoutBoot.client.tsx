"use client";

import dynamic from "next/dynamic";

const AppDeepLinkHandler = dynamic(() => import("./appDeepLinkHandler"), {
  ssr: false,
});
const KakaoExternalBridge = dynamic(() => import("./kakaoExternalBridge"), {
  ssr: false,
});
const PullToRefresh = dynamic(() => import("./pullToRefresh"), {
  ssr: false,
});

export default function RootLayoutBoot() {
  return (
    <>
      <AppDeepLinkHandler />
      <KakaoExternalBridge />
      <PullToRefresh />
    </>
  );
}
