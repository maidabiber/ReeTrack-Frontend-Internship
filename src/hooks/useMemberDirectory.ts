import { useEffect, useState } from 'react'
import { listMembers, type Member } from '../api/members'

/** Fetches the member directory once on mount. Returns a map of userId → member. */
export function useMemberDirectory() {
  const [members, setMembers] = useState<Map<string, Member>>(new Map())
  const [teamSize, setTeamSize] = useState<number>(0)

  useEffect(() => {
    const controller = new AbortController()

    listMembers({ pageSize: 200 })
      .then(result => {
        if (controller.signal.aborted) return
        const map = new Map<string, Member>()
        for (const member of result.items) {
          map.set(member.id, member)
        }
        setMembers(map)
        setTeamSize(result.totalCount)
      })
      .catch(() => {
        // 403 or network error — degrade gracefully, hide team size
      })

    return () => controller.abort()
  }, [])

  return { members, teamSize }
}
