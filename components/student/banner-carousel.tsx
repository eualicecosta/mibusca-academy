"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type StudentBanner = {
  id: string;
  imageUrl: string;
  title: string | null;
  subtitle: string | null;
  href: string | null;
};

function BannerFrame({ banner, active }: { banner: StudentBanner; active: boolean }) {
  const content = (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-white/10 bg-[#151019]">
      <Image
        src={banner.imageUrl}
        alt={banner.title || "Banner da area de membros"}
        fill
        priority={active}
        sizes="(min-width: 1024px) 1120px, 100vw"
        className="object-cover"
      />
      {(banner.title || banner.subtitle) ? <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/38 to-transparent" /> : null}
      {(banner.title || banner.subtitle) ? (
        <div className="absolute inset-x-0 bottom-0 max-w-3xl p-5 sm:p-8">
          {banner.title ? <h1 className="break-words text-3xl font-bold leading-tight text-white sm:text-5xl">{banner.title}</h1> : null}
          {banner.subtitle ? <p className="mt-3 max-w-2xl break-words text-base leading-7 text-white/72 sm:text-lg">{banner.subtitle}</p> : null}
        </div>
      ) : null}
    </div>
  );

  if (!banner.href) {
    return content;
  }

  if (banner.href.startsWith("http")) {
    return (
      <a href={banner.href} target="_blank" rel="noreferrer" className="block h-full">
        {content}
      </a>
    );
  }

  return (
    <Link href={banner.href} className="block h-full">
      {content}
    </Link>
  );
}

export function BannerCarousel({ banners }: { banners: StudentBanner[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const hasControls = banners.length > 1;
  const safeIndex = useMemo(() => Math.min(activeIndex, Math.max(banners.length - 1, 0)), [activeIndex, banners.length]);
  const activeBanner = banners[safeIndex];

  useEffect(() => {
    if (!hasControls) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % banners.length);
    }, 6000);

    return () => window.clearInterval(timer);
  }, [banners.length, hasControls]);

  if (!activeBanner) {
    return null;
  }

  function previous() {
    setActiveIndex((current) => (current - 1 + banners.length) % banners.length);
  }

  function next() {
    setActiveIndex((current) => (current + 1) % banners.length);
  }

  return (
    <section className="relative h-[220px] min-w-0 overflow-hidden rounded-lg sm:h-[280px]">
      <BannerFrame banner={activeBanner} active />
      {hasControls ? (
        <>
          <button
            type="button"
            aria-label="Banner anterior"
            onClick={previous}
            className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/55 text-white transition hover:bg-[#53009F]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Proximo banner"
            onClick={next}
            className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/55 text-white transition hover:bg-[#53009F]"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-black/45 px-3 py-2">
            {banners.map((banner, index) => (
              <button
                key={banner.id}
                type="button"
                aria-label={`Ir para banner ${index + 1}`}
                onClick={() => setActiveIndex(index)}
                className={cn("h-2.5 w-2.5 rounded-full bg-white/35 transition", index === safeIndex && "w-7 bg-[#8A1DEE]")}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
