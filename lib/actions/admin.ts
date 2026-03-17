'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

async function requireSuperAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' as string, user: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin) return { error: 'Unauthorized.' as string, user: null }
  return { error: null, user }
}

export async function setOrganizationPlan(organizationId: string, plan: 'free' | 'premium') {
  const { error: authError } = await requireSuperAdmin()
  if (authError) return { error: authError }

  const service = createServiceClient()
  const { error } = await service
    .from('organizations')
    .update({ plan, updated_at: new Date().toISOString() })
    .eq('id', organizationId)

  if (error) return { error: 'Failed to update plan.' }
  return { success: true }
}

export async function approveUpgradeRequest(requestId: string) {
  const { error: authError } = await requireSuperAdmin()
  if (authError) return { error: authError }

  const service = createServiceClient()

  // Load the request
  const { data: request } = await service
    .from('upgrade_requests')
    .select('organization_id, user_id')
    .eq('id', requestId)
    .eq('status', 'pending')
    .single()

  if (!request) return { error: 'Request not found or already handled.' }

  // Update request status
  await service
    .from('upgrade_requests')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', requestId)

  // Set org plan to premium
  await service
    .from('organizations')
    .update({ plan: 'premium', updated_at: new Date().toISOString() })
    .eq('id', request.organization_id)

  // Create notification for requesting user
  await service.from('notifications').insert({
    organization_id: request.organization_id,
    user_id: request.user_id,
    type: 'plan_approved',
    title: 'Premium access approved',
    message:
      'Your request has been approved. Your organization now has full access to all Premium features.',
  })

  return { success: true }
}

export async function rejectUpgradeRequest(requestId: string) {
  const { error: authError } = await requireSuperAdmin()
  if (authError) return { error: authError }

  const service = createServiceClient()

  const { data: request } = await service
    .from('upgrade_requests')
    .select('organization_id, user_id')
    .eq('id', requestId)
    .eq('status', 'pending')
    .single()

  if (!request) return { error: 'Request not found or already handled.' }

  await service
    .from('upgrade_requests')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', requestId)

  await service.from('notifications').insert({
    organization_id: request.organization_id,
    user_id: request.user_id,
    type: 'plan_rejected',
    title: 'Premium request not approved',
    message:
      'Your upgrade request was not approved at this time. Contact our sales team to learn more.',
  })

  return { success: true }
}

export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', user.id)

  return { success: true }
}

export async function markAllNotificationsRead(userId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.id !== userId) return { error: 'Unauthorized.' }

  await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)

  return { success: true }
}
