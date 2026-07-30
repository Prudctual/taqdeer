"use client";

export function NewsletterForm() {
  return (
    <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
      <input
        type="email"
        placeholder="بريدك الإلكتروني (name@domain.com)"
        className="w-full rounded-md border border-line bg-panel px-3.5 py-2 text-xs text-ink placeholder-faint focus:border-accent focus:outline-none"
      />
      <button
        type="submit"
        className="motion-colors shrink-0 rounded-md bg-accent px-4 py-2 text-xs font-bold text-bg hover:bg-accent/90 cursor-pointer"
      >
        اشتراك
      </button>
    </form>
  );
}
