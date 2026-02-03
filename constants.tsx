import {
  Officer,
  OfficerDivision,
  DepartmentType,
  Proposal,
  ProposalCategory,
  Policy,
  BudgetEntry,
  Project,
  ProjectStatus,
} from "./types";

const createCouncilors = (dept: DepartmentType, startId: number): Officer[] =>
  Array.from({ length: 6 }).map((_, i) => ({
    id: `c-${startId + i}`,
    name: `Councilor ${i + 1}`,
    position: "Councilor",
    department: dept,
    division: OfficerDivision.LEGISLATIVE,
    photoUrl: "", // ✅ upload-only: keep empty so placeholder shows
    order: i + 10,
  }));

// SAMASA Officers
export const SAMASA_OFFICERS: Officer[] = [
  {
    id: "s1",
    name: "James Wilson",
    position: "Governor",
    department: DepartmentType.SAMASA,
    division: OfficerDivision.EXECUTIVE,
    photoUrl: "",
    order: 1,
  },
  {
    id: "s2",
    name: "Sarah Chen",
    position: "Vice Governor",
    department: DepartmentType.SAMASA,
    division: OfficerDivision.EXECUTIVE,
    photoUrl: "",
    order: 2,
  },
  {
    id: "s3",
    name: "Marcus Aurelius",
    position: "General Secretary",
    department: DepartmentType.SAMASA,
    division: OfficerDivision.EXECUTIVE,
    photoUrl: "",
    order: 3,
  },

  ...Array.from({ length: 6 }).map((_, i) => ({
    id: `b-${i}`,
    name: `Board Member ${i + 1}`,
    position: "Board Member",
    department: DepartmentType.SAMASA,
    division: OfficerDivision.EXECUTIVE,
    photoUrl: "",
    order: 10 + i,
  })),
];

export const DEPT_OFFICERS: Record<string, Officer[]> = {
  [DepartmentType.MSA]: [
    {
      id: "m1",
      name: "Mayor Adams",
      position: "Mayor",
      department: DepartmentType.MSA,
      division: OfficerDivision.EXECUTIVE,
      photoUrl: "",
      order: 1,
    },
    {
      id: "m2",
      name: "Vice Mayor Baker",
      position: "Vice Mayor",
      department: DepartmentType.MSA,
      division: OfficerDivision.EXECUTIVE,
      photoUrl: "",
      order: 2,
    },
    {
      id: "m3",
      name: "Sec Carter",
      position: "Secretary",
      department: DepartmentType.MSA,
      division: OfficerDivision.EXECUTIVE,
      photoUrl: "",
      order: 3,
    },
    ...createCouncilors(DepartmentType.MSA, 100),
  ],

  [DepartmentType.PSSS]: [
    {
      id: "p1",
      name: "Mayor Dixon",
      position: "Mayor",
      department: DepartmentType.PSSS,
      division: OfficerDivision.EXECUTIVE,
      photoUrl: "",
      order: 1,
    },
    {
      id: "p2",
      name: "Vice Mayor Evans",
      position: "Vice Mayor",
      department: DepartmentType.PSSS,
      division: OfficerDivision.EXECUTIVE,
      photoUrl: "",
      order: 2,
    },
    {
      id: "p3",
      name: "Sec Foster",
      position: "Secretary",
      department: DepartmentType.PSSS,
      division: OfficerDivision.EXECUTIVE,
      photoUrl: "",
      order: 3,
    },
    ...createCouncilors(DepartmentType.PSSS, 200),
  ],

  [DepartmentType.LALISA]: [
    {
      id: "l1",
      name: "Mayor Gomez",
      position: "Mayor",
      department: DepartmentType.LALISA,
      division: OfficerDivision.EXECUTIVE,
      photoUrl: "",
      order: 1,
    },
    {
      id: "l2",
      name: "Vice Mayor Hayes",
      position: "Vice Mayor",
      department: DepartmentType.LALISA,
      division: OfficerDivision.EXECUTIVE,
      photoUrl: "",
      order: 2,
    },
    {
      id: "l3",
      name: "Sec Ivan",
      position: "Secretary",
      department: DepartmentType.LALISA,
      division: OfficerDivision.EXECUTIVE,
      photoUrl: "",
      order: 3,
    },
    ...createCouncilors(DepartmentType.LALISA, 300),
  ],

  [DepartmentType.MSSA]: [
    {
      id: "ms1",
      name: "Mayor Jones",
      position: "Mayor",
      department: DepartmentType.MSSA,
      division: OfficerDivision.EXECUTIVE,
      photoUrl: "",
      order: 1,
    },
    {
      id: "ms2",
      name: "Vice Mayor King",
      position: "Vice Mayor",
      department: DepartmentType.MSSA,
      division: OfficerDivision.EXECUTIVE,
      photoUrl: "",
      order: 2,
    },
    {
      id: "ms3",
      name: "Sec Lopez",
      position: "Secretary",
      department: DepartmentType.MSSA,
      division: OfficerDivision.EXECUTIVE,
      photoUrl: "",
      order: 3,
    },
    ...createCouncilors(DepartmentType.MSSA, 400),
  ],

  [DepartmentType.PASS]: [
    {
      id: "pa1",
      name: "Mayor Newton",
      position: "Mayor",
      department: DepartmentType.PASS,
      division: OfficerDivision.EXECUTIVE,
      photoUrl: "",
      order: 1,
    },
    {
      id: "pa2",
      name: "Vice Mayor Olivia",
      position: "Vice Mayor",
      department: DepartmentType.PASS,
      division: OfficerDivision.EXECUTIVE,
      photoUrl: "",
      order: 2,
    },
    {
      id: "pa3",
      name: "Sec Parker",
      position: "Secretary",
      department: DepartmentType.PASS,
      division: OfficerDivision.EXECUTIVE,
      photoUrl: "",
      order: 3,
    },
    ...createCouncilors(DepartmentType.PASS, 500),
  ],
};

