'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { ChefHat, Building2 } from 'lucide-react'
import { NMark } from '@/components/brand/mark'
import { createOrganization } from '@/lib/actions/onboarding'
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

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Creating workspace…' : 'Create workspace'}
    </Button>
  )
}

export default function OnboardingPage() {
  const [state, action] = useActionState(createOrganization, null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)

  // Auto-derive slug from name until the user edits it manually
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name))
  }, [name, slugTouched])

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <NMark className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold tracking-tight">Northline</span>
          </div>
          <p className="text-muted-foreground text-sm">Let&apos;s set up your workspace</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create your organization</CardTitle>
            <CardDescription>
              This is your restaurant&apos;s workspace — you can invite your team later.
            </CardDescription>
          </CardHeader>

          <form action={action}>
            <CardContent className="space-y-6">
              {/* Business type selector */}
              <div className="space-y-2">
                <Label>Business type</Label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Restaurant — selected */}
                  <div className="flex items-center gap-2.5 border-2 border-primary rounded-lg p-3 bg-primary/5 cursor-default select-none">
                    <ChefHat className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-medium">Restaurant</span>
                  </div>
                  {/* Property — coming soon */}
                  <div className="flex items-center gap-2 border rounded-lg p-3 text-muted-foreground/60 cursor-not-allowed select-none">
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span className="text-sm">Property</span>
                    <span className="ml-auto text-[10px] font-medium bg-muted rounded px-1.5 py-0.5">
                      soon
                    </span>
                  </div>
                </div>
                <input type="hidden" name="mode" value="restaurant" />
              </div>

              {/* Business name */}
              <div className="space-y-1.5">
                <Label htmlFor="name">Business name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="The Garden Bistro"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Workspace URL */}
              <div className="space-y-1.5">
                <Label htmlFor="slug">Workspace URL</Label>
                <div className="flex items-center">
                  <span className="inline-flex items-center h-9 rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground select-none">
                    northline.app/
                  </span>
                  <Input
                    id="slug"
                    name="slug"
                    className="rounded-l-none"
                    placeholder="garden-bistro"
                    value={slug}
                    onChange={(e) => {
                      setSlug(e.target.value)
                      setSlugTouched(true)
                    }}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Lowercase letters, numbers, and hyphens only.
                </p>
              </div>

              {state?.error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                  {state.error}
                </p>
              )}
            </CardContent>

            <CardFooter>
              <SubmitButton />
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
