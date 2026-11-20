import { PageHeader } from "@/components/PageHeader";
import { SettingsScreen } from "@/components/settings/SettingsScreen";

export const metadata = { title: "Настройки · FocusAI" };

export default function Page() {
  return (
    <>
      <PageHeader title="Настройки" />
      <SettingsScreen />
    </>
  );
}
