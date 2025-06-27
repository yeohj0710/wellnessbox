"use client";

import { useFooter } from "@/components/common/footerContext";
import { useEffect, useRef } from "react";

export default function About() {
  const videoRef1 = useRef<HTMLVideoElement>(null);
  const videoRef2 = useRef<HTMLVideoElement>(null);
  const { showFooter } = useFooter();
  useEffect(() => {
    let video1 = videoRef1.current!;
    let video2 = videoRef2.current!;
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
  }, []);
  return (
    <div className="relative h-[100vh] w-full overflow-hidden">
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef1}
          src="/background.mp4"
          className="absolute inset-0 w-full h-full object-cover
            opacity-100 transition-opacity duration-1000 ease-in-out
            filter brightness-110 pointer-events: none
          "
          muted
          autoPlay
        />
        <video
          ref={videoRef2}
          src="/background.mp4"
          className="
            absolute inset-0 w-full h-full object-cover
            opacity-0 transition-opacity duration-1000 ease-in-out
            filter brightness-110 pointer-events: none
          "
          muted
        />
        <div className="absolute inset-0 bg-black/30"></div>
      </div>
      <div className="relative z-10 mt-8 w-full max-w-[800px] mx-auto px-6 sm:px-12 py-10 bg-white/0 text-center">
        <h1 className="text-3xl font-bold text-white mb-10">
          약국에서만 파는 약국 전용 영양제, 집에서도 주문해요
        </h1>
        <p className="text-white leading-relaxed break-words">
          다른 온라인 쇼핑몰에서는 살 수 없는{" "}
          <b>약국에서만 판매하는 약국 전용 영양제</b>
          를, 웰니스박스에서 제공해요. <br />
          <br />
          짝퉁, 가품 논란이 끊이지 않는 다른 온라인 쇼핑몰에서 영양제, 비타민을
          구매하는 것은 믿기 어렵죠. <br />
          약국에서 직접 판매하는 건강기능식품들을 온라인으로 편하게 확인하고,
          주문해 보세요. <br />
          <br />
          <b>웰니스박스</b>는 진짜인지 믿을 수 없는, 아무 영양제나 판매하는
          온라인 쇼핑몰과는 <b>3가지</b>가 다릅니다. <br />
          <br />
          <span className="font-bold">
            1. 약국에서만 판매하는 믿을 수 있는 고효능 영양제 <br />
            2. 친절한 약사님과 메시지 상담을 통한 복약 지도 <br />
            3. 믿을 수 있는 약사님이 직접 조제, 포장하는 상품 <br />
          </span>
          <br />
        </p>
      </div>
    </div>
  );
}
