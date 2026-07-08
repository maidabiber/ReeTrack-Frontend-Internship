import type { SVGProps } from 'react'
import Avatar from 'boring-avatars'

const AVATAR_COLORS = ['#4366E2', '#3552C4', '#BF6DE6', '#1B2540' ]

interface UserAvatarProps extends SVGProps<SVGSVGElement> {
  name: string
  size?: number
}

/**
 * Deterministic SVG avatar seeded from a display name or email.
 * Uses the ReeTrack brand palette via boring-avatars.
 */
export function UserAvatar({ name, size = 40, className, ...props }: UserAvatarProps) {
  return (
    <Avatar
      name={name}
      size={size}
      variant="beam"
      colors={AVATAR_COLORS}
      className={className}
      {...props}
    />
  )
}
