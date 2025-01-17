export const steps = [
  { label: "결제 완료" },
  { label: "상담 완료" },
  { label: "조제 완료" },
  { label: "픽업 완료" },
  { label: "배송 완료" },
];

export function getStatusClass(step: number, currentStatus: string) {
  const currentStepIndex =
    steps.findIndex((s) => s.label === currentStatus) + 1;
  return step < currentStepIndex
    ? "bg-sky-400 text-white"
    : step === currentStepIndex
    ? "bg-sky-400 text-white"
    : "bg-gray-200 text-gray-500";
}

export function getLineClass(step: number, currentStatus: string) {
  const currentStepIndex =
    steps.findIndex((s) => s.label === currentStatus) + 1;
  return step < currentStepIndex
    ? "bg-sky-400"
    : step === currentStepIndex
    ? "bg-sky-400 animate-pulse shadow-lg"
    : "bg-gray-200";
}

export function getLineText(step: number) {
  switch (step) {
    case 1:
      return "상담 진행 중";
    case 2:
      return "조제 진행 중";
    case 3:
      return "배송 대기 중";
    case 4:
      return "배송 중";
    default:
      return "진행 중";
  }
}
