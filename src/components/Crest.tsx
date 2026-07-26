import Image from "next/image";

type Size = "xs" | "chip" | "sm" | "md" | "lg" | "xl";
type Shape = "circle" | "soft";

const box: Record<Size, string> = {
  xs: "h-5 w-5",
  chip: "h-6 w-6",
  sm: "h-8 w-8",
  md: "h-11 w-11",
  lg: "h-14 w-14",
  xl: "h-[4.5rem] w-[4.5rem]",
};

const shapeCls: Record<Shape, string> = {
  circle: "rounded-full",
  soft: "rounded-[0.3rem]",
};

const imgSize: Record<Size, number> = {
  xs: 20,
  chip: 24,
  sm: 32,
  md: 44,
  lg: 56,
  xl: 72,
};

const imgPad: Record<Size, string> = {
  xs: "p-px",
  chip: "p-0.5",
  sm: "p-0.5",
  md: "p-1",
  lg: "p-1.5",
  xl: "p-2",
};

const fallbackText: Record<Size, string> = {
  xs: "text-[8px]",
  chip: "text-[9px]",
  sm: "text-[10px]",
  md: "text-[11px]",
  lg: "text-xs",
  xl: "text-sm",
};

/**
 * شعار نادٍ أو دوري — لوح محايد بخط شعري واحد.
 * زخرفي دائماً: الاسم مكتوب بجواره في كل استعمال، لذا يُخفى عن القارئ الصوتي.
 */
export function Crest({
  src,
  alt,
  size = "md",
  fallback,
  tone = "neutral",
  shape = "circle",
  className = "",
  priority = false,
}: {
  src?: string | null;
  alt: string;
  size?: Size;
  fallback?: string;
  tone?: "home" | "away" | "neutral";
  /** soft أنسب لشعارات الدوريات */
  shape?: Shape;
  className?: string;
  priority?: boolean;
}) {
  const px = imgSize[size];
  const plate = `inline-grid shrink-0 place-items-center border border-line bg-panel ${shapeCls[shape]} ${box[size]}`;

  if (src) {
    return (
      <span
        className={`relative overflow-hidden ${plate} ${className}`}
        title={alt}
        aria-hidden
      >
        <Image
          src={src}
          alt=""
          width={px}
          height={px}
          priority={priority}
          className={`h-full w-full object-contain ${imgPad[size]}`}
        />
      </span>
    );
  }

  // بديل نصي: الرمز يحمل المعنى، واللون تأكيد لا أكثر
  const glyphTone =
    tone === "home"
      ? "text-home"
      : tone === "away"
        ? "text-away"
        : "text-muted";

  return (
    <span
      className={`font-semibold tabular ${plate} ${fallbackText[size]} ${glyphTone} ${className}`}
      aria-hidden
      title={alt}
    >
      {fallback ?? "•"}
    </span>
  );
}
