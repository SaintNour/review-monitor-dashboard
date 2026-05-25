import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { Select } from '../components/ui/Select'
import { Button } from '../components/ui/Button'
import { useAuth } from '../auth/AuthProvider'
import { Timestamp } from '../lib/timestamp'
import { createEntryApi, fetchEntryByIdApi, updateEntryApi } from '../data/entries.api'
import {
  PLATFORMS,
  STATUSES,
  ONGOING_TYPES,
  RESOLVED_TYPES,
  SOCIAL_MEDIA_TYPES,
  ERROR_CATEGORIES,
  POLICY_TYPES,
  type Platform,
  type ReviewDoc,
  type ReviewStatus,
  type StatusType,
  type ErrorCategory,
  type PolicyType,
  type ResolveCommentEntry,
  type ActivityLogEntry,
} from '../types'
import { clamp } from '../lib/utils'
import { CheckCircle2, Pencil, Plus, Save, Trash2 } from 'lucide-react'

function toTimestamp(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return Timestamp.fromDate(d)
}

function toDateInput(ts: unknown) {
  let d: Date | null = null
  if (ts && typeof (ts as { toDate?: () => Date }).toDate === 'function') {
    d = (ts as { toDate: () => Date }).toDate()
  } else if (ts) {
    d = new Date(ts as string | number)
  }
  if (!d || isNaN(d.getTime())) return ''
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function getStatusTypeOptions(status: ReviewStatus): readonly string[] {
  if (status === 'Ongoing') return ONGOING_TYPES
  if (status === 'Resolved') return RESOLVED_TYPES
  if (status === 'Social Media') return SOCIAL_MEDIA_TYPES
  return []
}

function isSocialMediaPlatform(platform: string) {
  return platform === 'Facebook' || platform === 'Instagram' || platform === 'TikTok'
}

function isPolicies(v: any) {
  return String(v ?? '').toLowerCase().startsWith('policies')
}
function isOthers(v: any) {
  return String(v ?? '').toLowerCase().startsWith('others')
}
function defaultNoneError(): ErrorCategory {
  const found = (ERROR_CATEGORIES as any[]).find((x) => String(x).toLowerCase().startsWith('none'))
  return (found ?? 'None.') as any
}

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function normalizeComment(raw: any): ResolveCommentEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const id = String(raw.id ?? '')
  const text = String(raw.text ?? '')
  if (!id || !text) return null
  return {
    id,
    text,
    createdByUid: String(raw.createdByUid ?? ''),
    createdByName: String(raw.createdByName ?? raw.agentName ?? 'Unknown'),
    createdAt: raw.createdAt ?? Timestamp.now(),
    updatedAt: raw.updatedAt ?? null,
  }
}

/** `resolvedLog` rows → form state (authorName is source of truth). */
function resolvedLogToComment(raw: any): ResolveCommentEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const id = String(raw.id ?? '')
  const text = String(raw.text ?? '').trim()
  if (!id || !text) return null
  return {
    id,
    text,
    createdByUid: String(raw.createdByUid ?? ''),
    createdByName: String(raw.authorName ?? raw.createdByName ?? raw.agentName ?? 'Unknown'),
    createdAt: raw.createdAt ?? Timestamp.now(),
    updatedAt: raw.updatedAt ?? null,
  }
}

function resolveCommentEntryToResolvedLog(c: ResolveCommentEntry) {
  const row: Record<string, unknown> = {
    id: c.id,
    text: c.text,
    authorName: c.createdByName,
    createdAt: c.createdAt,
  }
  if (c.updatedAt != null) row.updatedAt = c.updatedAt
  return row
}

const formNestedSectionClass =
  'rounded-2xl border border-white/[0.07] bg-[#0d1522] p-5'

export type EntryFormProps = {
  mode: 'create' | 'edit'
  entryId?: string
  onSaved?: (nextStatus: ReviewStatus) => void
}

