<script setup lang="ts">
import { ref, watch } from 'vue'
import UHandsontable from './UHandsontable.vue'
import { getCookie } from '../utils/cookies'

const props = defineProps<{
  open: boolean
  recordId: string | null
  baseUrl: string // e.g., '/config-master/country'
  title?: string
}>()

const emit = defineEmits(['update:open'])

const isOpen = ref(props.open)
const loading = ref(false)
const detailsLoading = ref(false)
const logs = ref<any[]>([])
const selectedLogDetails = ref<any[]>([])
const isDetailModalOpen = ref(false)

const EVENT_NAMES: Record<string, string> = {
  'fd9c7022-581c-4f60-b22b-653138544474': 'CREACIÓN',
  'a92b49fc-3690-4200-80b7-5a883279599e': 'ACTUALIZACIÓN',
  'c57fd4e8-7108-4e96-9f5a-0ff5e5f69afb': 'INACTIVACIÓN',
  'b443609e-a554-4e38-bc3e-0e1a82792f35': 'RESTAURACIÓN',
  'fe29663e-12f2-40b9-90af-2c1f8ff8630a': 'ANULACIÓN',
  '8faad2e0-7a71-4225-aa1b-23ba2d04062d': 'IMPORTACIÓN',
  'a801a75d-d648-4006-ac4b-af5777f83691': 'ACTIVACIÓN MASIVA',
  '4dfc1fff-1845-4a38-8c14-1233448f0aed': 'INACTIVACIÓN MASIVA',
  'dc1e860e-b22f-4a62-9eac-20b0f00e3489': 'ANULACIÓN MASIVA'
}

watch(
  () => props.open,
  (val) => {
    isOpen.value = val
    if (val && props.recordId) {
      fetchLogs()
    } else if (!val) {
      isDetailModalOpen.value = false
    }
  }
)

watch(isOpen, (val) => {
  emit('update:open', val)
})

const fetchLogs = async () => {
  if (!props.recordId) return
  loading.value = true

  try {
    const response = await fetch(`${import.meta.env.VUE_URL_BASE}${props.baseUrl}/log/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken') || ''
      },
      body: JSON.stringify({ id: props.recordId }),
      credentials: 'include'
    })
    const result = await response.json()
    if (response.ok && result.status === 'success') {
      logs.value = result.data.map((log: any) => ({
        ...log,
        event_name: EVENT_NAMES[log.key_event] || 'EVENTO',
        created_at_fmt: new Date(log.created_at).toLocaleString()
      }))
    }
  } catch (error) {
    console.error('Error fetching logs:', error)
  } finally {
    loading.value = false
  }
}

const fetchLogDetails = async (logId: string) => {
  detailsLoading.value = true
  try {
    const response = await fetch(`${import.meta.env.VUE_URL_BASE}${props.baseUrl}/log/detail/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken') || ''
      },
      body: JSON.stringify({ id: logId }),
      credentials: 'include'
    })
    const result = await response.json()
    if (response.ok && result.status === 'success') {
      selectedLogDetails.value = result.data
      isDetailModalOpen.value = true
    }
  } catch (error) {
    console.error('Error fetching log details:', error)
  } finally {
    detailsLoading.value = false
  }
}

const hotSettingsLogs = ref({
  themeName: 'ht-theme-main',
  rowHeaders: true,
  rowHeaderWidth: 50,
  colHeaders: ['EVENTO', 'MÓDULO', 'TABLA', 'USUARIO', 'FECHA Y HORA'],
  columns: [
    { data: 'event_name', readOnly: true, width: 140 },
    { data: 'name_module', readOnly: true, width: 200 },
    { data: 'name_table', readOnly: true, width: 250 },
    { data: 'user_name', readOnly: true, width: 150 },
    { data: 'created_at_fmt', readOnly: true, width: 200 }
  ],
  contextMenu: {
    items: {
      history_details: {
        name: '<div class="flex items-center gap-2 text-info-600 font-bold"><span class="inline-block h-4 w-4 i-lucide-info"></span> Detalle Log</div>',
        callback: function () {
          const hotInstance = this as any
          const selection = hotInstance.getSelected()
          if (!selection || !selection.length) {
            console.warn('No selection found')
            return
          }

          const row = selection[0][0]
          const logData = hotInstance.getSourceDataAtRow(row)

          if (logData && logData.id) {
            fetchLogDetails(logData.id)
          } else {
            console.warn('Log ID not found for row:', row)
          }
        }
      }
    }
  },
  height: 600,
  stretchH: 'all',
  selectionMode: 'row',
  currentRowClassName: 'currentRow',
  outsideClickDeselects: false,
  licenseKey: 'non-commercial-and-evaluation'
})

