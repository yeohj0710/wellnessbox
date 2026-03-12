import type { B2bIntegratedSupplementDesign } from "../_lib/b2b-integrated-result-preview-model";

type B2bIntegratedSupplementDesignSectionProps = {
  supplementDesigns: B2bIntegratedSupplementDesign[];
};

function normalizeHeadingText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export default function B2bIntegratedSupplementDesignSection({
  supplementDesigns,
}: B2bIntegratedSupplementDesignSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h3 className="text-lg font-bold text-slate-900">맞춤 영양제 설계</h3>
      <p className="mt-1 text-xs text-slate-500">
        레포트 본문에서 숨긴 맞춤 설계 내용을 관리자 확인용으로 따로 보여줍니다.
      </p>

      {supplementDesigns.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">맞춤 영양제 설계 데이터가 없습니다.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {supplementDesigns.map((item, index) => {
            const showSectionTitle =
              normalizeHeadingText(item.sectionTitle) !== normalizeHeadingText(item.title);

            return (
              <article
                key={`integrated-supplement-${item.sectionId}-${index}`}
                className="rounded-xl border border-indigo-100 bg-indigo-50/40 px-3 py-3"
              >
                {showSectionTitle ? (
                  <p className="text-xs font-semibold text-indigo-700">{item.sectionTitle}</p>
                ) : null}
                <h4
                  className={`${showSectionTitle ? "mt-1" : "mt-0"} text-sm font-bold text-slate-900`}
                >
                  {item.title}
                </h4>
                {item.paragraphs.length > 0 ? (
                  <div className="mt-2 space-y-1.5 text-sm text-slate-700">
                    {item.paragraphs.map((paragraph, paragraphIndex) => (
                      <p key={`integrated-supplement-paragraph-${index}-${paragraphIndex}`}>
                        {paragraph}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">설계 설명 데이터가 없습니다.</p>
                )}
                {item.recommendedNutrients.length > 0 ? (
                  <div className="mt-2 rounded-lg border border-indigo-200/80 bg-white/70 px-2.5 py-2">
                    <p className="text-xs font-semibold text-indigo-700">추천 영양소</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {item.recommendedNutrients.map((nutrient) => (
                        <span
                          key={`integrated-supplement-nutrient-${index}-${nutrient}`}
                          className="rounded-full border border-indigo-200 bg-white px-2 py-1 text-xs font-medium text-indigo-700"
                        >
                          {nutrient}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
