export const THERAPIES = {
  ORTOPEDICA: { label: "Ortopédica", color: "#F26B1D" },
  ESPORTIVA: { label: "Esportiva", color: "#D85510" },
  NEUROLOGICA: { label: "Neurológica", color: "#6B6762" },
  RESPIRATORIA: { label: "Respiratória", color: "#8E8A86" },
  PILATES: { label: "Pilates clínico", color: "#FF8638" },
  RPG: { label: "RPG", color: "#B3420E" },
  PELVICA: { label: "Pélvica", color: "#FFA66B" },
  GERIATRICA: { label: "Geriátrica", color: "#4A4743" },
} as const;
export type TherapyKey = keyof typeof THERAPIES;
export const therapyLabel = (k: string) => THERAPIES[k as TherapyKey]?.label ?? k;
export const therapyColor = (k: string) => THERAPIES[k as TherapyKey]?.color ?? "#8E8A86";

export const STATUS: Record<string, { label: string; cls: string }> = {
  AGENDADA: { label: "Agendada", cls: "bg-ink-100 text-ink-600" },
  CONFIRMADA: { label: "Confirmada", cls: "bg-brand-100 text-brand-700" },
  REALIZADA: { label: "Realizada", cls: "bg-emerald-100 text-emerald-700" },
  FALTOU: { label: "Faltou", cls: "bg-red-100 text-red-700" },
  CANCELADA: { label: "Cancelada", cls: "bg-ink-200 text-ink-500" },
};

export const isPilates = (therapy: string) => therapy === "PILATES";
