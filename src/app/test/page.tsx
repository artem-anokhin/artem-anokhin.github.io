import { PageHeader } from "@/components/PageHeader";
import { Placeholder } from "@/components/Placeholder";

export const metadata = { title: "Тест · FocusAI" };

export default function Page() {
  return (
    <>
      <PageHeader title="Тест" accent="фокуса" />
      <Placeholder text="Короткий тест реакции появится здесь." />
    </>
  );
}
