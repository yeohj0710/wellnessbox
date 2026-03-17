import type { ColumnSummary } from "@/app/column/_lib/columns-types";
import PersonalizedEducationCard from "@/components/common/PersonalizedEducationCard";
import { recommendPersonalizedEducation } from "@/lib/education-content/engine";
import type { MyDataCollections } from "./myDataPageData";
import { buildMyDataContextSummary } from "./myDataJourneyInsights";

export default function MyDataEducationInsightSection({
  columns,
  profileData,
  assessResults,
  checkAiResults,
  orders,
  healthLink,
  chatSessions,
}: {
  columns: ColumnSummary[];
  profileData: unknown;
  assessResults: MyDataCollections["assessResults"];
  checkAiResults: MyDataCollections["checkAiResults"];
  orders: MyDataCollections["orders"];
  healthLink: MyDataCollections["healthLink"];
  chatSessions: MyDataCollections["chatSessions"];
}) {
  const summary = buildMyDataContextSummary({
    profileData,
    assessResults,
    checkAiResults,
    orders,
    healthLink,
    chatSessions,
  });

  const insight = recommendPersonalizedEducation({
    columns,
    summary,
    surface: "my-data",
  });

  if (!insight) return null;

  return (
    <div className="mt-6">
      <PersonalizedEducationCard
        insight={insight}
        eyebrow="건강 여정 읽을거리"
        hideBehindBeta={false}
      />
    </div>
  );
}
