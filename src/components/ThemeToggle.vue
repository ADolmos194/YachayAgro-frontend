<script setup lang="ts">
import { useTheme } from '../composables/useTheme'

const { isDark, toggleTheme } = useTheme()
</script>

<template>
  <button
    class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    :title="isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
    @click="toggleTheme"
  >
    <UIcon
      :name="isDark ? 'i-heroicons-sun' : 'i-heroicons-moon'"
      class="w-5 h-5 text-gray-600 dark:text-gray-400"
    />
  </button>
</template>
