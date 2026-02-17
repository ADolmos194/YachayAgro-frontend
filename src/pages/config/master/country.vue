<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import UHandsontable from '../../../components/UHandsontable.vue'
import { getCookie } from '../../../utils/cookies'
import { STATUS_UUIDS } from '../../../utils/status'
import { statusRenderer } from '../../../utils/renderers'
import { useStatus } from '../../../composables/useStatus'
import { useExcel } from '../../../composables/useExcel'
import UImportModal from '../../../components/UImportModal.vue'

const toast = useToast()
const { fetchStatuses, getStatus } = useStatus()
const { loading: excelLoading, downloadExcel, validateExcel, uploadExcel } = useExcel()

const fileInput = ref<HTMLInputElement | null>(null)
const isImportModalOpen = ref(false)
const previewData = ref<any[]>([])
const currentFile = ref<File | null>(null)

interface Country {
  id?: string
  code: string
  name: string
  abbreviation: string
  status: string
  isNew?: boolean
  isDirty?: boolean
  isPendingInactivate?: boolean
}

// Pagination state
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const countries = ref<Country[]>([]) // Now stores ALL countries for client-side pagination
const loading = ref(false)
const uHandsontableRef = ref<any>(null)
const isDiscardModalOpen = ref(false)

// Pagination logic (Client-Side)
const displayCountries = computed(() => {
  const start = (page.value - 1) * pageSize.value
  const end = start + pageSize.value
  return countries.value.slice(start, end)
})

// Count unsaved changes by type (on ALL data)
const newCount = computed(() => countries.value.filter(c => c.isNew).length)
const editedCount = computed(() => countries.value.filter(c => c.isDirty && !c.isNew && !c.isPendingInactivate).length)
const inactivateCount = computed(() => countries.value.filter(c => c.isPendingInactivate && c.status === STATUS_UUIDS.STATUS_INACTIVO).length)
const restoreCount = computed(() => countries.value.filter(c => c.isPendingInactivate && c.status === STATUS_UUIDS.STATUS_ACTIVO).length)
const annulCount = computed(() => countries.value.filter(c => c.isPendingInactivate && c.status === STATUS_UUIDS.STATUS_ANULADO).length)
const dirtyCount = computed(() => newCount.value + editedCount.value + inactivateCount.value + restoreCount.value + annulCount.value)

