'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { signUp } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Creating account…' : 'Create account'}
    </Button>
  )
}

export default function SignupPage() {
  const [state, action] = useActionState(signUp, null)

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold tracking-tight">Restaurant MOT</h1>
        <p className="text-sm text-muted-foreground mt-1">Know your numbers. Run a tighter kitchen.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>Get your restaurant data dashboard set up in minutes.</CardDescription>
        </CardHeader>

        <form action={action}>
          <CardContent className="space-y-4">
            {state?.error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                {state.error}
              </p>
            )}
            {state?.success && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                {state.message}
              </p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                name="full_name"
                type="text"
                placeholder="Jane Smith"
                autoComplete="name"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@restaurant.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                placeholder="Min. 8 characters"
                required
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <SubmitButton />
            <p className="text-sm text-muted-foreground text-center">
              Already have an account?{' '}
              <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
