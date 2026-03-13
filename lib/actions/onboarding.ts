'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function createOrganization(prevState: unknown, formData: FormData) {
  // Verify the user is logged in via the anon client (respects RLS)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const name = (formData.get('name') as string).trim()
  const slug = (formData.get('slug') as string).trim().toLowerCase()

  if (!name || !slug) return { error: 'Business name and URL are required.' }
  if (!/^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$/.test(slug))
    return {
      error: 'URL must be 3–48 characters: lowercase letters, numbers, and hyphens only.',
    }

  // Use service role to create org + initial membership — these bypass RLS
  // intentionally since the user has no org membership yet.
  const service = createServiceClient()

  const { data: org, error: orgError } = await service
    .from('organizations')
    .insert({ name, slug, mode: 'restaurant' })
    .select()
    .single()

  if (orgError) {
    if (orgError.code === '23505')
      return { error: 'That workspace URL is already taken. Try another.' }
    return { error: 'Could not create organization. Please try again.' }
  }

  const { error: memberError } = await service
    .from('organization_memberships')
    .insert({ organization_id: org.id, user_id: user.id, role: 'owner' })

  if (memberError) {
    // Roll back the org so we don't leave orphaned rows
    await service.from('organizations').delete().eq('id', org.id)
    return { error: 'Could not set up your workspace. Please try again.' }
  }

  redirect('/dashboard')
}
