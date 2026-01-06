"use client";

import { pretendard } from "@/app/fonts";

interface PricingSectionProps {
  onSelect7Day: () => void;
  onSubscribe: () => void;
}

export default function PricingSection({
  onSelect7Day,
  onSubscribe,
}: PricingSectionProps) {
  return (
    <section
      className={`relative isolate -mt-px w-full overflow-visible bg-gradient-to-b from-[#F3F6FF] via-[#E6ECFF] to-white pt-20 sm:pt-24 md:pt-28 ${pretendard.className}`}
    >
      <div className="pointer-events-none absolute inset-x-0 -top-8 h-14 bg-gradient-to-b from-[#F3F6FF] to-transparent" />
      <div className="absolute inset-x-0 top-4 sm:top-6 md:top-8 pointer-events-none overflow-visible">
        <div className="relative mx-auto h-[5.5rem]">
          <div className="absolute left-1/2 -translate-x-1/2 -top-2 rotate-[-8deg] w-[230vw]">
            <div className="mx-auto flex h-10 items-center justify-center rounded-full bg-gradient-to-r from-[#59C1FF] to-[#7B61FF] shadow-[0_10px_30px_rgba(86,120,255,0.35)]">
              <div className="flex gap-10 text-white/95 text-xs sm:text-sm tracking-widest font-semibold whitespace-nowrap">
                <span>WELLNESS BOX</span>
                <span>WELLNESS BOX</span>
                <span>WELLNESS BOX</span>
                <span>WELLNESS BOX</span>
                <span>WELLNESS BOX</span>
                <span>WELLNESS BOX</span>
                <span>WELLNESS BOX</span>
                <span>WELLNESS BOX</span>
                <span>WELLNESS BOX</span>
                <span>WELLNESS BOX</span>
              </div>
            </div>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 top-5 rotate-[7deg] w-[235vw] opacity-95">
            <div className="mx-auto flex h-10 items-center justify-center rounded-full bg-gradient-to-r from-[#4AA8FF] to-[#6C4DFF] shadow-[0_8px_24px_rgba(86,120,255,0.28)]">
              <div className="flex gap-10 text-white/95 text-xs sm:text-sm tracking-widest font-semibold whitespace-nowrap">
                <span>WELLNESS BOX</span>
                <span>WELLNESS BOX</span>
                <span>WELLNESS BOX</span>
                <span>WELLNESS BOX</span>
                <span>WELLNESS BOX</span>
                <span>WELLNESS BOX</span>
                <span>WELLNESS BOX</span>
                <span>WELLNESS BOX</span>
                <span>WELLNESS BOX</span>
                <span>WELLNESS BOX</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative mx-auto max-w-[48rem] md:max-w-[50rem] lg:max-w-[52rem] px-4 sm:px-6 md:px-8 pt-12 sm:pt-14 md:pt-16 pb-12 sm:pb-14 md:pb-16">
        <div className="text-center">
          <p className="text-xs sm:text-sm font-semibold tracking-widest text-[#4B63E6]">
            START NOW
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#0F1222] leading-[1.28] sm:leading-[1.32] md:leading-[1.36]">
            지금 시작하고,
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#1E40FF] via-[#3B5BFF] to-[#6C4DFF]">
              7일치 복용
            </span>
            을 경험해보세요!
          </h2>
          <p className="mt-4 text-[13px] sm:text-sm md:text-base text-[#6F7690]">
            7일 간편 체험 후, 나에게 꼭 맞으면 정기구독으로 건강 습관을
            이어가세요.
          </p>
        </div>

        <div className="relative mt-8 sm:mt-10">
          <div className="pointer-events-none absolute -left-10 -top-8 h-24 w-24 rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.6),transparent)] blur-sm" />
          <div className="pointer-events-none absolute -right-8 bottom-3 h-28 w-28 rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.55),transparent)] blur-sm" />
          <div className="mx-auto grid grid-cols-1 md:grid-cols-none md:grid-flow-col md:auto-cols-max justify-center justify-items-center items-center md:justify-items-stretch md:items-stretch gap-6 md:gap-8">
            <div className="relative h-full w-[16rem] sm:w-[18rem] md:w-[19rem] lg:w-[20rem] rounded-[28px] bg-gradient-to-b from-[#5B4BFF] to-[#5637FF] px-5 sm:px-6 md:px-7 py-7 sm:py-9 md:py-10 text-white shadow-[0_28px_80px_-20px_rgba(77,76,220,0.55)] flex flex-col">
              <div className="absolute -top-3 left-4 inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-[#5A46FF] shadow-sm">
                간편한 체험
              </div>
              <div className="absolute -top-3 right-4 inline-flex items-center rounded-full bg-[#7C6CFF] px-3 py-1 text-[11px] font-semibold">
                베스트
              </div>
              <h3 className="text-base sm:text-lg font-bold">7일치 구매하기</h3>
              <div className="mt-2 text-[34px] sm:text-[38px] md:text-5xl font-extrabold leading-none tracking-tight">
                700
                <span className="text-xl sm:text-2xl md:text-3xl align-top">
                  ₩
                </span>
                <span className="ml-1 text-xs sm:text-sm md:text-base font-bold text-white/80">
                  부터
                </span>
              </div>
              <div className="mt-6 border-t border-white/25 pt-5 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </span>
                  <span className="text-sm">7일치 구매하기</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </span>
                  <span className="text-sm">7일 이내로 취소 가능</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </span>
                  <span className="text-sm">언제든지 정기구독 전환</span>
                </div>
              </div>
              <div className="mt-auto pt-7">
                <button
                  className="hover:scale-105 transition duration-300 h-11 sm:h-12 w-full rounded-full bg-white text-[#3B2BFF] text-sm sm:text-base font-semibold shadow-[0_8px_22px_rgba(255,255,255,0.35)]"
                  onClick={onSelect7Day}
                >
                  구독하기
                </button>
              </div>
            </div>

            <div className="relative h-full w-[16rem] sm:w-[18rem] md:w-[19rem] lg:w-[20rem] rounded-[28px] bg-white px-5 sm:px-6 md:px-7 py-7 sm:py-9 md:py-10 text-[#0F1222] shadow-[0_28px_80px_-22px_rgba(67,103,230,0.35)] ring-1 ring-[#E7E9FF]">
              <div className="absolute -top-3 left-4 inline-flex items-center rounded-full bg-[#EAF0FF] px-3 py-1 text-[11px] font-semibold text-[#3B5BFF]">
                첫 달 75% 할인
              </div>
              <div className="absolute -top-3 right-4 inline-flex items-center rounded-full bg-[#6C4DFF] px-3 py-1 text-[11px] font-semibold text-white">
                정기구독
              </div>
              <h3 className="text-base sm:text-lg font-bold">스탠다드</h3>
              <div className="mt-2 text-[34px] sm:text-[38px] md:text-5xl font-extrabold leading-none tracking-tight">
                19,000
                <span className="text-xl sm:text-2xl md:text-3xl align-top">
                  ₩
                </span>
                <span className="ml-1 text-xs sm:text-sm md:text-base font-bold text-[#5B5A74]">
                  / 월
                </span>
              </div>
              <div className="mt-6 border-t border-[#E9ECFF] pt-5 space-y-3">
                <div className="flex items-center gap-3 text-[#28314A]">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#EEF3FF] text-[#3B5BFF]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </span>
                  <span className="text-sm">첫 달 75% 파격적 할인</span>
                </div>
                <div className="flex items-center gap-3 text-[#28314A]">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#EEF3FF] text-[#3B5BFF]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </span>
                  <span className="text-sm">원하는 날짜에 맞춰 구독</span>
                </div>
                <div className="flex items-center gap-3 text-[#28314A]">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#EEF3FF] text-[#3B5BFF]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </span>
                  <span className="text-sm">무료 AI 약사 상담</span>
                </div>
                <div className="flex items-center gap-3 text-[#28314A]">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#EEF3FF] text-[#3B5BFF]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </span>
                  <span className="text-sm">정기 구독자를 위한 배송 편의</span>
                </div>
              </div>
              <div className="mt-7">
                <button
                  className="hover:scale-105 transition duration-300 h-11 sm:h-12 w-full rounded-full bg-white text-[#0F1222] text-sm sm:text-base ring-1 ring-[#E7E9FF] font-semibold shadow-[0_8px_22px_rgba(20,30,60,0.08)]"
                  onClick={onSubscribe}
                >
                  구독하기
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
