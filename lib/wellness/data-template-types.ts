export type WellnessSurveyQuestionForTemplate = {
  key: string;
  index: number;
  text: string;
  helpText?: string;
  type: "text" | "single" | "multi" | "number" | "group";
  sourceType:
    | "single_choice"
    | "multi_select_with_none"
    | "multi_select_limited"
    | "number"
    | "group";
  required: boolean;
  options: Array<{
    value: string;
    label: string;
    score?: number;
    aliases?: string[];
    isNoneOption?: boolean;
  }>;
  placeholder?: string;
  maxSelect?: number;
  optionsPrefix?: string;
  unit?: string;
  fields?: Array<{
    id: string;
    label: string;
    type: "text" | "number";
    unit?: string;
    constraints?: {
      min?: number;
      max?: number;
      integer?: boolean;
    };
  }>;
  displayIf?: {
    field: string;
    equals: string;
  };
  constraints?: {
    min?: number;
    max?: number;
    integer?: boolean;
    maxSelections?: number;
    recommendedSelectionsRange?: [number, number];
  };
  scoringEnabled?: boolean;
  noneOptionValue?: string;
  variants?: Record<
    string,
    {
      variantId: string;
      optionsPrefix?: string;
      options: Array<{ value: string; label: string; score?: number }>;
    }
  >;
};

export type WellnessSurveyTemplate = {
  version: number;
  title: string;
  description?: string;
  common: WellnessSurveyQuestionForTemplate[];
  sectionCatalog: Array<{
    key: string;
    title: string;
    displayName?: string;
    description?: string;
    triggerLabel: string;
    questionCount: number;
    aliases?: string[];
  }>;
  sections: Array<{
    key: string;
    title: string;
    displayName?: string;
    description?: string;
    questions: WellnessSurveyQuestionForTemplate[];
  }>;
  rules: {
    selectSectionByCommonQuestionKey: string;
    maxSelectedSections: number;
    minSelectedSections: number;
    recommendedSelectionsRange?: [number, number];
  };
};
