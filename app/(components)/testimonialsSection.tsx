"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
    headline: "“아침이 다릅니다.”",
    body: "기존에 멜라토닌만 먹었는데 효과를 잘 모르겠어서 시작했어요. AI가 복용 중인 약과 수면패턴을 분석해서 구성해준다는데 체감 효과가 분명히 있어요. 아침 피로가 훨씬 덜해졌어요!!",
  },
  {
    id: 2,
    img: "/landingPage2/testimonials/pills.png",
    rating: "4.5/5",
    name: "리셋하고싶은월요일",
    role: "7일치만 먼저 복용 중",
    headline: "“7일치만 먼저 받아볼 수 있어서 좋아요!”",
    body: "사실 기존에도 영양제는 많지만, 뭘 사야 할지 늘 헷갈렸어요. 웰니스박스는 진짜 필요한 것만 딱 골라주고 7일씩 복용할 수 있어서 부담도 적더라고요.",
  },
  {
    id: 3,
    img: "/landingPage2/testimonials/gymbag.png",
    rating: "4.5/5",
    name: "운동하는개발자",
    role: "17회차 정기구독자",
    headline: "“이건 그냥 뜯어 먹기만 하면 돼요.”",
    body: "PT 받으면서 영양 보충도 챙기고 싶었는데 하루치씩 소분된 파우치가 너무 간편해요. 헬스 가방에 넣기 딱. 매번 챙기기 귀찮았는데, 무거운 병 없이 필요한 것만 간단하게, 효율적이에요.",
  },
  {
    id: 4,
    img: "/landingPage2/testimonials/tablets.png",
    rating: "5/5",
    name: "50대, 다시 시작",
    role: "5회차 정기구독자",
    headline: "“갱년기 영양제도 섬세하게 나오네요..”",
    body: "병원에서 종합영양제 추천받고도 반신반의했는데, 여기는 내 증상 기반으로 필요한 성분만 골라주는 게 좋아요. 갱년기 영양제도 엄선해서 보내주시고, 약사님이 조합해주신다고 하니 불필요한 걱정도 사라졌어요.",
  },
  {
    id: 5,
    img: "/landingPage2/testimonials/keyboard.png",
    rating: "5/5",
    name: "취준백단",
    role: "2회차 정기구독자",
    headline: "“집중력 개선에 도움된다는 게 진짜였어요”",
    body: "복용 시작한 지 2주째인데 확실히 덜 멍해요. 중요한 건 매일 잊지 않고 챙기게 해준다는 점. 예전엔 약병을 들고 다니거나, 매일 아침 어떤 걸 먹을지 찾아보다가 결국 안 챙기기 일쑤였거든요.",
  },
];

