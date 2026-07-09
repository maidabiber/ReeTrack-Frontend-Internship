/** Card list layout for time entries. */
export const TIME_ENTRY_LIST_CLASS = 'space-y-2 p-3'

export const TIME_ENTRY_ITEM_CLASS = 'px-1'

/** Default confirmed entry — rounded with a light brand border. */
export const TIME_ENTRY_ROW_CLASS =
  'rounded-[14px] border border-brand/25 bg-white hover:border-brand/40 hover:bg-surface-muted/50 transition-colors'

/** Pending / invitation entry — stronger blue fill and border. */
export const PENDING_ENTRY_ROW_CLASS =
  'rounded-[14px] border border-brand/50 bg-[#d4def8] hover:border-brand/65 hover:bg-[#c5d4f4] transition-colors'

export const PENDING_ENTRY_AVATAR_RING_CLASS = 'ring-[#d4def8]'

/** @deprecated Use TIME_ENTRY_LIST_CLASS */
export const PENDING_ENTRY_LIST_CLASS = TIME_ENTRY_LIST_CLASS

/** @deprecated Use TIME_ENTRY_ITEM_CLASS */
export const PENDING_ENTRY_ITEM_CLASS = TIME_ENTRY_ITEM_CLASS
