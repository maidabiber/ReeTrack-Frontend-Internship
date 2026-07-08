/**
 * A workspace client (RT-45). Mirrors the backend ClientResponse; projects and
 * time entries associate to a client through their project (RT-154).
 */
export interface Client {
  id: string
  name: string
  /** false = archived: hidden from pickers but kept on existing projects. */
  isActive: boolean
  /** Number of non-deleted projects assigned to this client. */
  projectCount: number
  createdAtUtc: string
}
