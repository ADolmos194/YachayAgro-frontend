<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useStorage, useColorMode } from '@vueuse/core'
import type { NavigationMenuItem } from '@nuxt/ui'

// Set initial mode to 'light' if no preference is stored
useColorMode({ initialValue: 'light' })

import { useAuth } from './composables/useAuth'

const toast = useToast()
const route = useRoute()
const { session, checkSession } = useAuth()

const isAuthPage = computed(() => ['/login', '/register', '/verify'].includes(route.path))

// Verify session status on application load only if NOT on an auth page
if (!isAuthPage.value) {
  checkSession()
}

const open = ref(false)

const mapMenu = (items: any[]): NavigationMenuItem[] => {
  return items.map((item) => {
    // 1. Normalize path. Only treat 'root' as '/' and non-empty strings as paths.
    let path: string | undefined
    if (item.to === 'root') {
      path = '/'
    } else if (typeof item.to === 'string' && item.to.trim() !== '') {
      path = `/${item.to.trim().replace(/-/g, '/')}`
    }

    const hasChildren = item.children && item.children.length > 0
    // 2. Strict active check. If it's a folder, it's NEVER active (to avoid highlighting parent).
    // If it's a link, match exactly.
    const isActive = !hasChildren && path ? route.path === path : false

    const menuNode: NavigationMenuItem = {
      label: item.title,
      icon: item.icon || 'i-lucide-circle',
      active: isActive,
      exact: true,
      children: hasChildren ? mapMenu(item.children) : undefined,
      onSelect: () => {
        if (!hasChildren) {
          open.value = false
        }
      }
    }

    // 3. Only add 'to' for leaf items to prevent parent highlighting on click
    if (path && !hasChildren) {
      menuNode.to = path
    }

    return menuNode
  })
}

const dynamicLinks = computed(() => {
  // Access route.path here to ensure this computed property re-evaluates when the route changes
  return mapMenu(session.value?.menu || [])
})

const staticLinks = [
  [
    {
      label: 'Feedback',
      icon: 'i-lucide-message-circle',
      to: 'https://github.com/nuxt-ui-templates/dashboard-vue',
      target: '_blank'
    },
    {
      label: 'Help & Support',
      icon: 'i-lucide-info',
      to: 'https://github.com/nuxt/ui',
      target: '_blank'
    }
  ]
] satisfies NavigationMenuItem[][]

const links = computed(() => [dynamicLinks.value, staticLinks[0]])

const groups = computed(() => [
  {
    id: 'links',
    label: 'Go to',
    items: links.value.flat().map((link) => {
      // CommandPaletteItem expects chip to be ChipProps | undefined,
      // but NavigationMenuItem allows boolean | ChipProps | undefined.
      const { chip, ...rest } = link as any
      return {
        ...rest,
        chip: typeof chip === 'object' ? chip : undefined
      }
    })
  },
  {
    id: 'code',
    label: 'Code',
    items: [
      {
        id: 'source',
        label: 'View page source',
        icon: 'simple-icons:github',
        to: `https://github.com/nuxt-ui-templates/dashboard-vue/blob/main/src/pages${route.path === '/' ? '/index' : route.path}.vue`,
        target: '_blank'
      }
    ]
  }
])

const cookie = useStorage('cookie-consent', 'pending')
if (cookie.value !== 'accepted') {
  toast.add({
    title: 'We use first-party cookies to enhance your experience on our website.',
    duration: 0,
    close: false,
    actions: [
      {
        label: 'Accept',
        color: 'neutral',
        variant: 'outline',
        onClick: () => {
          cookie.value = 'accepted'
        }
      },
      {
        label: 'Opt out',
        color: 'neutral',
        variant: 'ghost'
      }
    ]
  })
}
</script>

<template>
  <Suspense>
    <UApp :toaster="{ position: 'top-right' }">
      <template v-if="isAuthPage">
        <div class="bg-background min-h-screen">
          <RouterView />
        </div>
      </template>

      <UDashboardGroup v-else unit="rem" storage="local">
        <UDashboardSidebar
          id="default"
          v-model:open="open"
          collapsible
          resizable
          class="bg-elevated/25"
          :ui="{ footer: 'lg:border-t lg:border-default' }"
        >
          <template #header="{ collapsed }">
            <TeamsMenu :collapsed="collapsed" />
          </template>

          <template #default="{ collapsed }">
            <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" />

            <UNavigationMenu
              :collapsed="collapsed"
              :items="links[0]"
              orientation="vertical"
              tooltip
              popover
            />

            <UNavigationMenu
              :collapsed="collapsed"
              :items="links[1]"
              orientation="vertical"
              tooltip
              class="mt-auto"
            />
          </template>
        </UDashboardSidebar>

        <UDashboardSearch :groups="groups" />

        <RouterView />

        <NotificationsSlideover />
      </UDashboardGroup>
    </UApp>
  </Suspense>
</template>
