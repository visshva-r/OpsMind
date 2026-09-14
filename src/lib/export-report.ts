import type { AgentResult } from "./types";

/**
 * The exported file must say exactly what the screen says, including the absence
 * of evidence — an action with no citation is reported as such rather than
 * silently losing its evidence line.
 */
export function formatAgentReport(
  result: AgentResult,
  meta: {
    title: string;
    equipmentTag?: string;
    symptoms?: string;
    scope?: string;
  }
): string {
  const header = [
    meta.title,
    `Generated: ${new Date().toISOString()}`,
    `Retrieval match: ${
      result.confidence > 0
        ? `${Math.round(result.confidence * 100)}%`
        : "no supporting evidence in the indexed corpus"
    }`,
    meta.equipmentTag ? `Equipment: ${meta.equipmentTag}` : null,
    meta.symptoms ? `Symptoms: ${meta.symptoms}` : null,
    meta.scope ? `Scope: ${meta.scope}` : null,
  ].filter((line): line is string => Boolean(line));

  const evidence = result.citations.length
    ? result.citations.map(
        (citation, index) =>
          `${index + 1}. ${citation.documentTitle} (${citation.documentType}, ${Math.round(
            citation.relevanceScore * 100
          )}% match)\n   ${citation.excerpt}`
      )
    : ["None. No indexed record matched this query."];

  const links = result.knowledgeLinks.length
    ? result.knowledgeLinks.map(
        (link) =>
          `- ${link.from} --${link.relation.replaceAll("_", " ")}--> ${link.to} (Source: ${link.source})`
      )
    : ["None."];

  const actions = result.actions.map((action, index) => {
    const cited = action.citations.map((citation) => citation.documentTitle);
    const evidenceLine = cited.length
      ? `Evidence: ${cited.join("; ")}`
      : "Evidence: none in the indexed corpus";
    return `${index + 1}. [${action.priority.toUpperCase()}] ${action.title}\n   ${action.description}\n   Owner: ${action.owner} | Due: ${action.dueIn}\n   ${evidenceLine}`;
  });

  return [
    ...header,
    "",
    "## Summary",
    result.summary,
    "",
    "## Evidence",
    ...evidence,
    "",
    "## Knowledge links",
    ...links,
    "",
    "## Recommended actions",
    ...actions,
    "",
  ].join("\n");
}
