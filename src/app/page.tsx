import { PageHeader } from "@/components/PageHeader";
import { TodayScreen } from "@/components/checkin/TodayScreen";

export default function TodayPage() {
  return (
    <>
      <PageHeader
        title="Сегодня"
        accent="ваш фокус"
        lead="Минута в день, чтобы понять, что влияет на вашу концентрацию."
      />
      <TodayScreen />
    </>
  );
}
