import Image from "next/image";

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--line)] bg-[var(--bg)]">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-5 text-center sm:flex-row sm:flex-wrap sm:justify-end sm:gap-x-3 sm:gap-y-2 sm:px-6 sm:py-6 sm:text-left">
        <Image
          src="/logo_einar_white.png"
          alt="einAR"
          width={448}
          height={128}
          className="h-10 w-auto opacity-90 sm:h-[72px]"
        />
        <span className="text-[10px] leading-snug tracking-wide text-[var(--ink-soft)] sm:text-xs">
          Soluciones de Inteligencia Artificial y Automatizaciones
        </span>
      </div>
    </footer>
  );
}
