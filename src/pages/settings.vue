<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import UserMenu from '../components/UserMenu.vue'
import { useDashboard } from '../composables/useDashboard'

const { isNotificationsSlideoverOpen } = useDashboard()

const links = [
  [
    {
      label: 'General',
      icon: 'i-lucide-user',
      to: '/settings',
      exact: true
    },
    {
      label: 'Members',
      icon: 'i-lucide-users',
      to: '/settings/members'
    },
    {
      label: 'Notifications',
      icon: 'i-lucide-bell',
      to: '/settings/notifications'
    },
    {
      label: 'Security',
      icon: 'i-lucide-shield',
      to: '/settings/security'
    }
  ],
  [
    {
      label: 'Documentation',
      icon: 'i-lucide-book-open',
      to: 'https://ui.nuxt.com/docs/getting-started/installation/vue',
      target: '_blank'
    }
  ]
] satisfies NavigationMenuItem[][]
</script>

<template>
  <UDashboardPanel id="settings" :ui="{ body: 'lg:py-12' }">
    <template #header>
      <UDashboardNavbar title="Settings" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UTooltip text="Notificaciones">
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
        <!-- NOTE: The `-mx-1` class is used to align with the `DashboardSidebarCollapse` button here. -->
        <UNavigationMenu :items="links" highlight class="-mx-1 flex-1" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-4 sm:gap-6 lg:gap-12 w-full lg:max-w-2xl mx-auto">
        <RouterView />
      </div>
    </template>
  </UDashboardPanel>
</template>
