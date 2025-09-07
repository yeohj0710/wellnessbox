interface Parts {
  system: string
  guidelines: string
  retrieved: string
  conversation: string
  user: string
  budget?: number
}

function tokens(t: string) {
  return Math.ceil((t || "").length / 4)
}

export function composeContext(p: Parts) {
  const budget = p.budget ?? Number(process.env.RAG_MAX_TOKENS || 4000)
  let { system, guidelines, retrieved, conversation, user } = p
  while (tokens(system) + tokens(guidelines) + tokens(retrieved) + tokens(conversation) + tokens(user) > budget) {
    if (retrieved.length > 0) retrieved = retrieved.slice(0, Math.floor(retrieved.length * 0.9))
    else if (guidelines.length > 0) guidelines = guidelines.slice(0, Math.floor(guidelines.length * 0.9))
    else if (conversation.length > 0) conversation = conversation.slice(0, Math.floor(conversation.length * 0.9))
    else break
  }
  return { system, guidelines, retrieved, conversation, user }
}
