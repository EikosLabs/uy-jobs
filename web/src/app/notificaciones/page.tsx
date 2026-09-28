import { verifySession } from "@/lib/dal";
import { AppNav } from "@/components/AppNav";
import NotificacionesClient from "@/components/NotificacionesClient";

export default async function Notificaciones() {
  await verifySession();
  return (
    <main className="bg-scene-plain min-h-screen pb-24">
      <AppNav active="avisos" />
      <NotificacionesClient />
    </main>
  );
}
