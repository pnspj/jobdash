export const SELECTION_PHASES = [
  '書類選考',
  '試験/課題',
  '一次面接',
  '二次面接',
  '最終面接',
  'オファー/内定',
] as const;

export const ACTION_STATUSES = [
  '要日程調整',
  '要本番準備',
  '要対応',
  '日程調整待ち',
  '選考結果待ち',
  '辞退/不通過',
] as const;

export type SelectionPhase = (typeof SELECTION_PHASES)[number];
export type ActionStatus = (typeof ACTION_STATUSES)[number];

export interface CompanyRecord {
  id: string;
  companyName: string;
  companyUrl?: string;
  agent: string;
  agentJobUrl?: string;
  phase: SelectionPhase;
  action: ActionStatus;
  nextActionDate: string; // YYYY-MM-DD
  nextActionTime?: string; // HH:mm (optional)
  details: string;
  updatedAt: string; // ISO string
}

/** Payload accepted by POST / PUT (server assigns id and updatedAt). */
export type CompanyInput = Omit<CompanyRecord, 'id' | 'updatedAt'>;

/** Maximum number of records accepted by a single bulk import request. */
export const IMPORT_MAX_RECORDS = 1000;
