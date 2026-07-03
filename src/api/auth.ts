/**
 * Auth stubs. Backend Google SSO is owned by another task; these are
 * placeholders so the sign-in / onboarding buttons have something to call.
 * Replace with the real OAuth redirect (or backend-issued auth URL) once ready.
 */

/**
 * Begin the Google sign-in flow. For now this just resolves after a short delay
 * to mimic the redirect round-trip so the buttons can show a loading state.
 */
export function startGoogleSignIn(): Promise<void> {
  console.info('[auth] Google sign-in stub — backend OAuth not wired yet')
  return new Promise((resolve) => setTimeout(resolve, 1200))
}
