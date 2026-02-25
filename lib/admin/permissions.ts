export type AdminRole = 'super_admin' | 'manager' | 'staff'
export type AdminStatus = 'active' | 'pending' | 'disabled'

const ROLE_PRIORITY: Record<AdminRole, number> = {
    staff: 1,
    manager: 2,
    super_admin: 3,
}

export function hasMinimumRole(role: AdminRole, minimumRole: AdminRole) {
    return ROLE_PRIORITY[role] >= ROLE_PRIORITY[minimumRole]
}

export function isActiveAdminStatus(status: AdminStatus) {
    return status === 'active'
}

export type AdminNavLink = {
    href: string
    label: string
    minimumRole: AdminRole
}

export const ADMIN_NAV_RULES: AdminNavLink[] = [
    { href: '/admin', label: 'Overview', minimumRole: 'staff' },
    { href: '/admin/announcements', label: 'Announcements', minimumRole: 'manager' },
    { href: '/admin/users', label: 'Users', minimumRole: 'manager' },
    { href: '/admin/rewards', label: 'Rewards', minimumRole: 'manager' },
    { href: '/admin/lottery', label: 'Lottery', minimumRole: 'manager' },
    { href: '/admin/rewards/spin-wheel', label: 'Spin Wheel', minimumRole: 'manager' },
    { href: '/admin/redeem', label: 'Redeem', minimumRole: 'staff' },
    { href: '/admin/pos', label: 'POS / Record', minimumRole: 'staff' },
    { href: '/admin/settings', label: 'Settings', minimumRole: 'super_admin' },
    { href: '/admin/reports', label: 'Reports', minimumRole: 'manager' },
    { href: '/admin/messaging', label: 'Messaging', minimumRole: 'manager' },
    { href: '/admin/emails', label: 'Campaigns', minimumRole: 'manager' },
    { href: '/admin/automations', label: 'Automations', minimumRole: 'super_admin' },
    { href: '/admin/marketing/templates', label: 'Templates', minimumRole: 'super_admin' },
    { href: '/admin/marketing/workflows', label: 'Workflows', minimumRole: 'super_admin' },
]

export function canAccessNavLink(role: AdminRole, href: string) {
    const rule = ADMIN_NAV_RULES.find((entry) => entry.href === href)
    if (!rule) return false
    return hasMinimumRole(role, rule.minimumRole)
}
