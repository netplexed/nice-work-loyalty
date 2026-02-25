'use client'

import { useState } from 'react'
import { Loader2, UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import type { AdminRole, AdminStatus } from '@/lib/admin/permissions'

export type AdminStaffRow = {
    id: string
    email: string
    full_name: string
    role: AdminRole
    status: AdminStatus
    invited_at: string | null
    last_login_at: string | null
}

function formatDateTime(value: string | null) {
    if (!value) return 'Never'
    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(new Date(value))
}

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback
}

function RoleBadge({ role }: { role: AdminRole }) {
    if (role === 'super_admin') {
        return <Badge className="bg-purple-600 text-white hover:bg-purple-600">Super Admin</Badge>
    }
    if (role === 'manager') {
        return <Badge className="bg-blue-600 text-white hover:bg-blue-600">Manager</Badge>
    }
    return <Badge variant="secondary" className="bg-slate-200 text-slate-700 hover:bg-slate-200">Staff</Badge>
}

function StatusBadge({ status }: { status: AdminStatus }) {
    if (status === 'active') {
        return <Badge className="bg-green-600 text-white hover:bg-green-600">Active</Badge>
    }
    if (status === 'pending') {
        return <Badge className="bg-amber-500 text-white hover:bg-amber-500">Pending</Badge>
    }
    return <Badge className="bg-red-600 text-white hover:bg-red-600">Disabled</Badge>
}

