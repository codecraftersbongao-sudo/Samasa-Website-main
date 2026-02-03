import { LandingPageContent } from "../types";

export const LANDING_CONTENT_KEY = "samasa.landingContent.v1";

export const DEFAULT_LANDING_CONTENT: LandingPageContent = {
  heroBackgroundUrl:
    "https://images.unsplash.com/photo-1523050853064-8d9609599557?q=80&w=2070",
  heroHeadingTop: "LEAD WITH",
  heroHeadingHighlight: "GRIT.",
  heroSubtitle:
    "Official Student Government transparency portal for the College of Arts and Social Sciences.",

  visionTitle: "Radical Transparency.",
  visionBody:
    "We've built a system where every student can audit our progress. Our budget is a living ledger.",
  visionCard1Title: "Verified Logs",
  visionCard1Body: "Public financial logs updated by the treasury.",
  visionCard2Title: "Strategic Goals",
  visionCard2Body: "Every cent tied to a project milestone.",
  visionImageUrl:
    "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1200",

  projectsEyebrow: "Strategic Roadmap",
  projectsTitle: "Live Initiatives",

  budgetEyebrow: "Financial Ledger",
  budgetTitle: "Trust Fund Transparency",

  footerLeft: "SAMASA 2026",
  footerRight: "© Samahan ng mga Mag-aaral sa Sining at Agham",
};

function safeMerge(
  base: LandingPageContent,
  maybe: Partial<LandingPageContent> | null
): LandingPageContent {
  return {
    ...base,
    ...(maybe || {}),
  };
}

export function loadLandingContent(): LandingPageContent {
  try {
    const raw = localStorage.getItem(LANDING_CONTENT_KEY);
    if (!raw) return DEFAULT_LANDING_CONTENT;
    const parsed = JSON.parse(raw) as Partial<LandingPageContent>;
    return safeMerge(DEFAULT_LANDING_CONTENT, parsed);
  } catch {
    return DEFAULT_LANDING_CONTENT;
  }
}

export function saveLandingContent(content: LandingPageContent) {
  localStorage.setItem(LANDING_CONTENT_KEY, JSON.stringify(content));
  // instant refresh for same-tab listeners
  window.dispatchEvent(
    new CustomEvent("samasa:landingContentUpdated", { detail: content })
  );
}

export function resetLandingContent() {
  localStorage.removeItem(LANDING_CONTENT_KEY);
  window.dispatchEvent(
    new CustomEvent("samasa:landingContentUpdated", {
      detail: DEFAULT_LANDING_CONTENT,
    })
  );
}
