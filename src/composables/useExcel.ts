import { ref } from 'vue'
import { getCookie } from '../utils/cookies'

export const useExcel = () => {
  const loading = ref(false)
  const toast = useToast()

  const downloadExcel = async (url: string, filename: string) => {
    loading.value = true
    try {
      const response = await fetch(url, {
        credentials: 'include'
      })
      if (!response.ok) throw new Error('Error al descargar el archivo')

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error('Download error:', error)
      toast.add({
        title: 'Error',
        description: 'No se pudo descargar el archivo Excel',
        color: 'error'
      })
    } finally {
      loading.value = false
    }
  }

  const validateExcel = async (url: string, file: File) => {
    loading.value = true
    const formData = new FormData()
    formData.append('file', file)
    formData.append('dry_run', 'true')

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-CSRFToken': getCookie('csrftoken') || ''
        },
        credentials: 'include',
        body: formData
      })

      const result = await response.json()

      if (response.ok && result.status === 'success') {
        return result.data // Contiene { rows, total, has_errors }
      } else {
        toast.add({
          title: 'Error',
          description: result.message || 'Error en la validación',
          color: 'error'
        })
        return null
      }
    } catch (error) {
      console.error('Validation error:', error)
      toast.add({
        title: 'Error',
        description: 'Error crítico al validar el archivo',
        color: 'error'
      })
      return null
    } finally {
      loading.value = false
    }
  }

  const uploadExcel = async (url: string, file: File) => {
    loading.value = true
    const formData = new FormData()
    formData.append('file', file)
    formData.append('dry_run', 'false')

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-CSRFToken': getCookie('csrftoken') || ''
        },
        credentials: 'include',
        body: formData
      })

      const result = await response.json()

      if (response.ok && result.status === 'success') {
        toast.add({
          title: 'Éxito',
          description: result.message || 'Importación completada',
          color: 'success'
        })
        return true
      } else {
        toast.add({
          title: 'Error',
          description: result.message || 'Error en la importación',
          color: 'error'
        })
        return false
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.add({
        title: 'Error',
        description: 'Error crítico al subir el archivo',
        color: 'error'
      })
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    downloadExcel,
    validateExcel,
    uploadExcel
  }
}
