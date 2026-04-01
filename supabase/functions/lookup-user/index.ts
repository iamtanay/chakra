import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── CORS ──────────────────────────────────────────────────────────────────────
// Allow all origins so the function works from any Vercel preview URL as well
// as the production domain. The caller must still supply a valid Bearer token.
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

// ── Handler ───────────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  // ── 1. Preflight ──────────────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    // Must return 200 (not 204) for Supabase edge runtime preflight handling
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    // ── 2. Auth check — validate the caller's session ──────────────────────
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const token = authHeader.slice(7) // strip "Bearer "

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    )

    const { data: { user: caller }, error: authError } = await anonClient.auth.getUser(token)
    if (authError || !caller) {
      return json({ error: 'Unauthorized' }, 401)
    }

    // ── 3. Parse + validate request body ──────────────────────────────────
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return json({ error: 'Invalid JSON body' }, 400)
    }

    if (!body || typeof (body as Record<string, unknown>).email !== 'string') {
      return json({ error: 'Missing or invalid email field' }, 400)
    }

    const email = ((body as Record<string, unknown>).email as string).trim().toLowerCase()
    if (!email) {
      return json({ error: 'Email is required' }, 400)
    }

    // ── 4. Prevent self-share ──────────────────────────────────────────────
    if (caller.email?.toLowerCase() === email) {
      return json({ error: 'You cannot share a project with yourself.' }, 400)
    }

    // ── 5. Look up the target user via admin API ───────────────────────────
    // We use paginated listUsers to handle accounts > 50 users correctly.
    // listUsers returns up to 50 per page; we page through until found or exhausted.
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    let page = 1
    const perPage = 50
    let found: { id: string; email: string } | null = null

    // Safety cap: search up to 20 pages (1 000 users) — adjust if needed
    while (page <= 20) {
      const { data, error } = await adminClient.auth.admin.listUsers({
        page,
        perPage,
      })

      if (error) {
        console.error('listUsers error:', error)
        return json({ error: 'Internal server error' }, 500)
      }

      const match = data.users.find((u) => u.email?.toLowerCase() === email)
      if (match) {
        found = { id: match.id, email: match.email! }
        break
      }

      // If we got fewer results than the page size, we've reached the end
      if (data.users.length < perPage) break

      page++
    }

    if (!found) {
      return json({ error: 'No user found with that email.' }, 404)
    }

    return json({ id: found.id, email: found.email }, 200)

  } catch (err) {
    console.error('lookup-user error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})
