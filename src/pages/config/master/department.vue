<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
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
import { DEPARTMENT_PERMISSIONS, COUNTRY_PERMISSIONS } from '../../../constants/permissions/index'

const toast = useToast()
const route = useRoute()
const { fetchStatuses, getStatus } = useStatus()
const { loading: excelLoading, downloadExcel, validateExcel, uploadExcel } = useExcel()
const { isNotificationsSlideoverOpen } = useDashboard()
const { can: originalCan } = useAuth()
const can = (permission: string) => {
  const hasPerm = originalCan(permission)
  if (!hasPerm) {
    console.warn(`[Permission Debug] User lacks permission: ${permission}`)
  }
  return hasPerm
}

const isImportModalOpen = ref(false)
const previewData = ref<any[]>([])
const currentFile = ref<File | null>(null)

interface Department {
  id?: string
  code: string
  name: string
  abbreviation: string
  key_country: string
  country_name?: string
  status: string
  isNew?: boolean
  isDirty?: boolean
  isPendingInactivate?: boolean
}

interface Country {
  id: string
  name: string
}

const countryFilter = ref((route.query.country as string) || '')
const countriesList = ref<Country[]>([])
const parentCountryName = ref('')

// Pagination state
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const departments = ref<Department[]>([])
const loading = ref(false)
const uHandsontableRef = ref<any>(null)
const isDiscardModalOpen = ref(false)
const isHistoryModalOpen = ref(false)
const selectedRecordId = ref<string | null>(null)
const searchQuery = ref('')
const isAnnulModalOpen = ref(false)
const recordsToAnnul = ref<string[]>([])
const statusFilter = ref<'todos' | 'activo' | 'inactivo'>('todos')

const isValidating = ref(false)
const validatingMsg = ref('')

// Server-side pagination: displayDepartments is just the current page
// Local search filters within the loaded page for instant UX
const displayDepartments = computed(() => {
  if (!searchQuery.value) return departments.value
  const q = searchQuery.value.toLowerCase()
  return departments.value.filter(
    (d) =>
      (d.code || '').toLowerCase().includes(q) ||
      (d.name || '').toLowerCase().includes(q) ||
      (d.abbreviation || '').toLowerCase().includes(q)
  )
})

const displayTotal = computed(() => total.value)

