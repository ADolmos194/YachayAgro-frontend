import { ref } from 'vue'
import { createSharedComposable } from '@vueuse/core'

export interface Status {
  id: string
  name: string
  description?: string
  color_code: string
  icon?: string
  type_status: string
}

const _useStatus = () => {
  const statuses = ref<Status[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchStatuses = async (force = false) => {
    // Avoid double fetching unless forced
    if (statuses.value.length > 0 && !force) return

    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${import.meta.env.VUE_URL_BASE}/config/status/all/`, {
        credentials: 'include'
      })
      const result = await response.json()
      if (response.ok && result.status === 'success') {
        statuses.value = result.data
      } else {
        error.value = result.message || 'Error al obtener los estados'
      }
    } catch (e) {
      error.value = 'Error de conexión al obtener los estados'
    } finally {
      loading.value = false
    }
  }

  const getStatus = (uuid: string) => {
    return statuses.value.find((s) => s.id === uuid)
  }

  return {
    statuses,
    loading,
    error,
    fetchStatuses,
    getStatus
  }
}

export const useStatus = createSharedComposable(_useStatus)
