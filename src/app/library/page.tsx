import { PageHeader } from "@/components/PageHeader";
import { LibraryScreen } from "@/components/library/LibraryScreen";

export const metadata = { title: "Библиотека · FocusAI" };

export default function Page() {
  return (
    <>
      <PageHeader title="Библиотека" accent="знаний" />
      <LibraryScreen />
    </>
  );
}
