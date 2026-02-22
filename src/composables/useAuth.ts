import { computed } from 'vue'
import { useStorage, StorageSerializers } from '@vueuse/core'
import { getCookie } from '../utils/cookies'

/**
 * Interface for the detailed user info.
 */
export interface UserInfo {
  id: string
  username: string
  name: string
  last_name: string
  email: string
  dni: string
  role: boolean
}

/**
 * Interface for the full authentication response.
 */
export interface AuthSession {
  user_info: UserInfo
  menu: any[]
  permisos_front: any[]
  permisos_back: string[]
}

// 1. Singleton state outside the function to ensure data consistency
const session = useStorage<AuthSession | null>('auth-session', null, undefined, {
  serializer: StorageSerializers.object,
  listenToStorageChanges: true // Crucial for cross-tab or multi-instance sync
})

export function useAuth() {
  /**
   * Computed property to check if the user is logged in.
   */
  const isLoggedIn = computed(() => !!session.value?.user_info?.username)

  /**
   * Returns the name to display (username).
   */
  const userFullName = computed(() => {
    return session.value?.user_info?.username || 'Acceso'
  })

  /**
   * Logs out the user by clearing the storage and notifying the backend.
   */
  async function logout() {
    try {
      // First clear reactive state to trigger UI updates immediately
      session.value = null

      // Clean specific local storage keys
      localStorage.removeItem('auth-session')
      localStorage.removeItem('auth-user')
      localStorage.removeItem('verify_email')

      await fetch(`${import.meta.env.VUE_URL_BASE}/auth/logout/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken') || ''
        },
        credentials: 'include'
      })
    } catch (error) {
      console.error('Error during backend logout:', error)
    }
  }

  /**
   * Sets the session after a successful login.
   */
  function setUser(data: any) {
    // Update the singleton session reference
    session.value = {
      user_info: data.user_info,
      menu: data.user_info?.menu || [],
      permisos_front: data.user_info?.permisos_front || [],
      permisos_back: data.user_info?.permisos_back || []
    }
  }

  /**
   * Verifies the session with the backend on page load or refresh.
   */
  async function checkSession() {
    try {
      const response = await fetch(`${import.meta.env.VUE_URL_BASE}/auth/session/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      const result = await response.json()
      if (response.ok && result.status === 'success') {
        setUser(result.data)
      } else {
        // If session is invalid on backend, clear local
        session.value = null
        localStorage.removeItem('auth-session')
        localStorage.removeItem('auth-user')
      }
    } catch (error) {
      console.error('Error verifying session:', error)
    }
  }

  /**
   * Checks if the user has a specific permission.
   * @param permission The permission string to check (decorator_name).
   * @returns true if the user has the permission or ALL_PERMISSIONS.
   */
  function can(permission: string): boolean {
    if (!session.value) return false
    const perms = session.value.permisos_back || []
    return perms.includes('ALL_PERMISSIONS') || perms.includes(permission)
  }

  return {
    session,
    user: computed(() => session.value?.user_info),
    isLoggedIn,
    userFullName,
    setUser,
    logout,
    checkSession,
    can
  }
}
