import { TEAM_NAME_AR, toArabicName } from "./teams-ar";

export const TEAM_NAMES_AR = TEAM_NAME_AR;

export function nameAr(english: string): string {
  return toArabicName(english);
}

export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
