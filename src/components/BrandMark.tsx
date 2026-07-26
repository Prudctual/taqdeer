/** مونوغرام توقّع — حرف ت فوق قوس ملعب مبسّط. علامة مسطّحة بلا حواف لامعة ولا ظل */
export function BrandMark({
  className = "",
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      className={`shrink-0 text-on-fill ${className}`}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      focusable="false"
    >
      <rect width="32" height="32" rx="6" className="fill-accent" />
      <path
        d="M8 12.5h16M16 12.5v11"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 9c3-1.9 15-1.9 18 0"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  );
}
