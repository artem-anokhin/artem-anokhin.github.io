import { InsightsTabs } from "@/components/insights/InsightsTabs";
import { LibraryScreen } from "@/components/library/LibraryScreen";

export const metadata = { title: "Библиотека · FocusAI" };

export default function Page() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-[15px] font-medium text-muted first-letter:uppercase">Знания с источниками</p>
        <h1 className="title text-[34px]">Библиотека</h1>
      </header>
      <InsightsTabs current="library" />
      <LibraryScreen />
    </div>
  );
}
