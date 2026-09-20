import { colors } from '@/theme/colors';

export const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  pending: { bg: colors.warningBackground, fg: colors.warning, label: 'Pending' },
  waiting: { bg: colors.warningBackground, fg: colors.warning, label: 'Waiting' },

  accepted: { bg: colors.successBackground, fg: colors.success, label: 'Accepted' },
  loaded: { bg: colors.successBackground, fg: colors.success, label: 'Loaded' },
  delivered: { bg: colors.successBackground, fg: colors.success, label: 'Delivered' },
  confirmed: { bg: colors.successBackground, fg: colors.success, label: 'Confirmed' },

  cancelled: { bg: colors.errorBackground, fg: colors.error, label: 'Cancelled' },
  mismatch: { bg: colors.errorBackground, fg: colors.error, label: 'Mismatch reported' },
};
