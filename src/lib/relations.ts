/**
 * Kept free of corpus imports so client components can render the legend without
 * pulling the whole seed document set into the browser bundle.
 */
export const RELATION_MEANINGS: Record<string, string> = {
  documented_in: "This equipment or asset is mentioned in the linked record.",
  cites_regulation: "The document references this statutory or industry rule.",
  governed_by: "The asset is subject to the linked regulation.",
  has_failure_mode: "Linked records describe this failure or risk mode.",
};
