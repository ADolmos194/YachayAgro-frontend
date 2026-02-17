import { computed } from 'vue'
import { useStorage, StorageSerializers } from '@vueuse/core'

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

export function useAuth() {
    // Store the complete session (user info + menu + permissions)
    const session = useStorage<AuthSession | null>('auth-session', null, undefined, { serializer: StorageSerializers.object })

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
            await fetch(`${import.meta.env.VUE_URL_BASE}/auth/logout/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            })
        } catch (error) {
            console.error('Error during backend logout:', error)
        } finally {
            // Always clear local state even if the backend call fails
            session.value = null
            localStorage.removeItem('auth-session')
            localStorage.removeItem('auth-user')

            // Optional: If we want to be absolutely sure, we can clear everything, 
            // but that might affect other things like theme preferences.
            // For now, let's just make sure we clear the known auth keys.
        }
    }

    /**
     * Sets the session after a successful login.
     */
    function setUser(data: any) {
        // Now 'data' is the 'data' field from our standardized response
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
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            })

            const result = await response.json()
            if (response.ok && result.status === 'success') {
                setUser(result.data)
            } else {
                // If 401 or other error, clear local session
                logout()
            }
        } catch (error) {
            console.error('Error verifying session:', error)
        }
    }

    return {
        session,
        user: computed(() => session.value?.user_info),
        isLoggedIn,
        userFullName,
        setUser,
        logout,
        checkSession
    }
}
