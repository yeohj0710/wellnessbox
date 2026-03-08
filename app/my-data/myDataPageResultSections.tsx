import {
  normalizeAssessmentResult,
  normalizeCheckAiResult,
} from "@/lib/server/result-normalizer";
import type { MyDataCollections } from "./myDataPageData";
import {
  AccordionCard,
  formatDate,
  JsonBox,
  MiniAccordion,
  Pill,
} from "./myDataPagePrimitives";

type AssessResultItem = MyDataCollections["assessResults"][number];
type CheckAiResultItem = MyDataCollections["checkAiResults"][number];

export function MyDataAssessmentSection({
  assessResults,
  lastAssessAt,
}: {
  assessResults: AssessResultItem[];
  lastAssessAt?: Date | null;
}) {
  return (
    <AccordionCard
      title="정밀 검사 내역"
      subtitle="검사 결과 1건씩 펼쳐서 JSON을 확인하세요."
      right={
        <div className="flex items-center gap-2">
          <Pill>{assessResults.length}건</Pill>
          <Pill>최근: {formatDate(lastAssessAt)}</Pill>
        </div>
      }
    >
      {assessResults.length === 0 ? (
        <p className="text-sm text-gray-500">정밀 검사 결과가 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {assessResults.map((result) => {
            const normalized = normalizeAssessmentResult(result);
            return (
              <MiniAccordion
                key={result.id}
                title={`결과 #${result.id}`}
                subtitle={formatDate(result.createdAt)}
                right={<Pill>tz: {result.tzOffsetMinutes ?? "-"}</Pill>}
              >
                <JsonBox
                  data={{
                    answers: result.answers,
                    result: result.cResult,
                    normalized,
                    tzOffsetMinutes: result.tzOffsetMinutes,
                  }}
                  maxHeightClass="max-h-[520px]"
                />
              </MiniAccordion>
            );
          })}
        </div>
      )}
    </AccordionCard>
  );
}

export function MyDataCheckAiSection({
  checkAiResults,
  lastCheckAt,
}: {
  checkAiResults: CheckAiResultItem[];
  lastCheckAt?: Date | null;
}) {
  return (
    <AccordionCard
      title="빠른 검사 내역"
      subtitle="검사 결과 1건씩 펼쳐서 JSON을 확인하세요."
      right={
        <div className="flex items-center gap-2">
          <Pill>{checkAiResults.length}건</Pill>
          <Pill>최근: {formatDate(lastCheckAt)}</Pill>
        </div>
      }
    >
      {checkAiResults.length === 0 ? (
        <p className="text-sm text-gray-500">빠른 검사 결과가 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {checkAiResults.map((result) => {
            const normalized = normalizeCheckAiResult(result);
            return (
              <MiniAccordion
                key={result.id}
                title={`결과 #${result.id}`}
                subtitle={formatDate(result.createdAt)}
                right={<Pill>tz: {result.tzOffsetMinutes ?? "-"}</Pill>}
              >
                <JsonBox
                  data={{
                    answers: result.answers,
                    result: result.result,
                    normalized,
                    tzOffsetMinutes: result.tzOffsetMinutes,
                  }}
                  maxHeightClass="max-h-[520px]"
                />
              </MiniAccordion>
            );
          })}
        </div>
      )}
    </AccordionCard>
  );
}
