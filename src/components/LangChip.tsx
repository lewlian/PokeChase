/** Language chip for mixed-language lists — every row gets one, so users
 *  never have to infer: EN (blue outline) vs JP (solid red). */
export function LangChip({ language }: { language?: string | null }) {
  if (!language) return null;
  if (language === "jp") {
    return (
      <span className="inline-block shrink-0 rounded bg-pokered px-1 py-px align-middle text-[9px] font-bold uppercase leading-tight text-white">
        JP
      </span>
    );
  }
  return (
    <span className="inline-block shrink-0 rounded border border-pokeblue/50 px-1 py-px align-middle text-[9px] font-bold uppercase leading-tight text-pokeblue">
      EN
    </span>
  );
}
