"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function MatchHero() {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // Pequeño delay para que se vea el logo "apagado" antes del brillo.
    const t = setTimeout(() => setAnimate(true), 350);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`match-hero relative inline-block w-full ${
        animate ? "match-hero-animate" : ""
      }`}
    >
      <Image
        src="/logo_match_full.png"
        alt="Match"
        width={392}
        height={424}
        priority
        className="relative z-0 h-auto w-full"
      />
      <span aria-hidden className="match-spark match-spark-l" />
      <span aria-hidden className="match-spark match-spark-r" />
      <span aria-hidden className="match-burst" />
    </div>
  );
}
