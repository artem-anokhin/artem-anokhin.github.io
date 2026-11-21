import { PageHeader } from "@/components/PageHeader";
import { GoalsTabs } from "@/components/goals/GoalsTabs";
import { GoalsScreen } from "@/components/goals/GoalsScreen";

export const metadata = { title: "Цели · FocusAI" };

export default function Page() {
  return (
    <>
      <PageHeader title="Цели" lead="Большая цель — из маленьких шагов. Всё хранится только на этом устройстве." />
      <GoalsTabs current="goals" />
      <GoalsScreen />
    </>
  );
}
