"use client";

import dynamic from "next/dynamic";

const CanonicalHostRedirect = dynamic(
  () => import("./canonicalHostRedirect.client"),
  {
    ssr: false,
  }
);
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
      <CanonicalHostRedirect />
      <AppDeepLinkHandler />
      <KakaoExternalBridge />
      <PullToRefresh />
    </>
  );
}
