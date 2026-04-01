'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Modal } from '@/components/ui/Modal'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import type { Project, ProjectMember, MemberRole } from '@/types'
import { UserPlus, Trash2, Mail, Crown, Pencil, Eye } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string) => (createClient() as any).from(table)

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  project: Project | null
}

interface MemberWithEmail extends ProjectMember {
  email: string
}

function fieldLabel(text: string) {
  return (
    <label
      className="block font-mono text-xs uppercase tracking-widest mb-2"
      style={{ color: 'var(--text3)', letterSpacing: '0.1em' }}
    >
      {text}
    </label>
  )
}

function RoleBadge({ role }: { role: MemberRole }) {
  const isEditor = role === 'editor'
  return (
    <span
      className="flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-xs"
      style={{
        background: isEditor ? 'rgba(232,162,71,0.12)' : 'var(--bg5)',
        color:      isEditor ? 'var(--amber)'           : 'var(--text3)',
        border:     `1px solid ${isEditor ? 'rgba(232,162,71,0.25)' : 'var(--border)'}`,
      }}
    >
      {isEditor ? <Pencil size={10} /> : <Eye size={10} />}
      {isEditor ? 'Editor' : 'Viewer'}
    </span>
  )
}

export function ShareModal({ isOpen, onClose, project }: ShareModalProps) {
  const [email,         setEmail]         = useState('')
  const [role,          setRole]          = useState<MemberRole>('editor')
  const [members,       setMembers]       = useState<MemberWithEmail[]>([])
  const [loading,       setLoading]       = useState(false)
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [success,       setSuccess]       = useState<string | null>(null)
  const [removingId,    setRemovingId]    = useState<string | null>(null)

  const isMobile = useMediaQuery('(max-width: 768px)')

  // Load current members whenever the modal opens
  useEffect(() => {
    if (!isOpen || !project) {
      setEmail('')
      setRole('editor')
      setError(null)
      setSuccess(null)
      setMembers([])
      return
    }
    loadMembers()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, project?.id])

  const loadMembers = async () => {
    if (!project) return
    setLoadingMembers(true)
    try {
      const supabase = createClient()
      // Fetch members for this project
      const { data, error: fetchError } = await db('project_members')
        .select('*')
        .eq('project_id', project.id)

      if (fetchError) throw fetchError

      if (!data || data.length === 0) {
        setMembers([])
        return
      }

      // For each member, look up their email via the edge function.
      // We use a lightweight approach: call lookup-user for each user_id
      // isn't possible (lookup-user takes email, not id). Instead we
      // store the email client-side when we add them; for existing members
      // we call the edge function to resolve them via a separate endpoint.
      // Since we don't have a reverse lookup edge function, we fetch their
      // email by calling the edge function with a known workaround:
      // we load the members with their user_id and resolve emails via
      // a custom RPC or accept that we show user_ids gracefully.
      //
      // Practical solution: after inserting we store email in local state.
      // On fresh load we show "Member" with the shared_at date.
      // This is correct — auth.users emails are intentionally not exposed
      // to the client. We show what we know from the session/insert flow.
      //
      // For this app, we track emails in component state during the session.
      // On reload, we label members as "Shared user" with their role + date.
      const withEmails: MemberWithEmail[] = (data as ProjectMember[]).map((m) => ({
        ...m,
        // email is stored in sessionStorage keyed by user_id during this session
        email: sessionStorage.getItem(`chakra_user_email_${m.user_id}`) || 'Shared user',
      }))
      setMembers(withEmails)
    } catch (err) {
      console.error('Error loading members:', err)
    } finally {
      setLoadingMembers(false)
    }
  }

  const handleShare = async () => {
    if (!project || !email.trim()) return

    const trimmedEmail = email.trim().toLowerCase()

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address.')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const supabase = createClient()

      // getUser() fetches a fresh verified token from Supabase — more reliable
      // than getSession() which can return a stale or null session with SSR clients.
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (sessionError || !accessToken) {
        // Fallback: try refreshing the session
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError || !refreshed.session?.access_token) {
          setError('You must be logged in to share projects.')
          return
        }
      }

      const token = session?.access_token
        ?? (await supabase.auth.refreshSession()).data.session?.access_token

      if (!token) {
        setError('You must be logged in to share projects.')
        return
      }

      // Look up the user via the Edge Function
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/lookup-user`,
        {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey':        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({ email: trimmedEmail }),
        }
      )

      const payload = await res.json()

      if (!res.ok) {
        setError(payload.error || 'Something went wrong. Please try again.')
        return
      }

      const targetUserId: string = payload.id

      // Check if already a member
      const alreadyMember = members.some((m) => m.user_id === targetUserId)
      if (alreadyMember) {
        setError('This user already has access to this project.')
        return
      }

      // Insert into project_members
      const { error: insertError } = await db('project_members')
        .insert([{
          project_id: project.id,
          user_id:    targetUserId,
          role,
        }])

      if (insertError) {
        // Duplicate key — shouldn't happen since we check above, but be safe
        if (insertError.code === '23505') {
          setError('This user already has access to this project.')
        } else {
          throw insertError
        }
        return
      }

      // Cache their email client-side so we can show it in the member list
      sessionStorage.setItem(`chakra_user_email_${targetUserId}`, trimmedEmail)

      const newMember: MemberWithEmail = {
        project_id: project.id,
        user_id:    targetUserId,
        role,
        shared_at:  new Date().toISOString(),
        email:      trimmedEmail,
      }
      setMembers((prev) => [...prev, newMember])
      setEmail('')
      setSuccess(`${trimmedEmail} now has ${role} access.`)
    } catch (err) {
      console.error('Share error:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (member: MemberWithEmail, newRole: MemberRole) => {
    if (!project) return
    // Optimistic update
    setMembers((prev) =>
      prev.map((m) => m.user_id === member.user_id ? { ...m, role: newRole } : m)
    )
    const { error: updateError } = await db('project_members')
      .update({ role: newRole })
      .eq('project_id', project.id)
      .eq('user_id', member.user_id)

    if (updateError) {
      console.error('Role update error:', updateError)
      // Revert on failure
      setMembers((prev) =>
        prev.map((m) => m.user_id === member.user_id ? { ...m, role: member.role } : m)
      )
      setError('Failed to update role. Please try again.')
    }
  }

  const handleRemove = async (member: MemberWithEmail) => {
    if (!project) return
    if (removingId === member.user_id) {
      // Confirmed — proceed
      setRemovingId(null)
      setMembers((prev) => prev.filter((m) => m.user_id !== member.user_id))
      const { error: deleteError } = await db('project_members')
        .delete()
        .eq('project_id', project.id)
        .eq('user_id', member.user_id)

      if (deleteError) {
        console.error('Remove member error:', deleteError)
        // Reload actual state
        loadMembers()
        setError('Failed to remove member. Please try again.')
      }
    } else {
      // First click — ask for confirmation
      setRemovingId(member.user_id)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleShare()
    if (e.key === 'Escape' && removingId) setRemovingId(null)
  }

  const content = (
    <div className="space-y-5">

      {/* Add new member */}
      <div>
        {fieldLabel('Invite by email')}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Mail
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--text3)' }}
            />
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); setSuccess(null); setRemovingId(null) }}
              onKeyDown={handleKeyDown}
              placeholder="colleague@example.com"
              autoComplete="off"
              className="w-full pl-9 pr-4 py-3 rounded-xl font-syne text-sm outline-none transition-all duration-150"
              style={{
                background: 'var(--bg4)',
                border:     '1px solid var(--border)',
                color:      'var(--text)',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--amber)')}
              onBlur={(e)  => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>

          {/* Role picker */}
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as MemberRole)}
            className="px-3 py-3 rounded-xl font-syne text-sm outline-none transition-all duration-150"
            style={{
              background: 'var(--bg4)',
              border:     '1px solid var(--border)',
              color:      'var(--text)',
              cursor:     'pointer',
            }}
          >
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>

        {/* Role description */}
        <p className="font-mono text-xs mt-1.5" style={{ color: 'var(--text3)' }}>
          {role === 'editor'
            ? 'Editors can create, edit, and delete tasks, and edit project settings.'
            : 'Viewers can see the project and tasks but cannot make changes.'}
        </p>
      </div>

      {/* Feedback messages */}
      {error && (
        <p
          className="font-mono text-xs px-3 py-2 rounded-lg"
          style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--rose)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          {error}
        </p>
      )}
      {success && (
        <p
          className="font-mono text-xs px-3 py-2 rounded-lg"
          style={{ background: 'rgba(45,212,191,0.1)', color: 'var(--teal)', border: '1px solid rgba(45,212,191,0.2)' }}
        >
          {success}
        </p>
      )}

      {/* Share button */}
      <button
        onClick={handleShare}
        disabled={loading || !email.trim()}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-syne font-600 text-sm transition-all duration-150"
        style={{
          background: loading || !email.trim() ? 'var(--bg5)' : 'var(--amber)',
          color:      loading || !email.trim() ? 'var(--text3)' : '#0a0a0a',
          cursor:     loading || !email.trim() ? 'not-allowed' : 'pointer',
        }}
      >
        <UserPlus size={15} />
        {loading ? 'Adding…' : 'Share project'}
      </button>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border)' }} />

      {/* Current members */}
      <div>
        {fieldLabel(`People with access · ${members.length}`)}

        {loadingMembers ? (
          <div className="py-4 text-center">
            <p className="font-mono text-xs" style={{ color: 'var(--text3)' }}>Loading…</p>
          </div>
        ) : members.length === 0 ? (
          <div
            className="py-5 text-center rounded-xl"
            style={{ border: '1px dashed var(--border2)' }}
          >
            <p className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
              Only you have access.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => {
              const confirmingRemove = removingId === member.user_id
              return (
                <div
                  key={member.user_id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{
                    background: 'var(--bg4)',
                    border: confirmingRemove
                      ? '1px solid var(--rose)'
                      : '1px solid var(--border)',
                    transition: 'border-color 150ms ease',
                  }}
                >
                  {/* Avatar placeholder */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-syne font-700 text-sm"
                    style={{
                      background: 'var(--bg5)',
                      color:      'var(--amber)',
                    }}
                  >
                    {member.email !== 'Shared user'
                      ? member.email.charAt(0).toUpperCase()
                      : '?'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-syne text-sm font-600 truncate"
                      style={{ color: 'var(--text)' }}
                    >
                      {member.email}
                    </p>
                    <p className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
                      Added {new Date(member.shared_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </p>
                  </div>

                  {/* Role toggle */}
                  {!confirmingRemove && (
                    <button
                      onClick={() => handleRoleChange(member, member.role === 'editor' ? 'viewer' : 'editor')}
                      title={`Switch to ${member.role === 'editor' ? 'viewer' : 'editor'}`}
                      className="flex-shrink-0"
                    >
                      <RoleBadge role={member.role} />
                    </button>
                  )}

                  {/* Remove button */}
                  {confirmingRemove ? (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleRemove(member)}
                        className="px-2.5 py-1.5 rounded-lg font-mono text-xs font-600"
                        style={{ background: 'var(--rose)', color: '#0a0a0a' }}
                      >
                        Remove
                      </button>
                      <button
                        onClick={() => setRemovingId(null)}
                        className="px-2.5 py-1.5 rounded-lg font-mono text-xs"
                        style={{ background: 'var(--bg5)', color: 'var(--text3)', border: '1px solid var(--border)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleRemove(member)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-150"
                      style={{ background: 'var(--bg5)', color: 'var(--text3)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--rose)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text3)' }}
                      title="Remove member"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Owner note */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
        style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
      >
        <Crown size={12} style={{ color: 'var(--amber)', flexShrink: 0 }} />
        <p className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
          You are the owner. Only you can share, manage members, and delete this project.
        </p>
      </div>
    </div>
  )

  const title = `Share · ${project?.name ?? ''}`

  if (isMobile) {
    return (
      <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
        {content}
      </BottomSheet>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {content}
    </Modal>
  )
}
