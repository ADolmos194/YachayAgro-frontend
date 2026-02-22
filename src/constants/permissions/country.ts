/**
 * Permission constants for the Country module.
 */
export const COUNTRY_PERMISSIONS = {
  GET: 'general_master_country_get',
  CREATE: 'general_master_country_create',
  UPDATE: 'general_master_country_update',
  INACTIVATE: 'general_master_country_inactivate',
  RESTORE: 'general_master_country_restore',
  ANNUL: 'general_master_country_annul',
  IMPORT: 'general_master_country_import',
  EXPORT: 'general_master_country_export',
  TEMPLATE: 'general_master_country_template',
  LOG: 'general_master_country_log',
  LOG_DETAIL: 'general_master_country_log_detail'
} as const
