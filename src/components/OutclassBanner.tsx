// Promo banner for Outclass (outclass.design), our AI design tool for web & mobile.
// Dofollow on purpose: no rel="nofollow"/"noreferrer", so link equity and the referrer pass through.
const OUTCLASS_URL = "https://outclass.design/?ref=voxmind";

export function OutclassBanner() {
  return (
    <section className="px-6 md:px-10 pb-16">
      <a
        href={OUTCLASS_URL}
        target="_blank"
        rel="noopener"
        referrerPolicy="no-referrer-when-downgrade"
        className="group max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6 rounded-2xl border border-[#7C3AED]/30 bg-gradient-to-r from-[#7C3AED]/15 via-[#111111] to-[#111111] p-6 md:p-8 transition hover:border-[#7C3AED]/60"
      >
        <div>
          <span className="text-xs uppercase tracking-[0.2em] text-[#a78bfa]">Also from the makers of VoxMind</span>
          <h3 className="mt-2 text-2xl md:text-3xl font-bold tracking-tight text-[#F5F0E8]">
            Outclass — AI that designs your web & mobile apps
          </h3>
          <p className="mt-2 text-[#a0a0a0] max-w-xl">
            Describe your idea and get polished, production-ready web and mobile designs in minutes.
          </p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-2 rounded-full bg-[#7C3AED] px-5 py-3 text-sm font-medium text-white transition group-hover:bg-[#6D28D9]">
          Try outclass.design →
        </span>
      </a>
    </section>
  );
}
