import { PageHeader } from "@/components/PageHeader";
import { InsightsScreen } from "@/components/insights/InsightsScreen";

export const metadata = { title: "Инсайты · FocusAI" };

export default function Page() {
  return (
    <>
      <PageHeader title="Инсайты" accent="о вас" />
      <InsightsScreen />
    </>
  );
}
