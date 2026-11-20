import { InsightsTabs } from "@/components/insights/InsightsTabs";
import { LibraryScreen } from "@/components/library/LibraryScreen";

export const metadata = { title: "Библиотека · FocusAI" };

export default function Page() {
  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Знания с источниками</p>
        <h1 className="title mt-1 text-[32px]">Библиотека</h1>
      </header>
      <InsightsTabs current="library" />
      <LibraryScreen />
    </div>
  );
}
