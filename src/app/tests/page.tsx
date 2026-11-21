import { PageHeader } from "@/components/PageHeader";
import { TestsHub } from "@/components/tests/TestsHub";

export const metadata = { title: "Тесты · FocusAI" };

export default function Page() {
  return (
    <>
      <PageHeader title="Тесты" lead="Три коротких теста: внимание, контроль и память. Следите за своей динамикой." />
      <TestsHub />
    </>
  );
}
