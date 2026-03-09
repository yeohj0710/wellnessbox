import styles from "@/components/b2b/B2bUx.module.css";
import type { SurveyTemplateSchema } from "../_lib/client-types";

type B2bSurveyEditorSectionSelectorProps = {
  sectionCatalog: SurveyTemplateSchema["sectionCatalog"];
  selectedSectionCount: number;
  selectedSectionSet: Set<string>;
  maxSelectedSections: number;
  recommendedText: string;
  busy: boolean;
  onToggleSection: (sectionKey: string) => void;
};

export default function B2bSurveyEditorSectionSelector({
  sectionCatalog,
  selectedSectionCount,
  selectedSectionSet,
  maxSelectedSections,
  recommendedText,
  busy,
  onToggleSection,
}: B2bSurveyEditorSectionSelectorProps) {
  return (
    <section className={styles.editorSection}>
      <div className={styles.editorSectionHead}>
        <h3 className={styles.editorSectionTitle}>세부 영역 선택</h3>
        <p className={styles.editorSectionHint}>
          선택 {selectedSectionCount}/{Math.max(1, maxSelectedSections)} · 권장 {recommendedText}
        </p>
      </div>
      <div className={`${styles.actionRow} ${styles.editorChipRow}`}>
        {sectionCatalog.map((section) => (
          <button
            key={section.key}
            type="button"
            onClick={() => onToggleSection(section.key)}
            className={selectedSectionSet.has(section.key) ? styles.chipActive : styles.chip}
            disabled={busy}
          >
            {section.displayName || `${section.key} ${section.title}`}
          </button>
        ))}
      </div>
    </section>
  );
}
