"use client";

import { useRouter } from "next/navigation";
import { Onboarding } from "@/components/Onboarding";

export default function WelcomePage() {
  const router = useRouter();
  return <Onboarding onDone={() => router.replace("/")} />;
}
