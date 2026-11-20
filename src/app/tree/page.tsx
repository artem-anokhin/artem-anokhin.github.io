import { PageHeader } from "@/components/PageHeader";
import { TreeScreen } from "@/components/tree/TreeScreen";

export const metadata = { title: "Дерево · FocusAI" };

export default function Page() {
  return (
    <>
      <PageHeader title="Ваше" accent="дерево" lead="Растёт от регулярности, а не от идеальности." />
      <TreeScreen />
    </>
  );
}