export default function TestimonialsSection() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const pauseRef = useRef(false);
  const dragRef = useRef(false);
  const startXRef = useRef(0);
  const startPosRef = useRef(0);
  const posRef = useRef(0);
  const halfRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const idleRef = useRef<number | null>(null);
  const [progress, setProgress] = useState(0);

  const ITEMS_LOCAL = [...ITEMS, ...ITEMS];

  const applyTransform = () => {
    const el = trackRef.current;
    if (!el) return;
    el.style.transform = `translate3d(${posRef.current}px,0,0)`;
  };

  const normalize = () => {
    const h = halfRef.current || 1;
    while (posRef.current <= -h) posRef.current += h;
    while (posRef.current >= 0) posRef.current -= h;
  };

  const updateProgress = () => {
    const h = halfRef.current || 1;
    const p = ((-posRef.current % h) + h) % h;
    setProgress(p / h);
  };

  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => {
      halfRef.current = el.scrollWidth / 2;
    };
    measure();
    applyTransform();
    const ro = new ResizeObserver(() => {
      measure();
      normalize();
      applyTransform();
      updateProgress();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let last = performance.now();
    const speed = 0.45;
    const step = (t: number) => {
      const dt = Math.min(32, t - last);
      last = t;
      if (!pauseRef.current && halfRef.current > 0) {
        posRef.current -= speed * (dt / 16);
        normalize();
        applyTransform();
        updateProgress();
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const resumeSoon = () => {
      pauseRef.current = true;
      if (idleRef.current) clearTimeout(idleRef.current);
      idleRef.current = window.setTimeout(
        () => (pauseRef.current = false),
        800
      );
    };
    const onPointerDown = (e: PointerEvent) => {
      pauseRef.current = true;
      dragRef.current = true;
      startXRef.current = e.clientX;
      startPosRef.current = posRef.current;
      el.setPointerCapture(e.pointerId);
      el.style.cursor = "grabbing";
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      e.preventDefault();
      posRef.current = startPosRef.current + (e.clientX - startXRef.current);
      normalize();
      applyTransform();
      updateProgress();
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!dragRef.current) return;
      dragRef.current = false;
      el.releasePointerCapture(e.pointerId);
      el.style.cursor = "";
      resumeSoon();
    };
    const onWheel = (e: WheelEvent) => {
      pauseRef.current = true;
      const delta =
        Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      posRef.current -= delta;
      normalize();
      applyTransform();
      updateProgress();
      resumeSoon();
    };
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);
    el.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  return (
    <section
      className={`relative isolate w-full overflow-hidden bg-gradient-to-b from-white via-[#EAF1FF] to-[#EEF3FF] py-16 sm:py-20 md:py-24 ${pretendard.className}`}
    >
      <div className="pointer-events-none absolute inset-x-0 -bottom-14 h-28 bg-[linear-gradient(to_top,#EEF3FF,rgba(238,243,255,0))]" />
      <div className="pointer-events-none absolute -left-24 -top-20 h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(closest-side,rgba(120,150,255,0.16),transparent)]" />
      <div className="pointer-events-none absolute -right-28 top-24 h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(closest-side,rgba(140,120,255,0.14),transparent)]" />

      <div className="relative mx-auto max-w-[100rem] px-4 sm:px-6 md:px-10">
        <div className="text-center">
          <p className="text-xs sm:text-sm font-semibold tracking-widest text-[#4B63E6]">
            REAL EXPERIENCES
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[#0F1222]">
            나만을 위한 웰니스,
            <br />
            구독자들의 이야기가{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#1E40FF] via-[#3B5BFF] to-[#6C4DFF]">
              증명합니다.
            </span>
          </h2>
        </div>

        <div className="relative mt-8 sm:mt-10">
          <div className="pointer-events-none absolute left-0 right-0 bottom-0 h-24 -z-10 bg-[linear-gradient(to_top,#EAF1FF,rgba(234,241,255,0))]" />
          <div className="pointer-events-none absolute -left-8 top-0 bottom-0 w-16 bg-[linear-gradient(to_right,#EAF1FF,rgba(234,241,255,0))]" />
          <div className="pointer-events-none absolute -right-8 top-0 bottom-0 w-16 bg-[linear-gradient(to_left,#EAF1FF,rgba(234,241,255,0))]" />

          <div className="relative overflow-hidden px-2 sm:px-0 select-none bg-[#EAF1FF]">
            <div
              ref={trackRef}
              className="will-change-transform flex gap-5 md:gap-6"
              style={{ transform: "translate3d(0,0,0)", touchAction: "pan-y" }}
            >
              {ITEMS_LOCAL.map((t, i) => (
                <article
                  key={`${t.id}-${i}`}
                  className="flex-none w-[290px] sm:w-[360px] md:w-[420px] rounded-[22px] bg-white ring-1 ring-[#E7E9FF] shadow-[0_18px_60px_-20px_rgba(67,103,230,0.25)] overflow-hidden"
                >
                  <div className="relative h-[170px] sm:h-[190px] md:h-[210px]">
                    <Image
                      src={t.img}
                      alt={t.name}
                      fill
                      sizes="(min-width:1024px) 420px, 70vw"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(to_top,#2F45B0_0%,rgba(98,123,247,0)_100%)] opacity-90" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#2F45B0]/70 via-[#2F45B0]/40 to-transparent" />
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