export const MOCK_OFFICERS: Officer[] = [
  ...SAMASA_OFFICERS,
  ...Object.values(DEPT_OFFICERS).flat(),
];

export const MOCK_PROPOSALS: Proposal[] = [
  {
    id: "prop1",
    title: "Student Lounge Refurbishment",
    category: ProposalCategory.RESOURCES,
    proponent: "Dept of MSA",
    dateSubmitted: "2024-03-01",
    status: "APPROVED",
    description: "Upgrading the 2nd floor lounge with ergonomic seating and charging stations.",
  },
  {
    id: "prop2",
    title: "Mental Health Peer Network",
    category: ProposalCategory.PROGRAMS,
    proponent: "SAMASA Executive",
    dateSubmitted: "2024-03-10",
    status: "PENDING",
    description: "Establishing a network of trained peer counselors across all departments.",
  },
  {
    id: "prop3",
    title: "Paperless Initiative Policy",
    category: ProposalCategory.POLICY,
    proponent: "Board of Members",
    dateSubmitted: "2024-02-15",
    status: "IMPLEMENTED",
    description: "Mandating digital-first submissions for all college organizations.",
  },
];

// MOCK Policies
export const MOCK_POLICIES: Policy[] = [
  {
    id: "pol1",
    code: "CASS-2024-001",
    title: "Transparency Act",
    dateApproved: "2024-01-10",
    description: "Ensures all financial records are accessible to officers via the digital portal.",
  },
  {
    id: "pol2",
    code: "CASS-2024-002",
    title: "Environmental Sustainability Code",
    dateApproved: "2024-02-05",
    description: "Banning single-use plastics in all student-led events.",
  },
];

