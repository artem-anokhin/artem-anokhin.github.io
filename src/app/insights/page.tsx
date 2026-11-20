import { InsightsScreen } from "@/components/insights/InsightsScreen";
import { InsightsTabs } from "@/components/insights/InsightsTabs";

export const metadata = { title: "Инсайты · FocusAI" };

export default function Page() {
  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Ваши данные</p>
        <h1 className="title mt-1 text-[32px]">Инсайты</h1>
      </header>
      <InsightsTabs current="insights" />
      <InsightsScreen />
    </div>
  );
}
