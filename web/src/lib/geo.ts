/** Departamentos y capitales de Uruguay (para mapa y "cerca de mí"). */
export const CAPITALES: Record<string, { lat: number; lng: number; capital: string }> = {
  Artigas: { lat: -30.4, lng: -56.47, capital: "Artigas" },
  Salto: { lat: -31.39, lng: -57.96, capital: "Salto" },
  "Paysandú": { lat: -32.32, lng: -58.08, capital: "Paysandú" },
  "Río Negro": { lat: -33.13, lng: -58.3, capital: "Fray Bentos" },
  Soriano: { lat: -33.25, lng: -58.03, capital: "Mercedes" },
  Colonia: { lat: -34.47, lng: -57.84, capital: "Colonia" },
  "San José": { lat: -34.34, lng: -56.71, capital: "San José de Mayo" },
  Canelones: { lat: -34.52, lng: -56.28, capital: "Canelones" },
  Montevideo: { lat: -34.9, lng: -56.16, capital: "Montevideo" },
  Maldonado: { lat: -34.9, lng: -54.95, capital: "Maldonado" },
  Rocha: { lat: -34.48, lng: -54.33, capital: "Rocha" },
  Lavalleja: { lat: -34.38, lng: -55.24, capital: "Minas" },
  Florida: { lat: -34.1, lng: -56.21, capital: "Florida" },
  Durazno: { lat: -33.38, lng: -56.52, capital: "Durazno" },
  Flores: { lat: -33.54, lng: -56.9, capital: "Trinidad" },
  "Tacuarembó": { lat: -31.73, lng: -55.98, capital: "Tacuarembó" },
  Rivera: { lat: -30.9, lng: -55.55, capital: "Rivera" },
  "Cerro Largo": { lat: -32.37, lng: -54.19, capital: "Melo" },
  "Treinta y Tres": { lat: -33.23, lng: -54.39, capital: "Treinta y Tres" },
};

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Departamento más cercano a una coordenada + distancia en km. */
export function nearestDepartamento(lat: number, lng: number) {
  let best = "";
  let bestKm = Infinity;
  for (const [name, c] of Object.entries(CAPITALES)) {
    const km = haversineKm(lat, lng, c.lat, c.lng);
    if (km < bestKm) {
      bestKm = km;
      best = name;
    }
  }
  return { departamento: best, km: Math.round(bestKm) };
}
