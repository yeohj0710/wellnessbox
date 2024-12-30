"use client";

import { useEffect, useRef } from "react";

export default function About() {
  const videoRef1 = useRef<HTMLVideoElement>(null);
  const videoRef2 = useRef<HTMLVideoElement>(null);
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
    return () => {
      video1.removeEventListener("ended", handleCrossfade);
      video2.removeEventListener("ended", handleCrossfade);
    };
  }, []);
  return (
    <div className="relative h-[105vh] w-full mx-auto overflow-hidden">
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
        <h1 className="text-2xl font-bold text-white mb-10">
          맞춤형 건강기능식품 소분 판매 중개 플랫폼, 웰니스박스
        </h1>
        <p className="text-white leading-relaxed break-words">
          웰니스박스는 고객님의 건강을 최우선으로 생각하는 맞춤형 건강기능식품
          소분 판매 중개 플랫폼입니다. <br />
          최신 기술과 전문 상담을 통해 개인별 건강 상태에 적합한 건강기능식품을
          추천하며, 신뢰할 수 있는 품질을 보장합니다. 고객의 건강과 행복을 위해
          항상 노력하며, 지속 가능한 미래를 만들어 나가겠습니다.
        </p>
      </div>
    </div>
  );
}
