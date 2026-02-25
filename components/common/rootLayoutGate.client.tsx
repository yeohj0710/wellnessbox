"use client";

import dynamic from "next/dynamic";

const GoogleTranslateGate = dynamic(() => import("./GoogleTranslateGate"), {
  ssr: false,
});

export default function RootLayoutGate() {
  return <GoogleTranslateGate />;
}