const newCount = computed(() => departments.value.filter((d) => d.isNew).length)
const editedCount = computed(
  () => departments.value.filter((d) => d.isDirty && !d.isNew && !d.isPendingInactivate).length
)
const inactivateCount = computed(
  () =>
    departments.value.filter(
      (d) => d.isPendingInactivate && d.status === STATUS_UUIDS.STATUS_INACTIVO
    ).length
)
const restoreCount = computed(
  () =>
    departments.value.filter(
      (d) => d.isPendingInactivate && d.status === STATUS_UUIDS.STATUS_ACTIVO
    ).length
)
const annulCount = computed(
  () =>
    departments.value.filter(
      (d) => d.isPendingInactivate && d.status === STATUS_UUIDS.STATUS_ANULADO
    ).length
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
  rowHeaders: true,
  rowHeaderWidth: 50,
  colHeaders: true,
  autoColumnSize: { useHeaders: true, syncLimit: '100%' },
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
          if (ids.length > 0) toggleStatus(ids)
        },
        disabled: function () {
          if (!can(DEPARTMENT_PERMISSIONS.INACTIVATE)) return true
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
          if (ids.length > 0) toggleStatus(ids)
        },
        disabled: function () {
          if (!can(DEPARTMENT_PERMISSIONS.RESTORE)) return true
          const row = (this as any).getSelectedLast()?.[0]
          if (row === undefined) return true
          const rowData = (this as any).getSourceDataAtRow(row)
          return (
            !rowData ||
            (rowData.status === STATUS_UUIDS.STATUS_ACTIVO && !rowData.isPendingInactivate)
          )
        }
      },
      separator5: '---------',
      toggle_annul: {
        name: '<div class="flex items-center gap-2 text-rose-700 font-bold uppercase"><span class="inline-block h-4 w-4 i-lucide-trash-2"></span> ANULAR REGISTRO</div>',
        disabled: function () {
          if (!can(DEPARTMENT_PERMISSIONS.ANNUL)) return true
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
          if (ids.length > 0) confirmAnnul(ids)
        }
      },
      separator6: '---------',
      history: {
        name: '<div class="flex items-center gap-2 text-info-600 font-bold uppercase"><span class="inline-block h-4 w-4 i-lucide-history"></span> HISTORIAL</div>',
        callback: function (_key: any, selection: any) {
          const row = selection[0].start.row
          const rowData = (this as any).getSourceDataAtRow(row)
          if (rowData && rowData.id) openHistory(rowData.id)
        },
        disabled: function () {
          if (!can(DEPARTMENT_PERMISSIONS.LOG)) return true
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
  multiColumnSorting: { indicator: true },
  fillHandle: true,
  outsideClickDeselects: false,

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
    { data: 'abbreviation', title: 'ABREVIACIÓN', readOnly: false },
    {
      data: 'key_country',
      title: 'PAÍS',
      type: 'dropdown',
      source: [] as string[], // Will be populated
      readOnly: false
    },
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
  stretchH: 'all',
  autoWrapRow: true,
  autoWrapCol: true,
  rowHeights: 45,
  columnHeaderHeight: 45,
  cells: (row: number) => {
    const cellProperties: any = {}
    const rowData = displayDepartments.value[row]
    let classes = 'htCenter htMiddle '
    if (rowData) {
      if (rowData.isPendingInactivate && rowData.status === STATUS_UUIDS.STATUS_INACTIVO)
        classes += 'pending-inactivate-row '
      else if (rowData.isNew) classes += 'new-row '
      else if (rowData.isDirty || rowData.isPendingInactivate) classes += 'dirty-row '
    }
    cellProperties.className = classes.trim()
    return cellProperties
  },
  afterChange: (changes: any) => {
    if (changes) {
      changes.forEach(([row, prop, oldVal, newVal]: any) => {
        if (oldVal !== newVal && displayDepartments.value[row]) {
          if (['code', 'abbreviation'].includes(prop) && typeof newVal === 'string') {
            const upper = newVal.toUpperCase()
            if (upper !== newVal) {
              const hot = uHandsontableRef.value?.getHotInstance()
              hot.setDataAtRowProp(row, prop, upper)
              return
            }
          }
          // Special handling for country dropdown to map string back to ID if needed
          // But Handsontable handles the value from 'source'.
          displayDepartments.value[row].isDirty = true
          uHandsontableRef.value?.getHotInstance()?.render()
        }
      })
    }
  }
})

const fetchCountries = async () => {
  if (!can(COUNTRY_PERMISSIONS.GET)) {
    console.warn('[Permission] User cannot fetch countries for dropdown')
    return
  }
  try {
    const response = await fetch(`${import.meta.env.VUE_URL_BASE}/config-master/country/select/`, {
      credentials: 'include'
    })
    const result = await response.json()
    if (response.ok && result.status === 'success') {
      countriesList.value = result.data.results
      const countryNames = countriesList.value.map((c) => c.name)

      // Update HOT source inside hotSettings ref
      const countryCol = hotSettings.value.columns.find((c) => c.data === 'key_country')
      if (countryCol) countryCol.source = countryNames

      // FORCE UPDATE in Handsontable instance if it exists
      const hot = uHandsontableRef.value?.getHotInstance()
      if (hot) {
        hot.updateSettings({
          columns: hotSettings.value.columns
        })
      }

      if (countryFilter.value) {
        const parent = countriesList.value.find((c) => c.id === countryFilter.value)
        if (parent) parentCountryName.value = parent.name
      }
    }
  } catch (error) {
    console.error('Fetch countries error:', error)
  }
}