function InviteAdminDialog({
    canInvite,
    onInvited,
}: {
    canInvite: boolean
    onInvited: () => void
}) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [fullName, setFullName] = useState('')
    const [role, setRole] = useState<AdminRole>('staff')
    const [inlineError, setInlineError] = useState('')

    const reset = () => {
        setEmail('')
        setFullName('')
        setRole('staff')
        setInlineError('')
    }

    const handleSubmit = async () => {
        setInlineError('')
        if (!email.trim() || !fullName.trim()) {
            setInlineError('Full name and email are required')
            return
        }

        setLoading(true)
        try {
            const response = await fetch('/api/admin/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.trim(),
                    full_name: fullName.trim(),
                    role,
                }),
            })

            const payload = await response.json()
            if (!response.ok) {
                if (response.status === 409) {
                    setInlineError('This email already has an admin account')
                    return
                }
                throw new Error(payload.error || 'Something went wrong, please try again')
            }

            toast.success(`Invitation sent to ${email.trim().toLowerCase()}`)
            setOpen(false)
            reset()
            onInvited()
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Something went wrong, please try again'))
        } finally {
            setLoading(false)
        }
    }

    if (!canInvite) return null

    return (
        <Dialog open={open} onOpenChange={(nextOpen) => {
            setOpen(nextOpen)
            if (!nextOpen) reset()
        }}>
            <DialogTrigger asChild>
                <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite Admin
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>Invite Admin</DialogTitle>
                    <DialogDescription>
                        Send an invitation to grant admin portal access.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-2">
                    <div className="grid gap-2">
                        <Label htmlFor="invite-full-name">Full Name</Label>
                        <Input
                            id="invite-full-name"
                            value={fullName}
                            onChange={(event) => setFullName(event.target.value)}
                            placeholder="Jane Doe"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="invite-email">Email Address</Label>
                        <Input
                            id="invite-email"
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="jane@company.com"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="invite-role">Role</Label>
                        <Select value={role} onValueChange={(value) => setRole(value as AdminRole)}>
                            <SelectTrigger id="invite-role">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="super_admin">Super Admin</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="staff">Staff</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {inlineError && (
                        <p className="text-sm text-red-600">{inlineError}</p>
                    )}
                </div>

                <div className="flex justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setOpen(false)}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Send Invitation
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export function AdminStaffPanel({
    currentAdminId,
    currentAdminRole,
    users,
}: {
    currentAdminId: string
    currentAdminRole: AdminRole
    users: AdminStaffRow[]
}) {
    const router = useRouter()
    const [loadingRowId, setLoadingRowId] = useState<string | null>(null)
    const isSuperAdmin = currentAdminRole === 'super_admin'

    const refresh = () => {
        router.refresh()
    }

    const updateRole = async (user: AdminStaffRow, nextRole: AdminRole) => {
        if (user.id === currentAdminId) return
        if (user.role === nextRole) return

        const confirmed = window.confirm(`Change ${user.full_name} to ${nextRole.replace('_', ' ')}?`)
        if (!confirmed) return

        setLoadingRowId(user.id)
        try {
            const response = await fetch(`/api/admin/users/${user.id}/role`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: nextRole }),
            })
            const payload = await response.json()
            if (!response.ok) throw new Error(payload.error || 'Failed to update role')
            toast.success(`Updated role for ${user.full_name}`)
            refresh()
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Failed to update role'))
        } finally {
            setLoadingRowId(null)
        }
    }

    const updateStatus = async (user: AdminStaffRow, nextStatus: 'active' | 'disabled') => {
        if (user.id === currentAdminId) return

        if (nextStatus === 'disabled') {
            const confirmed = window.confirm(`Disable ${user.full_name}? They will be logged out immediately.`)
            if (!confirmed) return
        }

        setLoadingRowId(user.id)
        try {
            const response = await fetch(`/api/admin/users/${user.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: nextStatus }),
            })
            const payload = await response.json()
            if (!response.ok) throw new Error(payload.error || 'Failed to update account status')
            toast.success(`${user.full_name} is now ${nextStatus === 'active' ? 'active' : 'disabled'}`)
            refresh()
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Failed to update account status'))
        } finally {
            setLoadingRowId(null)
        }
    }

    const resendInvite = async (user: AdminStaffRow) => {
        setLoadingRowId(user.id)
        try {
            const response = await fetch(`/api/admin/users/${user.id}/resend-invite`, {
                method: 'POST',
            })
            const payload = await response.json()
            if (!response.ok) throw new Error(payload.error || 'Failed to resend invitation')
            toast.success(`Invitation resent to ${user.email}`)
            refresh()
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Failed to resend invitation'))
        } finally {
            setLoadingRowId(null)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Admin &amp; Staff</h2>
                    <p className="text-muted-foreground">Manage portal access for your team</p>
                </div>
                <InviteAdminDialog canInvite={isSuperAdmin} onInvited={refresh} />
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Last Login</TableHead>
                                {isSuperAdmin ? <TableHead className="text-right">Actions</TableHead> : null}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => {
                                const isSelf = user.id === currentAdminId
                                const isRowLoading = loadingRowId === user.id

                                return (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.full_name}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            {isSuperAdmin && !isSelf ? (
                                                <Select
                                                    value={user.role}
                                                    onValueChange={(value) => updateRole(user, value as AdminRole)}
                                                    disabled={isRowLoading}
                                                >
                                                    <SelectTrigger className="w-[160px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="super_admin">Super Admin</SelectItem>
                                                        <SelectItem value="manager">Manager</SelectItem>
                                                        <SelectItem value="staff">Staff</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <RoleBadge role={user.role} />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={user.status} />
                                        </TableCell>
                                        <TableCell>{formatDateTime(user.last_login_at)}</TableCell>
                                        {isSuperAdmin ? (
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {isSelf ? (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled
                                                            title="You cannot modify your own account"
                                                            className="opacity-60"
                                                        >
                                                            Current Account
                                                        </Button>
                                                    ) : user.status === 'pending' ? (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => resendInvite(user)}
                                                            disabled={isRowLoading}
                                                        >
                                                            {isRowLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                                                            Resend Invite
                                                        </Button>
                                                    ) : user.status === 'disabled' ? (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="border-green-600 text-green-700 hover:bg-green-50"
                                                            onClick={() => updateStatus(user, 'active')}
                                                            disabled={isRowLoading}
                                                        >
                                                            {isRowLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                                                            Enable
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="border-red-600 text-red-700 hover:bg-red-50"
                                                            onClick={() => updateStatus(user, 'disabled')}
                                                            disabled={isRowLoading}
                                                        >
                                                            {isRowLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                                                            Disable
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        ) : null}
                                    </TableRow>
                                )
                            })}
                            {users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={isSuperAdmin ? 6 : 5} className="py-8 text-center text-muted-foreground">
                                        No admin users found
                                    </TableCell>
                                </TableRow>
                            ) : null}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
