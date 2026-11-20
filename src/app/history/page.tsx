import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { HistoryScreen } from "@/components/history/HistoryScreen";

export const metadata = { title: "История · FocusAI" };

export default function Page() {
  return (
    <>
      <Link href="/" className="mb-2 inline-flex min-h-11 items-center gap-1 font-semibold text-navy">
        <ChevronLeft aria-hidden size={20} /> Сегодня
      </Link>
      <PageHeader title="История" accent="30 дней" />
      <HistoryScreen />
    </>
  );
}
