import {
  Building2,
  CalendarDays,
  ChartColumn,
  Database,
  FileText,
  LayoutDashboard,
  type LucideIcon,
  MessageSquareText,
  Users,
} from 'lucide-react';

/** Icons shared by the header navigation and the page titles, so a page and its nav item match. */
export const PAGE_ICONS = {
  dashboard: LayoutDashboard,
  companies: Building2,
  calendar: CalendarDays,
  agents: Users,
  reports: MessageSquareText,
  resume: FileText,
  stats: ChartColumn,
  settings: Database,
} satisfies Record<string, LucideIcon>;

/** Header navigation. The dashboard is reached through the "JobDash" logo. */
export const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/companies', label: '企業一覧', icon: PAGE_ICONS.companies },
  { href: '/calendar', label: 'カレンダー', icon: PAGE_ICONS.calendar },
  { href: '/agents', label: 'エージェント', icon: PAGE_ICONS.agents },
  { href: '/reports', label: '連絡用テキスト', icon: PAGE_ICONS.reports },
  { href: '/resume', label: '職務経歴書', icon: PAGE_ICONS.resume },
  { href: '/stats', label: '集計', icon: PAGE_ICONS.stats },
  { href: '/settings', label: 'データ管理', icon: PAGE_ICONS.settings },
];
