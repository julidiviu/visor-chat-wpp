"use client";

import Image from "next/image";
import { useState } from "react";
import { ImageOffIcon, PlayIcon } from "./icons";

/**
 * Miniatura para rejillas. El padre debe ser `relative` y tener tamaño.
 * Los videos se representan con un mosaico y el icono de reproducción.
 */
export function MediaThumb({
  src,
  alt,
  sizes,
  video = false,
  className = "",
}: {
  src: string;
  alt: string;
  sizes: string;
  video?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (video) {
    return (
      <span className="absolute inset-0 grid place-items-center bg-black/45 text-white/90">
        <PlayIcon className="size-7 drop-shadow" />
      </span>
    );
  }

  if (failed) {
    return (
      <span className="absolute inset-0 grid place-items-center text-muted">
        <ImageOffIcon className="size-5" />
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={160}
      height={160}
      sizes={sizes}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`h-full w-full object-cover ${className}`}
    />
  );
}