const hotSettings = ref({
  themeName: 'ht-theme-main',
  rowHeaders: true, // Excel-like numbers
  rowHeaderWidth: 50, // Fixed width for row headers
  colHeaders: true,
  autoColumnSize: true, // Auto-size based on content
  
  // Advanced Features
  copyPaste: true,
  contextMenu: {
    items: {
      'row_above': {},
      'row_below': {},
      'separator1': '---------',
      'remove_row': {},
      'separator2': '---------',
      'undo': {},
      'redo': {},
      'separator3': '---------',
      'copy': {},
      'cut': {},
      'separator4': '---------',
      'toggle_inactivate': {
        name: '<div class="flex items-center gap-2 text-rose-600 font-semibold"><span class="h-4 w-4 i-lucide-user-x"></span> Inactivar</div>',
        callback: function(_key: any, selection: any) {
          const row = selection[0].start.row
          const rowData = (this as any).getSourceDataAtRow(row)
          if (rowData && rowData.id) {
            toggleStatus(rowData.id)
          }
        },
        disabled: function() {
          const row = (this as any).getSelectedLast()?.[0]
          if (row === undefined) return true
          const rowData = (this as any).getSourceDataAtRow(row)
          return !rowData || rowData.status !== STATUS_UUIDS.STATUS_ACTIVO || rowData.isPendingInactivate
        }
      },
      'toggle_restore': {
        name: '<div class="flex items-center gap-2 text-green-600 font-semibold"><span class="h-4 w-4 i-lucide-check-circle"></span> Activar / Restaurar</div>',
        callback: function(_key: any, selection: any) {
          const row = selection[0].start.row
          const rowData = (this as any).getSourceDataAtRow(row)
          if (rowData && rowData.id) {
            toggleStatus(rowData.id)
          }
        },
        disabled: function() {
          const row = (this as any).getSelectedLast()?.[0]
          if (row === undefined) return true
          const rowData = (this as any).getSourceDataAtRow(row)
          // Show if it's inactive OR marked for pending inactivation
          return !rowData || (rowData.status === STATUS_UUIDS.STATUS_ACTIVO && !rowData.isPendingInactivate)
        }
      },
      'separator5': '---------',
      'toggle_annul': {
        name: '<div class="menu-item-custom text-rose-700 font-bold"><span class="menu-icon i-lucide-trash-2"></span> Anular Registro</div>',
        callback: function(_key: any, selection: any) {
          const row = selection[0].start.row
          const rowData = (this as any).getSourceDataAtRow(row)
          if (rowData && rowData.id) {
            toggleAnnul(rowData.id)
          }
        },
        disabled: function() {
          const row = (this as any).getSelectedLast()?.[0]
          if (row === undefined) return true
          const rowData = (this as any).getSourceDataAtRow(row)
          return !rowData || rowData.status === STATUS_UUIDS.STATUS_ANULADO || rowData.isNew
        }
      }
    }
  },
  dropdownMenu: true,
  filters: true,
  manualColumnMove: true,
  manualRowMove: true,
  manualColumnResize: true,
  manualRowResize: true,
  multiColumnSorting: {
    indicator: true
  },
  fillHandle: true,
  outsideClickDeselects: false, // Keeps selection active when clicking UI buttons
  
  beforeCopy: (data: any[][], coords: any[]) => {
    data.forEach((row, r) => {
      row.forEach((val, c) => {
        const colIndex = coords[0].startCol + c
        const colConfig = hotSettings.value.columns[colIndex]
        if (colConfig && colConfig.data === 'status') {
          const statusInfo = getStatus(val)
          if (statusInfo) {
            data[r][c] = statusInfo.name
          }
        }
      })
    })
  },

  columns: [
    { data: 'code', title: 'Código', readOnly: false, width: 120 },
    { data: 'name', title: 'Nombre', readOnly: false, width: 350 },
    { data: 'abbreviation', title: 'Abreviación', readOnly: false, width: 150 },
    { 
      data: 'status', 
      title: 'Estado', 
      readOnly: true,
      renderer: statusRenderer,
      columnSorting: false,
      width: 150
    }
  ],
  licenseKey: 'non-commercial-and-evaluation',
  height: 600, 
  stretchH: 'all', // Restored to fill the width of the container
  autoWrapRow: true,
  autoWrapCol: true,
  rowHeights: 45,
  columnHeaderHeight: 45,
  cells: (row: number) => {
    const cellProperties: any = {}
    const rowData = displayCountries.value[row]
    // Base alignment classes
    let classes = 'htCenter htMiddle '
    
    if (rowData) {
      if (rowData.isPendingInactivate && rowData.status === STATUS_UUIDS.STATUS_INACTIVO) {
        classes += 'pending-inactivate-row '
      } else if (rowData.isNew) {
        classes += 'new-row '
      } else if (rowData.isDirty || rowData.isPendingInactivate) {
        // Toggled for activation or simply edited
        classes += 'dirty-row '
      }
    }
    cellProperties.className = classes.trim()
    return cellProperties
  },
  afterChange: (changes: any) => {
    if (changes) {
      // Mark as dirty if any change occurred
      changes.forEach(([row, , oldVal, newVal]: any) => {
        if (oldVal !== newVal && displayCountries.value[row]) {
          displayCountries.value[row].isDirty = true
          // Render table to apply color
          uHandsontableRef.value?.getHotInstance()?.render()
        }
      })
    }
  }
})

const toggleAnnul = (id: string) => {
  const index = countries.value.findIndex(c => c.id === id)
  if (index !== -1) {
    const country = countries.value[index]
    // Mark for annulment
    country.status = STATUS_UUIDS.STATUS_ANULADO
    country.isPendingInactivate = true // Reuse this flag for dirty state
    uHandsontableRef.value?.getHotInstance()?.render()
  }
}

const fetchCountries = async () => {
  loading.value = true
  try {
    const response = await fetch(`${import.meta.env.VUE_URL_BASE}/config-master/country/get/`, {
      credentials: 'include'
    })
    const result = await response.json()
    if (response.ok && result.status === 'success') {
      countries.value = result.data.results
      total.value = result.data.total
    }
  } catch (error) {
    console.error('Fetch error:', error)
    toast.add({ title: 'Error', description: 'No se pudieron cargar los países', color: 'error' })
  } finally {
    loading.value = false
  }
}

