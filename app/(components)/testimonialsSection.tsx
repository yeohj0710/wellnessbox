"use client";

import { pretendard } from "../fonts";
import type { TestimonialItem } from "./testimonials.types";
import { useTestimonialsCarousel } from "./useTestimonialsCarousel";
import { TestimonialsCarouselViewport } from "./testimonialsCarouselViewport";

const ITEMS: TestimonialItem[] = [
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
  const { trackRef, progress, itemsLocal } = useTestimonialsCarousel(ITEMS);

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

        <TestimonialsCarouselViewport
          trackRef={trackRef}
          items={itemsLocal}
          progress={progress}
        />
      </div>
    </section>
  );
}
