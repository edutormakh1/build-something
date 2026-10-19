export const SCORE_LIMITS = "Twin Scores are legacy editorial estimates on a 0–100 scale. No firsthand product-test log or per-dimension scoring worksheet is attached to these retained scores. Dated documentation checks establish only the specific product facts they cite; they do not validate the scores.";
export const RESEARCH_LIMITS = "The bylines are catalog attributions; this evidence register contains agent documentation review dated 2026-10-16, with a responsible human editor unassigned. Professional history and firsthand product evaluations are not independently verified in this evidence register.";
export const SUBMISSION_LIMITS = "Submissions are stored separately as pending when the submission service is configured. Public reviews are read from the committed catalog; approving a database row does not publish it here. No automated submission-to-publication workflow is enabled in this version.";

export const peopleEditorialPolicyContent = {
  title: "Editorial policy",
  openingParagraph: `This directory is an editorial product. Reviews are labeled by kind: editorial, public_quote (editorial documentation paraphrases with source URL, not direct quotations or user testimony), user, or agent. ${SUBMISSION_LIMITS} We never show fake UGC as authentic.`,
  independenceHeading: "Independence",
  independenceParagraph: "We do not sell stars. If a vendor later becomes a sponsor, the relationship will be labeled on the page. The public form does not offer an admin-role field. Database-side permission enforcement has not been verified by this editorial audit. Corrections go to editor@buildsomethingpeoplewant.com.",
  aiAssistanceHeading: "AI assistance",
  aiAssistanceParagraph: `${RESEARCH_LIMITS} ${SCORE_LIMITS} The tables summarize committed catalog values, not firsthand measurements.`,
} as const;

export const peopleContactContent = {
  title: "Contact the editors",
  openingParagraph: "Email editor@buildsomethingpeoplewant.com for corrections, product submissions after you create an account, and press. This is a worldwide English publication; we do not run a walk-in newsroom.",
  whatToIncludeHeading: "What to include",
  whatToIncludeParagraph: "Product slug if it exists, URLs to public docs, and the factual error. We do not accept ghostwritten five-star quotes.",
  agentsHeading: "Agents",
  agentsParagraphPrefix: "Machines should prefer ",
  agentsParagraphSuffix: " and the API. Humans can use this form of words and the email address above.",
} as const;
