import { AppNav } from "@/components/AppNav";
import MapaClient from "@/components/MapaClient";

export default function Mapa() {
  return (
    <main className="bg-scene-plain min-h-screen">
      <AppNav active="mapa" />
      <MapaClient />
    </main>
  );
}
