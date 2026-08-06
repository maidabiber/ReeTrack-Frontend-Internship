import type { ReactNode, RefObject } from 'react'
import { Dialog, Popover } from 'react-aria-components'
import { cn } from '../../../lib/utils'

type PickerPopoverProps = {
  onToday: () => void
  children: ReactNode
  /**
   * Render without a focus-trapping dialog so the trigger keeps focus while open.
   * The owner is then responsible for dismissing the popover.
   */
  nonModal?: boolean
  popoverRef?: RefObject<HTMLElement | null>
  className?: string
}

export function PickerPopover({
  onToday,
  children,
  nonModal = false,
  popoverRef,
  className,
}: PickerPopoverProps) {
  const content = (
    <div>
      {children}
      <div className="mt-3 border-t border-navy/[0.06] pt-3">
        <button
          type="button"
          onClick={onToday}
          className="w-full rounded-md py-1.5 text-sm font-semibold text-brand outline-none hover:bg-brand-tint"
        >
          Today
        </button>
      </div>
    </div>
  )

  return (
    <Popover
      ref={popoverRef}
      isNonModal={nonModal}
      className={cn(
        'w-[272px] rounded-2xl border border-navy/[0.08] bg-white p-4 shadow-dropdown outline-none',
        className,
      )}
    >
      {nonModal ? content : <Dialog className="outline-none">{content}</Dialog>}
    </Popover>
  )
}
