const TIER_CLASS: Record<string, string> = {
  blue: "border-sky-400/50 bg-sky-400/15 text-sky-300",
  green: "border-green-500/50 bg-green-500/15 text-green-400",
  orange: "border-orange-500/50 bg-orange-500/15 text-orange-400",
  red: "border-red-500/50 bg-red-500/15 text-red-400",
  purple: "border-purple-500/50 bg-purple-500/15 text-purple-300",
  bronze: "border-[#cd7f32] bg-gradient-to-r from-[#7a4a22] via-[#cd7f32] to-[#8c5a2b] text-white",
  silver: "border-[#c0c0c0] bg-gradient-to-r from-[#7f8790] via-[#d8dce0] to-[#9aa1a9] text-black",
  gold: "border-[#ffd700] bg-gradient-to-r from-[#b8860b] via-[#ffd700] to-[#daa520] text-black",
  platinum: "border-[#f5e9b8] bg-gradient-to-r from-[#e6d99a] via-[#fffbe6] to-[#efe2a8] text-black",
  rainbow: "border-yellow-400 bg-gradient-to-r from-pink-300 via-yellow-200 to-sky-300 text-black",
  rainbow_ex: "border-yellow-300 bg-gradient-to-r from-cyan-500 via-green-300 to-orange-400 text-black",
  rainbow_max: "border-yellow-200 bg-gradient-to-r from-purple-800 via-gray-800 to-indigo-600 text-white",
};

const FALLBACK_CLASS = "border-accent/40 bg-accent/10 text-accent";

/** Rating区分のバッジ。tierで配色を切り替える。 */
export function RatingBadge({ label, tier }: { label: string; tier?: string }) {
  const color = (tier && TIER_CLASS[tier]) || FALLBACK_CLASS;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${color}`}>
      {label}
    </span>
  );
}
