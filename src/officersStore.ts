import { Officer, OfficerDivision } from "../types";
import { SAMASA_OFFICERS, DEPT_OFFICERS } from "../constants";

export const OFFICERS_KEY = "samasa.officers.v6";

const makeId = () => Math.random().toString(36).slice(2, 11);

const inferDivision = (position: string): OfficerDivision => {
  const p = (position || "").toLowerCase();

  if (p.includes("adviser") || p.includes("advisor")) return OfficerDivision.ADVISERS;

  if (p.includes("undersecretary") || p.includes("under secretary"))
    return OfficerDivision.UNDERSECRETARIES;

  if (
    p.includes("councilor") ||
    p.includes("councillor") ||
    p.includes("board member") ||
    p.includes("legisl")
  )
    return OfficerDivision.LEGISLATIVE;

  return OfficerDivision.EXECUTIVE;
};

function normalizeOfficer(raw: any, department: string, order: number): Officer {
  const position = raw?.position || "Position";

  return {
    id: raw?.id || makeId(),
    name: raw?.name || "Unnamed",
    position,
    department: (raw?.department ?? department) as any,
    division: (raw?.division as OfficerDivision) || inferDivision(position),
    photoUrl: raw?.photoUrl || raw?.photo || "", // accepts old "photo" field
    order: typeof raw?.order === "number" ? raw.order : order,
  };
}

export function buildDefaultOfficers(): Officer[] {
  const out: Officer[] = [];

  if (Array.isArray(SAMASA_OFFICERS)) {
    SAMASA_OFFICERS.forEach((o: any, idx: number) => {
      out.push(normalizeOfficer(o, "SAMASA", idx));
    });
  }

  if (DEPT_OFFICERS && typeof DEPT_OFFICERS === "object") {
    Object.keys(DEPT_OFFICERS).forEach((deptKey) => {
      const arr = (DEPT_OFFICERS as any)[deptKey];
      if (Array.isArray(arr)) {
        arr.forEach((o: any, idx: number) => out.push(normalizeOfficer(o, deptKey, idx)));
      }
    });
  }

  return out;
}

export function loadOfficers(): Officer[] {
  try {
    const raw = localStorage.getItem(OFFICERS_KEY);
    if (!raw) return buildDefaultOfficers();

    const parsed = JSON.parse(raw) as Officer[];
    if (!Array.isArray(parsed) || parsed.length === 0) return buildDefaultOfficers();

    return parsed.map((o: any, idx: number) =>
      normalizeOfficer(o, o?.department || "SAMASA", typeof o?.order === "number" ? o.order : idx)
    );
  } catch {
    return buildDefaultOfficers();
  }
}

export function saveOfficers(officers: Officer[]) {
  localStorage.setItem(OFFICERS_KEY, JSON.stringify(officers));
  window.dispatchEvent(new CustomEvent("samasa:officersUpdated", { detail: officers }));
}
