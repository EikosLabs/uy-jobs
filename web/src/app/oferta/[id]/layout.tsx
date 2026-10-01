import { AppNav } from "@/components/AppNav";

/** El encabezado vive en el layout: queda fijo mientras carga el aviso (y durante la View Transition). */
export default function OfertaLayout({ children }: LayoutProps<"/oferta/[id]">) {
  return (
    <>
      <AppNav active="ofertas" />
      {children}
    </>
  );
}
