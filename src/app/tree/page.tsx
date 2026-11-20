import { PageHeader } from "@/components/PageHeader";
import { Placeholder } from "@/components/Placeholder";

export const metadata = { title: "Дерево · FocusAI" };

export default function Page() {
  return (
    <>
      <PageHeader title="Дерево" accent="роста" />
      <Placeholder text="Здесь будет расти ваше дерево." />
    </>
  );
}
