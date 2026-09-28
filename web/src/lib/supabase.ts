export type Oferta = {
  id: number;
  fuente: string;
  oferta_id: string | null;
  titulo: string | null;
  empresa: string | null;
  ubicacion: string | null;
  salario: string | null;
  contrato: string | null;
  jornada: string | null;
  fecha_publicacion: string | null;
  url: string;
  descripcion: string | null;
  requisitos: string | null;
  fecha_scrapeo: string | null;
  categoria: string | null;
  tags: string | null;
  modalidad: string | null;
  seniority: string | null;
  salario_num: number | null;
  moneda: string | null;
  experiencia_min: number | null;
  departamento: string | null;
};

export const CATEGORIAS = [
  "tecnologia", "ventas", "administracion", "logistica", "atencion_cliente",
  "gerencia", "oficios", "operarios", "salud", "marketing",
  "hoteleria_turismo", "gastronomia", "educacion", "otros",
];

export const MODALIDADES = ["remoto", "hibrido"];
export const FUENTES = ["linkedin", "computrabajo", "buscojobs", "indeed", "gallito"];
export const SENIORITIES = ["estudiante", "junior", "pasantia", "senior", "lead"];

export const DEPARTAMENTOS = [
  "Artigas", "Canelones", "Cerro Largo", "Colonia", "Durazno",
  "Flores", "Florida", "Lavalleja", "Maldonado", "Montevideo",
  "Paysandú", "Río Negro", "Rivera", "Rocha", "Salto",
  "San José", "Soriano", "Tacuarembó", "Treinta y Tres",
];