// MOCK Budget (with department)
export const MOCK_BUDGET: BudgetEntry[] = [
  { id: "b1", title: "Quarterly Allocation", amount: 250000, type: "INCOME", date: "2024-01-01", category: "Operational", approvedBy: "Admin", department: DepartmentType.SAMASA },
  { id: "b2", title: "Unity Cup Venue", amount: 45000, type: "EXPENSE", date: "2024-02-15", category: "Events", approvedBy: "Governor", department: DepartmentType.SAMASA },
  { id: "b3", title: "Office Supplies", amount: 12000, type: "EXPENSE", date: "2024-03-05", category: "Resources", approvedBy: "Gen Sec", department: DepartmentType.SAMASA },

  { id: "b4", title: "Workshop Materials", amount: 15000, type: "EXPENSE", date: "2024-01-20", category: "Resources", approvedBy: "MSA Mayor", department: DepartmentType.MSA },
  { id: "b5", title: "MSA Fundraising", amount: 30000, type: "INCOME", date: "2024-02-01", category: "Operational", approvedBy: "MSA Mayor", department: DepartmentType.MSA },

  { id: "b6", title: "Seminar Expenses", amount: 22000, type: "EXPENSE", date: "2024-03-10", category: "Programs", approvedBy: "PSSS Mayor", department: DepartmentType.PSSS },
  { id: "b7", title: "Department Grant", amount: 50000, type: "INCOME", date: "2024-01-15", category: "Operational", approvedBy: "PSSS Mayor", department: DepartmentType.PSSS },

  { id: "b8", title: "Art Exhibit Supplies", amount: 18000, type: "EXPENSE", date: "2024-02-28", category: "Programs", approvedBy: "LALISA Mayor", department: DepartmentType.LALISA },
  { id: "b9", title: "Department Funding", amount: 40000, type: "INCOME", date: "2024-01-10", category: "Operational", approvedBy: "LALISA Mayor", department: DepartmentType.LALISA },

  { id: "b10", title: "Sports Equipment", amount: 25000, type: "EXPENSE", date: "2024-03-15", category: "Programs", approvedBy: "MSSA Mayor", department: DepartmentType.MSSA },
  { id: "b11", title: "MSSA Sponsorship", amount: 35000, type: "INCOME", date: "2024-02-05", category: "Operational", approvedBy: "MSSA Mayor", department: DepartmentType.MSSA },

  { id: "b12", title: "Pass Seminar Materials", amount: 10000, type: "EXPENSE", date: "2024-03-20", category: "Programs", approvedBy: "PASS Mayor", department: DepartmentType.PASS },
  { id: "b13", title: "Pass Funding", amount: 20000, type: "INCOME", date: "2024-01-25", category: "Operational", approvedBy: "PASS Mayor", department: DepartmentType.PASS },
];

// MOCK Projects
export const MOCK_PROJECTS: Project[] = [
  {
    id: "p1",
    title: "University-wide Festival",
    bannerImage: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800",
    status: ProjectStatus.ONGOING,
    timeline: "March - May 2024",
    inCharge: "Gov. Wilson",
    description: "A grand celebration of arts and sciences involving all departments.",
    objectives: ["Foster unity", "Showcase talents", "Community building"],
    spentAmount: 50000,
    budgetAllocated: 150000,
  },
  {
    id: "p2",
    title: "Campus Greening Initiative",
    bannerImage: "https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=800",
    status: ProjectStatus.COMPLETED,
    timeline: "Jan - Feb 2024",
    inCharge: "Sarah Chen",
    description: "Planting native trees around the CASS building to improve air quality and provide shade.",
    objectives: ["Sustainability", "Beautification"],
    spentAmount: 20000,
    budgetAllocated: 20000,
  },
];

// MOCK Announcements
export const MOCK_ANNOUNCEMENTS = [
  {
    id: "1",
    title: "SAMASA General Assembly",
    date: "2026-01-01",
    content: "Join the SAMASA General Assembly this semester for updates on projects and programs.",
    category: "Activity",
  },
  {
    id: "2",
    title: "Urgent Notice: Budget Submission",
    date: "2026-01-05",
    content: "All department officers must submit their budget proposals by the end of this week.",
    category: "Urgent",
  },
  {
    id: "3",
    title: "Upcoming CASS Seminar",
    date: "2026-01-10",
    content: "Attend the CASS seminar to learn about student research opportunities.",
    category: "Activity",
  },
];
