import { managementNavigation } from './domain/management.js'
export const navigation = [...new Map([...managementNavigation('ADMIN'), ...managementNavigation('OPERATOR_ADMIN')].map(item => [item.id, item])).values()]
