"use client";

type Props = {
  onStart: () => void;
};

export default function WelcomeScreen({ onStart }: Props) {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(160deg, #1a6b55 0%, #0d5c48 55%, #0a4a3a 100%)" }}
    >
      {/* Top decorative band */}
      <div className="flex-none h-1" style={{ background: "#c4862a" }} />

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-16 pt-12">

        {/* Logo mark */}
        <div className="animate-fade-in mb-8">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >
            <span className="text-4xl">🌿</span>
          </div>
        </div>

        {/* Wordmark */}
        <div className="animate-fade-in-up delay-100 text-center mb-4">
          <h1 className="text-4xl font-bold tracking-tight text-white">
            FamilyNourish
          </h1>
          <div
            className="mt-2 mx-auto w-16 h-0.5 rounded"
            style={{ background: "#c4862a" }}
          />
        </div>

        {/* Tagline */}
        <p
          className="animate-fade-in-up delay-200 text-center text-lg leading-relaxed mt-4 max-w-xs"
          style={{ color: "rgba(255,255,255,0.82)" }}
        >
          Feeding your whole family — every need, every week, every budget.
        </p>

        {/* Value cards */}
        <div className="animate-fade-in-up delay-300 mt-12 w-full max-w-sm space-y-3">
          {[
            { icon: "👨‍👩‍👧‍👦", text: "Plans meals for the whole family at once" },
            { icon: "💚", text: "Works around every dietary need" },
            { icon: "🛒", text: "Finds the cheapest basket every week" },
          ].map((item) => (
            <div
              key={item.text}
              className="flex items-center gap-4 px-5 py-4 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.1)" }}
            >
              <span className="text-2xl flex-none">{item.icon}</span>
              <span className="text-white text-sm leading-snug">{item.text}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="animate-fade-in-up delay-400 mt-12 w-full max-w-sm">
          <button
            onClick={onStart}
            className="w-full py-5 rounded-2xl text-lg font-semibold text-white shadow-lg transition-all active:scale-95"
            style={{
              background: "#c4862a",
              boxShadow: "0 4px 20px rgba(196,134,42,0.4)",
            }}
          >
            Get started — it's free
          </button>
          <p
            className="text-center mt-4 text-sm"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            Takes about 3 minutes to set up your family
          </p>
        </div>
      </div>

      {/* Bottom brand note */}
      <div className="flex-none pb-8 text-center">
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
          Nothing about me without me.
        </p>
      </div>
    </div>
  );
}
