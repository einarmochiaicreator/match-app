import Image from "next/image";
import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="border-b border-[var(--line)] bg-[var(--bg)]">
      <div className="mx-auto flex max-w-6xl items-center px-4 py-1.5 sm:px-6 sm:py-2">
        <Link
          href="/"
          aria-label="Match"
          className="inline-flex items-center transition hover:opacity-80"
        >
          <Image
            src="/logo_match_word.png"
            alt="Match"
            width={408}
            height={92}
            className="h-3 w-auto sm:h-4"
            priority
          />
        </Link>
      </div>
    </header>
  );
}
