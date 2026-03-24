async function callClaude(system, user, useSearch = false, maxTokens = 1500) {
  const body = { ... };
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
