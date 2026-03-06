export default function B2bSurveyEditorGuidanceCard() {
  return (
    <div className="rounded-2xl border border-sky-100 bg-sky-50/55 p-4">
      <p className="text-[13px] font-semibold text-sky-800">관리자 입력 가이드</p>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-slate-600">
        <li>설문 문항 처리 로직은 `/survey`와 동일한 공통 로직을 사용합니다.</li>
        <li>단일 선택 문항은 클릭 즉시 다음 문항으로 자동 이동합니다.</li>
        <li>이전/다음 버튼은 섹션 이동 기준으로 동작합니다.</li>
      </ul>
    </div>
  );
}
