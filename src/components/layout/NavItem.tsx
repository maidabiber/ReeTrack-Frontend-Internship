import { NavLink } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import type { NavItem as NavItemModel } from '../../config/navigation'

const BASE = 'flex items-center gap-[9px] rounded-[9px] px-2.5 py-2 font-display text-[13px] font-semibold no-underline transition-colors'
const ACTIVE = 'bg-purple text-white'
const INACTIVE = 'text-white/60 hover:bg-white/[0.08]'

export function NavItem({ item }: { item: NavItemModel }) {
  return (
    <NavLink
      to={item.path}
      // `end` keeps the index route ("/") from matching every path.
      end={item.path === '/'}
      className={({ isActive }) => `${BASE} ${isActive ? ACTIVE : INACTIVE}`}
    >
      <Icon name={item.icon} className="h-4 w-4 flex-shrink-0" />
      {item.label}
    </NavLink>
  )
}
