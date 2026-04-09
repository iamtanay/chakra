'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { AppShell } from '@/components/layout/AppShell'
import { PageTopBar } from '@/components/layout/PageTopBar'
import { StreamCard } from '@/components/streams/StreamCard'
import { StreamDetail } from '@/components/streams/StreamDetail'
import { StreamCreateModal } from '@/components/streams/StreamCreateModal'
import { StreamShareModal } from '@/components/streams/StreamShareModal'
import { Plus, Archive, Waves, ChevronDown, ChevronRight } from 'lucide-react'
import type { Stream, StreamItem, StreamMember, StreamType, Project } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string) => (createClient() as any).from(table)

// ── Main page ─────────────────────────────────────────────────────────────
export default function StreamsPage() {
  const [streams,       setStreams]       = useState<Stream[]>([])
  const [items,         setItems]         = useState<StreamItem[]>([])
  const [members,       setMembers]       = useState<StreamMember[]>([])
  const [projects,      setProjects]      = useState<Project[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [createOpen,    setCreateOpen]    = useState(false)
  const [sharingStream, setSharingStream] = useState<Stream | null>(null)
  const [openStream,    setOpenStream]    = useState<Stream | null>(null)
  const [showArchived,  setShowArchived]  = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const uid = user?.id ?? null
      setCurrentUserId(uid)

      const [{ data: sd }, { data: id }, { data: md }, { data: pd }] = await Promise.all([
        db('streams').select('*').order('pinned', { ascending: false }).order('updated_at', { ascending: false }),
        db('stream_items').select('*'),
        db('stream_members').select('*'),
        db('projects').select('*'),
      ])

      setStreams((sd || []) as Stream[])
      setItems((id || []) as StreamItem[])
      setMembers((md || []) as StreamMember[])
      setProjects((pd || []) as Project[])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleCreate = async (name: string, color: string, type: StreamType) => {
    if (!currentUserId) return
    const { data } = await db('streams').insert({
      name, color, type,
      owner_id: currentUserId,
    }).select().single()
    if (data) setStreams(prev => [data as Stream, ...prev])
  }

  const handlePin = async (stream: Stream) => {
    const next = !stream.pinned
    setStreams(prev => prev.map(s => s.id === stream.id ? { ...s, pinned: next } : s))
    await db('streams').update({ pinned: next }).eq('id', stream.id)
  }

  const handleArchive = async (stream: Stream) => {
    setStreams(prev => prev.map(s => s.id === stream.id ? { ...s, archived: true } : s))
    if (openStream?.id === stream.id) setOpenStream(null)
    await db('streams').update({ archived: true }).eq('id', stream.id)
  }

  const handleDelete = async (stream: Stream) => {
    setStreams(prev => prev.filter(s => s.id !== stream.id))
    if (openStream?.id === stream.id) setOpenStream(null)
    await db('streams').delete().eq('id', stream.id)
  }

  const activeStreams   = streams.filter(s => !s.archived)
  const archivedStreams = streams.filter(s =>  s.archived)

  const isOwnerOf     = (s: Stream) => !!currentUserId && s.owner_id === currentUserId
  const canEditStream  = (s: Stream) => {
    if (isOwnerOf(s)) return true
    if (!currentUserId) return false
    return members.some(m => m.stream_id === s.id && m.user_id === currentUserId && m.role === 'editor')
  }
  const memberCount = (s: Stream) => members.filter(m => m.stream_id === s.id).length

  // ── Stream detail view ───────────────────────────────────────────────
  if (openStream) {
    return (
      <AppShell projects={projects} selectedProjectId={null} onProjectSelect={() => {}}>
        <StreamDetail
          stream={openStream}
          isOwner={isOwnerOf(openStream)}
          canEdit={canEditStream(openStream)}
          onBack={() => { setOpenStream(null); loadData() }}
          onShare={() => setSharingStream(openStream)}
        />

        <StreamShareModal
          isOpen={!!sharingStream}
          onClose={() => setSharingStream(null)}
          stream={sharingStream}
        />
      </AppShell>
    )
  }

  // ── Grid view ────────────────────────────────────────────────────────
  return (
    // Fix 3: pass projects so sidebar always shows All Spaces
    <AppShell projects={projects} selectedProjectId={null} onProjectSelect={() => {}}>
      {/* Fix 2: h-full + overflow-hidden on outer, overflow-y-auto on scrollable inner */}
      <div className="flex flex-col h-full overflow-hidden">
        <PageTopBar
          title="Streams"
          badge={activeStreams.length || null}
          actions={
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-syne text-sm font-600 transition-all duration-150"
              style={{ background: 'var(--amber)', color: '#0a0a0a' }}
            >
              <Plus size={15} />
              <span>New</span>
            </button>
          }
        />

        {/* Fix 2: this div scrolls */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 pt-5 pb-24 md:pb-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-xl animate-pulse" style={{ background: 'var(--bg4)' }} />
                <span className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
                  Loading streams...
                </span>
              </div>
            </div>
          ) : activeStreams.length === 0 ? (
            /* ── Empty state ── */
            <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--amber-dim)', border: '1px solid rgba(232,162,71,0.25)' }}
              >
                <Waves size={28} style={{ color: 'var(--amber)' }} strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-syne font-700 text-base mb-1" style={{ color: 'var(--text)' }}>
                  No streams yet
                </p>
                <p className="font-mono text-sm" style={{ color: 'var(--text3)' }}>
                  Streams are living collections — checklists, notes, and links in one place.
                </p>
              </div>
              <button
                onClick={() => setCreateOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-syne text-sm font-600 transition-all duration-150"
                style={{ background: 'var(--amber)', color: '#0a0a0a' }}
              >
                <Plus size={15} />
                Create your first stream
              </button>
            </div>
          ) : (
            <>
              {/* Pinned section */}
              {activeStreams.some(s => s.pinned) && (
                <div className="mb-6">
                  <p
                    className="font-mono text-xs uppercase tracking-widest mb-3 px-0.5"
                    style={{ color: 'var(--text3)', letterSpacing: '0.1em' }}
                  >
                    Pinned
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {activeStreams.filter(s => s.pinned).map(stream => (
                      <StreamCard
                        key={stream.id}
                        stream={stream}
                        items={items.filter(i => i.stream_id === stream.id)}
                        memberCount={memberCount(stream)}
                        isOwner={isOwnerOf(stream)}
                        onClick={() => setOpenStream(stream)}
                        onPin={handlePin}
                        onArchive={handleArchive}
                        onDelete={handleDelete}
                        onShare={setSharingStream}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* All streams */}
              {activeStreams.some(s => !s.pinned) && (
                <div>
                  {activeStreams.some(s => s.pinned) && (
                    <p
                      className="font-mono text-xs uppercase tracking-widest mb-3 px-0.5"
                      style={{ color: 'var(--text3)', letterSpacing: '0.1em' }}
                    >
                      All streams
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {activeStreams.filter(s => !s.pinned).map(stream => (
                      <StreamCard
                        key={stream.id}
                        stream={stream}
                        items={items.filter(i => i.stream_id === stream.id)}
                        memberCount={memberCount(stream)}
                        isOwner={isOwnerOf(stream)}
                        onClick={() => setOpenStream(stream)}
                        onPin={handlePin}
                        onArchive={handleArchive}
                        onDelete={handleDelete}
                        onShare={setSharingStream}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Archived */}
              {archivedStreams.length > 0 && (
                <div className="mt-8">
                  <button
                    onClick={() => setShowArchived(p => !p)}
                    className="flex items-center gap-2 mb-3 transition-colors duration-150 px-0.5"
                    style={{ color: 'var(--text3)' }}
                  >
                    {showArchived ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    <Archive size={12} />
                    <span className="font-mono text-xs uppercase tracking-widest" style={{ letterSpacing: '0.1em' }}>
                      Archived ({archivedStreams.length})
                    </span>
                  </button>

                  {showArchived && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 opacity-50">
                      {archivedStreams.map(stream => (
                        <StreamCard
                          key={stream.id}
                          stream={stream}
                          items={items.filter(i => i.stream_id === stream.id)}
                          memberCount={memberCount(stream)}
                          isOwner={isOwnerOf(stream)}
                          onClick={() => {}}
                          onPin={() => {}}
                          onArchive={() => {}}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <StreamCreateModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />

      <StreamShareModal
        isOpen={!!sharingStream}
        onClose={() => setSharingStream(null)}
        stream={sharingStream}
      />
    </AppShell>
  )
}
