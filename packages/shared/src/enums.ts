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
  '辞退',
  '不通過',
] as const;

export type SelectionPhase = (typeof SELECTION_PHASES)[number];
export type ActionStatus = (typeof ACTION_STATUSES)[number];

/** Actions that end the selection process for a company. */
export const CLOSED_ACTIONS: readonly ActionStatus[] = ['辞退', '不通過'];

export const isClosedAction = (action: ActionStatus) => CLOSED_ACTIONS.includes(action);

/** Actions starting with "要" require the user's attention. */
export const isActionRequired = (action: ActionStatus) => action.startsWith('要');
