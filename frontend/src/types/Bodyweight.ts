export type BodyweightLog = {
  id: string;
  weightKg: number;
  loggedAt: string;
  notes?: string;
};

export type CreateBodyweightLogRequest = {
  weightKg: number;
  loggedAt: string;
  notes?: string;
};
