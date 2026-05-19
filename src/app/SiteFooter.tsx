import Image from "next/image";

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--line)] bg-[var(--bg)]">
      <div className="mx-auto flex max-w-6xl flex-nowrap items-center justify-center gap-2 px-3 py-4 sm:justify-end sm:gap-3 sm:px-6 sm:py-6">
        <Image
          src="/logo_einar_white.png"
          alt="einAR"
          width={448}
          height={128}
          className="h-24 w-auto opacity-90 sm:h-[144px]"
        />
        <span className="whitespace-nowrap text-[9px] tracking-wide text-[var(--ink-soft)] sm:text-xs">
          soluciones de IA y automatizaciones
        </span>
      </div>
    </footer>
  );
}
