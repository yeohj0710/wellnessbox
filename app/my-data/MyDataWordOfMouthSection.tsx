import WordOfMouthShareCard from "@/components/common/WordOfMouthShareCard";
import { buildMyDataWordOfMouthModel } from "@/lib/word-of-mouth/engine";
import type { MyDataCollections } from "./myDataPageData";
import { buildMyDataContextSummary } from "./myDataJourneyInsights";

export default function MyDataWordOfMouthSection({
  profileData,
  assessResults,
  checkAiResults,
  orders,
  healthLink,
  chatSessions,
}: {
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
  const model = buildMyDataWordOfMouthModel({ summary });

  if (!model) return null;

  return (
    <WordOfMouthShareCard
      model={model}
      className="mt-6"
      hideBehindBeta={false}
    />
  );
}
