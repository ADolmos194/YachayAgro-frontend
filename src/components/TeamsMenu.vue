<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  collapsed?: boolean
}>()

const team = ref({
  label: 'Yachay Agro',
  avatar: {
    src: '/logo_yachay_agro.png',
    alt: 'Yachay Agro'
  }
})
</script>

<template>
  <div
    class="flex items-center gap-2 px-3 py-2"
    :class="[collapsed ? 'justify-center' : 'justify-start']"
  >
    <UAvatar v-bind="team.avatar" size="sm" />
    <span v-if="!collapsed" class="font-bold text-sm truncate text-zinc-900 dark:text-white">
      {{ team.label }}
    </span>
  </div>
</template>
