export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
}

export interface UserProfile {
  name?: string;
  age?: number;
  sex?: "male" | "female" | "other";
  heightCm?: number;
  weightKg?: number;
  conditions?: string[]; // e.g., hypertension, diabetes
  medications?: string[]; // e.g., metformin, statins
  allergies?: string[]; // e.g., shellfish, lactose
  goals?: string[]; // e.g., sleep, stress, digestion, immunity
  dietaryRestrictions?: string[]; // e.g., vegan, halal, gluten-free
  pregnantOrBreastfeeding?: boolean;
  caffeineSensitivity?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export interface ChatRequestBody {
  messages: ChatMessage[];
  profile?: UserProfile;
  model?: string;
  // Extended fields used by /api/chat
  clientId?: string;
  mode?: "init" | "chat";
  // Optional local-only Check-AI top labels to enrich context
  localCheckAiTopLabels?: string[];
}
