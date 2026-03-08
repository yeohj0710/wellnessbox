import type { B2bIntegratedHealthMetric } from "../_lib/b2b-integrated-result-preview-model";

type B2bIntegratedHealthMetricsSectionProps = {
  metrics: B2bIntegratedHealthMetric[];
};

export default function B2bIntegratedHealthMetricsSection({
  metrics,
}: B2bIntegratedHealthMetricsSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h3 className="text-lg font-bold text-slate-900">건강검진 데이터 상세</h3>
      <p className="mt-1 text-xs text-slate-500">
        건강검진에서 수집된 핵심 지표 상태를 빠르게 확인합니다.
      </p>
      {metrics.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">표시할 건강검진 지표가 없습니다.</p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {metrics.map((metric, index) => (
            <li
              key={`integrated-health-metric-${index}`}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
            >
              <p className="text-xs font-semibold text-slate-700">
                {metric.label || `지표 ${index + 1}`}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{metric.value}</p>
              {metric.status ? (
                <p className="mt-0.5 text-xs text-slate-500">상태: {metric.status}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
