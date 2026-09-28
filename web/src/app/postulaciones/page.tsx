import { verifySession } from "@/lib/dal";
import { AppNav } from "@/components/AppNav";
import PostulacionesClient from "@/components/PostulacionesClient";

export default async function Postulaciones() {
  await verifySession();
  return (
    <main className="bg-scene-plain min-h-screen">
      <AppNav active="postulaciones" />
      <PostulacionesClient />
    </main>
  );
}
