const EN_CATEGORY_LABELS: Record<string, string> = {
  vitc: "Vitamin C",
  omega3: "Omega-3",
  ca: "Calcium",
  lutein: "Lutein",
  vitd: "Vitamin D",
  milkthistle: "Milk Thistle",
  probiotics: "Probiotics",
  vitb: "Vitamin B",
  mg: "Magnesium",
  garcinia: "Garcinia",
  multivitamin: "Multivitamin",
  zn: "Zinc",
  psyllium: "Psyllium Husk",
  minerals: "Minerals",
  vita: "Vitamin A",
  fe: "Iron",
  ps: "Phosphatidylserine",
  folate: "Folic Acid",
  arginine: "Arginine",
  chondroitin: "Chondroitin",
  coq10: "Coenzyme Q10",
  collagen: "Collagen",
};

const EN_CATEGORY_DESC: Record<string, string> = {
  vitc: "Supports immune health and helps protect cells from everyday stress.",
  omega3: "Supports heart, brain, and eye health with healthy fats.",
  ca: "Helps support strong bones and normal muscle function.",
  lutein: "Supports eye health and helps protect the retina from strain.",
  vitd: "Helps your body absorb calcium and supports immune health.",
  milkthistle: "Traditionally used to support liver health and recovery.",
  probiotics: "Supports gut balance and comfortable digestion.",
  vitb: "Helps support energy metabolism and nervous system function.",
  mg: "Supports muscle relaxation, sleep quality, and stress management.",
  garcinia: "Often used to support appetite control and weight management.",
  multivitamin: "Helps fill common nutrient gaps for daily wellness support.",
  zn: "Supports immune function and helps maintain healthy skin.",
  psyllium: "A gentle fiber that supports regularity and digestive comfort.",
  minerals: "Supports key body functions with essential trace minerals.",
  vita: "Supports vision and healthy skin and immune function.",
  fe: "Supports red blood cell production and helps reduce tiredness.",
  ps: "Supports memory, focus, and healthy brain function.",
  folate: "Supports healthy cell growth and normal blood formation.",
  arginine: "Supports blood flow and exercise performance.",
  chondroitin: "Supports joint comfort and healthy cartilage.",
  coq10: "Supports cellular energy and heart health.",
  collagen: "Supports skin elasticity and joint comfort.",
};

const DEFAULT_DESCRIPTION =
  "Supports general wellness based on common health needs.";

export function resolveEnglishCategoryLabel(
  code: string | undefined,
  fallback: string
) {
  if (!code) return fallback;
  return EN_CATEGORY_LABELS[code] ?? fallback;
}

export function resolveEnglishCategoryDescription(code: string | undefined) {
  if (!code) return DEFAULT_DESCRIPTION;
  return EN_CATEGORY_DESC[code] ?? DEFAULT_DESCRIPTION;
}
