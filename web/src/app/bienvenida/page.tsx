import { getUser, verifySession } from "@/lib/dal";
import { AppNav } from "@/components/AppNav";
import { firstName } from "@/components/ui";
import OnboardingWizard from "@/components/OnboardingWizard";

export const metadata = { title: "Bienvenida · Trabajogpt" };

export default async function Bienvenida() {
  await verifySession();
  const user = await getUser();
  return (
    <main className="bg-scene-plain min-h-screen pb-24">
      <AppNav />
      <OnboardingWizard
        nombre={firstName(user?.nombre)}
        intereses={String(user?.intereses || "").split(",").filter(Boolean)}
        departamento={user?.departamento ?? ""}
        etapa={user?.etapa ?? ""}
        jornada={user?.jornada ?? ""}
      />
    </main>
  );
}
