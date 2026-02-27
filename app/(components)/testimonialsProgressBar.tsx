"use client";

type TestimonialsProgressBarProps = {
  progress: number;
};

export function TestimonialsProgressBar({ progress }: TestimonialsProgressBarProps) {
  const width = `${Math.min(100, Math.max(0, progress * 100))}%`;

  return (
    <div className="mt-8 flex justify-center">
      <div className="h-1.5 w-44 sm:w-56 md:w-64 rounded-full bg-[#D9E2FF] overflow-hidden">
        <div className="h-full rounded-full bg-[#5A6BFF]" style={{ width }} />
      </div>
    </div>
  );
}
