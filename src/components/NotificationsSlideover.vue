<script setup lang="ts">
import { formatTimeAgo } from '@vueuse/core'
import { useDashboard } from '../composables/useDashboard'
import { useNotifications } from '../composables/useNotifications'

const { isNotificationsSlideoverOpen } = useDashboard()
const { notifications } = useNotifications()
</script>

<template>
  <USlideover
    v-model:open="isNotificationsSlideoverOpen"
    title="Notificaciones"
    description="Centro de alertas y mensajes del sistema en tiempo real."
  >
    <template #body>
      <div
        v-for="notification in notifications"
        :key="notification.id"
        class="px-3 py-2.5 rounded-md hover:bg-elevated/50 flex items-start gap-3 relative -mx-3 first:-mt-3 last:-mb-3"
      >
        <UIcon
          :name="
            notification.type === 'error'
              ? 'i-lucide-circle-alert'
              : notification.type === 'warning'
                ? 'i-lucide-triangle-alert'
                : 'i-lucide-info'
          "
          :class="[
            'w-5 h-5 mt-0.5',
            notification.type === 'error'
              ? 'text-red-500'
              : notification.type === 'warning'
                ? 'text-amber-500'
                : 'text-blue-500'
          ]"
        />

        <div class="text-sm flex-1">
          <p class="flex items-center justify-between">
            <span class="text-highlighted font-medium">{{ notification.title }}</span>

            <time
              v-if="notification.date"
              :datetime="notification.date"
              class="text-muted text-xs"
              v-text="formatTimeAgo(new Date(notification.date))"
            />
          </p>

          <p class="text-dimmed">
            {{ notification.message }}
          </p>
        </div>
      </div>
    </template>
  </USlideover>
</template>
