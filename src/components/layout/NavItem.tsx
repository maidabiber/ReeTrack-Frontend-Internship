import { NavLink } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import type { NavItem as NavItemModel } from '../../config/navigation'

const BASE = 'flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 font-display text-[14px] font-medium no-underline transition-colors'
const ACTIVE = 'bg-brand text-white'
const INACTIVE = 'text-white/70 hover:bg-white/[0.06] hover:text-white'

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
