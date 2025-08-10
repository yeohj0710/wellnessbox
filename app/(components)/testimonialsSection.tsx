"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { pretendard } from "../fonts";

type TItem = {
  id: number;
  img: string;
  rating: string;
  name: string;
  role: string;
  headline: string;
  body: string;
};

const ITEMS: TItem[] = [
  {
    id: 1,
    img: "/landingPage2/testimonials/sleep.png",
    rating: "5/5",
    name: "잠이보약",
    role: "9회차 정기구독자",
    headline: "“잠의 질이 다릅니다.”",
    body: "멜라토닌만으론 몰랐던 효과를 정기구독으로 체감했어요. 새벽 중간에 깨는 일이 줄고 아침 피로가 확실히 덜해졌습니다. 꾸준히 먹으니 효과가 분명했어요.",
  },
  {
    id: 2,
    img: "/landingPage2/testimonials/pills.jpg",
    rating: "4.5/5",
    name: "리셋하고싶은월요일",
    role: "7일 무료 체험 중",
    headline: "“7일치만 먼저 받아볼 수 있어서 좋아요!”",
    body: "평일엔 일정이 들쭉날쭉한 편인데 7일 단위가 딱 맞아요. 일단 부담 없이 체험해 보고 맞으면 구독으로 전환할 수 있어 유연하게 관리할 수 있었어요.",
  },
  {
    id: 3,
    img: "/landingPage2/testimonials/gymbag.jpg",
    rating: "4.5/5",
    name: "운동하는개발자",
    role: "17회차 정기구독자",
    headline: "“이건 그냥 뜯어 먹기만 하면 돼요.”",
    body: "헬스 가방에 7일 분량으로 넣어 다니니 매일 챙기기 편합니다. 무게도 가볍고 필요할 것만 간단하게 구성돼 운동 루틴에 방해가 안 돼요.",
  },
  {
    id: 4,
    img: "/landingPage2/testimonials/tablets.jpg",
    rating: "5/5",
    name: "50대, 다시 시작",
    role: "5회차 정기구독자",
    headline: "“갱년기 영양제도 섬세하게 나오네요..”",
    body: "초기 상담에서 증상과 복용 약을 꼼꼼히 반영해줘서 안심됐어요. 약사의 피드백대로 조정해 주니 불편했던 증상도 서서히 가라앉았습니다.",
  },
  {
    id: 5,
    img: "/landingPage2/testimonials/keyboard.jpg",
    rating: "5/5",
    name: "취준백단",
    role: "2회차 정기구독자",
    headline: "“집중력 개선에 도움됩니다.”",
    body: "오후만 되면 흐려지던 집중력이 꽤 오래 유지돼요. 알람으로 복용 리듬도 잡히고, 면접 준비할 때 컨디션이 일정해져서 유용했습니다.",
  },
];

export default function TestimonialsSection() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const pauseRef = useRef(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let raf = 0;
    const step = () => {
      if (!pauseRef.current) {
        const half = el.scrollWidth / 2;
        el.scrollLeft += 0.6;
        if (el.scrollLeft >= half) el.scrollLeft -= half;
        setProgress((el.scrollLeft % half) / half);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const pause = () => (pauseRef.current = true);
    const resume = () => (pauseRef.current = false);
    const kick = () => {
      pauseRef.current = true;
      window.clearTimeout((kick as any)._t);
      (kick as any)._t = window.setTimeout(
        () => (pauseRef.current = false),
        1800
      );
    };
    el.addEventListener("mouseenter", pause);
    el.addEventListener("mouseleave", resume);
    el.addEventListener("pointerdown", pause);
    el.addEventListener("pointerup", kick);
    el.addEventListener("wheel", kick, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("mouseenter", pause);
      el.removeEventListener("mouseleave", resume);
      el.removeEventListener("pointerdown", pause);
      el.removeEventListener("pointerup", kick);
      el.removeEventListener("wheel", kick);
    };
  }, []);

  const doubled = [...ITEMS, ...ITEMS];

  return (
    <section
      className={`relative w-full overflow-hidden bg-gradient-to-b from-white via-[#EAF1FF] to-white py-16 sm:py-20 md:py-24 ${pretendard.className}`}
    >
      <div className="pointer-events-none absolute -left-24 -top-20 h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(closest-side,rgba(120,150,255,0.16),transparent)]" />
      <div className="pointer-events-none absolute -right-28 top-24 h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(closest-side,rgba(140,120,255,0.14),transparent)]" />

      <div className="relative mx-auto max-w-[100rem] px-4 sm:px-6 md:px-10">
        <div className="text-center">
          <p className="text-xs sm:text-sm font-semibold tracking-widest text-[#4B63E6]">
            REAL EXPERIENCES
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[#0F1222]">
            나만을 위한 웰니스,
            <br className="hidden sm:block" />
            구독자들의 이야기가{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#1E40FF] via-[#3B5BFF] to-[#6C4DFF]">
              증명합니다.
            </span>
          </h2>
        </div>

        <div className="relative mt-8 sm:mt-10">
          <div className="pointer-events-none absolute -left-8 top-0 bottom-0 w-16 bg-gradient-to-r from-[#EAF1FF] to-transparent" />
          <div className="pointer-events-none absolute -right-8 top-0 bottom-0 w-16 bg-gradient-to-l from-[#EAF1FF] to-transparent" />

          <div
            ref={trackRef}
            className="relative flex gap-5 md:gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory px-2 sm:px-0"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {doubled.map((t, i) => (
              <article
                key={`${t.id}-${i}`}
                className="min-w-[290px] sm:min-w-[360px] md:min-w-[420px] snap-center rounded-[22px] bg-white ring-1 ring-[#E7E9FF] shadow-[0_18px_60px_-20px_rgba(67,103,230,0.25)] overflow-hidden"
              >
                <div className="relative h-[170px] sm:h-[190px] md:h-[210px]">
                  <Image
                    src={t.img}
                    alt={t.name}
                    fill
                    priority
                    sizes="(min-width:1024px) 420px, 70vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-[#2D47D8]/0 via-[#2D47D8]/10 to-[#2D47D8]/65" />
                  <div className="absolute left-3 top-3 inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-[#3341FF]">
                    {t.rating}
                  </div>
                  <div className="absolute left-4 bottom-4 flex items-center gap-3 text-white">
                    <span className="h-6 w-6 rounded-full bg-white/85 ring-1 ring-white/70" />
                    <div>
                      <div className="text-sm font-semibold leading-none">
                        {t.name}
                      </div>
                      <div className="mt-1 text-[11px] opacity-90">
                        {t.role}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-5 sm:px-6 py-5">
                  <h3 className="text-base sm:text-lg font-extrabold text-[#0F1222]">
                    {t.headline}
                  </h3>
                  <p className="mt-2 text-[13px] sm:text-sm leading-relaxed text-[#4B5168]">
                    {t.body}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <div className="h-1.5 w-44 sm:w-56 md:w-64 rounded-full bg-[#D9E2FF] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#5A6BFF]"
                style={{
                  width: `${Math.min(100, Math.max(0, progress * 100))}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
