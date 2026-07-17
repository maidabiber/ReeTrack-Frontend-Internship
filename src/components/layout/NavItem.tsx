import { NavLink } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import type { NavItem as NavItemModel } from '../../config/navigation'

import {
  SIDEBAR_ROW_ACTIVE,
  SIDEBAR_ROW_BASE,
  SIDEBAR_ROW_INACTIVE,
} from './sidebarRow'

export function NavItem({ item }: { item: NavItemModel }) {
  return (
    <NavLink
      to={item.path}
      // `end` keeps the index route ("/") from matching every path.
      end={item.path === '/'}
      className={({ isActive }) =>
        `${SIDEBAR_ROW_BASE} ${isActive ? SIDEBAR_ROW_ACTIVE : SIDEBAR_ROW_INACTIVE}`
      }
    >
      <Icon name={item.icon} className="h-4 w-4 flex-shrink-0" />
      {item.label}
    </NavLink>
  )
}
