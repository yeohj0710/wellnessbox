import type { B2bIntegratedMedication } from "../_lib/b2b-integrated-result-preview-model";

type B2bIntegratedMedicationReviewSectionProps = {
  medicationStatusMessage: string;
  medications: B2bIntegratedMedication[];
};

export default function B2bIntegratedMedicationReviewSection({
  medicationStatusMessage,
  medications,
}: B2bIntegratedMedicationReviewSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h3 className="text-lg font-bold text-slate-900">복약 이력</h3>
      <p className="mt-1 text-xs text-slate-500">
        최근 복약 이력과 상태 메시지를 한 번에 확인합니다.
      </p>

      {medicationStatusMessage ? (
        <p className="mt-3 rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-2 text-sm text-sky-800">
          {medicationStatusMessage}
        </p>
      ) : null}

      {medications.length === 0 && !medicationStatusMessage ? (
        <p className="mt-3 text-sm text-slate-500">복약 이력이 없습니다.</p>
      ) : medications.length > 0 ? (
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
      ) : null}
    </section>
  );
}
