<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import UHandsontable from '../../../components/UHandsontable.vue'
import { getCookie } from '../../../utils/cookies'
import { STATUS_UUIDS } from '../../../utils/status'
import { statusRenderer } from '../../../utils/renderers'
import { useStatus } from '../../../composables/useStatus'
import { useExcel } from '../../../composables/useExcel'
import UImportModal from '../../../components/UImportModal.vue'
import UHistoryModal from '../../../components/UHistoryModal.vue'
import { useDashboard } from '../../../composables/useDashboard'
import { useAuth } from '../../../composables/useAuth'
import { COUNTRY_PERMISSIONS } from '../../../constants/permissions/index'

const toast = useToast()
const { fetchStatuses, getStatus } = useStatus()
const { loading: excelLoading, downloadExcel, validateExcel, uploadExcel } = useExcel()
const { isNotificationsSlideoverOpen } = useDashboard()
const { can } = useAuth()

const isImportModalOpen = ref(false)
const previewData = ref<any[]>([])
const currentFile = ref<File | null>(null)

interface Country {
  id?: string
  code: string
  name: string
  abbreviation: string
  iso_alpha_2?: string
  iso_alpha_3?: string
  phone_prefix?: string
  status: string
  isNew?: boolean
  isDirty?: boolean
  isPendingInactivate?: boolean
}

const flagRenderer = (
  instance: any,
  td: HTMLTableCellElement,
  row: number,
  _col: number,
  _prop: string | number,
  value: any,
  cellProperties: any
) => {
  // Use the HTML renderer from Handsontable
  const iso2 = instance.getSourceDataAtRow(row).iso_alpha_2
  if (iso2 && iso2.length === 2) {
    const flagUrl = `https://flagcdn.com/w20/${iso2.toLowerCase()}.png`
    td.innerHTML = `<div class="flex items-center gap-2 justify-center h-full">
      <img src="${flagUrl}" class="h-3 w-5 object-cover rounded-sm shadow-sm" onerror="this.style.display='none'" />
      <span class="font-mono text-xs">${value || ''}</span>
    </div>`
  } else {
    td.textContent = value || ''
  }
  td.className = cellProperties.className || ''
  return td
}

// Pagination state
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const countries = ref<Country[]>([]) // Only holds the current page from server
const loading = ref(false)
const uHandsontableRef = ref<any>(null)
const isDiscardModalOpen = ref(false)
const isHistoryModalOpen = ref(false)
const selectedRecordId = ref<string | null>(null)
const searchQuery = ref('')
const isAnnulModalOpen = ref(false)
const recordsToAnnul = ref<string[]>([])
const statusFilter = ref<'todos' | 'activo' | 'inactivo'>('todos')

// With server-side pagination, displayCountries is the current page as-is
// Local search still filters within the current page for UX responsiveness
const displayCountries = computed(() => {
  if (!searchQuery.value) return countries.value
  const q = searchQuery.value.toLowerCase()
  return countries.value.filter(
    (c) =>
      (c.code || '').toLowerCase().includes(q) ||
      (c.name || '').toLowerCase().includes(q) ||
      (c.abbreviation || '').toLowerCase().includes(q)
  )
})

// Total comes from server; local search shows filtered count from current page
const displayTotal = computed(() => total.value)

// Count unsaved changes by type (on ALL data)
const newCount = computed(() => countries.value.filter((c) => c.isNew).length)
const editedCount = computed(
  () => countries.value.filter((c) => c.isDirty && !c.isNew && !c.isPendingInactivate).length
)
const inactivateCount = computed(
  () =>
    countries.value.filter(
      (c) => c.isPendingInactivate && c.status === STATUS_UUIDS.STATUS_INACTIVO
    ).length
)
const restoreCount = computed(
  () =>
    countries.value.filter((c) => c.isPendingInactivate && c.status === STATUS_UUIDS.STATUS_ACTIVO)
      .length
)
const annulCount = computed(
  () =>
    countries.value.filter((c) => c.isPendingInactivate && c.status === STATUS_UUIDS.STATUS_ANULADO)
      .length
)
const dirtyCount = computed(
  () =>
    newCount.value +
    editedCount.value +
    inactivateCount.value +
    restoreCount.value +
    annulCount.value
)