export function EntryForm({ mode, entryId, onSaved }: EntryFormProps) {
  const { user, profile } = useAuth()
  const agentName = profile?.displayName ?? user?.displayName ?? user?.email ?? 'Unknown'
  const agentUid = user?.uid ?? ''

  const [platform, setPlatform] = useState<Platform>('Amazon')
  const [status, setStatus] = useState<ReviewStatus>('Ongoing')
  const [statusType, setStatusType] = useState<StatusType | null>(ONGOING_TYPES[0])

  const [clientUsername, setClientUsername] = useState('')
  const [feedbackDate, setFeedbackDate] = useState('')
  const [feedbackText, setFeedbackText] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [ratingStars, setRatingStars] = useState('')

  const [errorCategory, setErrorCategory] = useState<ErrorCategory>(defaultNoneError())
  const [policyType, setPolicyType] = useState<PolicyType | null>(null)
  const [otherManualInput, setOtherManualInput] = useState('')

  const [comments, setComments] = useState<ResolveCommentEntry[]>([])
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([])
  const [draftComment, setDraftComment] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')

  const prevStatusRef = useRef<ReviewStatus | null>(null)
  const originalModeratorRef = useRef<{ uid: string; name: string; email: string } | null>(null)
  const [hydrated, setHydrated] = useState(mode === 'create')
  const [loadingEdit, setLoadingEdit] = useState(mode === 'edit')
  const [loadError, setLoadError] = useState<string | null>(null)

  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const statusTypeOptions = useMemo(() => getStatusTypeOptions(status), [status])
  const socialPlatform = useMemo(() => isSocialMediaPlatform(platform), [platform])

  const pushActivity = useCallback(
    (action: ActivityLogEntry['action'], details?: Record<string, unknown> | null) => {
      const entry: ActivityLogEntry = {
        action,
        performedBy: agentName,
        performedByUid: agentUid || null,
        timestamp: Timestamp.now(),
        details: details ?? null,
      }
      setActivityLog((prev) => [...prev, entry])
    },
    [agentName, agentUid],
  )

  useEffect(() => {
    if (mode !== 'edit' || !entryId) return
    let cancelled = false
    async function load() {
      setLoadingEdit(true)
      setLoadError(null)
      try {
        const data = (await fetchEntryByIdApi(entryId)) as Record<string, unknown>
        if (cancelled) return

        originalModeratorRef.current = {
          uid: String(data.moderatorUid ?? ''),
          name: String(data.moderatorName ?? ''),
          email: String(data.moderatorEmail ?? ''),
        }

        setPlatform((data.platform as Platform) ?? 'Amazon')
        const st = (data.status as ReviewStatus) ?? 'Ongoing'
        setStatus(st)
        const opts = getStatusTypeOptions(st)
        setStatusType((data.statusType as StatusType) ?? opts[0] ?? null)

        setClientUsername(data.clientUsername ?? '')
        setFeedbackDate(toDateInput(data.feedbackDate))
        setFeedbackText(data.feedbackText ?? '')
        setOrderNumber(data.orderNumber ?? '')
        setRatingStars(data.ratingStars != null ? String(data.ratingStars) : data.rating != null ? String(data.rating) : '')

        setErrorCategory((data.errorCategory as ErrorCategory) ?? defaultNoneError())
        setPolicyType((data.policyType as PolicyType) ?? null)
        setOtherManualInput((data.errorOtherText as string) ?? '')

        const fromResolved = Array.isArray(data.resolvedLog)
          ? (data.resolvedLog as any[]).map(resolvedLogToComment).filter(Boolean)
          : []
        const fromLegacy = (Array.isArray(data.comments) ? data.comments : [])
          .map(normalizeComment)
          .filter(Boolean) as ResolveCommentEntry[]
        setComments(fromResolved.length > 0 ? (fromResolved as ResolveCommentEntry[]) : fromLegacy)

        const rawLog = Array.isArray(data.activityLog) ? data.activityLog : []
        setActivityLog(rawLog as ActivityLogEntry[])

        prevStatusRef.current = st
        setHydrated(true)
      } catch (e: any) {
        if (!cancelled) setLoadError(String(e?.message ?? 'Failed to load'))
      } finally {
        if (!cancelled) setLoadingEdit(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [mode, entryId])

  useEffect(() => {
    if (!hydrated) return
    if (prevStatusRef.current === null) {
      prevStatusRef.current = status
      return
    }
    if (prevStatusRef.current !== status) {
      pushActivity('status_changed', { from: prevStatusRef.current, to: status })
      prevStatusRef.current = status
    }
  }, [status, hydrated, pushActivity])

  useEffect(() => {
    if (!isPolicies(errorCategory)) setPolicyType(null)
    if (!isOthers(errorCategory)) setOtherManualInput('')
  }, [errorCategory])

  const canSave = useMemo(() => {
    return !!(
      user &&
      profile &&
      clientUsername.trim() &&
      feedbackDate &&
      feedbackText.trim() &&
      platform &&
      status
    )
  }, [user, profile, clientUsername, feedbackDate, feedbackText, platform, status])

  function onStatusChange(next: ReviewStatus) {
    setStatus(next)
    if (next === 'Ongoing') setStatusType(ONGOING_TYPES[0])
    else if (next === 'Resolved') setStatusType(RESOLVED_TYPES[0])
    else if (next === 'Social Media') setStatusType(SOCIAL_MEDIA_TYPES[0])
  }

  function addComment() {
    const text = draftComment.trim()
    if (!text || !user) return
    const now = Timestamp.now()
    const row: ResolveCommentEntry = {
      id: newId(),
      text,
      createdByUid: user.uid,
      createdByName: agentName,
      createdAt: now,
      updatedAt: null,
    }
    setComments((c) => [...c, row])
    setDraftComment('')
    pushActivity('comment_added', { commentId: row.id })
  }

  function startEdit(c: ResolveCommentEntry) {
    setEditingId(c.id)
    setEditDraft(c.text)
  }

  function saveEdit() {
    if (!editingId) return
    const t = editDraft.trim()
    if (!t) return
    setComments((list) =>
      list.map((c) =>
        c.id === editingId ? { ...c, text: t, updatedAt: Timestamp.now() } : c,
      ),
    )
    pushActivity('comment_edited', { commentId: editingId })
    setEditingId(null)
    setEditDraft('')
  }

  function deleteComment(id: string) {
    setComments((list) => list.filter((c) => c.id !== id))
    if (editingId === id) {
      setEditingId(null)
      setEditDraft('')
    }
    pushActivity('comment_deleted', { commentId: id })
  }

  function formatCommentTime(ts: Timestamp) {
    try {
      return ts.toDate().toLocaleString()
    } catch {
      return String(ts)
    }
  }

  async function save() {
    setErr(null)
    setOk(null)
    if (!user || !profile) return setErr('Your account is not provisioned (missing role profile).')
    if (mode === 'edit' && (!entryId || loadingEdit)) return setErr('Entry not ready.')

    if (isPolicies(errorCategory) && !policyType) {
      return setErr('Please select a Policies type (Warranty / Refunds-Return).')
    }

    if (!statusType) return setErr('Please select a status type.')

    setBusy(true)
    try {
      const parsedRating = Number(ratingStars)
      const rating = ratingStars.trim()
        ? socialPlatform
          ? Number.isFinite(parsedRating)
            ? Math.max(0, Math.floor(parsedRating))
            : null
          : clamp(parsedRating, 1, 5)
        : null

      const fTs = toTimestamp(feedbackDate)
      const now = Timestamp.now()

      const resolveCommentLegacy =
        comments.length > 0 ? comments.map((c) => c.text).join('\n---\n') : ''

      const moderatorUid =
        mode === 'edit' && originalModeratorRef.current?.uid
          ? originalModeratorRef.current.uid
          : user.uid
      const moderatorName =
        mode === 'edit' && originalModeratorRef.current?.name
          ? originalModeratorRef.current.name
          : profile.displayName
      const moderatorEmail =
        mode === 'edit' && originalModeratorRef.current?.email
          ? originalModeratorRef.current.email
          : profile.email

      const base: Omit<ReviewDoc, 'createdAt' | 'updatedAt'> = {
        moderatorUid,
        moderatorName,
        moderatorEmail,

        clientUsername: clientUsername.trim(),
        clientUsernameLower: clientUsername.trim().toLowerCase(),

        platform,
        status,
        statusType: statusType ?? null,

        feedbackDate: fTs,
        responseDate: null,

        feedbackText: feedbackText.trim(),
        orderNumber: orderNumber.trim() ? orderNumber.trim() : null,

        resolveComment: resolveCommentLegacy,
        resolvedLog: comments.map(resolveCommentEntryToResolvedLog),
        activityLog:
          mode === 'edit'
            ? (activityLog as any)
            : activityLog.length
              ? (activityLog as any)
              : undefined,

        resolveCommentUpdatedByUid: user.uid,
        resolveCommentUpdatedByName: profile?.displayName ?? user?.displayName ?? user?.email ?? 'Unknown',
        resolveCommentUpdatedAt: now,

        ratingStars: rating,
        hasRating: rating !== null,
        hasOrderNumber: !!orderNumber.trim(),

        responseTimeHours: null,

        errorCategory: errorCategory ?? defaultNoneError(),
        policyType: isPolicies(errorCategory) ? policyType : null,
        errorOtherText: isOthers(errorCategory) ? (otherManualInput.trim() ? otherManualInput.trim() : null) : null,
      }

      if (mode === 'create') {
        const entryPayload = { ...base, createdAt: now.toDate().toISOString(), updatedAt: now.toDate().toISOString() }
        await createEntryApi(entryPayload as Record<string, unknown>)
        setOk('Saved!')
        setClientUsername('')
        setFeedbackDate('')
        setFeedbackText('')
        setOrderNumber('')
        setRatingStars('')
        setStatus('Ongoing')
        setStatusType(ONGOING_TYPES[0])
        setErrorCategory(defaultNoneError())
        setPolicyType(null)
        setOtherManualInput('')
        setComments([])
        setActivityLog([])
        setDraftComment('')
        setEditingId(null)
        setEditDraft('')
        prevStatusRef.current = 'Ongoing'
      } else {
        await updateEntryApi(entryId!, { ...base, updatedAt: now.toDate().toISOString() } as Record<string, unknown>)
        setOk('Changes saved!')
        onSaved?.(status)
      }
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to save')
    } finally {
      setBusy(false)
    }
  }

  if (mode === 'edit' && loadingEdit) {
    return (
      <Card className="mt-6">
        <CardContent className="py-10 text-center text-sm text-white/55">Loading entry…</CardContent>
      </Card>
    )
  }

  if (mode === 'edit' && loadError) {
    return (
      <Card className="mt-6 border-red-400/20 bg-red-500/10">
        <CardContent className="py-6 text-sm text-red-100/90">{loadError}</CardContent>
      </Card>
    )
  }

  return (
    <Card className="mt-7 overflow-hidden">
      <CardHeader className="px-6 pb-4 pt-6">
        <CardTitle className="leading-none">Review details</CardTitle>
      </CardHeader>

      <CardContent className="space-y-7 px-6 pb-6 pt-5">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Select label="Platform" value={platform} onChange={(e) => setPlatform(e.target.value as any)}>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>

          <Select label="Status" value={status} onChange={(e) => onStatusChange(e.target.value as ReviewStatus)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>

          <Select
            label="Status type"
            value={(statusType ?? '') as any}
            onChange={(e) => setStatusType((e.target.value || null) as StatusType | null)}
          >
            <option value="">Select…</option>
            {statusTypeOptions.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </Select>
          <Input
            label="Client Username"
            value={clientUsername}
            onChange={(e) => setClientUsername(e.target.value)}
            placeholder="ex: john_doe"
          />

          <Input label="Feedback date" type="date" value={feedbackDate} onChange={(e) => setFeedbackDate(e.target.value)} />

          <Input
            label="Order number (optional)"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="ex: 112-1234567-1234567"
          />

          <Select label="Error category" value={errorCategory as any} onChange={(e) => setErrorCategory(e.target.value as any)}>
            {(ERROR_CATEGORIES as any[]).map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </Select>

          {isPolicies(errorCategory) ? (
            <Select
              label="Policy type"
              value={(policyType ?? '') as any}
              onChange={(e) => setPolicyType((e.target.value || null) as PolicyType | null)}
            >
              <option value="">Select…</option>
              {(POLICY_TYPES as any[]).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          ) : isOthers(errorCategory) ? (
            <Input
              label="Others (manual input)"
              value={otherManualInput}
              onChange={(e) => setOtherManualInput(e.target.value)}
              placeholder="Optional details…"
            />
          ) : (
            <div className="hidden md:block" aria-hidden>
              <div className="mb-1.5 text-xs font-medium text-transparent select-none">—</div>
              <div className="h-11 rounded-xl border border-transparent" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_minmax(0,220px)] md:items-start">
          <Textarea
            label={socialPlatform ? 'Comment or message' : 'Feedback text'}
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder={socialPlatform ? 'Paste the social comment/message here…' : 'Paste the customer review text here…'}
          />
          {socialPlatform ? (
            <Input
              label="Likes (optional)"
              type="number"
              min={0}
              step={1}
              value={ratingStars}
              onChange={(e) => setRatingStars(e.target.value)}
              placeholder="e.g. 120"
            />
          ) : (
            <Select label="Rating (optional)" value={ratingStars} onChange={(e) => setRatingStars(e.target.value)}>
              <option value="">No rating</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={String(n)}>
                  {'⭐'.repeat(n)} ({n})
                </option>
              ))}
            </Select>
          )}
        </div>

        <div className={formNestedSectionClass}>
          <div className="text-[15px] font-semibold tracking-tight text-white">Resolved comments - Log history</div>

          <div className="mt-4">
            <div className="mb-1.5 text-xs font-medium text-white/70">Add comment</div>
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <Input
                  className="h-11 w-full"
                  value={draftComment}
                  onChange={(e) => setDraftComment(e.target.value)}
                  placeholder="Write a comment…"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      addComment()
                    }
                  }}
                />
              </div>
              <Button
                type="button"
                className="h-11 shrink-0 px-5 min-w-[104px]"
                onClick={addComment}
                disabled={!draftComment.trim() || !user}
              >
                Add
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {comments.length === 0 ? (
              <div className="text-sm text-white/55">No comments yet.</div>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="rounded-xl border border-white/[0.08] bg-[#0c1420] p-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="text-xs text-white/60">
                      <span className="font-medium text-white/85">{c.createdByName}</span>
                      <span className="mx-2">·</span>
                      <span>{formatCommentTime(c.createdAt)}</span>
                      {c.updatedAt ? (
                        <>
                          <span className="mx-2">·</span>
                          <span>edited {formatCommentTime(c.updatedAt)}</span>
                        </>
                      ) : null}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="!px-2"
                        onClick={() => startEdit(c)}
                        aria-label="Edit comment"
                      >
                        <Pencil size={16} />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="!px-2"
                        onClick={() => deleteComment(c.id)}
                        aria-label="Delete comment"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                  {editingId === c.id ? (
                    <div className="mt-2 space-y-2">
                      <Textarea value={editDraft} onChange={(e) => setEditDraft(e.target.value)} />
                      <div className="flex gap-2">
                        <Button type="button" size="sm" onClick={saveEdit}>
                          Save
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingId(null)
                            setEditDraft('')
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/88">{c.text}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          {ok ? (
            <div className="mr-auto inline-flex items-center gap-2 text-sm text-emerald-300">
              <CheckCircle2 size={18} /> {ok}
            </div>
          ) : null}
          {err ? <div className="mr-auto text-sm text-red-300">{err}</div> : null}

          <Button
            onClick={save}
            disabled={!canSave || busy}
            className="h-11 rounded-xl px-5 font-medium shadow-[0_5px_12px_rgba(0,0,0,0.18)] hover:bg-skyish-500"
          >
            {mode === 'create' ? (
              <>
                <Plus size={16} /> Save entry
              </>
            ) : (
              <>
                <Save size={16} /> Save changes
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
