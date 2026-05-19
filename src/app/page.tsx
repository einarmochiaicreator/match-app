import CreateEventForm from "./CreateEventForm";
import MatchHero from "@/components/MatchHero";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-16 lg:py-24">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
        <section className="flex justify-center lg:justify-start">
          <div className="w-56 sm:w-72 lg:w-80">
            <MatchHero />
          </div>
        </section>

        <section>
          <CreateEventForm />
        </section>
      </div>
    </main>
  );
}