const hotSettings = ref({
  themeName: 'ht-theme-main',
  rowHeaders: true, // Excel-like numbers
  rowHeaderWidth: 50, // Fixed width for row headers
  colHeaders: true,
  autoColumnSize: { useHeaders: true, syncLimit: '100%' },

  // Advanced Features
  copyPaste: true,
  contextMenu: {
    items: {
      row_above: {},
      row_below: {},
      separator1: '---------',
      remove_row: {},
      separator2: '---------',
      undo: {},
      redo: {},
      separator3: '---------',
      copy: {},
      cut: {},
      separator4: '---------',
      toggle_inactivate: {
        name: '<div class="flex items-center gap-2 text-rose-600 font-semibold uppercase"><span class="inline-block h-4 w-4 i-lucide-user-x"></span> INACTIVAR</div>',
        callback: function (_key: any, _selection: any) {
          const selected = (this as any).getSelected() || []
          const ids: string[] = []
          selected.forEach(([row1, _col1, row2, _col2]: any) => {
            const startRow = Math.min(row1, row2)
            const endRow = Math.max(row1, row2)
            for (let r = startRow; r <= endRow; r++) {
              const rowData = (this as any).getSourceDataAtRow(r)
              if (
                rowData &&
                rowData.id &&
                rowData.status === STATUS_UUIDS.STATUS_ACTIVO &&
                !rowData.isPendingInactivate
              ) {
                ids.push(rowData.id)
              }
            }
          })
          if (ids.length > 0) {
            toggleStatus(ids)
          }
        },
        disabled: function () {
          if (!can(COUNTRY_PERMISSIONS.INACTIVATE)) return true
          const row = (this as any).getSelectedLast()?.[0]
          if (row === undefined) return true
          const rowData = (this as any).getSourceDataAtRow(row)
          return (
            !rowData || rowData.status !== STATUS_UUIDS.STATUS_ACTIVO || rowData.isPendingInactivate
          )
        }
      },
      toggle_restore: {
        name: '<div class="flex items-center gap-2 text-green-600 font-semibold uppercase"><span class="inline-block h-4 w-4 i-lucide-check-circle"></span> ACTIVAR / RESTAURAR</div>',
        callback: function (_key: any, _selection: any) {
          const selected = (this as any).getSelected() || []
          const ids: string[] = []
          selected.forEach(([row1, _col1, row2, _col2]: any) => {
            const startRow = Math.min(row1, row2)
            const endRow = Math.max(row1, row2)
            for (let r = startRow; r <= endRow; r++) {
              const rowData = (this as any).getSourceDataAtRow(r)
              if (
                rowData &&
                rowData.id &&
                (rowData.status !== STATUS_UUIDS.STATUS_ACTIVO || rowData.isPendingInactivate)
              ) {
                ids.push(rowData.id)
              }
            }
          })
          if (ids.length > 0) {
            toggleStatus(ids)
          }
        },
        disabled: function () {
          if (!can(COUNTRY_PERMISSIONS.RESTORE)) return true
          const row = (this as any).getSelectedLast()?.[0]
          if (row === undefined) return true
          const rowData = (this as any).getSourceDataAtRow(row)
          // Show if it's inactive OR marked for pending inactivation
          return (
            !rowData ||
            (rowData.status === STATUS_UUIDS.STATUS_ACTIVO && !rowData.isPendingInactivate)
          )
        }
      },
      separator_dept: '---------',
      go_to_departments: {
        name: '<div class="flex items-center gap-2 text-zinc-600 font-semibold uppercase"><span class="inline-block h-4 w-4 i-lucide-map-pinned"></span> VER DEPARTAMENTOS</div>',
        callback: function (_key: any, selection: any) {
          const row = selection[0].start.row
          const rowData = (this as any).getSourceDataAtRow(row)
          if (rowData && rowData.id) {
            const router = (window as any).$router || useRouter()
            router.push({ path: '/config/master/department', query: { country: rowData.id } })
          }
        },
        disabled: function () {
          const row = (this as any).getSelectedLast()?.[0]
          if (row === undefined) return true
          const rowData = (this as any).getSourceDataAtRow(row)
          return !rowData || rowData.isNew
        }
      },
      separator5: '---------',
      toggle_annul: {
        name: '<div class="flex items-center gap-2 text-rose-700 font-bold uppercase"><span class="inline-block h-4 w-4 i-lucide-trash-2"></span> ANULAR REGISTRO</div>',
        disabled: function () {
          if (!can(COUNTRY_PERMISSIONS.ANNUL)) return true
          const row = (this as any).getSelectedLast()?.[0]
          if (row === undefined) return true
          const rowData = (this as any).getSourceDataAtRow(row)
          return !rowData || rowData.status === STATUS_UUIDS.STATUS_ANULADO || rowData.isNew
        },
        callback: function (_key: any, _selection: any) {
          const selected = (this as any).getSelected() || []
          const ids: string[] = []
          selected.forEach(([row1, _col1, row2, _col2]: any) => {
            const startRow = Math.min(row1, row2)
            const endRow = Math.max(row1, row2)
            for (let r = startRow; r <= endRow; r++) {
              const rowData = (this as any).getSourceDataAtRow(r)
              if (
                rowData &&
                rowData.id &&
                rowData.status !== STATUS_UUIDS.STATUS_ANULADO &&
                !rowData.isNew
              ) {
                ids.push(rowData.id)
              }
            }
          })
          if (ids.length > 0) {
            confirmAnnul(ids)
          }
        }
      },
      separator6: '---------',
      history: {
        name: '<div class="flex items-center gap-2 text-info-600 font-bold uppercase"><span class="inline-block h-4 w-4 i-lucide-history"></span> HISTORIAL</div>',
        callback: function (_key: any, selection: any) {
          const row = selection[0].start.row
          const rowData = (this as any).getSourceDataAtRow(row)
          if (rowData && rowData.id) {
            openHistory(rowData.id)
          }
        },
        disabled: function () {
          if (!can(COUNTRY_PERMISSIONS.LOG)) return true
          const row = (this as any).getSelectedLast()?.[0]
          if (row === undefined) return true
          const rowData = (this as any).getSourceDataAtRow(row)
          return !rowData || rowData.isNew
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
    { data: 'code', title: 'CÓDIGO', readOnly: false },
    { data: 'name', title: 'NOMBRE', readOnly: false },
    { data: 'abbreviation', title: 'ABR.', readOnly: false },
    { data: 'iso_alpha_2', title: 'ISO2', readOnly: false, renderer: flagRenderer },
    { data: 'iso_alpha_3', title: 'ISO3', readOnly: false },
    { data: 'phone_prefix', title: 'NÚMERO DE PREFIJO', readOnly: false },
    {
      data: 'status',
      title: 'ESTADO',
      readOnly: true,
      renderer: statusRenderer,
      columnSorting: false
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
      changes.forEach(([row, prop, oldVal, newVal]: any) => {
        if (oldVal !== newVal && displayCountries.value[row]) {
          // Auto-uppercase for specific fields
          if (
            ['code', 'abbreviation', 'iso_alpha_2', 'iso_alpha_3'].includes(prop) &&
            typeof newVal === 'string'
          ) {
            const upper = newVal.toUpperCase()
            if (upper !== newVal) {
              const hot = uHandsontableRef.value?.getHotInstance()
              hot.setDataAtRowProp(row, prop, upper)
              return // The next afterChange call will handle isDirty
            }
          }

          displayCountries.value[row].isDirty = true
          // Render table to apply color
          uHandsontableRef.value?.getHotInstance()?.render()
        }
      })
    }
  }
})

const confirmAnnul = (ids: string | string[]) => {
  recordsToAnnul.value = Array.isArray(ids) ? ids : [ids]
  isAnnulModalOpen.value = true
}

const toggleAnnul = () => {
  if (recordsToAnnul.value.length === 0) return

  recordsToAnnul.value.forEach((id) => {
    const index = countries.value.findIndex((c) => c.id === id)
    if (index !== -1) {
      const country = countries.value[index]
      country.status = STATUS_UUIDS.STATUS_ANULADO
      country.isPendingInactivate = true
    }
  })
  uHandsontableRef.value?.getHotInstance()?.render()
  isAnnulModalOpen.value = false
  recordsToAnnul.value = []
}

const openHistory = (id: string) => {
  selectedRecordId.value = id
  isHistoryModalOpen.value = true
}

const fetchCountries = async () => {
  loading.value = true
  try {
    const body: Record<string, any> = {
      page: page.value,
      page_size: pageSize.value
    }
    if (statusFilter.value !== 'todos') body.status = statusFilter.value

    const response = await fetch(`${import.meta.env.VUE_URL_BASE}/config-master/country/get/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') ?? '' },
      credentials: 'include',
      body: JSON.stringify(body)
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

watch([page, pageSize], () => fetchCountries())

const setStatusFilter = (f: typeof statusFilter.value) => {
  statusFilter.value = f
  page.value = 1
  fetchCountries()
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

const toggleStatus = (ids: string | string[]) => {
  const idList = Array.isArray(ids) ? ids : [ids]
  idList.forEach((id) => {
    const index = countries.value.findIndex((c) => c.id === id)
    if (index !== -1) {
      const country = countries.value[index]
      const isActivo = country.status === STATUS_UUIDS.STATUS_ACTIVO

      // Toggle both status and pending flag
      country.status = isActivo ? STATUS_UUIDS.STATUS_INACTIVO : STATUS_UUIDS.STATUS_ACTIVO
      country.isPendingInactivate = !country.isPendingInactivate
    }
  })
  // Re-render table to apply color class and update badge
  uHandsontableRef.value?.getHotInstance()?.render()
}

const saveChanges = async () => {
  if (dirtyCount.value === 0) {
    toast.add({
      title: 'Info',
      description: 'No hay cambios pendientes por guardar',
      color: 'info'
    })
    return
  }

  // Filter out pending inactivations for standard validation if they are being deleted
  const newRows = countries.value.filter((c) => c.isNew)
  const editedRows = countries.value.filter((c) => c.isDirty && !c.isNew && !c.isPendingInactivate)
  const toInactivate = countries.value.filter((c) => c.isPendingInactivate)

  // Validation for new and edited
  const invalid = [...newRows, ...editedRows].some((c) => !c.code || !c.name || !c.abbreviation)
  if (invalid) {
    toast.add({
      title: 'Advertencia',
      description: 'Todos los campos son obligatorios para registros nuevos o editados',
      color: 'warning'
    })
    return
  }

  loading.value = true
  let successCount = 0
  let errorCount = 0

  try {
    // 1. Process New Rows
    for (const row of newRows) {
      const response = await fetch(
        `${import.meta.env.VUE_URL_BASE}/config-master/country/create/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken') || ''
          },
          credentials: 'include',
          body: JSON.stringify(row)
        }
      )
      if (response.ok) successCount++
      else errorCount++
    }

    // 2. Process Edited Rows
    for (const row of editedRows) {
      const response = await fetch(
        `${import.meta.env.VUE_URL_BASE}/config-master/country/update/`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken') || ''
          },
          credentials: 'include',
          body: JSON.stringify(row)
        }
      )
      if (response.ok) successCount++
      else errorCount++
    }

    // 3. Process Inactivations / Restorations / Annulments (grouped by action → single request each)
    const inactivateIds = toInactivate
      .filter((r) => r.status === STATUS_UUIDS.STATUS_INACTIVO)
      .map((r) => r.id!)
    const restoreIds = toInactivate
      .filter((r) => r.status === STATUS_UUIDS.STATUS_ACTIVO)
      .map((r) => r.id!)
    const annulIds = toInactivate
      .filter((r) => r.status === STATUS_UUIDS.STATUS_ANULADO)
      .map((r) => r.id!)

    const massActions: Array<{ action: string; ids: string[] }> = [
      { action: 'inactivate', ids: inactivateIds },
      { action: 'restore', ids: restoreIds },
      { action: 'annul', ids: annulIds }
    ]

    for (const { action, ids } of massActions) {
      if (ids.length === 0) continue
      const response = await fetch(
        `${import.meta.env.VUE_URL_BASE}/config-master/country/${action}/`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken') || ''
          },
          credentials: 'include',
          body: JSON.stringify(ids.length === 1 ? { id: ids[0] } : { ids })
        }
      )
      if (response.ok) successCount += ids.length
      else errorCount += ids.length
    }

    if (successCount > 0) {
      toast.add({
        title: 'Éxito',
        description: `${successCount} cambios procesados correctamente`,
        color: 'success'
      })
      fetchCountries()
    }
    if (errorCount > 0) {
      toast.add({
        title: 'Error',
        description: `${errorCount} cambios fallaron. Revisa los datos e intenta nuevamente.`,
        color: 'error'
      })
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
  toast.add({
    title: 'Descartado',
    description: 'Cambios no guardados han sido descartados',
    color: 'neutral'
  })
}

