export type PrimaryFlow = {
  kind: "init" | "sign" | "fetch";
  step: 1 | 2 | 3;
  title: string;
  guide: string;
};