const fetchDepartments = async () => {
  loading.value = true
  try {
    const body: Record<string, any> = {
      page: page.value,
      page_size: pageSize.value
    }
    if (countryFilter.value) body.country = countryFilter.value
    if (statusFilter.value !== 'todos') body.status = statusFilter.value

    const response = await fetch(`${import.meta.env.VUE_URL_BASE}/config-master/department/get/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') ?? '' },
      credentials: 'include',
      body: JSON.stringify(body)
    })
    const result = await response.json()
    if (response.ok && result.status === 'success') {
      departments.value = result.data.results.map((d: any) => ({
        ...d,
        key_country: d.country_name
      }))
      total.value = result.data.total
    }
  } catch (error) {
    console.error('Fetch error:', error)
    toast.add({
      title: 'Error',
      description: 'No se pudieron cargar los departamentos',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

watch([page, pageSize], () => fetchDepartments())

const setStatusFilter = (f: typeof statusFilter.value) => {
  statusFilter.value = f
  page.value = 1
  fetchDepartments()
}

const confirmAnnul = (ids: string | string[]) => {
  recordsToAnnul.value = Array.isArray(ids) ? ids : [ids]
  isAnnulModalOpen.value = true
}

const toggleAnnul = () => {
  if (recordsToAnnul.value.length === 0) return
  recordsToAnnul.value.forEach((id) => {
    const index = departments.value.findIndex((d) => d.id === id)
    if (index !== -1) {
      departments.value[index].status = STATUS_UUIDS.STATUS_ANULADO
      departments.value[index].isPendingInactivate = true
    }
  })
  uHandsontableRef.value?.getHotInstance()?.render()
  isAnnulModalOpen.value = false
}

const openHistory = (id: string) => {
  selectedRecordId.value = id
  isHistoryModalOpen.value = true
}

const addNewRow = () => {
  const newDept: Department = {
    code: '',
    name: '',
    abbreviation: '',
    key_country: parentCountryName.value || '',
    status: STATUS_UUIDS.STATUS_ACTIVO,
    isNew: true,
    isDirty: true
  }
  departments.value = [newDept, ...departments.value]
  page.value = 1
  total.value++
  setTimeout(() => {
    const hot = uHandsontableRef.value?.getHotInstance()
    if (hot) {
      hot.render()
      hot.selectCell(0, 0)
    }
  }, 100)
}

const toggleStatus = (ids: string | string[]) => {
  const idList = Array.isArray(ids) ? ids : [ids]
  idList.forEach((id) => {
    const index = departments.value.findIndex((d) => d.id === id)
    if (index !== -1) {
      const dept = departments.value[index]
      const isActivo = dept.status === STATUS_UUIDS.STATUS_ACTIVO
      dept.status = isActivo ? STATUS_UUIDS.STATUS_INACTIVO : STATUS_UUIDS.STATUS_ACTIVO
      dept.isPendingInactivate = !dept.isPendingInactivate
    }
  })
  uHandsontableRef.value?.getHotInstance()?.render()
}

const saveChanges = async () => {
  if (dirtyCount.value === 0) {
    toast.add({ title: 'Info', description: 'No hay cambios pendientes', color: 'info' })
    return
  }

  const newRows = departments.value.filter((d) => d.isNew)
  const editedRows = departments.value.filter(
    (d) => d.isDirty && !d.isNew && !d.isPendingInactivate
  )
  const toInactivate = departments.value.filter((d) => d.isPendingInactivate)

  const invalid = [...newRows, ...editedRows].some((d) => !d.code || !d.name || !d.key_country)
  if (invalid) {
    toast.add({
      title: 'Advertencia',
      description: 'Campos obligatorios faltantes',
      color: 'warning'
    })
    return
  }

  loading.value = true
  let successCount = 0
  let errorCount = 0

  try {
    for (const row of newRows) {
      const country = countriesList.value.find((c) => c.name === row.key_country)
      const data = { ...row, key_country: country?.id }
      const response = await fetch(
        `${import.meta.env.VUE_URL_BASE}/config-master/department/create/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken') || ''
          },
          credentials: 'include',
          body: JSON.stringify(data)
        }
      )
      if (response.ok) successCount++
      else errorCount++
    }

    for (const row of editedRows) {
      const country = countriesList.value.find((c) => c.name === row.key_country)
      const data = { ...row, key_country: country?.id }
      const response = await fetch(
        `${import.meta.env.VUE_URL_BASE}/config-master/department/update/`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken') || ''
          },
          credentials: 'include',
          body: JSON.stringify(data)
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
        `${import.meta.env.VUE_URL_BASE}/config-master/department/${action}/`,
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
      fetchDepartments()
    }
    if (errorCount > 0) {
      toast.add({
        title: 'Error',
        description: `${errorCount} cambios fallaron. Revisa los datos.`,
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
  if (dirtyCount.value > 0) isDiscardModalOpen.value = true
  else
    toast.add({ title: 'Aviso', description: 'No hay cambios para descartar', color: 'secondary' })
}

const discardChanges = () => {
  fetchDepartments()
  isDiscardModalOpen.value = false
  toast.add({ title: 'Descartado', description: 'Cambios descartados', color: 'neutral' })
}

const clearFilters = () => {
  const hot = uHandsontableRef.value?.getHotInstance()
  if (hot) {
    const filtersPlugin = hot.getPlugin('filters')
    filtersPlugin.clearConditions()
    filtersPlugin.filter()
    toast.add({
      title: 'Filtros limpiados',
      description: 'Se han restablecido los filtros',
      color: 'info'
    })
  }
}

const onExport = () =>
  downloadExcel(
    `${import.meta.env.VUE_URL_BASE}/config-master/department/export/`,
    'departamentos.xlsx'
  )
const onDownloadTemplate = () =>
  downloadExcel(
    `${import.meta.env.VUE_URL_BASE}/config-master/department/template/`,
    'plantilla_departamentos.xlsx'
  )

const onFileSelected = async (file: File) => {
  currentFile.value = file
  isValidating.value = true
  validatingMsg.value = 'Analizando documento...'

  await new Promise((resolve) => setTimeout(resolve, 800))

  const result = await validateExcel(
    `${import.meta.env.VUE_URL_BASE}/config-master/department/import/`,
    file
  )

  if (result) {
    validatingMsg.value = 'Validación completa'
    await new Promise((resolve) => setTimeout(resolve, 600))
    previewData.value = result.rows
  }
  isValidating.value = false
}

const onConfirmImport = async () => {
  if (!currentFile.value) return
  const success = await uploadExcel(
    `${import.meta.env.VUE_URL_BASE}/config-master/department/import/`,
    currentFile.value
  )
  if (success) {
    isImportModalOpen.value = false
    fetchDepartments()
  }
}

const triggerImport = () => {
  previewData.value = []
  isImportModalOpen.value = true
}

// Watch for page changes
watch(page, () => {
  uHandsontableRef.value?.getHotInstance()?.render()
})

onMounted(() => {
  fetchStatuses()
  fetchCountries()
  fetchDepartments()
})
</script>

<template>
  <div class="hidden">
    <div class="i-lucide-trash-2 text-rose-700" />
    <div class="i-lucide-user-x text-rose-600" />
    <div class="i-lucide-check-circle text-green-600" />
    <div class="i-lucide-history text-info-600" />
  </div>
  <UDashboardPanel id="departments">
    <template #header>
      <UDashboardNavbar :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
          <div class="flex items-center gap-2 ml-2">
            <span
              class="text-sm font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider"
              >Configuración</span
            >
            <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-zinc-300 dark:text-zinc-700" />
            <span
              class="text-sm font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider"
              >Maestra</span
            >
            <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-zinc-300 dark:text-zinc-700" />
            <span class="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight"
              >Departamento</span
            >
            <template v-if="parentCountryName">
              <UIcon
                name="i-lucide-chevron-right"
                class="w-4 h-4 text-zinc-300 dark:text-zinc-700"
              />
              <UBadge color="primary" variant="subtle" size="xs" class="font-bold uppercase">
                {{ parentCountryName }}
              </UBadge>
            </template>
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
          class="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/50"
        >
          <div class="flex items-center gap-4">
            <h2
              class="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight leading-tight"
            >
              Listado de departamentos
            </h2>
            <div class="relative w-64">
              <UInput
                v-model="searchQuery"
                icon="i-lucide-search"
                placeholder="Buscar departamento..."
                class="rounded-xl shadow-sm"
                variant="outline"
                color="neutral"
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

            <!-- Status Filter Tabs -->
            <div class="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1">
              <UButton
                v-for="f in [
                  { key: 'todos', label: 'TODOS', color: 'neutral' as const },
                  { key: 'activo', label: 'ACTIVOS', color: 'success' as const },
                  { key: 'inactivo', label: 'INACTIVOS', color: 'warning' as const }
                ]"
                :key="f.key"
                :label="f.label"
                :color="statusFilter === f.key ? f.color : 'neutral'"
                :variant="statusFilter === f.key ? 'solid' : 'ghost'"
                size="xs"
                class="font-bold rounded-lg tracking-tight transition-all"
                @click="setStatusFilter(f.key as any)"
              />
            </div>

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
            <UTooltip v-if="can(DEPARTMENT_PERMISSIONS.EXPORT)" text="Exportar a Excel">
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
            <UTooltip v-if="can(DEPARTMENT_PERMISSIONS.IMPORT)" text="Importar desde Excel">
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
            <UTooltip v-if="can(DEPARTMENT_PERMISSIONS.TEMPLATE)" text="Descargar plantilla">
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
                @click="fetchDepartments"
              />
            </UTooltip>

            <UTooltip v-if="can(DEPARTMENT_PERMISSIONS.CREATE)" text="Agregar fila">
              <UButton
                icon="i-lucide-list-plus"
                color="success"
                variant="solid"
                size="xl"
                class="rounded-full shadow-lg transition-all hover:scale-110 active:scale-95"
                @click="addNewRow"
              />
            </UTooltip>

            <UTooltip
              v-if="can(DEPARTMENT_PERMISSIONS.CREATE) || can(DEPARTMENT_PERMISSIONS.UPDATE)"
              text="Guardar cambios"
            >
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

        <div class="flex-1 overflow-hidden p-4 relative">
          <UHandsontable
            ref="uHandsontableRef"
            :settings="hotSettings"
            :data="displayDepartments"
          />

          <div
            v-if="!loading && departments.length === 0"
            class="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm z-10"
          >
            <div class="p-6 rounded-full bg-zinc-50 dark:bg-zinc-900 mb-4 shadow-inner">
              <UIcon
                name="i-lucide-database-zap"
                class="w-16 h-16 text-zinc-300 dark:text-zinc-700"
              />
            </div>
            <h3 class="text-xl font-bold text-zinc-900 dark:text-white uppercase tracking-tight">
              No hay datos a mostrar
            </h3>
            <p class="text-zinc-500 dark:text-zinc-400 mt-2 font-medium tracking-tight">
              Agrega un nuevo registro o importa desde Excel para comenzar.
            </p>
            <UButton
              label="AGREGAR PRIMER DEPARTAMENTO"
              icon="i-lucide-plus"
              color="success"
              variant="solid"
              size="lg"
              class="mt-6 font-black rounded-xl shadow-lg ring-4 ring-success-500/10 transition-all hover:scale-105"
              @click="addNewRow"
            />
          </div>
        </div>

        <div
          class="flex items-center justify-between p-4 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900"
        >
          <div class="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Mostrando
            <span class="text-primary-600 font-bold">{{ displayDepartments.length }}</span> de
            <span class="font-bold text-zinc-900 dark:text-white">{{ departments.length }}</span>
            registros
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
              :total="displayTotal"
              size="sm"
              class="font-bold"
            />
          </div>
        </div>

        <!-- Modals moved inside #body for layout parity -->
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

        <UImportModal
          v-model:open="isImportModalOpen"
          title="Importación de Departamentos"
          description="Selecciona y valida tu archivo Excel antes de procesar."
          :data="previewData"
          :headers="['CÓDIGO', 'NOMBRE', 'ABREVIACIÓN', 'PAÍS', 'ESTADO']"
          :validating="isValidating"
          :validating-message="validatingMsg"
          :importing="excelLoading"
          @confirm="onConfirmImport"
          @file-selected="onFileSelected"
        />

        <UHistoryModal
          v-model:open="isHistoryModalOpen"
          :record-id="selectedRecordId"
          base-url="/config-master/department"
          title="Historial de Cambios - Departamento"
        />
      </div>
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
