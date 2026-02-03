// src/types.ts

export enum UserRole {
  SUPERADMIN = "SUPERADMIN",
  OFFICER = "OFFICER",
  STUDENT = "STUDENT",
}

export enum ProposalCategory {
  RESOURCES = "RESOURCES",
  PROGRAMS = "PROGRAMS",
  POLICY = "POLICY",

  // NOTE: "IMPLEMENTED" is a status in Proposal.status, not a category.
  // Kept here because your project currently includes it.
  IMPLEMENTED = "IMPLEMENTED",
}

export type BudgetFundKey = "operational" | "project" | "trust";

export type BudgetImpact = "LEDGER" | "AVAILABLE_ONLY";

export enum DepartmentType {
  SAMASA = "SAMASA",
  MSA = "MSA",
  PSSS = "PSSS",
  LALISA = "LALISA",
  MSSA = "MSSA",
  PASS = "PASS",
}

export enum ProjectStatus {
  COMPLETED = "COMPLETED",
  ONGOING = "ONGOING",
  PLANNED = "PLANNED",
}

/** ✅ Adds ADVISERS */
export enum OfficerDivision {
  EXECUTIVE = "EXECUTIVE",
  UNDERSECRETARIES = "UNDERSECRETARIES",
  LEGISLATIVE = "LEGISLATIVE",
  ADVISERS = "ADVISERS",
}

/** Officers directory supports dynamic department IDs */
export type DepartmentId = DepartmentType | string;

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;

  department?: DepartmentType;
  avatar?: string;

  /** ✅ NEW: if this logged-in OFFICER is linked to an Officer card */
  officerId?: string;
}

export interface Department {
  id: DepartmentId;
  name: string;
  active: boolean;
  order: number;
  locked?: boolean;
}

/** ✅ Removed email + social links feature */
export interface Officer {
  id: string;
  name: string;
  position: string;
  department: DepartmentId;

  division: OfficerDivision;

  photoUrl?: string; // stored as DataURL from upload
  order?: number;
}

/** ✅ NEW: stored login accounts (for Officer login CRUD by Superadmin) */
export interface UserAccount {
  id: string;
  name: string;
  email: string;

  /** demo/local auth only (localStorage) */
  password: string;

  role: UserRole; // you will store OFFICER accounts here (and optionally SUPERADMIN if you want later)

  /** optional link to an Officer directory card */
  officerId?: string;

  /** optional if you want to pre-tag accounts by dept */
  department?: DepartmentId;

  createdAt: number;
  updatedAt?: number;

  active?: boolean; // optional toggle if you want "disable account"
}

export interface BudgetEntry {
  id: string;
  title: string;
  amount: number;

  // for LEDGER records:
  type: "INCOME" | "EXPENSE";

  category: string;
  department: DepartmentType;
  date: string;
  approvedBy: string;

  // ✅ NEW: required for accurate fund cards
  fund?: BudgetFundKey;

  // ✅ NEW: allows "Balance Adjustment" (affects Available only)
  impact?: BudgetImpact;
}

export interface Proposal {
  id: string;
  title: string;
  category: ProposalCategory;
  proponent: string;
  dateSubmitted: string;
  status: "PENDING" | "REVIEW" | "APPROVED" | "IMPLEMENTED";
  description: string;

  /** ✅ Cloudinary (optional) */
  pdfName?: string | null;
  pdfUrl?: string | null;
  pdfPublicId?: string | null;
}

export interface Policy {
  id: string;
  title: string;
  code: string;
  dateApproved: string;
  description: string;
}

export interface Project {
  id: string;
  title: string;
  bannerImage: string;
  status: ProjectStatus;
  timeline: string;
  inCharge: string;
  description: string;
  objectives: string[];
  spentAmount: number;
  budgetAllocated: number;

  /** ✅ Cloudinary (optional) */
  bannerPublicId?: string | null;
  pdfName?: string | null;
  pdfUrl?: string | null;
  pdfPublicId?: string | null;
}

export interface LandingPageContent {
  heroBackgroundUrl: string;
  heroHeadingTop: string;
  heroHeadingHighlight: string;
  heroSubtitle: string;

  visionTitle: string;
  visionBody: string;
  visionCard1Title: string;
  visionCard1Body: string;
  visionCard2Title: string;
  visionCard2Body: string;
  visionImageUrl: string;

  projectsEyebrow: string;
  projectsTitle: string;

  budgetEyebrow: string;
  budgetTitle: string;

  footerLeft: string;
  footerRight: string;

  loginBackgroundUrl: string;
}
