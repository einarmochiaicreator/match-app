import Image from "next/image";
import CreateEventForm from "./CreateEventForm";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-16 lg:py-24">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
        <section className="flex justify-center lg:justify-start">
          <Image
            src="/logo_match_full.png"
            alt="Match"
            width={392}
            height={424}
            priority
            className="h-auto w-56 sm:w-72 lg:w-80"
          />
        </section>

        <section>
          <CreateEventForm />
        </section>
      </div>
    </main>
  );
}
