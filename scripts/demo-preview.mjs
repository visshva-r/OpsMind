const BASE = process.env.BASE_URL ?? "http://localhost:3010";

const queries = [
  "What is the isolation procedure for pump P-101 before opening the casing?",
  "Why is pump P-101 experiencing repeat seal failures?",
  "What are the vibration limits and current status for P-101?",
  "What compliance gaps exist before the next Factory Act audit?",
];

for (const query of queries) {
  const response = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const data = await response.json();
  console.log(`\n${"=".repeat(78)}\nQ: ${query}`);
  console.log(`confidence=${data.confidence} citations=${data.citations.length} (${data.citations
    .map((c) => `${c.documentTitle} ${Math.round(c.relevanceScore * 100)}%`)
    .join(" | ")})`);
  console.log(`\n${data.answer}`);
}
