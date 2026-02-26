import { ref, onMounted, onUnmounted } from 'vue'

export function useNotifications() {
  const socket = ref<WebSocket | null>(null)
  const notifications = ref<any[]>([])

  const connect = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    // Adjust port/host if backend is different
    const host = window.location.hostname === 'localhost' ? 'localhost:8080' : window.location.host
    const wsUrl = `${protocol}//${host}/ws/notifications/`

    socket.value = new WebSocket(wsUrl)

    socket.value.onmessage = (event) => {
      const data = JSON.parse(event.data)
      notifications.value.push({
        ...data,
        id: Date.now(),
        read: false
      })

      // We could also use a toast library here if available
    }

    socket.value.onclose = () => {
      console.log('WebSocket closed. Reconnecting...')
      setTimeout(connect, 3000)
    }

    socket.value.onerror = (err) => {
      console.error('WebSocket error:', err)
      socket.value?.close()
    }
  }

  onMounted(() => {
    connect()
  })

  onUnmounted(() => {
    socket.value?.close()
  })

  return {
    notifications
  }
}
