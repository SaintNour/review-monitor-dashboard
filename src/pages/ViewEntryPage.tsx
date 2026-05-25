import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Timestamp } from '../lib/timestamp'
import { useAuth } from '../auth/AuthProvider'
import type { ActivityLogEntry } from '../types'
import {
  normalizeCommentsFromDoc,
  toResolvedLogRow,
  buildResolveCommentJoin,
  newCommentId,
  type NormalizedEntryComment,
} from '../utils/entryComments'

import { Layout } from '../components/Layout'
import { ErrorCategoryDisplay } from '../components/ErrorCategoryDisplay'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { createCommentApi } from '../data/comments.api'
import { deleteCommentApi, updateCommentApi } from '../data/comments.api'
import { fetchEntryByIdApi, updateEntryApi } from '../data/entries.api'

type ActivityLogItem = {
  id: string
  action?: string
  performedBy?: string
  timestamp?: unknown
  oldValue?: string
  newValue?: string
  deletedValue?: string
}

type ReviewDoc = {
  id: string
  platform?: string
  stars?: number
  rating?: number | string
  ratingStars?: number
  status?: string
  statusType?: string
  feedbackDate?: unknown
  errorCategory?: string
  policyType?: string
  feedbackText?: string
  clientUsername?: string
  orderNumber?: string
  comments?: NormalizedEntryComment[]
  activityLog?: ActivityLogEntry[]
  resolveComment?: string
  [key: string]: unknown
}

function toDateSafe(v: unknown): Date | null {
  if (!v) return null
  if (typeof (v as { toDate?: () => Date }).toDate === 'function') return (v as { toDate: () => Date }).toDate()
  const d = new Date(v as string | number)
  return isNaN(d.getTime()) ? null : d
}

function fmtDateTime(v: unknown) {
  const d = toDateSafe(v)
  if (!d) return '—'
  return d.toLocaleString()
}

function isSocialMediaPlatform(platform: unknown) {
  const p = String(platform ?? '')
  return p === 'Facebook' || p === 'Instagram' || p === 'TikTok'
}

/** Map stored activity (document `activityLog` or legacy flat shapes) to UI rows. */
function mapActivityToView(raw: unknown): ActivityLogItem[] {
  if (!Array.isArray(raw)) return []
  return raw.map((e: unknown, idx) => {
    const row = e as Record<string, unknown>
    const details = (row.details && typeof row.details === 'object' ? row.details : {}) as Record<string, unknown>
    const action = String(row.action ?? '')
    return {
      id: `al-${idx}-${String(row.timestamp ?? idx)}`,
      action,
      performedBy: String(row.performedBy ?? ''),
      timestamp: row.timestamp,
      oldValue: (details.oldValue as string) ?? (row.oldValue as string),
      newValue: (details.newValue as string) ?? (row.newValue as string),
      deletedValue: (details.deletedValue as string) ?? (row.deletedValue as string),
    }
  })
}

