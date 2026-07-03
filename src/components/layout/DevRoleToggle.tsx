import { useAuth } from '../../hooks/useAuth'
import type { Role } from '../../types/user'

const ROLES: Role[] = ['Admin', 'Member']

/**
 * Dev-only control to switch the mock user's role so the role-based navigation
 * can be exercised without backend auth. Remove once real auth ships.
 */
export function DevRoleToggle() {
  const { role, setRole } = useAuth()

  if (role === null) return null

  return (
    <div className="mt-auto mb-2 px-1 pt-4">
      <p className="mb-1.5 font-display text-[9px] font-bold tracking-[0.12em] text-white/25 uppercase">
        Dev · view as
      </p>
      <div className="flex gap-1 rounded-full bg-white/[0.06] p-1">
        {ROLES.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setRole(option)}
            className={`flex-1 rounded-full py-1 font-display text-[11px] font-semibold transition-colors ${
              role === option ? 'bg-purple text-white' : 'text-white/50 hover:text-cream'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}
