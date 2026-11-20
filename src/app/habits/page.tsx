import { PageHeader } from "@/components/PageHeader";
import { HabitsScreen } from "@/components/habits/HabitsScreen";

export const metadata = { title: "Привычки · FocusAI" };

export default function Page() {
  return (
    <>
      <PageHeader title="Привычки" lead="До 5 привычек. Пропуск дня — не провал: важна регулярность, а не идеальность." />
      <HabitsScreen />
    </>
  );
}
