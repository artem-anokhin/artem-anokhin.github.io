import Link from "next/link";
import { Settings } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { TodayScreen } from "@/components/checkin/TodayScreen";

export default function TodayPage() {
  return (
    <>
      <PageHeader
        title="Сегодня"
        accent="ваш фокус"
        lead="Минута в день, чтобы понять, что влияет на вашу концентрацию."
        action={
          <Link
            href="/settings/"
            aria-label="Настройки"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border-[1.5px] border-line bg-card text-navy hover:bg-soft md:hidden"
          >
            <Settings aria-hidden size={22} />
          </Link>
        }
      />
      <TodayScreen />
    </>
  );
}
