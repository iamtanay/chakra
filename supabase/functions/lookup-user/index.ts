import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req: Request) => {
  // ── Preflight ────────────────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    // ── Auth: extract Bearer token ───────────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      return json({ error: 'Missing authorization token' }, 401)
    }

    // ── Validate the caller's JWT ────────────────────────────────────────
    // We do this ourselves since verify_jwt = false at the gateway level.
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    )

    const { data: { user: caller }, error: authError } = await anonClient.auth.getUser(token)

    if (authError || !caller) {
      console.error('Auth error:', authError?.message)
      return json({ error: 'Invalid or expired token. Please refresh and try again.' }, 401)
    }

    // ── Parse body ───────────────────────────────────────────────────────
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return json({ error: 'Invalid JSON body' }, 400)
    }

    if (typeof body.email !== 'string' || !body.email.trim()) {
      return json({ error: 'Missing or invalid email field' }, 400)
    }

    const email = body.email.trim().toLowerCase()

    // ── Prevent self-share ───────────────────────────────────────────────
    if (caller.email?.toLowerCase() === email) {
      return json({ error: 'You cannot share a project with yourself.' }, 400)
    }

    // ── Look up target user via admin API ────────────────────────────────
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Page through all users — listUsers() returns max 50 per page
    let page = 1
    const perPage = 50
    let found: { id: string; email: string } | null = null

    while (page <= 20) {
      const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage })

      if (error) {
        console.error('listUsers error:', error)
        return json({ error: 'Internal server error' }, 500)
      }

      const match = data.users.find((u) => u.email?.toLowerCase() === email)
      if (match) {
        found = { id: match.id, email: match.email! }
        break
      }

      if (data.users.length < perPage) break
      page++
    }

    if (!found) {
      return json({ error: 'No user found with that email.' }, 404)
    }

    return json({ id: found.id, email: found.email }, 200)

  } catch (err) {
    console.error('lookup-user unhandled error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})
