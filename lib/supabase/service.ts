import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'

// Server-only. Never import this in client components.
// Used for operations that must bypass RLS (e.g. initial org + membership creation).
export function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
