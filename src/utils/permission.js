export function hasPermission(requiredCode) {
  const role = localStorage.getItem('admin_role')
  if (role === 'Superadmin') return true // Superadmin bypass

  const permsStr = localStorage.getItem('admin_permissions')
  if (!permsStr) return false

  try {
    const permissions = JSON.parse(permsStr)
    return permissions.includes(requiredCode)
  } catch (e) {
    return false
  }
}
