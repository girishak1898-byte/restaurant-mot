'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signUp(prevState: unknown, formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = (formData.get('full_name') as string).trim()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })

  if (error) return { error: error.message }

  // Session present = email auto-confirmed (local dev). Go straight to onboarding.
  if (data.session) redirect('/onboarding')

  // Email confirmation required — tell the user to check their inbox.
  return {
    success: true,
    message: 'Check your email to confirm your account, then sign in.',
  }
}

export async function signIn(prevState: unknown, formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) return { error: error.message }

  // Check whether this user already has an org.
  const { data: membership } = await supabase
    .from('organization_memberships')
    .select('id')
    .eq('user_id', data.user.id)
    .limit(1)
    .single()

  if (!membership) redirect('/onboarding')

  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