const addNewRow = () => {
  const newCountry: Country = {
    code: '',
    name: '',
    abbreviation: '',
    status: STATUS_UUIDS.STATUS_ACTIVO,
    isNew: true,
    isDirty: true
  }
  // Add to the main list (beginning) and reset to page 1
  countries.value = [newCountry, ...countries.value]
  page.value = 1
  total.value++
  
  // Highlight the first cell of the new row and render colors
  setTimeout(() => {
    const hot = uHandsontableRef.value?.getHotInstance()
    if (hot) {
      hot.render() // Force render for colors
      hot.selectCell(0, 0)
    }
  }, 100)
}

const toggleStatus = (id: string) => {
  const index = countries.value.findIndex(c => c.id === id)
  if (index !== -1) {
    const country = countries.value[index]
    const isActivo = country.status === STATUS_UUIDS.STATUS_ACTIVO
    
    // Toggle both status and pending flag
    country.status = isActivo ? STATUS_UUIDS.STATUS_INACTIVO : STATUS_UUIDS.STATUS_ACTIVO
    country.isPendingInactivate = !country.isPendingInactivate
    
    // Re-render table to apply color class and update badge
    uHandsontableRef.value?.getHotInstance()?.render()
  }
}

const saveChanges = async () => {
  if (dirtyCount.value === 0) {
    toast.add({ title: 'Info', description: 'No hay cambios pendientes por guardar', color: 'info' })
    return
  }

  // Filter out pending inactivations for standard validation if they are being deleted
  const newRows = countries.value.filter(c => c.isNew)
  const editedRows = countries.value.filter(c => c.isDirty && !c.isNew && !c.isPendingInactivate)
  const toInactivate = countries.value.filter(c => c.isPendingInactivate)

  // Validation for new and edited
  const invalid = [...newRows, ...editedRows].some(c => !c.code || !c.name || !c.abbreviation)
  if (invalid) {
    toast.add({ title: 'Advertencia', description: 'Todos los campos son obligatorios para registros nuevos o editados', color: 'warning' })
    return
  }

  loading.value = true
  let successCount = 0
  let errorCount = 0

  try {
    // 1. Process New Rows
    for (const row of newRows) {
      const response = await fetch(`${import.meta.env.VUE_URL_BASE}/config-master/country/create/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') || '' },
        credentials: 'include',
        body: JSON.stringify(row)
      })
      if (response.ok) successCount++
      else errorCount++
    }

    // 2. Process Edited Rows
    for (const row of editedRows) {
      const response = await fetch(`${import.meta.env.VUE_URL_BASE}/config-master/country/update/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') || '' },
        credentials: 'include',
        body: JSON.stringify(row)
      })
      if (response.ok) successCount++
      else errorCount++
    }

    // 3. Process Inactivations / Restorations / Annulments
    for (const row of toInactivate) {
      let action = 'inactivate'
      if (row.status === STATUS_UUIDS.STATUS_ACTIVO) action = 'restore'
      else if (row.status === STATUS_UUIDS.STATUS_ANULADO) action = 'annul'

      const response = await fetch(`${import.meta.env.VUE_URL_BASE}/config-master/country/${action}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') || '' },
        credentials: 'include',
        body: JSON.stringify({ id: row.id })
      })
      if (response.ok) successCount++
      else errorCount++
    }

    if (successCount > 0) {
      toast.add({ title: 'Éxito', description: `${successCount} cambios procesados correctamente`, color: 'success' })
      fetchCountries()
    }
    if (errorCount > 0) {
      toast.add({ title: 'Error', description: `${errorCount} cambios fallaron`, color: 'error' })
    }
  } catch (error) {
    console.error('Save error:', error)
    toast.add({ title: 'Error', description: 'Error crítico al procesar cambios', color: 'error' })
  } finally {
    loading.value = false
  }
}

const confirmDiscard = () => {
  if (dirtyCount.value > 0) {
    isDiscardModalOpen.value = true
  } else {
    toast.add({ title: 'Aviso', description: 'No hay cambios para descartar', color: 'secondary' })
  }
}

const discardChanges = () => {
  fetchCountries()
  isDiscardModalOpen.value = false
  toast.add({ title: 'Descartado', description: 'Cambios no guardados han sido descartados', color: 'neutral' })
}

const clearFilters = () => {
  const hot = uHandsontableRef.value?.getHotInstance()
  if (hot) {
    const filtersPlugin = hot.getPlugin('filters')
    filtersPlugin.clearConditions()
    filtersPlugin.filter()
    toast.add({ title: 'Filtros limpiados', description: 'Se han restablecido todos los filtros de la tabla', color: 'info' })
  }
}

// Excel Handlers
const onExport = () => {
  downloadExcel(
    `${import.meta.env.VUE_URL_BASE}/config-master/country/export/`,
    'paises_export.xlsx'
  )
}

const onDownloadTemplate = () => {
  downloadExcel(
    `${import.meta.env.VUE_URL_BASE}/config-master/country/template/`,
    'plantilla_paises.xlsx'
  )
}

const triggerImport = () => {
  fileInput.value?.click()
}

const onFileSelected = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  currentFile.value = file
  const result = await validateExcel(
    `${import.meta.env.VUE_URL_BASE}/config-master/country/import/`,
    file
  )
  
  if (result) {
    previewData.value = result.rows
    isImportModalOpen.value = true
  }
  
  // Reset input
  target.value = ''
}

const onConfirmImport = async () => {
  if (!currentFile.value) return

  const success = await uploadExcel(
    `${import.meta.env.VUE_URL_BASE}/config-master/country/import/`,
    currentFile.value
  )
  
  if (success) {
    isImportModalOpen.value = false
    fetchCountries()
  }
}

// Watch for page changes - NO longer fetches from backend
watch(page, () => {
  // Just force re-render if needed, but displayCountries computed handles it
  uHandsontableRef.value?.getHotInstance()?.render()
})

onMounted(() => {
  fetchStatuses()
  fetchCountries()
})
</script>

<template>
  <!-- Hidden div to ensure UnoCSS bundles the icons used in JS strings -->
  <div class="hidden">
    <div class="i-lucide-trash-2 text-rose-700"></div>
    <div class="i-lucide-user-x text-rose-600"></div>
    <div class="i-lucide-check-circle text-green-600"></div>
  </div>
  <UDashboardPanel id="countries">
    <template #header>
      <UDashboardNavbar title="Configuración de Países">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Unified Content Card -->
      <div class="flex-1 flex flex-col bg-white dark:bg-zinc-900 rounded-1xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <!-- Unified Header (Title + Actions) -->
        <div class="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/50">
          <div class="flex items-center gap-4">
            <h2 class="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              Listado de paises
            </h2>
              
            <!-- Change Indicators -->
            <div v-if="dirtyCount > 0" class="flex gap-2 items-center">
              <UBadge 
                v-if="newCount > 0" 
                color="success" 
                variant="subtle" 
                size="md"
                class="font-black px-3 py-1 text-sm rounded-full shadow-sm"
              >
                +{{ newCount }} Nuevos
              </UBadge>
              <UBadge 
                v-if="editedCount > 0" 
                color="warning" 
                variant="subtle" 
                size="md"
                class="font-black px-3 py-1 text-sm rounded-full shadow-sm"
              >
                {{ editedCount }} Editados
              </UBadge>
              <UBadge 
                v-if="inactivateCount > 0" 
                color="error" 
                variant="subtle" 
                size="md"
                class="font-black px-3 py-1 text-sm rounded-full shadow-sm"
              >
                {{ inactivateCount }} Inactivados
              </UBadge>
              <UBadge 
                v-if="restoreCount > 0" 
                color="info" 
                variant="subtle" 
                size="md"
                class="font-black px-3 py-1 text-sm rounded-full shadow-sm"
              >
                {{ restoreCount }} Restaurados
              </UBadge>
              <UBadge 
                v-if="annulCount > 0" 
                color="error" 
                variant="subtle" 
                size="md"
                class="font-black px-3 py-1 text-sm rounded-full shadow-sm"
              >
                {{ annulCount }} Anulados
              </UBadge>
            </div>
          </div>

          <div class="flex gap-4 items-center">
            <UTooltip text="Exportar a Excel">
              <UButton 
                icon="i-lucide-file-down" 
                color="info" 
                variant="solid"
                size="xl"
                class="rounded-full shadow-lg transition-all hover:scale-110 active:scale-95"
                :loading="excelLoading"
                @click="onExport" 
              />
            </UTooltip>

            <UTooltip text="Importar desde Excel">
              <UButton 
                icon="i-lucide-file-up" 
                color="secondary" 
                variant="solid"
                size="xl"
                class="rounded-full shadow-lg transition-all hover:scale-110 active:scale-95"
                :loading="excelLoading"
                @click="triggerImport" 
              />
            </UTooltip>

            <UTooltip text="Descargar plantilla">
              <UButton 
                icon="i-lucide-file-spreadsheet" 
                color="neutral" 
                variant="solid"
                size="xl"
                class="rounded-full shadow-lg transition-all hover:scale-110 active:scale-95"
                :loading="excelLoading"
                @click="onDownloadTemplate" 
              />
            </UTooltip>

            <UTooltip text="Limpiar filtros">
              <UButton 
                icon="i-lucide-filter-x" 
                color="neutral" 
                variant="solid"
                size="xl"
                class="rounded-full shadow-lg transition-all hover:scale-110 active:scale-95"
                @click="clearFilters" 
              />
            </UTooltip>

            <UTooltip text="Refrescar datos">
              <UButton 
                icon="i-lucide-refresh-cw" 
                color="warning" 
                variant="solid"
                size="xl"
                class="rounded-full shadow-lg transition-all hover:scale-110 active:scale-95"
                :loading="loading"
                @click="fetchCountries" 
              />
            </UTooltip>

            <UTooltip text="Agregar fila">
              <UButton 
                icon="i-lucide-list-plus" 
                color="success" 
                variant="solid"
                size="xl"
                class="rounded-full shadow-lg transition-all hover:scale-110 active:scale-95"
                @click="addNewRow" 
              />
            </UTooltip>
              
            <UTooltip text="Guardar cambios">
              <UChip 
                :text="dirtyCount.toString()" 
                :show="dirtyCount > 0" 
                color="error"
                size="md"
                :ui="{ 
                  base: '!-top-1 !-right-1 min-w-[20px] h-[20px] flex items-center justify-center text-[11px] font-bold ring-2 ring-white dark:ring-zinc-900 shadow-sm' 
                }"
              >
                <UButton 
                  icon="i-lucide-save" 
                  color="info" 
                  variant="solid"
                  size="xl"
                  class="rounded-full shadow-lg transition-all hover:scale-110 active:scale-95"
                  :loading="loading"
                  @click="saveChanges" 
                />
              </UChip>
            </UTooltip>

            <UTooltip text="Descartar cambios">
              <UButton 
                icon="i-lucide-undo-2" 
                color="error" 
                variant="solid"
                size="xl"
                class="rounded-full shadow-lg transition-all hover:scale-110 active:scale-95"
                @click="confirmDiscard" 
              />
            </UTooltip>
          </div>
        </div>

        <!-- Discard Confirmation Modal (Nuxt UI v4 Pattern) -->
        <UModal 
          v-model:open="isDiscardModalOpen" 
          title="Confirmar descarte" 
          description="¿Estás seguro de que deseas descartar todos los cambios no guardados en la tabla?"
          :ui="{ footer: 'justify-end' }"
        >
          <template #body>
            <div class="flex items-center gap-4 py-2">
              <div class="p-3 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600">
                <UIcon name="i-lucide-alert-triangle" class="w-8 h-8" />
              </div>
              <p class="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                Los datos volverán a su estado original y esta acción no se puede deshacer.
              </p>
            </div>
          </template>

          <template #footer>
            <UButton 
              label="No" 
              color="neutral" 
              variant="outline" 
              class="font-bold px-6 rounded-xl"
              @click="isDiscardModalOpen = false" 
            />
            <UButton 
              label="Sí, descartar" 
              color="error" 
              variant="solid"
              class="font-black px-6 rounded-xl shadow-md"
              @click="discardChanges" 
            />
          </template>
        </UModal>

        <!-- Unified Grid Body - Now with better responsiveness -->
        <div class="flex-1 p-4 bg-white dark:bg-zinc-950 overflow-hidden">
          <UHandsontable 
            ref="uHandsontableRef"
            :settings="hotSettings" 
            :data="displayCountries" 
          />
        </div>

        <!-- Pagination Footer -->
        <div class="flex items-center justify-between p-4 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div class="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Mostrando <span class="text-primary-600 font-bold">{{ displayCountries.length }}</span> de <span class="font-bold text-zinc-900 dark:text-white">{{ countries.length }}</span> registros
          </div>
          <div class="flex items-center gap-6">
            <div class="flex items-center gap-2">
              <span class="text-xs text-zinc-400 uppercase font-bold tracking-wider">Filas:</span>
              <USelectMenu
                v-model="pageSize"
                :items="[10, 15, 20, 50]"
                :searchable="false"
                size="sm"
                class="w-16"
                @update:model-value="page = 1"
              />
            </div>
            <UPagination
              v-model:page="page"
              :items-per-page="pageSize"
              :total="countries.length"
              size="sm"
              class="font-bold"
            />
          </div>
        </div>
      </div>
      
      <!-- Hidden File Input for Import -->
      <input 
        ref="fileInput"
        type="file" 
        accept=".xlsx, .xls" 
        class="hidden" 
        @change="onFileSelected" 
      />

      <!-- Success Modal for Import Preview (Centralized) -->
      <UImportModal 
        v-model:open="isImportModalOpen"
        title="Previsualización de Importación - Países"
        description="Revisa los datos antes de confirmar la importación."
        :data="previewData"
        :headers="['Código', 'Nombre', 'Abreviación', 'Estado']"
        :loading="excelLoading"
        @confirm="onConfirmImport"
      />
    </template>
  </UDashboardPanel>
</template>

<style>
/* Adjust container for Handsontable - Removed fixed height for better responsiveness */
.handsontable-wrapper {
  width: 100%;
}

/* Ensure table headers look good and show sorting arrows */
.handsontable thead th, 
.handsontable tbody th {
  background-color: #f4f4f5 !important; /* Zinc-100 */
  color: #3f3f46 !important; /* Zinc-700 */
  font-size: 13px !important;
  vertical-align: middle !important;
  padding: 0 4px !important;
}

/* Handsontable native alignment for header text */
.handsontable th .relative {
  padding: 8px 10px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.dark .handsontable thead th,
.dark .handsontable tbody th {
  background-color: #09090b !important; /* Zinc-950 */
  color: #a1a1aa !important; /* Zinc-400 */
  border-color: #27272a !important; /* Zinc-800 */
}

/* Make sorting indicators visible in dark mode */
.dark .handsontable .sortAction {
  fill: #a1a1aa !important;
  color: #a1a1aa !important;
}

/* Specific style for Row Headers (Excel numbers) */
.handsontable .rowHeader {
  font-size: 13px !important;
  font-weight: 600 !important;
  color: #52525b !important; /* Zinc-600 */
  background-color: #f4f4f5 !important; /* Zinc-100 */
  text-align: center !important;
  line-height: 45px !important; /* Centers text vertically for rowHeights: 45 */
  border-right: none !important;
}

.dark .handsontable .rowHeader {
  background-color: #09090b !important;
  color: #71717a !important; /* Zinc-500 */
  border-right: 1px solid #18181b !important; /* Subtle neutral separator */
}

/* DARK MODE CELL STYLING - Strictly Pure Black */
.dark .handsontable td {
  background-color: #000000 !important; /* Pure Black */
  color: #e4e4e7 !important; /* Zinc-200 */
  border-color: #18181b !important; /* Zinc-900 border */
}

/* HIGHLIGHT DIRTY ROWS (Amber) */
.handsontable td.dirty-row {
  background-color: #fef3c7 !important;
  color: #92400e !important;
}

.dark .handsontable td.dirty-row {
  background-color: rgba(245, 158, 11, 0.1) !important;
  color: #f59e0b !important;
  border-bottom-color: rgba(245, 158, 11, 0.2) !important;
}

/* HIGHLIGHT NEW ROWS (Green) */
.handsontable td.new-row {
  background-color: #dcfce7 !important; /* Zinc friendly green */
  color: #166534 !important;
}

.dark .handsontable td.new-row {
  background-color: rgba(34, 197, 94, 0.1) !important;
  color: #22c55e !important;
  border-bottom-color: rgba(34, 197, 94, 0.2) !important;
}

/* HIGHLIGHT PENDING INACTIVATE ROWS (Red) */
.handsontable td.pending-inactivate-row {
  background-color: #fee2e2 !important;
  color: #991b1b !important;
  text-decoration: line-through !important;
}

.dark .handsontable td.pending-inactivate-row {
  background-color: rgba(239, 68, 68, 0.1) !important;
  color: #ef4444 !important;
  text-decoration: line-through !important;
  border-bottom-color: rgba(239, 68, 68, 0.2) !important;
}

/* Context Menu Icons */
.htContextMenu .menu-item-custom {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  padding: 2px 0 !important;
}

.htContextMenu .menu-icon {
  width: 16px !important;
  height: 16px !important;
  display: inline-block !important;
}
</style>
