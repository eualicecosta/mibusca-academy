"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type StudentBannerImage = {
  id: string;
  imageUrl: string;
};

export type StudentBannerBlock = {
  id: string;
  images: StudentBannerImage[];
  title: string | null;
  subtitle: string | null;
  href: string | null;
};

function BannerFrame({ banner, image, active }: { banner: StudentBannerBlock; image: StudentBannerImage | null; active: boolean }) {
  // Any image → only image (no title/subtitle overlay). No image → text only.
  const showText = !image && Boolean(banner.title?.trim() || banner.subtitle?.trim());
  const content = (
    <div className="relative h-full w-full min-w-0 overflow-hidden rounded-lg border border-white/10 bg-[#151019]">
      {image ? (
        <Image
          src={image.imageUrl}
          alt={banner.title || "Banner da área de membros"}
          fill
          priority={active}
          sizes="(min-width: 1024px) 1120px, 100vw"
          className="object-cover object-center"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(138,29,238,.62),transparent_36%),linear-gradient(145deg,#09050e,#260748_55%,#050306)]" />
      )}
      {showText ? <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/38 to-transparent" /> : null}
      {showText ? (
        <div className="absolute inset-x-0 bottom-0 w-full max-w-full p-5 sm:p-8">
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

export function BannerCarousel({ banner }: { banner: StudentBannerBlock }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const hasControls = banner.images.length > 1;
  const safeIndex = useMemo(() => Math.min(activeIndex, Math.max(banner.images.length - 1, 0)), [activeIndex, banner.images.length]);
  const activeImage = banner.images[safeIndex] || null;

  useEffect(() => {
    if (!hasControls) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % banner.images.length);
    }, 6000);

    return () => window.clearInterval(timer);
  }, [banner.images.length, hasControls]);

  if (!activeImage && !banner.title && !banner.subtitle) {
    return null;
  }

  function previous() {
    setActiveIndex((current) => (current - 1 + banner.images.length) % banner.images.length);
  }

  function next() {
    setActiveIndex((current) => (current + 1) % banner.images.length);
  }

  return (
    <section className="relative h-[220px] min-w-0 overflow-hidden rounded-lg sm:h-[280px]">
      <BannerFrame banner={banner} image={activeImage} active />
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
            {banner.images.map((image, index) => (
              <button
                key={image.id}
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
