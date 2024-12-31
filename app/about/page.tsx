"use client";

import { useFooter } from "@/components/footerContext";
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
    <div className="relative h-[100vh] w-full mx-auto overflow-hidden">
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef1}
          src="/background.mp4"
          className="absolute inset-0 w-full h-full object-cover
            opacity-100 transition-opacity duration-1000 ease-in-out
            filter brightness-110
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
            filter brightness-110
          "
          muted
        />
        <div className="absolute inset-0 bg-black/30"></div>
      </div>
      <div className="relative z-10 mt-8 w-full max-w-[800px] mx-auto px-6 sm:px-12 py-10 bg-white/0 text-center">
        <h1 className="text-3xl font-bold text-white mb-10">
          건강기능식품, 왜 한 통씩 사야만 할까요?
        </h1>
        <p className="text-white leading-relaxed break-words">
          내 몸에 맞을지도 모르는 영양제, 비타민, 유산균을 박스 단위로 사는 건
          불필요하죠. <br className="hidden sm:inline" />
          이제는 원하는 만큼만 먹고, 체험해 보고, 몸에 맞는다면 그 때 더
          구매해요. <br />
          <br />
          웰니스박스에서는 친절한 동네 약사님과의 메시지 상담을 통해{" "}
          <br className="hidden sm:inline" />
          나에게 필요한 건강기능식품을 정확히 추천받고,{" "}
          <br className="hidden sm:inline" />
          7일분, 30일분처럼 원하는 만큼만 구매할 수 있어요. <br />
          <br />
          경제적 부담은 줄이고, 건강은 극대화시키는 나만의 맞춤형 건강 케어를
          실현하세요. <br className="hidden sm:inline" />
          웰니스박스는 고객님의 건강을 최우선으로 생각하는{" "}
          <br className="hidden sm:inline" />
          <span className="font-semibold">
            맞춤형 건강기능식품 소분 판매
          </span>{" "}
          중개 플랫폼입니다.
        </p>
      </div>
    </div>
  );
}