export function ViewEntryPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile, user, role } = useAuth()

  const [docData, setDocData] = useState<ReviewDoc | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [newLogText, setNewLogText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([])

  useEffect(() => {
    if (!id) return
    async function load() {
      try {
        const raw = (await fetchEntryByIdApi(id)) as Record<string, unknown>
        const normalizedComments = normalizeCommentsFromDoc(raw)
        const merged: ReviewDoc = {
          id,
          ...raw,
          comments: normalizedComments,
        } as ReviewDoc
        setDocData(merged)
        if (role === 'admin') {
          setActivityLogs(mapActivityToView(raw.activityLog).reverse())
        }
      } catch {
        /* entry load failed — UI stays in loading/empty state */
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, role])

  async function appendActivityLog(entry: ActivityLogEntry) {
    if (!id) return
    try {
      const raw = (await fetchEntryByIdApi(id)) as Record<string, unknown>
      const prev = Array.isArray(raw.activityLog) ? [...(raw.activityLog as ActivityLogEntry[])] : []
      const next = [...prev, entry]
      await updateEntryApi(id, {
        activityLog: next.map((e) => ({
          ...e,
          timestamp: (e.timestamp as Timestamp)?.toDate?.()
            ? (e.timestamp as Timestamp).toDate().toISOString()
            : new Date().toISOString(),
        })),
        updatedAt: new Date().toISOString(),
      })
      if (role === 'admin') {
        setActivityLogs(mapActivityToView(next).reverse())
      }
    } catch {
      /* activity log write failed */
    }
  }

  async function addLog() {
    if (!id || !newLogText.trim() || !user) return
    setSaving(true)
    try {
      const agentName = profile?.displayName || user?.displayName || user?.email || 'Unknown'
      const newItem: NormalizedEntryComment = {
        id: newCommentId(),
        text: newLogText.trim(),
        agentName,
        createdByUid: user.uid,
        createdAt: Timestamp.now(),
      }
      const newList = [...(docData?.comments || []), newItem]
      const resolvedLog = newList.map(toResolvedLogRow)
      const resolveComment = buildResolveCommentJoin(newList)

      await createCommentApi({
        id: newItem.id,
        entryId: id,
        commentText: newItem.text,
        agentName,
      })

      setDocData((prev) => {
        if (!prev) return null
        return { ...prev, comments: newList, resolvedLog, resolveComment }
      })
      setNewLogText('')
      await appendActivityLog({
        action: 'comment_added',
        performedBy: agentName,
        performedByUid: user.uid,
        timestamp: Timestamp.now(),
        details: { commentId: newItem.id },
      })
    } catch (err) {
      alert('Failed to add log')
    } finally {
      setSaving(false)
    }
  }

  function startEdit(item: NormalizedEntryComment) {
    setEditingId(item.id)
    setEditingText(item.text)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingText('')
  }

  async function saveEdit() {
    if (!id || !editingId || !user) return
    setSaving(true)
    try {
      const oldItem = (docData?.comments || []).find((item) => item.id === editingId)
      const newList = (docData?.comments || []).map((item) => {
        if (item.id === editingId) {
          return { ...item, text: editingText, updatedAt: Timestamp.now() }
        }
        return item
      })
      const resolvedLog = newList.map(toResolvedLogRow)
      const resolveComment = buildResolveCommentJoin(newList)

      await updateCommentApi(editingId, { commentText: editingText })

      await appendActivityLog({
        action: 'comment_edited',
        performedBy: profile?.displayName || user?.displayName || user?.email || 'Unknown',
        performedByUid: user.uid,
        timestamp: Timestamp.now(),
        details: {
          commentId: editingId,
          oldValue: oldItem?.text || '',
          newValue: editingText,
        },
      })

      setDocData((prev) => (prev ? { ...prev, comments: newList, resolvedLog, resolveComment } : null))
      cancelEdit()
    } catch (err) {
      alert('Failed to update log')
    } finally {
      setSaving(false)
    }
  }

  async function softDelete(logId: string) {
    if (!id || !window.confirm('Delete this log entry?') || !user) return
    setSaving(true)
    try {
      const removed = (docData?.comments || []).find((item) => item.id === logId)
      const newList = (docData?.comments || []).filter((item) => item.id !== logId)
      const resolvedLog = newList.map(toResolvedLogRow)
      const resolveComment = buildResolveCommentJoin(newList)

      await deleteCommentApi(logId)

      await appendActivityLog({
        action: 'comment_deleted',
        performedBy: profile?.displayName || user?.displayName || user?.email || 'Unknown',
        performedByUid: user.uid,
        timestamp: Timestamp.now(),
        details: { commentId: logId, deletedValue: removed?.text || '' },
      })

      setDocData((prev) => (prev ? { ...prev, comments: newList, resolvedLog, resolveComment } : null))
    } catch (err) {
      alert('Failed to delete log')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-white">Loading...</div>
  if (!docData) return <div className="p-8 text-white">Entry not found.</div>

  const logs = docData.comments || []
  const socialPlatform = isSocialMediaPlatform(docData.platform)

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            Back
          </Button>
          <h1 className="text-2xl font-bold text-white">Entry Details</h1>
          <div />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Review Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="text-sm text-white/50">Client Username</label>
              <div className="text-white">{docData.clientUsername || '—'}</div>
            </div>
            <div>
              <label className="text-sm text-white/50">Status</label>
              <div className="text-white">{docData.status || '—'}</div>
            </div>
            <div>
              <label className="text-sm text-white/50">Feedback Date</label>
              <div className="text-white">{fmtDateTime(docData.feedbackDate)}</div>
            </div>
            <div>
              <label className="text-sm text-white/50">Platform</label>
              <div className="text-white">{docData.platform || '—'}</div>
            </div>
            <div>
              <label className="text-sm text-white/50">{socialPlatform ? 'Likes' : 'Rating'}</label>
              <div className="text-white">{docData.rating ?? docData.ratingStars ?? docData.stars ?? '—'}</div>
            </div>
            {docData.status === 'Ongoing' || docData.status === 'Resolved' || docData.status === 'Social Media' ? (
              <div>
                <label className="text-sm text-white/50">Status Type</label>
                <div className="text-white">{docData.statusType || '—'}</div>
              </div>
            ) : null}
            {String(docData.errorCategory ?? '')
              .toLowerCase()
              .startsWith('policies') ? (
              <div>
                <label className="text-sm text-white/50">Policy Type</label>
                <div className="text-white">{docData.policyType || '—'}</div>
              </div>
            ) : null}
            <div>
              <label className="text-sm text-white/50">Order #</label>
              <div className="text-white">{docData.orderNumber || '—'}</div>
            </div>
            <div>
              <label className="text-sm text-white/50">Error Category</label>
              <ErrorCategoryDisplay
                errorCategory={docData.errorCategory}
                policyType={docData.policyType}
                valueClassName="text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-white/50">{socialPlatform ? 'Comment or message' : 'Feedback Text'}</label>
              <div className="whitespace-pre-wrap text-white">{docData.feedbackText || '—'}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resolved comments - Log history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex w-full items-end gap-2">
              <div className="min-w-0 flex-1">
                <Input
                  placeholder="Add comment..."
                  value={newLogText}
                  onChange={(e) => setNewLogText(e.target.value)}
                  disabled={saving}
                />
              </div>
              <Button onClick={addLog} disabled={saving || !newLogText.trim()}>
                Add
              </Button>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-white/70">History</h3>
              <div className="space-y-3">
                <AnimatePresence>
                  {logs.length === 0 ? (
                    <div className="text-sm italic text-white/30">No logs added yet.</div>
                  ) : (
                    logs.map((item) => {
                      const isEditing = editingId === item.id

                      return (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4"
                        >
                          <div className="flex items-start justify-between">
                            <span className="text-xs font-bold text-blue-400">{item.agentName}</span>
                            <span className="text-[10px] text-white/40">
                              {fmtDateTime(item.updatedAt || item.createdAt)}
                            </span>
                          </div>

                          {isEditing ? (
                            <Input
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              autoFocus
                            />
                          ) : (
                            <div className="text-sm text-white/90">{item.text}</div>
                          )}

                          <div className="flex justify-end gap-2 pt-2">
                            {isEditing ? (
                              <>
                                <Button size="sm" onClick={saveEdit} disabled={saving}>
                                  Save
                                </Button>
                                <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={saving}>
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button size="sm" variant="ghost" onClick={() => startEdit(item)} disabled={saving}>
                                  Edit
                                </Button>
                                <Button size="sm" variant="danger" onClick={() => softDelete(item.id)} disabled={saving}>
                                  Delete
                                </Button>
                              </>
                            )}
                          </div>
                        </motion.div>
                      )
                    })
                  )}
                </AnimatePresence>
              </div>
            </div>

            {role === 'admin' ? (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-white/70">Activity Log</h3>
                {activityLogs.length === 0 ? (
                  <div className="text-sm italic text-white/30">No activity yet.</div>
                ) : (
                  <div className="space-y-3">
                    {activityLogs.map((log) => (
                      <div key={log.id} className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-start justify-between">
                          <span className="text-xs font-bold text-blue-400">{log.performedBy || 'Unknown'}</span>
                          <span className="text-[10px] text-white/40">{fmtDateTime(log.timestamp)}</span>
                        </div>
                        {log.action === 'comment_edited' ? (
                          <div className="space-y-1.5">
                            <div className="text-xs text-white/65">edited a comment</div>
                            <div className="text-xs text-white/55">Old: {log.oldValue || '—'}</div>
                            <div className="text-xs text-white/80">New: {log.newValue || '—'}</div>
                          </div>
                        ) : log.action === 'comment_deleted' ? (
                          <div className="space-y-1.5">
                            <div className="text-xs text-white/65">deleted a comment</div>
                            <div className="text-xs text-white/80">Deleted: {log.deletedValue || '—'}</div>
                          </div>
                        ) : log.action === 'comment_added' ? (
                          <div className="text-xs text-white/65">added a comment</div>
                        ) : (
                          <div className="text-xs text-white/55">{log.action || 'activity'}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
