import { PageHeader } from "@/components/PageHeader";
import { InsightsTabs } from "@/components/insights/InsightsTabs";
import { StatsScreen } from "@/components/stats/StatsScreen";

export const metadata = { title: "Статистика · FocusAI" };

export default function Page() {
  return (
    <>
      <PageHeader title="Статистика" />
      <div className="mb-5">
        <InsightsTabs current="stats" />
      </div>
      <StatsScreen />
    </>
  );
}
