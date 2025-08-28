"use client";

import { useFooter } from "@/components/common/footerContext";
import { useEffect, useRef } from "react";

export default function About() {
  const videoRef1 = useRef<HTMLVideoElement>(null);
  const videoRef2 = useRef<HTMLVideoElement>(null);
  const { showFooter } = useFooter();

  useEffect(() => {
    const video1 = videoRef1.current!;
    const video2 = videoRef2.current!;
    let activeVideo = video1;
    let inactiveVideo = video2;
    const handleCrossfade = () => {
      activeVideo.classList.remove("opacity-100");
      activeVideo.classList.add("opacity-0");
      inactiveVideo.classList.remove("opacity-0");
      inactiveVideo.classList.add("opacity-100");
      inactiveVideo.currentTime = 0;
      inactiveVideo.play().catch(() => null);
      [activeVideo, inactiveVideo] = [inactiveVideo, activeVideo];
    };
    video1.muted = true;
    video2.muted = true;
    video1.playbackRate = 0.75;
    video2.playbackRate = 0.75;
    video1.play().catch(() => null);
    video1.addEventListener("ended", handleCrossfade);
    video2.addEventListener("ended", handleCrossfade);
    showFooter();
    window.scrollTo(0, 0);
    return () => {
      video1.removeEventListener("ended", handleCrossfade);
      video2.removeEventListener("ended", handleCrossfade);
    };
  }, [showFooter]);

  return (
    <div className="relative h-[100vh] w-full overflow-hidden">
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef1}
          src="/background.mp4"
          className="absolute inset-0 w-full h-full object-cover opacity-100 transition-opacity duration-1000 ease-in-out filter brightness-110 pointer-events-none"
          muted
          autoPlay
        />
        <video
          ref={videoRef2}
          src="/background.mp4"
          className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-1000 ease-in-out filter brightness-110 pointer-events-none"
          muted
        />
        <div className="absolute inset-0 bg-black/30" />
      </div>
      <div className="relative z-10 mt-8 w-full max-w-[800px] mx-auto px-6 sm:px-12 py-10 bg-white/0 text-center">
        <h1 className="text-3xl font-bold text-white mb-10">내 몸에 맞는 프리미엄 건강 솔루션</h1>
        <p className="text-white leading-relaxed break-words">
          내 몸에 맞는 프리미엄 건강 솔루션을, 웰니스박스에서 제공합니다.
          <br />
          <br />
          믿을 수 있는 정품만 취급하며, 합리적인 가격으로 제공합니다.
          <br />한국에서도 안심하고 구매하실 수 있도록 꼼꼼히 준비했어요.
          <br />
          <br />
          <span className="font-bold">
            1. 검증된 고효능 영양제만 선별
            <br />
            2. 친절한 상담과 복약 가이드 제공
            <br />
            3. 믿을 수 있는 파트너와의 협업으로 안전한 배송
            <br />
          </span>
          <br />
        </p>
      </div>
    </div>
  );
}
