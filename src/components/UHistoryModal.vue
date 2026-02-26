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

// Pagination state
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

const EVENT_NAMES: Record<string, { label: string; color: string }> = {
  'fd9c7022-581c-4f60-b22b-653138544474': { label: 'CREACIÓN', color: 'success' },
  'a92b49fc-3690-4200-80b7-5a883279599e': { label: 'ACTUALIZACIÓN', color: 'warning' },
  'c57fd4e8-7108-4e96-9f5a-0ff5e5f69afb': { label: 'INACTIVACIÓN', color: 'error' },
  'b443609e-a554-4e38-bc3e-0e1a82792f35': { label: 'RESTAURACIÓN', color: 'success' },
  'fe29663e-12f2-40b9-90af-2c1f8ff8630a': { label: 'ANULACIÓN', color: 'error' },
  '8faad2e0-7a71-4225-aa1b-23ba2d04062d': { label: 'IMPORTACIÓN', color: 'info' },
  'a801a75d-d648-4006-ac4b-af5777f83691': { label: 'ACTIVACIÓN MASIVA', color: 'success' },
  '4dfc1fff-1845-4a38-8c14-1233448f0aed': { label: 'INACTIVACIÓN MASIVA', color: 'error' },
  'dc1e860e-b22f-4a62-9eac-20b0f00e3489': { label: 'ANULACIÓN MASIVA', color: 'error' }
}

watch(
  () => props.open,
  (val) => {
    isOpen.value = val
    if (val && props.recordId) {
      page.value = 1
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
      body: JSON.stringify({
        id: props.recordId,
        page: page.value,
        page_size: pageSize.value
      }),
      credentials: 'include'
    })
    const result = await response.json()
    if (response.ok && result.status === 'success' && result.data && Array.isArray(result.data.results)) {
      logs.value = result.data.results.map((log: any) => {
        const evt = EVENT_NAMES[log.key_event] || { label: 'EVENTO', color: 'neutral' }
        return {
          ...log,
          event_name: evt.label,
          event_color: evt.color,
          created_at_fmt: new Date(log.created_at).toLocaleString()
        }
      })
      total.value = result.data.total
    } else if (response.ok && result.status === 'success' && Array.isArray(result.data)) {
      // Fallback for old/direct array format just in case
      logs.value = result.data.map((log: any) => {
        const evt = EVENT_NAMES[log.key_event] || { label: 'EVENTO', color: 'neutral' }
        return {
          ...log,
          event_name: evt.label,
          event_color: evt.color,
          created_at_fmt: new Date(log.created_at).toLocaleString()
        }
      })
      total.value = result.data.length
    }
  } catch (error) {
    console.error('Error fetching logs:', error)
  } finally {
    loading.value = false
  }
}

watch(page, fetchLogs)

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
    { data: 'name_module', readOnly: true, width: 220 },
    { data: 'name_table', readOnly: true, width: 250 },
    { data: 'user_name', readOnly: true, width: 150 },
    { data: 'created_at_fmt', readOnly: true, width: 200 }
  ],
  cells(row: number) {
    const instance = (this as any).instance
    if (!instance) return {}
    const log = instance.getSourceDataAtRow(row)
    if (log && log.event_color) {
      return {
        className: `log-row-${log.event_color} htMiddle`
      }
    }
    return { className: 'htMiddle' }
  },
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
  height: 450, // Reduced height for approx 10 rows
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
            class="border rounded-lg overflow-hidden border-zinc-200 dark:border-zinc-800 h-[450px] relative bg-white dark:bg-black"
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

          <div class="flex items-center justify-between mt-2">
            <!-- Color Legends -->
            <div class="flex flex-wrap items-center gap-x-6 gap-y-2 px-1 py-1">
              <div class="flex items-center gap-1.5">
                <div
                  class="w-2.5 h-2.5 rounded-full bg-success-500 shadow-sm shadow-success-500/20"
                />
                <span
                  class="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-tight"
                  >Creación / Restauración</span
                >
              </div>
              <div class="flex items-center gap-1.5">
                <div
                  class="w-2.5 h-2.5 rounded-full bg-warning-500 shadow-sm shadow-warning-500/20"
                />
                <span
                  class="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-tight"
                  >Actualización</span
                >
              </div>
              <div class="flex items-center gap-1.5">
                <div class="w-2.5 h-2.5 rounded-full bg-error-500 shadow-sm shadow-error-500/20" />
                <span
                  class="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-tight"
                  >Inactivación / Anulación</span
                >
              </div>
              <div class="flex items-center gap-1.5">
                <div class="w-2.5 h-2.5 rounded-full bg-info-500 shadow-sm shadow-info-500/20" />
                <span
                  class="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-tight"
                  >Importación Masiva</span
                >
              </div>
            </div>

            <!-- Pagination -->
            <UPagination
              v-if="total > pageSize"
              v-model:page="page"
              :total="total"
              :items-per-page="pageSize"
              class="border-zinc-200 dark:border-zinc-800"
            />
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
  border: 1px solid #d4d4d8 !important; /* Light mode default */
}

.htContextMenu table.htCore {
  border: none !important;
  background: white !important;
}

/* Ensure the hover highlight is visible */
.htContextMenu table.htCore tr.htSelected {
  background-color: #f4f4f5 !important;
}

/* Log Row Coloring - Targeting cells directly with higher specificity */
.handsontable td.log-row-success {
  background-color: #f0fdf4 !important; /* Green-50 */
  color: #166534 !important; /* Green-800 */
}
.dark .handsontable td.log-row-success {
  background-color: rgba(34, 197, 94, 0.1) !important;
  color: #4ade80 !important;
}

.handsontable td.log-row-info {
  background-color: #f0f9ff !important; /* Blue-50 */
  color: #075985 !important; /* Blue-800 */
}
.dark .handsontable td.log-row-info {
  background-color: rgba(56, 189, 248, 0.1) !important;
  color: #38bdf8 !important;
}

.handsontable td.log-row-error {
  background-color: #fef2f2 !important; /* Red-50 */
  color: #991b1b !important; /* Red-800 */
}
.dark .handsontable td.log-row-error {
  background-color: rgba(239, 68, 68, 0.1) !important;
  color: #f87171 !important;
}

.handsontable td.log-row-warning {
  background-color: #fffbeb !important; /* Amber-50 */
  color: #92400e !important; /* Amber-800 */
}
.dark .handsontable td.log-row-warning {
  background-color: rgba(245, 158, 11, 0.1) !important;
  color: #fbbf24 !important;
}

.handsontable td.log-row-neutral {
  background-color: #f8fafc !important;
}
.dark .handsontable td.log-row-neutral {
  background-color: #000000 !important; /* Pure Black for neutral rows */
}

/* Force pure black background for the entire Handsontable area in dark mode */
.dark .handsontable,
.dark .handsontable .htCore,
.dark .handsontable th,
.dark .handsontable td,
.dark .handsontable .wtHolder {
    background-color: #000000 !important;
}
</style>
