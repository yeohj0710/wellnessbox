import type {
  B2bIntegratedMedication,
} from "../_lib/b2b-integrated-result-preview-model";

type B2bIntegratedMedicationReviewSectionProps = {
  medicationStatusMessage: string;
  medications: B2bIntegratedMedication[];
  pharmacistSummary: string;
  pharmacistRecommendations: string;
  pharmacistCautions: string;
};

export default function B2bIntegratedMedicationReviewSection({
  medicationStatusMessage,
  medications,
  pharmacistSummary,
  pharmacistRecommendations,
  pharmacistCautions,
}: B2bIntegratedMedicationReviewSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h3 className="text-lg font-bold text-slate-900">복약 이력 · 약사 코멘트</h3>
      <p className="mt-1 text-xs text-slate-500">
        최근 복약 이력과 약사 피드백을 한 번에 확인합니다.
      </p>

      {medicationStatusMessage ? (
        <p className="mt-3 rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-2 text-sm text-sky-800">
          {medicationStatusMessage}
        </p>
      ) : null}

      {medications.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">복약 이력이 없습니다.</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {medications.map((item, index) => (
            <li
              key={`integrated-medication-${index}`}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
            >
              <p className="text-sm font-semibold text-slate-900">
                {item.medicationName || `복약 항목 ${index + 1}`}
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                {[item.date, item.hospitalName].filter(Boolean).join(" / ") || "-"}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 grid gap-2">
        <article className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
          <p className="text-xs font-semibold text-slate-600">요약</p>
          <p className="mt-1 text-sm text-slate-800">
            {pharmacistSummary || "등록된 요약 코멘트가 없습니다."}
          </p>
        </article>
        <article className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2.5">
          <p className="text-xs font-semibold text-emerald-700">권장안</p>
          <p className="mt-1 text-sm text-emerald-900">
            {pharmacistRecommendations || "등록된 권장안이 없습니다."}
          </p>
        </article>
        <article className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2.5">
          <p className="text-xs font-semibold text-amber-700">주의사항</p>
          <p className="mt-1 text-sm text-amber-900">
            {pharmacistCautions || "등록된 주의사항이 없습니다."}
          </p>
        </article>
      </div>
    </section>
  );
}
