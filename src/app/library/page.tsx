import { PageHeader } from "@/components/PageHeader";
import { Placeholder } from "@/components/Placeholder";

export const metadata = { title: "Библиотека · FocusAI" };

export default function Page() {
  return (
    <>
      <PageHeader title="Библиотека" accent="знаний" />
      <Placeholder text="Короткие карточки с источниками появятся здесь." />
    </>
  );
}
