import Image from "next/image";

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--line)] bg-[var(--bg)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-end gap-x-3 gap-y-2 px-4 py-5 sm:px-6 sm:py-6">
        <Image
          src="/logo_einar_white.png"
          alt="einAR"
          width={448}
          height={128}
          className="h-14 w-auto opacity-90 sm:h-[72px]"
        />
        <span className="text-[10px] tracking-wide text-[var(--ink-soft)] sm:text-xs">
          — Soluciones de Inteligencia Artificial y Automatizaciones
        </span>
      </div>
    </footer>
  );
}
