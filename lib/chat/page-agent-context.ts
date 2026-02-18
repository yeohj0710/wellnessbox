import type { ChatActionType } from "@/lib/chat/agent-actions";

type SearchLike = {
  get(name: string): string | null;
};

export type ChatPageAgentContext = {
  routeKey: string;
  routePath: string;
  title: string;
  summary: string;
  suggestedPrompts: string[];
  preferredActions: ChatActionType[];
  runtimeContextText: string;
};

type BuildContextParams = {
  pathname?: string | null;
  searchParams?: SearchLike | null;
};

function normalizePath(pathname: string | null | undefined) {
  if (!pathname || typeof pathname !== "string") return "/";
  const trimmed = pathname.trim();
  return trimmed || "/";
}

function pickHomeSummary(searchParams?: SearchLike | null) {
  const packageQuery = searchParams?.get("package") || "";
  const categoryQuery = searchParams?.get("category") || "";
  const categoriesQuery = searchParams?.get("categories") || "";

  const hints: string[] = [];
  if (packageQuery) hints.push(`package=${packageQuery}`);
  if (categoryQuery) hints.push(`category=${categoryQuery}`);
  if (categoriesQuery) hints.push(`categories=${categoriesQuery}`);

  return hints.length > 0
    ? `Home product filter context: ${hints.join(", ")}`
    : "Home product browsing context.";
}

function buildRouteContext(
  routePath: string,
  title: string,
  summary: string,
  suggestedPrompts: string[],
  preferredActions: ChatActionType[]
): ChatPageAgentContext {
  const contextLines = [
    `route_path: ${routePath}`,
    `route_title: ${title}`,
    `route_summary: ${summary}`,
    `suggested_prompts: ${suggestedPrompts.join(" | ")}`,
    `preferred_actions: ${preferredActions.join(", ")}`,
  ];

  return {
    routeKey: routePath,
    routePath,
    title,
    summary,
    suggestedPrompts,
    preferredActions,
    runtimeContextText: contextLines.join("\n"),
  };
}

export function buildPageAgentContext(
  params: BuildContextParams = {}
): ChatPageAgentContext | null {
  const pathname = normalizePath(params.pathname);

  if (pathname.startsWith("/chat")) {
    return buildRouteContext(
      "chat",
      "AI chat workspace",
      "Full chat surface. Prefer deep guidance, tool execution, and follow-up planning.",
      [
        "Summarize what I can do from this page.",
        "Guide me to the next best action from my current status.",
        "Run the recommended cart and order flow.",
      ],
      ["open_explore", "open_my_orders", "open_me", "open_cart"]
    );
  }

  if (pathname === "/" || pathname.startsWith("/explore")) {
    return buildRouteContext(
      "home-products",
      "Home product browsing",
      pickHomeSummary(params.searchParams),
      [
        "Show me products for a 7-day package.",
        "Scroll to the home product section.",
        "Open cart and continue checkout.",
      ],
      ["focus_home_products", "open_7day_purchase", "open_cart", "open_check_ai"]
    );
  }

  if (pathname.startsWith("/my-orders")) {
    return buildRouteContext(
      "my-orders",
      "Order lookup",
      "Order lookup supports linked-phone flow and manual phone+password flow.",
      [
        "Move to linked-phone order lookup.",
        "Move to manual order lookup form.",
        "Help me verify order status step by step.",
      ],
      ["focus_linked_order_lookup", "focus_manual_order_lookup", "open_contact", "open_me"]
    );
  }

  if (pathname.startsWith("/me")) {
    return buildRouteContext(
      "me",
      "My profile",
      "Profile, phone link, and personal account settings.",
      [
        "Open profile setup from chat.",
        "Guide me through phone link status.",
        "Move to my order history.",
      ],
      ["open_profile", "open_my_orders", "open_my_data", "open_contact"]
    );
  }

  if (pathname.startsWith("/my-data")) {
    return buildRouteContext(
      "my-data",
      "My data dashboard",
      "Unified view for assessment, quick-check, orders, and chat history.",
      [
        "Summarize my data highlights.",
        "Show actions based on my recent data.",
        "Move to detailed order lookup.",
      ],
      ["open_my_orders", "open_check_ai", "open_assess", "open_explore"]
    );
  }

  if (pathname.startsWith("/assess")) {
    return buildRouteContext(
      "assess",
      "Deep assessment",
      "Deep assessment flow. Can continue in-page or switch to chat-based assessment.",
      [
        "Run deep assessment inside chat.",
        "Open quick-check instead.",
        "Recommend products after assessment.",
      ],
      ["start_chat_assess", "open_check_ai", "open_explore", "open_cart"]
    );
  }

  if (pathname.startsWith("/check-ai")) {
    return buildRouteContext(
      "check-ai",
      "Quick check",
      "Fast check flow. Can continue in-page or switch to deep assessment.",
      [
        "Run quick-check inside chat.",
        "Move to deep assessment page.",
        "Open product recommendations after results.",
      ],
      ["start_chat_quick_check", "open_assess", "open_explore", "open_cart"]
    );
  }

  if (pathname.startsWith("/pharm")) {
    return buildRouteContext(
      "pharm",
      "Pharmacy operations",
      "Pharmacy dashboard and product management.",
      [
        "Open pharmacy order dashboard.",
        "Open pharmacy product management.",
        "Help me process pending orders.",
      ],
      ["open_pharm_dashboard", "open_pharm_manage_products", "open_contact", "open_chat_page"]
    );
  }

  if (pathname.startsWith("/rider")) {
    return buildRouteContext(
      "rider",
      "Rider operations",
      "Rider delivery dashboard and status handling.",
      [
        "Open rider dashboard.",
        "Guide delivery status workflow.",
        "Open support contact page.",
      ],
      ["open_rider_dashboard", "open_contact", "open_chat_page", "open_my_orders"]
    );
  }

  if (pathname.startsWith("/admin")) {
    return buildRouteContext(
      "admin",
      "Admin operations",
      "Admin login and site management context.",
      [
        "Open admin login page.",
        "Open admin dashboard.",
        "Show operational quick links.",
      ],
      ["open_admin_login", "open_admin_dashboard", "open_contact", "open_chat_page"]
    );
  }

  if (pathname.startsWith("/about")) {
    return buildRouteContext(
      "about",
      "Support and policy",
      "Support pages, contact, terms, privacy, and refund policy.",
      [
        "Open contact page.",
        "Open terms and privacy pages.",
        "Open refund policy.",
      ],
      ["open_contact", "open_terms", "open_privacy", "open_refund_policy"]
    );
  }

  return buildRouteContext(
    "generic",
    "General page",
    "General browsing context. Provide guided actions and route shortcuts when needed.",
    [
      "Show what can be done from this page.",
      "Open AI full chat page.",
      "Move to product browsing.",
    ],
    ["open_chat_page", "open_explore", "open_my_orders", "open_contact"]
  );
}
