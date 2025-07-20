"use client";
import Image from "next/image";

export default function LandingSection() {
  return (
    <section className="w-full max-w-[640px] mx-auto mt-8 bg-white overflow-hidden rounded-md shadow-sm">
      <div className="relative h-40 sm:h-56 w-full">
        <video
          src="/background.mp4"
          autoPlay
          loop
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-center px-6">
          <h1 className="text-2xl font-bold text-white mb-4">
            필요한 기간만큼, 믿을 수 있게
          </h1>
          <p className="text-sm text-white leading-relaxed">
            영양제를 7일치, 30일치와 같이 원하는 기간만큼 소분 구매해요.
            <br />
            믿을 수 있는 약사님이 직접 포장하여 배송해 드립니다.
          </p>
        </div>
      </div>
    </section>
  );
}
