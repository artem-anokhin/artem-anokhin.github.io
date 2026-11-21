import { PageHeader } from "@/components/PageHeader";
import { GoalsTabs } from "@/components/goals/GoalsTabs";
import { NotesScreen } from "@/components/goals/NotesScreen";

export const metadata = { title: "Заметки · FocusAI" };

export default function Page() {
  return (
    <>
      <PageHeader title="Заметки" lead="Мысли, идеи, что получилось за день. Видите только вы." />
      <GoalsTabs current="notes" />
      <NotesScreen />
    </>
  );
}
