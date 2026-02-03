// src/usersStore.ts
import { UserAccount, UserRole } from "../types";

const USERS_KEY = "samasa_users_v1";

const safeParse = (raw: string | null): any[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const loadUsers = (): UserAccount[] => {
  const raw = localStorage.getItem(USERS_KEY);
  return safeParse(raw) as UserAccount[];
};

export const saveUsers = (users: UserAccount[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  window.dispatchEvent(new CustomEvent<UserAccount[]>("samasa:usersUpdated", { detail: users }));
};

export const upsertUser = (account: UserAccount) => {
  const list = loadUsers();
  const idx = list.findIndex((u) => u.id === account.id);
  const next = idx >= 0 ? list.map((u, i) => (i === idx ? account : u)) : [...list, account];
  saveUsers(next);
  return next;
};

export const deleteUser = (id: string) => {
  const next = loadUsers().filter((u) => u.id !== id);
  saveUsers(next);
  return next;
};

export const findUserByEmail = (email: string): UserAccount | undefined => {
  const norm = String(email || "").trim().toLowerCase();
  if (!norm) return undefined;
  return loadUsers().find((u) => String(u.email || "").trim().toLowerCase() === norm);
};

export const loadOfficerAccounts = (): UserAccount[] => {
  return loadUsers().filter((u) => u.role === UserRole.OFFICER);
};
