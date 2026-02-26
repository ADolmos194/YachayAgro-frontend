<script setup lang="ts">
import UserMenu from '../components/UserMenu.vue'
import { useDashboard } from '../composables/useDashboard'

const { isNotificationsSlideoverOpen } = useDashboard()
</script>

<template>
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar title="Home" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UTooltip text="Notifications" :shortcuts="['N']">
            <UButton
              color="neutral"
              variant="ghost"
              square
              @click="isNotificationsSlideoverOpen = true"
            >
              <UChip color="error" inset>
                <UIcon name="i-lucide-bell" class="size-5 shrink-0" />
              </UChip>
            </UButton>
          </UTooltip>

          <UserMenu />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <div class="flex items-center gap-2 px-1">
            <UIcon name="i-lucide-info" class="w-4 h-4 text-primary-500" />
            <span class="text-xs font-bold text-zinc-400 uppercase tracking-widest"
              >Panel Informativo</span
            >
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[600px]">
        <div class="relative mb-8">
          <div class="absolute inset-0 bg-primary-500/10 blur-3xl rounded-full scale-150" />
          <div
            class="relative p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden group"
          >
            <div
              class="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent pointer-events-none"
            />
            <UIcon
              name="i-lucide-construction"
              class="w-24 h-24 text-primary-500 mb-2 transition-transform duration-500 group-hover:scale-110"
            />
          </div>
        </div>

        <h1
          class="text-4xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700"
        >
          Sistema en Desarrollo
        </h1>

        <p
          class="max-w-md text-lg text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed mb-8 animate-in fade-in slide-in-from-bottom-5 duration-1000"
        >
          Estamos trabajando para ofrecerte el mejor panel de control agrícola. Vuelve pronto para
          ver tus estadísticas reales.
        </p>

        <div
          class="flex flex-wrap justify-center gap-4 text-xs font-bold uppercase tracking-widest text-zinc-400"
        >
          <div
            class="flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50"
          >
            <span class="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
            V 1.0.0 - Alpha
          </div>
          <div
            class="flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50"
          >
            <UIcon name="i-lucide-database" class="w-3.5 h-3.5" />
            Módulos Maestros Listos
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
