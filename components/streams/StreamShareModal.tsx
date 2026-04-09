'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Modal } from '@/components/ui/Modal'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import type { Stream, MemberRole } from '@/types'
import { UserPlus, Trash2, Mail, Crown, Pencil, Eye } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string) => (createClient() as any).from(table)

interface StreamMemberWithDisplay {
  stream_id: string
  user_id: string
  role: MemberRole
  shared_at: string
  display_name: string
}

interface StreamShareModalProps {
  isOpen: boolean
  onClose: () => void
  stream: Stream | null
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

export function StreamShareModal({ isOpen, onClose, stream }: StreamShareModalProps) {
  const [email,          setEmail]          = useState('')
  const [role,           setRole]           = useState<MemberRole>('editor')
  const [members,        setMembers]        = useState<StreamMemberWithDisplay[]>([])
  const [loading,        setLoading]        = useState(false)
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [success,        setSuccess]        = useState<string | null>(null)
  const [removingId,     setRemovingId]     = useState<string | null>(null)

  const isMobile = useMediaQuery('(max-width: 768px)')

  useEffect(() => {
    if (!isOpen || !stream) {
      setEmail('')
      setRole('editor')
      setError(null)
      setSuccess(null)
      setMembers([])
      return
    }
    loadMembers()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, stream?.id])

  const loadMembers = async () => {
    if (!stream) return
    setLoadingMembers(true)
    try {
      const { data, error: fetchError } = await db('stream_members')
        .select('*')
        .eq('stream_id', stream.id)

      if (fetchError) throw fetchError

      const withDisplay: StreamMemberWithDisplay[] = ((data ?? []) as (StreamMemberWithDisplay & { display_name?: string })[]).map(m => ({
        ...m,
        display_name: m.display_name?.trim() || 'Shared user',
      }))

      setMembers(withDisplay)
    } catch (err) {
      console.error('Error loading stream members:', err)
    } finally {
      setLoadingMembers(false)
    }
  }

  const handleShare = async () => {
    if (!stream || !email.trim()) return

    const trimmedEmail = email.trim().toLowerCase()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address.')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setError('Session expired. Please refresh the page and try again.')
        return
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/lookup-user`,
        {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${session.access_token}`,
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
      const memberDisplayName: string = payload.display_name || trimmedEmail.split('@')[0]

      if (members.some(m => m.user_id === targetUserId)) {
        setError('This user already has access to this stream.')
        return
      }

      const { error: insertError } = await db('stream_members')
        .insert([{
          stream_id:    stream.id,
          user_id:      targetUserId,
          role,
          display_name: memberDisplayName,
        }])

      if (insertError) {
        if (insertError.code === '23505') {
          setError('This user already has access to this stream.')
        } else {
          throw insertError
        }
        return
      }

      const newMember: StreamMemberWithDisplay = {
        stream_id:    stream.id,
        user_id:      targetUserId,
        role,
        shared_at:    new Date().toISOString(),
        display_name: memberDisplayName,
      }
      setMembers(prev => [...prev, newMember])
      setEmail('')
      setSuccess(`${memberDisplayName} now has ${role} access.`)
    } catch (err) {
      console.error('Share error:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (member: StreamMemberWithDisplay, newRole: MemberRole) => {
    if (!stream) return
    setMembers(prev => prev.map(m => m.user_id === member.user_id ? { ...m, role: newRole } : m))
    const { error: updateError } = await db('stream_members')
      .update({ role: newRole })
      .eq('stream_id', stream.id)
      .eq('user_id', member.user_id)

    if (updateError) {
      console.error('Role update error:', updateError)
      setMembers(prev => prev.map(m => m.user_id === member.user_id ? { ...m, role: member.role } : m))
      setError('Failed to update role. Please try again.')
    }
  }

  const handleRemove = async (member: StreamMemberWithDisplay) => {
    if (!stream) return
    if (removingId === member.user_id) {
      setRemovingId(null)
      setMembers(prev => prev.filter(m => m.user_id !== member.user_id))
      const { error: deleteError } = await db('stream_members')
        .delete()
        .eq('stream_id', stream.id)
        .eq('user_id', member.user_id)

      if (deleteError) {
        console.error('Remove member error:', deleteError)
        loadMembers()
        setError('Failed to remove member. Please try again.')
      }
    } else {
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
              onChange={e => { setEmail(e.target.value); setError(null); setSuccess(null); setRemovingId(null) }}
              onKeyDown={handleKeyDown}
              placeholder="colleague@example.com"
              autoComplete="off"
              className="w-full pl-9 pr-4 py-3 rounded-xl font-syne text-sm outline-none transition-all duration-150"
              style={{
                background: 'var(--bg4)',
                border:     '1px solid var(--border)',
                color:      'var(--text)',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--amber)')}
              onBlur={e  => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>

          <select
            value={role}
            onChange={e => setRole(e.target.value as MemberRole)}
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

        <p className="font-mono text-xs mt-1.5" style={{ color: 'var(--text3)' }}>
          {role === 'editor'
            ? 'Editors can add, edit, and delete items in this stream.'
            : 'Viewers can see the stream but cannot make changes.'}
        </p>
      </div>

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
        {loading ? 'Adding…' : 'Share stream'}
      </button>

      <div style={{ borderTop: '1px solid var(--border)' }} />

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
            {members.map(member => {
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
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-syne font-700 text-sm"
                    style={{ background: 'var(--bg5)', color: 'var(--amber)' }}
                  >
                    {member.display_name !== 'Shared user'
                      ? member.display_name.charAt(0).toUpperCase()
                      : '?'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-syne text-sm font-600 truncate" style={{ color: 'var(--text)' }}>
                      {member.display_name}
                    </p>
                    <p className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
                      Added {new Date(member.shared_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </p>
                  </div>

                  {!confirmingRemove && (
                    <button
                      onClick={() => handleRoleChange(member, member.role === 'editor' ? 'viewer' : 'editor')}
                      title={`Switch to ${member.role === 'editor' ? 'viewer' : 'editor'}`}
                      className="flex-shrink-0"
                    >
                      <RoleBadge role={member.role} />
                    </button>
                  )}

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
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--rose)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)' }}
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

      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
        style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
      >
        <Crown size={12} style={{ color: 'var(--amber)', flexShrink: 0 }} />
        <p className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
          You are the owner. Only you can share, manage members, and delete this stream.
        </p>
      </div>
    </div>
  )

  const title = `Share stream · ${stream?.name ?? ''}`

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
