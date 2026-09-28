export const STATUSES = ["guardada", "postulado", "respuesta", "entrevista", "oferta", "rechazado", "descartado"] as const;
export type AppStatus = (typeof STATUSES)[number];
