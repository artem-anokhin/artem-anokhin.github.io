import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { HistoryScreen } from "@/components/history/HistoryScreen";

export const metadata = { title: "История · FocusAI" };

export default function Page() {
  return (
    <>
      <Link href="/" className="-ml-1.5 flex min-h-11 w-fit items-center gap-0.5 text-[17px] text-link">
        <ChevronLeft aria-hidden size={20} /> Сегодня
      </Link>
      <PageHeader title="История" accent="30 дней" />
      <HistoryScreen />
    </>
  );
}
