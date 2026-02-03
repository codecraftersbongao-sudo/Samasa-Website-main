import { Department, DepartmentId, DepartmentType } from "../types";

export const DEPARTMENTS_KEY = "samasa.departments.v1";

const makeCustomId = (name: string) => {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "")
    .slice(0, 20);

  const id = base || "CUSTOM";
  return id.startsWith("SAMASA") ? `CUSTOM_${id}` : id;
};

export function buildDefaultDepartments(): Department[] {
  const enumIds = Object.values(DepartmentType);

  // Ensure SAMASA first + locked
  const list: Department[] = enumIds.map((id, idx) => ({
    id,
    name: id, // default label (editable later)
    active: true,
    order: idx,
    locked: id === DepartmentType.SAMASA,
  }));

  // Force SAMASA to top and locked
  const samasaIndex = list.findIndex((d) => d.id === DepartmentType.SAMASA);
  if (samasaIndex > 0) {
    const [samasa] = list.splice(samasaIndex, 1);
    list.unshift({ ...samasa, order: 0, active: true, locked: true, name: "SAMASA" });
    list.forEach((d, i) => (d.order = i));
  } else if (samasaIndex === 0) {
    list[0] = { ...list[0], order: 0, active: true, locked: true, name: "SAMASA" };
  }

  return list;
}

export function loadDepartments(): Department[] {
  try {
    const raw = localStorage.getItem(DEPARTMENTS_KEY);
    if (!raw) return buildDefaultDepartments();

    const parsed = JSON.parse(raw) as Department[];
    if (!Array.isArray(parsed) || parsed.length === 0) return buildDefaultDepartments();

    // ensure SAMASA exists + locked
    const hasSamasa = parsed.some((d) => d.id === DepartmentType.SAMASA);
    const fixed = hasSamasa
      ? parsed
      : [{ id: DepartmentType.SAMASA, name: "SAMASA", active: true, order: 0, locked: true }, ...parsed];

    // lock SAMASA properties
    const normalized = fixed.map((d) =>
      d.id === DepartmentType.SAMASA
        ? { ...d, name: "SAMASA", active: true, order: 0, locked: true }
        : { ...d, locked: false }
    );

    return normalized.slice().sort((a, b) => a.order - b.order);
  } catch {
    return buildDefaultDepartments();
  }
}

export function saveDepartments(depts: Department[]) {
  // lock SAMASA before saving
  const locked = depts.map((d) =>
    d.id === DepartmentType.SAMASA
      ? { ...d, name: "SAMASA", active: true, order: 0, locked: true }
      : { ...d, locked: false }
  );

  localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(locked));
  window.dispatchEvent(new CustomEvent("samasa:departmentsUpdated", { detail: locked }));
}

export function resetDepartments() {
  localStorage.removeItem(DEPARTMENTS_KEY);
  const defaults = buildDefaultDepartments();
  window.dispatchEvent(new CustomEvent("samasa:departmentsUpdated", { detail: defaults }));
}

export function addDepartment(name: string, existing: Department[]): Department[] {
  const trimmed = name.trim();
  if (!trimmed) return existing;

  const id: DepartmentId = makeCustomId(trimmed);
  const maxOrder = Math.max(...existing.map((d) => d.order ?? 0), 0);

  // avoid id collisions
  const finalId =
    existing.some((d) => d.id === id) ? `${id}_${Math.random().toString(36).slice(2, 6).toUpperCase()}` : id;

  return [
    ...existing,
    {
      id: finalId,
      name: trimmed,
      active: true,
      order: maxOrder + 1,
      locked: false,
    },
  ];
}
