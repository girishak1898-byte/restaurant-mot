'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function submitUpgradeRequest(organizationId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated.' }

  // Check membership
  const { data: membership } = await supabase
    .from('organization_memberships')
    .select('organization_id')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .single()

  if (!membership) return { error: 'You are not a member of this organization.' }

  // Check org plan - no point requesting if already premium
  const { data: org } = await supabase
    .from('organizations')
    .select('plan')
    .eq('id', organizationId)
    .single()

  if (org?.plan === 'premium') return { error: 'Your organization is already on the Premium plan.' }

  // Check for existing pending request
  const { data: existing } = await supabase
    .from('upgrade_requests')
    .select('id, status')
    .eq('organization_id', organizationId)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) return { error: 'A request is already pending for this organization.' }

  const { error } = await supabase.from('upgrade_requests').insert({
    organization_id: organizationId,
    user_id: user.id,
    requested_plan: 'premium',
    status: 'pending',
  })

  if (error) return { error: 'Failed to submit request. Please try again.' }

  return { success: true }
}