const clearFilters = () => {
  const hot = uHandsontableRef.value?.getHotInstance()
  if (hot) {
    const filtersPlugin = hot.getPlugin('filters')
    filtersPlugin.clearConditions()
    filtersPlugin.filter()
    toast.add({
      title: 'Filtros limpiados',
      description: 'Se han restablecido todos los filtros de la tabla',
      color: 'info'
    })
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

const isValidating = ref(false)
const validatingMsg = ref('')

const onFileSelected = async (file: File) => {
  currentFile.value = file

  // Phase: Analyzing
  isValidating.value = true
  validatingMsg.value = 'Analizando documento...'

  // Artificial delay for premium feel or just proceed to validation
  await new Promise((resolve) => setTimeout(resolve, 800))

  const result = await validateExcel(
    `${import.meta.env.VUE_URL_BASE}/config-master/country/import/`,
    file
  )

  if (result) {
    // Phase: Validation Complete
    validatingMsg.value = 'Validación completa'
    await new Promise((resolve) => setTimeout(resolve, 600)) // Short delay to see the "Complete" message

    previewData.value = result.rows
  }

  isValidating.value = false
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

const triggerImport = () => {
  previewData.value = [] // Reset preview to show the Upload step
  isImportModalOpen.value = true
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
    <div class="i-lucide-trash-2 text-rose-700" />
    <div class="i-lucide-user-x text-rose-600" />
    <div class="i-lucide-check-circle text-green-600" />
    <div class="i-lucide-history text-info-600" />
  </div>
  <UDashboardPanel id="countries">
    <template #header>
      <UDashboardNavbar :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
          <div class="flex items-center gap-1 sm:gap-2 ml-1 sm:ml-2 overflow-hidden">
            <span
              class="hidden lg:inline text-sm font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider whitespace-nowrap"
              >Configuración</span
            >
            <UIcon
              name="i-lucide-chevron-right"
              class="hidden lg:inline w-4 h-4 text-zinc-300 dark:text-zinc-700"
            />
            <span
              class="hidden md:inline text-sm font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider whitespace-nowrap"
              >Maestra</span
            >
            <UIcon
              name="i-lucide-chevron-right"
              class="hidden md:inline w-4 h-4 text-zinc-300 dark:text-zinc-700"
            />
            <span
              class="text-xs sm:text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight truncate"
              >País</span
            >
          </div>
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
    </template>

    <template #body>
      <!-- Unified Content Card -->
      <div
        class="flex-1 flex flex-col bg-white dark:bg-zinc-900 rounded-1xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden relative"
      >
        <!-- Premium Global Loader -->
        <div
          v-if="loading"
          class="absolute inset-0 bg-white/40 dark:bg-black/40 z-[100] flex items-center justify-center backdrop-blur-[1px]"
        >
          <div
            class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-6"
          >
            <div class="relative">
              <div
                class="w-16 h-16 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"
              />
              <UIcon
                name="i-lucide-refresh-cw"
                class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-primary-500"
              />
            </div>
            <div class="flex flex-col items-center gap-1">
              <span
                class="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tighter"
                >Procesando Solicitud</span
              >
              <span
                class="text-[10px] text-zinc-400 font-bold uppercase tracking-widest animate-pulse italic"
                >Cargando datos maestros...</span
              >
            </div>
          </div>
        </div>

        <!-- Unified Header (Title + Actions) -->
        <div
          class="flex flex-col lg:flex-row lg:items-center justify-between p-4 lg:p-5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/50 gap-4 transition-all duration-300"
        >
          <!-- Title Section -->
          <div class="flex flex-col lg:flex-row lg:items-center gap-4 flex-1">
            <h2
              class="text-xl lg:text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight shrink-0"
            >
              Listado de países
            </h2>

            <!-- Search Field (Full width on mobile, limited on desktop) -->
            <div class="w-full lg:max-w-xs">
              <UInput
                v-model="searchQuery"
                icon="i-lucide-search"
                placeholder="Buscar países..."
                class="rounded-xl shadow-sm w-full"
                variant="outline"
                color="neutral"
                size="md"
                @update:model-value="page = 1"
              >
                <template #trailing>
                  <UButton
                    v-if="searchQuery"
                    icon="i-lucide-x"
                    color="neutral"
                    variant="link"
                    size="xs"
                    class="-mr-1"
                    @click="searchQuery = ''"
                  />
                </template>
              </UInput>
            </div>
          </div>

          <!-- Mobile Cluster: Filters + Actions (Horizontal on mobile) -->
          <div class="flex items-center justify-between lg:justify-end gap-3 w-full lg:w-auto">
            <!-- Status Filter Tabs -->
            <div
              class="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 w-fit shadow-sm border border-zinc-200/50 dark:border-zinc-700/50 shrink-0"
            >
              <UButton
                v-for="f in [
                  { key: 'todos', t: 'T', full: 'TODOS', color: 'neutral' as const },
                  { key: 'activo', t: 'A', full: 'ACTIVOS', color: 'success' as const },
                  { key: 'inactivo', t: 'I', full: 'INACTIVOS', color: 'warning' as const }
                ]"
                :key="f.key"
                :color="statusFilter === f.key ? f.color : 'neutral'"
                :variant="statusFilter === f.key ? 'solid' : 'ghost'"
                size="xs"
                class="font-extrabold rounded-lg tracking-tighter transition-all px-2.5 sm:px-4"
                @click="setStatusFilter(f.key as any)"
              >
                <span class="sm:hidden">{{ f.t }}</span>
                <span class="hidden sm:inline text-[10px]">{{ f.full }}</span>
              </UButton>
            </div>

            <!-- Action Buttons Wrap -->
            <div class="flex flex-wrap gap-2 items-center justify-end">
              <UTooltip v-if="can(COUNTRY_PERMISSIONS.EXPORT)" text="Exportar">
                <UButton
                  icon="i-lucide-file-down"
                  color="info"
                  variant="solid"
                  size="md"
                  class="rounded-full shadow-lg transition-all hover:scale-110 active:scale-95"
                  :loading="excelLoading"
                  @click="onExport"
                />
              </UTooltip>
              <UTooltip v-if="can(COUNTRY_PERMISSIONS.IMPORT)" text="Importar">
                <UButton
                  icon="i-lucide-file-up"
                  color="secondary"
                  variant="solid"
                  size="md"
                  class="rounded-full shadow-lg transition-all hover:scale-110 active:scale-95"
                  :loading="excelLoading"
                  @click="triggerImport"
                />
              </UTooltip>
              <UTooltip v-if="can(COUNTRY_PERMISSIONS.TEMPLATE)" text="Plantilla">
                <UButton
                  icon="i-lucide-file-spreadsheet"
                  color="neutral"
                  variant="solid"
                  size="md"
                  class="rounded-full shadow-lg transition-all hover:scale-110 active:scale-95"
                  :loading="excelLoading"
                  @click="onDownloadTemplate"
                />
              </UTooltip>
              <UTooltip text="Limpiar">
                <UButton
                  icon="i-lucide-filter-x"
                  color="neutral"
                  variant="solid"
                  size="md"
                  class="rounded-full shadow-lg transition-all hover:scale-110 active:scale-95"
                  @click="clearFilters"
                />
              </UTooltip>
              <UTooltip text="Refrescar">
                <UButton
                  icon="i-lucide-refresh-cw"
                  color="warning"
                  variant="solid"
                  size="md"
                  class="rounded-full shadow-lg transition-all hover:scale-110 active:scale-95"
                  :loading="loading"
                  @click="fetchCountries"
                />
              </UTooltip>
              <UTooltip v-if="can(COUNTRY_PERMISSIONS.CREATE)" text="Agregar">
                <UButton
                  icon="i-lucide-list-plus"
                  color="success"
                  variant="solid"
                  size="md"
                  class="rounded-full shadow-lg transition-all hover:scale-110 active:scale-95"
                  @click="addNewRow"
                />
              </UTooltip>
              <UTooltip
                v-if="can(COUNTRY_PERMISSIONS.CREATE) || can(COUNTRY_PERMISSIONS.UPDATE)"
                text="Guardar"
              >
                <UChip
                  :text="dirtyCount.toString()"
                  :show="dirtyCount > 0"
                  color="error"
                  size="sm"
                  :ui="{
                    base: '!-top-1 !-right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold ring-2 ring-white dark:ring-zinc-900 shadow-sm'
                  }"
                >
                  <UButton
                    icon="i-lucide-save"
                    color="info"
                    variant="solid"
                    size="md"
                    class="rounded-full shadow-lg transition-all hover:scale-110 active:scale-95"
                    :loading="loading"
                    @click="saveChanges"
                  />
                </UChip>
              </UTooltip>
              <UTooltip text="Descartar">
                <UButton
                  icon="i-lucide-undo-2"
                  color="error"
                  variant="solid"
                  size="md"
                  class="rounded-full shadow-lg transition-all hover:scale-110 active:scale-95"
                  @click="confirmDiscard"
                />
              </UTooltip>
            </div>
          </div>
        </div>

        <!-- Change Indicators (Condensed below header on mobile) -->
        <div
          v-if="dirtyCount > 0"
          class="flex flex-wrap gap-1 px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 overflow-x-auto"
        >
          <UBadge
            v-if="newCount > 0"
            color="success"
            variant="subtle"
            size="xs"
            class="font-black px-2 py-0.5 rounded-full"
          >
            +{{ newCount }} Nuevo
          </UBadge>
          <UBadge
            v-if="editedCount > 0"
            color="warning"
            variant="subtle"
            size="xs"
            class="font-black px-2 py-0.5 rounded-full"
          >
            {{ editedCount }} Edit.
          </UBadge>
          <UBadge
            v-if="inactivateCount > 0"
            color="error"
            variant="subtle"
            size="xs"
            class="font-black px-2 py-0.5 rounded-full"
          >
            {{ inactivateCount }} Inact.
          </UBadge>
          <UBadge
            v-if="restoreCount > 0"
            color="info"
            variant="subtle"
            size="xs"
            class="font-black px-2 py-0.5 rounded-full"
          >
            {{ restoreCount }} Rest.
          </UBadge>
          <UBadge
            v-if="annulCount > 0"
            color="error"
            variant="subtle"
            size="xs"
            class="font-black px-2 py-0.5 rounded-full"
          >
            {{ annulCount }} Anul.
          </UBadge>
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
              label="SÍ, DESCARTAR"
              color="error"
              variant="solid"
              class="font-black px-6 rounded-xl shadow-md"
              @click="discardChanges"
            />
          </template>
        </UModal>

        <!-- Annul Confirmation Modal -->
        <UModal
          v-model:open="isAnnulModalOpen"
          title="Confirmar anulación"
          description="¿Estás seguro de que deseas ANULAR este registro?"
          :ui="{ footer: 'justify-end' }"
        >
          <template #body>
            <div class="flex items-center gap-4 py-2">
              <div class="p-3 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700">
                <UIcon name="i-lucide-trash-2" class="w-8 h-8" />
              </div>
              <p class="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                Esta acción marcará el registro como ANULADO. Deberás guardar los cambios para
                confirmar.
              </p>
            </div>
          </template>

          <template #footer>
            <UButton
              label="No"
              color="neutral"
              variant="outline"
              class="font-bold px-6 rounded-xl"
              @click="isAnnulModalOpen = false"
            />
            <UButton
              label="SÍ, ANULAR"
              color="error"
              variant="solid"
              class="font-black px-6 rounded-xl shadow-md"
              @click="toggleAnnul"
            />
          </template>
        </UModal>

        <!-- Unified Grid Body - Now with better responsiveness -->
        <div class="flex-1 p-4 bg-white dark:bg-zinc-950 overflow-hidden relative">
          <UHandsontable ref="uHandsontableRef" :settings="hotSettings" :data="displayCountries" />

          <!-- Empty State Overlay -->
          <div
            v-if="!loading && countries.length === 0"
            class="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm z-10"
          >
            <div
              class="p-4 sm:p-6 rounded-full bg-zinc-50 dark:bg-zinc-900 mb-3 sm:mb-4 shadow-inner"
            >
              <UIcon
                name="i-lucide-database-zap"
                class="w-10 h-10 sm:w-16 sm:h-16 text-zinc-300 dark:text-zinc-700"
              />
            </div>
            <h3
              class="text-base sm:text-xl font-bold text-zinc-900 dark:text-white uppercase tracking-tight text-center"
            >
              No hay datos a mostrar
            </h3>
            <p
              class="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 sm:mt-2 font-medium tracking-tight text-center px-4"
            >
              Agrega un nuevo registro o importa desde Excel para comenzar.
            </p>
            <UButton
              label="AGREGAR PRIMER PAÍS"
              icon="i-lucide-plus"
              color="success"
              variant="solid"
              size="md"
              class="mt-4 sm:mt-6 font-black rounded-xl shadow-lg ring-4 ring-success-500/10 transition-all hover:scale-105 active:scale-95 text-xs sm:text-sm"
              @click="addNewRow"
            />
          </div>
        </div>

        <!-- Color Legend Bar -->
        <div
          class="flex items-center justify-center gap-6 px-4 py-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50"
        >
          <div class="flex items-center gap-2">
            <div class="w-2.5 h-2.5 rounded-full bg-success-500 shadow-sm shadow-success-500/20" />
            <span
              class="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest"
              >Nuevo Registro</span
            >
          </div>
          <div class="flex items-center gap-2">
            <div class="w-2.5 h-2.5 rounded-full bg-warning-500 shadow-sm shadow-warning-500/20" />
            <span
              class="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest"
              >Con Cambios</span
            >
          </div>
          <div class="flex items-center gap-2">
            <div class="w-2.5 h-2.5 rounded-full bg-error-500 shadow-sm shadow-error-500/20" />
            <span
              class="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest"
              >Pendiente Inactivar</span
            >
          </div>
        </div>

        <!-- Pagination Footer -->
        <div
          class="flex items-center justify-between p-4 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900"
        >
          <div class="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Mostrando
            <span class="text-primary-600 font-bold">{{ displayCountries.length }}</span> de
            <span class="font-bold text-zinc-900 dark:text-white">{{ countries.length }}</span>
            registros
          </div>

          <div class="flex items-center gap-6">
            <div class="flex items-center gap-2">
              <span class="text-xs text-zinc-400 uppercase font-bold tracking-wider">Filas:</span>
              <USelectMenu
                v-model="pageSize"
                :items="[10, 20, 50]"
                :searchable="false"
                size="sm"
                class="w-16"
                @update:model-value="page = 1"
              />
            </div>
            <UPagination
              v-model:page="page"
              :items-per-page="pageSize"
              :total="displayTotal"
              size="sm"
              class="font-bold"
            />
          </div>
        </div>
      </div>

      <!-- Success Modal for Import Preview (Centralized Step-by-Step) -->
      <UImportModal
        v-model:open="isImportModalOpen"
        title="Importación de Países"
        description="Selecciona y valida tu archivo Excel antes de procesar."
        :data="previewData"
        :headers="['CÓDIGO', 'NOMBRE', 'ABREVIACIÓN', 'ESTADO']"
        :validating="isValidating"
        :validating-message="validatingMsg"
        :importing="excelLoading"
        @confirm="onConfirmImport"
        @file-selected="onFileSelected"
      />

      <!-- Reusable History Modal -->
      <UHistoryModal
        v-model:open="isHistoryModalOpen"
        :record-id="selectedRecordId"
        base-url="/config-master/country"
        title="Historial de Cambios - País"
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
