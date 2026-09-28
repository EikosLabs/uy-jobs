import { verifySession } from "@/lib/dal";
import { AppNav } from "@/components/AppNav";
import PerfilClient from "@/components/PerfilClient";

export default async function Perfil() {
  await verifySession();
  return (
    <main className="bg-scene-plain min-h-screen pb-24">
      <AppNav active="perfil" />
      <PerfilClient />
    </main>
  );
}
