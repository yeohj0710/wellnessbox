import { sectionA, sectionB } from "../data/questions";
import { BANK } from "../data/c-bank";
import { C_OPTIONS } from "../data/c-options";

type AnswersState = Record<string, unknown>;

export function composeAssessAnswers(
  abAnswers: AnswersState,
  cAnswers: Record<string, number[]>,
  categories: string[]
): AnswersState {
  const out: AnswersState = {};

  for (const question of [...sectionA, ...sectionB]) {
    if (abAnswers[question.id] !== undefined) {
      out[question.id] = abAnswers[question.id];
    }
  }

  for (const category of categories) {
    const selectedValues = cAnswers[category] || [];
    const questionBank = BANK[category] || [];

    for (
      let index = 0;
      index < Math.min(selectedValues.length, questionBank.length);
      index++
    ) {
      const value = selectedValues[index];
      if (value < 0) continue;

      const question = questionBank[index];
      const options = C_OPTIONS[
        question.type as keyof typeof C_OPTIONS
      ] as readonly {
        value: number;
        label: string;
      }[];
      const answerLabel = options.find((option) => option.value === value)?.label;
      out[question.prompt] = answerLabel ?? value;
    }
  }

  return out;
}
