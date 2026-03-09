type B2bSurveyEditorSectionTabsProps = {
  sections: Array<{ key: string; title: string }>;
  currentSectionIndex: number;
  onMoveToSection: (index: number) => void;
};

export default function B2bSurveyEditorSectionTabs({
  sections,
  currentSectionIndex,
  onMoveToSection,
}: B2bSurveyEditorSectionTabsProps) {
  if (sections.length <= 1) return null;

  return (
    <nav className="flex flex-wrap gap-2">
      {sections.map((section, index) => (
        <button
          key={section.key}
          type="button"
          onClick={() => onMoveToSection(index)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
            index === currentSectionIndex
              ? "bg-sky-600 text-white"
              : "border border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-700"
          }`}
        >
          {section.title}
        </button>
      ))}
    </nav>
  );
}
