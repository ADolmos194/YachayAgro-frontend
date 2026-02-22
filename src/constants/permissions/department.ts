/**
 * Permission constants for the Department module.
 */
export const DEPARTMENT_PERMISSIONS = {
  GET: 'general_master_department_get',
  CREATE: 'general_master_department_create',
  UPDATE: 'general_master_department_update',
  INACTIVATE: 'general_master_department_inactivate',
  RESTORE: 'general_master_department_restore',
  ANNUL: 'general_master_department_annul',
  IMPORT: 'general_master_department_import',
  EXPORT: 'general_master_department_export',
  TEMPLATE: 'general_master_department_template',
  LOG: 'general_master_department_log',
  LOG_DETAIL: 'general_master_department_log_detail'
} as const
