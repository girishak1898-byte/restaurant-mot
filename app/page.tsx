import { redirect } from 'next/navigation'

// Root always bounces to /dashboard.
// The middleware + app shell will redirect to /login or /onboarding as needed.
export default function RootPage() {
  redirect('/dashboard')
}