const hotSettingsDetails = ref({
  themeName: 'ht-theme-main',
  rowHeaders: true,
  rowHeaderWidth: 50,
  colHeaders: ['CAMPO', 'VALOR ANTERIOR', 'VALOR NUEVO'],
  columns: [
    { data: 'column_name', readOnly: true, width: 150 },
    { data: 'old_value', readOnly: true, width: 250 },
    { data: 'new_value', readOnly: true, width: 250 }
  ],
  height: 400,
  stretchH: 'all',
  currentRowClassName: 'currentRow',
  licenseKey: 'non-commercial-and-evaluation'
})
</script>

<template>
  <!-- Using :dismissible="false" and ensuring it doesn't close on interaction with second modal -->
  <UModal
    v-model:open="isOpen"
    :title="title || 'Historial de Cambios'"
    description="Línea de tiempo de acciones y eventos registrados."
    :dismissible="false"
    :ui="{ content: 'w-full max-w-7xl sm:max-w-7xl' }"
  >
    <template #body>
      <div class="flex flex-col gap-4 p-4">
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold text-zinc-400 uppercase tracking-widest">
              Línea de Tiempo Detallada
            </h3>
          </div>
          <div
            class="border rounded-lg overflow-hidden border-zinc-200 dark:border-zinc-800 h-[600px] relative"
          >
            <!-- Loader for Initial Logs -->
            <div
              v-if="loading"
              class="absolute inset-0 bg-white/40 dark:bg-black/40 z-[100] flex items-center justify-center backdrop-blur-[1px]"
            >
              <div
                class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4"
              >
                <div class="relative">
                  <div
                    class="w-12 h-12 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"
                  />
                  <UIcon
                    name="i-lucide-history"
                    class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-primary-500"
                  />
                </div>
                <span
                  class="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tighter"
                  >Cargando Historial...</span
                >
              </div>
            </div>

            <!-- Loader overlay for details -->
            <div
              v-if="detailsLoading"
              class="absolute inset-0 bg-white/40 dark:bg-black/40 z-[100] flex items-center justify-center backdrop-blur-[1px]"
            >
              <div
                class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4"
              >
                <div class="relative">
                  <div
                    class="w-12 h-12 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"
                  />
                  <UIcon
                    name="i-lucide-database"
                    class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-primary-500"
                  />
                </div>
                <span
                  class="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tighter"
                  >Cargando Detalle...</span
                >
              </div>
            </div>
            <UHandsontable :settings="hotSettingsLogs" :data="logs" />
          </div>
          <p class="text-[10px] text-zinc-400 font-medium italic mt-1">
            * Click derecho sobre una fila para ver el detalle detallado de los cambios
          </p>
        </div>
      </div>
    </template>
    <!-- Adding footer back to ensure there is a clear way to close when dismissible is false -->
    <template #footer>
      <div class="flex justify-end w-full">
        <UButton
          label="CERRAR HISTORIAL"
          color="neutral"
          variant="solid"
          class="font-bold rounded-xl"
          @click="isOpen = false"
        />
      </div>
    </template>
  </UModal>

  <!-- Detail Modal -->
  <UModal
    v-model:open="isDetailModalOpen"
    title="Detalle de Cambios"
    description="Comparativa técnica entre el valor anterior y el nuevo valor del campo."
    :ui="{ content: 'w-full max-w-4xl sm:max-w-4xl' }"
  >
    <template #body>
      <div class="p-4">
        <div
          class="border rounded-lg overflow-hidden border-zinc-200 dark:border-zinc-800 h-[400px]"
        >
          <UHandsontable :settings="hotSettingsDetails" :data="selectedLogDetails" />
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end w-full">
        <UButton
          label="VOLVER AL HISTORIAL"
          color="neutral"
          variant="outline"
          class="font-bold rounded-xl"
          @click="isDetailModalOpen = false"
        />
      </div>
    </template>
  </UModal>
</template>

<style>
/* Global fix for Handsontable context menu inside modals */
.htContextMenu {
  pointer-events: auto !important;
  z-index: 10000 !important;
}

/* Ensure the hover highlight is visible */
.htContextMenu table.htCore tr.htSelected {
  background-color: #f4f4f5 !important;
}

.dark .htContextMenu table.htCore tr.htSelected {
  background-color: #27272a !important;
}
</style>
