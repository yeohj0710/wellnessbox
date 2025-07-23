"use client";
import Image from "next/image";

export default function LandingSection() {
  return (
    <section className="w-full max-w-[640px] mx-auto mt-8 bg-white overflow-hidden rounded-md shadow-sm">
      <div className="relative h-64 w-full">
        <video
          src="/background.mp4"
          autoPlay
          loop
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-start pt-12 sm:pt-14 text-center px-6">
          <h1 className="text-2xl font-bold text-white mb-4">
            필요한 기간만큼, 믿을 수 있게
          </h1>
          <p className="text-sm text-white leading-relaxed">
            나한테 잘 맞을지 모르는데, 비싼 영양제를 통째로 사기에는 망설여지죠.
            <br />
            웰니스박스에서 7일치만 구매해 보세요.
            <br />
            믿을 수 있는 약사님이 직접, 한 알씩 개별 포장해 드립니다.
          </p>
        </div>
      </div>
    </section>
  );
}
