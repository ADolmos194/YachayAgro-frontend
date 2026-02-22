/**
 * Retrieves a cookie value by its name.
 * @param name The name of the cookie.
 * @returns The cookie value or null if not found.
 */
export function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null
  }
  return null
}
