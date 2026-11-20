import { PageHeader } from "@/components/PageHeader";
import { Placeholder } from "@/components/Placeholder";

export default function TodayPage() {
  return (
    <>
      <PageHeader
        title="Сегодня"
        accent="ваш фокус"
        lead="Минута в день, чтобы понять, что влияет на вашу концентрацию."
      />
      <Placeholder text="Ежедневная отметка появится здесь." />
    </>
  );
}
