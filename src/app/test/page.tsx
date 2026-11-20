import { PageHeader } from "@/components/PageHeader";
import { FocusTest } from "@/components/focus/FocusTest";

export const metadata = { title: "Тест · FocusAI" };

export default function Page() {
  return (
    <>
      <PageHeader title="Тест на фокус" accent="90 секунд" />
      <FocusTest />
    </>
  );
}
