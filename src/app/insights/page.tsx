import { PageHeader } from "@/components/PageHeader";
import { Placeholder } from "@/components/Placeholder";

export const metadata = { title: "Инсайты · FocusAI" };

export default function Page() {
  return (
    <>
      <PageHeader title="Инсайты" accent="о вас" />
      <Placeholder text="Закономерности появятся после 7 дней отметок." />
    </>
  );
}
