import { initials } from "@/lib/format";

const SIZES = {
  sm: "size-9 text-[12px]",
  md: "size-11 text-[13px]",
  lg: "size-12 text-sm",
  xl: "size-20 text-xl",
  "2xl": "size-28 text-2xl",
} as const;

export function Avatar({
  title,
  src,
  size = "md",
}: {
  title: string;
  src?: string | null;
  size?: keyof typeof SIZES;
}) {
  if (src) {
    return (
      // Data URL reducida en el cliente; next/image no aporta aquí.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className={`${SIZES[size]} shrink-0 rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10`}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`${SIZES[size]} grid shrink-0 place-items-center rounded-full bg-accent-soft font-mono font-medium uppercase tracking-wide text-accent ring-1 ring-black/5 dark:ring-white/10`}
    >
      {initials(title)}
    </span>
  );
}
