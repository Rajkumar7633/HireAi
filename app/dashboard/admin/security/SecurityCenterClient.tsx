"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldCheck, KeyRound, GlobeLock, Bell, Activity } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

type Session = { id: string; user: string; ip: string; userAgent: string; lastActive: string }
export type RoleInfo = { currentRole: string; roles: Array<{ name: string; permissions: string[] }> }

export default function SecurityCenterClient({ initialRole }: { initialRole: string }) {
  const [role, setRole] = useState<string>(initialRole || "viewer")
  const isAdmin = role === "admin"
  const { toast } = useToast()
  const [sessions, setSessions] = useState<Session[]>([])
  const [keys, setKeys] = useState<any[]>([])
  const [proxy, setProxy] = useState<{ ok?: boolean; latencyMs?: number; upstream?: string; error?: string } | null>(null)
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState<{[k:string]: boolean}>({})
  const [sessPage, setSessPage] = useState(1)
  const [sessLimit, setSessLimit] = useState(10)
  const [sessTotal, setSessTotal] = useState<number|undefined>(undefined)
  const [evPage, setEvPage] = useState(1)
  const [evLimit, setEvLimit] = useState(10)
  const [evTotal, setEvTotal] = useState<number|undefined>(undefined)
  const [openSessions, setOpenSessions] = useState(false)
  const [openRoles, setOpenRoles] = useState(false)
  const [roles, setRoles] = useState<RoleInfo|null>(null)
  const [liveMode, setLiveMode] = useState<'sse'|'polling'>('sse')
  // Moderation state
  const [modType, setModType] = useState<'user'|'job'>('user')
  const [modId, setModId] = useState('')
  const [modReason, setModReason] = useState('')
  const [modDuration, setModDuration] = useState<number>(24)
  const [openHistory, setOpenHistory] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [lookupQ, setLookupQ] = useState("")
  const banned = Boolean((roles as any)?.banned)
  const onHold = Boolean((roles as any)?.on_hold)
  const validId = modId.trim().length > 0
  const validReason = modReason.trim().length > 0
  const [statusLabel, setStatusLabel] = useState<string>("")
  const [reasonPresets, setReasonPresets] = useState<string[]>(["Spam","Fake Job","Harassment","Other"]) 
  const [openManage, setOpenManage] = useState(false)
  const [newPreset, setNewPreset] = useState("")

  useEffect(() => {
    const refreshRole = async () => {
      try {
        const res = await fetch('/api/admin/security/roles', { cache: 'no-store' })
        if (res.ok) {
          const data: any = await res.json()
          setRole(data.currentRole || 'viewer')
          setRoles(data)
        }
      } catch {}
    }
    if (!initialRole) refreshRole()
  }, [initialRole])

  // Load/save presets and last used values
  useEffect(()=>{
    try {
      const raw = localStorage.getItem('moderation:presets')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr) && arr.length) setReasonPresets(arr.filter(Boolean))
      }
      const last = localStorage.getItem('moderation:last')
      if (last) {
        const j = JSON.parse(last)
        if (j?.duration) setModDuration(Number(j.duration)||24)
        if (j?.reason) setModReason(String(j.reason))
      }
    } catch {}
  }, [])
  useEffect(()=>{
    try { localStorage.setItem('moderation:last', JSON.stringify({ reason: modReason, duration: modDuration })) } catch {}
  }, [modReason, modDuration])

  // Moderation actions
  const banEntity = async ()=>{
    if (!window.confirm(`Ban ${modType} ${modId}?`)) return
    setLoading(s=>({...s, ban:true}))
    try {
      const r = await fetch('/api/admin/moderation/ban', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ type: modType, id: modId, reason: modReason, durationHours: modDuration }) })
      if (r.ok) toast({ title: 'Banned', description: `${modType} ${modId} banned` })
      else toast({ title: 'Ban failed', description: 'Upstream error', variant: 'destructive' })
    } finally { setLoading(s=>({...s, ban:false})) }
  }
  const unbanEntity = async ()=>{
    if (!modId) return
    if (!window.confirm(`Unban ${modType} ${modId}?`)) return
    setLoading(s=>({...s, unban:true}))
    try {
      const r = await fetch('/api/admin/moderation/unban', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ type: modType, id: modId }) })
      if (r.ok) toast({ title: 'Unbanned', description: `${modType} ${modId} unbanned` })
      else toast({ title: 'Unban failed', description: 'Upstream error', variant: 'destructive' })
    } finally { setLoading(s=>({...s, unban:false})) }
  }
  const holdEntity = async ()=>{
    if (!modId) return
    if (!window.confirm(`Place hold on ${modType} ${modId}?`)) return
    setLoading(s=>({...s, hold:true}))
    try {
      const until = new Date(Date.now() + modDuration*60*60*1000).toISOString()
      const r = await fetch('/api/admin/moderation/hold', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ type: modType === 'user' ? 'user' : 'job', id: modId, reason: modReason, until }) })
      if (r.ok) toast({ title: 'Hold applied', description: `${modType} ${modId} on hold` })
      else toast({ title: 'Hold failed', description: 'Upstream error', variant: 'destructive' })
    } finally { setLoading(s=>({...s, hold:false})) }
  }
  const loadHistory = async ()=>{
    if (!modId) { setHistory([]); return }
    setLoading(s=>({...s, history:true}))
    try {
      const r = await fetch(`/api/admin/moderation/history?type=${encodeURIComponent(modType)}&id=${encodeURIComponent(modId)}`, { cache:'no-store' })
      if (r.ok) setHistory((await r.json()).actions || [])
    } finally { setLoading(s=>({...s, history:false})) }
    // Derive latest status label
    try {
      const last = history && history.length ? history[0] : null
      if (last?.action === 'ban') setStatusLabel('BANNED')
      else if (last?.action === 'hold') setStatusLabel(last?.expiresAt ? `ON HOLD until ${new Date(last.expiresAt).toLocaleString()}` : 'ON HOLD')
      else if (last?.action === 'unban') setStatusLabel('ACTIVE')
    } catch {}
  }

  const quickLookup = async ()=>{
    if (!lookupQ) return
    setLoading(s=>({...s, lookup:true}))
    try {
      const r = await fetch(`/api/admin/moderation/lookup?query=${encodeURIComponent(lookupQ)}`, { cache:'no-store' })
      if (r.ok) {
        const j = await r.json()
        if (j.userId) { setModType('user'); setModId(j.userId) }
        else if (j.jobId) { setModType('job'); setModId(j.jobId) }
        else { toast({ title: 'Not found', description: 'No user/job matched' }); return }
        // After filling ID, load status history and toast status
        setTimeout(async ()=>{ 
          await loadHistory()
          if (statusLabel) toast({ title: 'Status', description: statusLabel })
        }, 0)
      }
    } finally { setLoading(s=>({...s, lookup:false})) }
  }

  const doLoadSessions = async ()=>{
    setLoading(s=>({...s, sessions:true}))
    try {
      const r = await fetch(`/api/admin/security/sessions?page=${sessPage}&limit=${sessLimit}`, { cache:'no-store' })
      if (r.ok) {
        const j = await r.json()
        setSessions(j.sessions || [])
        setSessTotal(j.total)
      }
    } finally { setLoading(s=>({...s, sessions:false})) }
  }
  const doAuditKeys = async ()=>{
    setLoading(s=>({...s, keys:true}))
    try {
      const r = await fetch('/api/admin/security/keys', { cache:'no-store' })
      if (r.ok) setKeys((await r.json()).keys || [])
    } finally { setLoading(s=>({...s, keys:false})) }
  }
  const doRotateKeys = async ()=>{
    setLoading(s=>({...s, rotate:true}))
    try {
      await fetch('/api/admin/security/keys', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ rotate:true }) })
      await doAuditKeys()
    } finally { setLoading(s=>({...s, rotate:false})) }
  }
  const doProxyCheck = async ()=>{
    setLoading(s=>({...s, proxy:true}))
    try {
      const r = await fetch('/api/admin/security/proxy-check', { cache:'no-store' })
      const j = await r.json()
      setProxy(j)
      if (j?.ok) toast({ title: 'Proxy OK', description: `${j.upstream} • ${j.latencyMs ?? '?'}ms` })
      else toast({ title: 'Proxy Failed', description: j?.error || 'unreachable', variant: 'destructive' })
    } finally { setLoading(s=>({...s, proxy:false})) }
  }

  // Events: SSE with polling fallback
  useEffect(()=>{
    let es: EventSource | null = null
    let timer: any
    const apply = (d: any) => {
      if (!d) return
      setEvents(d.events || d || [])
      if (typeof d.total === 'number') setEvTotal(d.total)
    }
    const poll = async ()=>{
      try {
        const r = await fetch(`/api/admin/security/events?range=24h&page=${evPage}&limit=${evLimit}`, { cache:'no-store' })
        if (r.ok) apply(await r.json())
      } catch {}
    }
    try {
      es = new EventSource(`/api/admin/security/events/stream?range=24h`)
      es.onmessage = (e)=>{ try { apply(JSON.parse(e.data)) } catch {} }
      es.onerror = ()=>{ es?.close(); es=null; if (!timer) { timer = setInterval(poll, 8000); setLiveMode('polling') } }
      setLiveMode('sse')
    } catch {
      timer = setInterval(poll, 8000)
      setLiveMode('polling')
    }
    // initial load
    poll()
    return ()=>{ es?.close(); if (timer) clearInterval(timer) }
  }, [evPage, evLimit])

  const openSessionsModal = async ()=>{
    setOpenSessions(true)
    await doLoadSessions()
  }
  const openRolesModal = async ()=>{
    setOpenRoles(true)
    const r = await fetch('/api/admin/security/roles', { cache:'no-store' })
    if (r.ok) setRoles(await r.json())
  }

  const revokeSession = async (id: string)=>{
    setLoading(s=>({...s, revoke:true}))
    try {
      await fetch(`/api/admin/security/sessions/${encodeURIComponent(id)}`, { method:'DELETE' })
      await doLoadSessions()
      toast({ title: 'Session revoked', description: id })
    } finally {
      setLoading(s=>({...s, revoke:false}))
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Security Center</h2>
        <div className="text-sm text-muted-foreground">Role: <span className={`px-2 py-0.5 rounded ${isAdmin? 'bg-green-500/10 text-green-600 border border-green-500/30':'bg-amber-500/10 text-amber-700 border border-amber-500/30'}`}>{role}</span></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isAdmin && (
          <Card className="rounded-2xl border bg-card md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Moderation</CardTitle>
              <CardDescription>Ban/Unban users or jobs, and place holds</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(banned || onHold) && (
                <div className="text-xs px-2 py-1 rounded-full border bg-amber-50 text-amber-700 inline-block">
                  {banned ? 'User is banned' : 'User is on hold'}
                </div>
              )}
              {/* Section: Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="text-[12px] text-muted-foreground">Type</label>
                  <select className="h-9 w-full border rounded px-2 bg-white" value={modType} onChange={(e)=>setModType(e.target.value as any)}>
                    <option value="user">User</option>
                    <option value="job">Job</option>
                  </select>
                </div>
                <div className="md:col-span-5">
                  <label className="text-[12px] text-muted-foreground">ID</label>
                  <div className="flex items-center gap-2">
                    <Input className="h-9 w-full bg-white" value={modId} onChange={(e)=>setModId(e.target.value)} placeholder="userId, email, or jobId/slug" />
                    {statusLabel && (<span className="text-[11px] px-2 py-1 rounded-full border bg-muted/40">{statusLabel}</span>)}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">Accepts userId, email, or jobId/slug</div>
                </div>
                <div className="md:col-span-3">
                  <label className="text-[12px] text-muted-foreground">Reason</label>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={()=>setOpenManage(true)}>Manage</Button>
                    <select className="h-9 border rounded px-2 bg-white" onChange={(e)=>setModReason(e.target.value)} value={modReason}>
                      <option value="">Select preset…</option>
                      {reasonPresets.map((p)=> (<option key={p} value={p}>{p}</option>))}
                    </select>
                    <Input className="h-9 w-full bg-white" value={modReason} onChange={(e)=>setModReason(e.target.value)} placeholder="Custom reason" />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="text-[12px] text-muted-foreground">Duration (hours)</label>
                  <Input type="number" min={1} className="h-9 w-full bg-white" value={modDuration} onChange={(e)=>setModDuration(parseInt(e.target.value)||24)} />
                </div>
              </div>
              <div className="h-px bg-border" />
              {/* Section: Actions */}
              <div className="flex flex-wrap items-center gap-3">
                <Input className="h-9 w-64 bg-white" placeholder="Quick lookup (email or slug)" value={lookupQ} onChange={(e)=>setLookupQ(e.target.value)} />
                <Button size="sm" variant="outline" onClick={quickLookup} disabled={!!loading.lookup}>{loading.lookup? 'Looking…':'Lookup'}</Button>
                <div className="ml-auto flex flex-wrap gap-2">
                  <Button size="sm" variant="destructive" disabled={!validId || !validReason || !!loading.ban || banned} onClick={banEntity}>{loading.ban? 'Banning…':'Ban'}</Button>
                  <Button size="sm" variant="outline" disabled={!validId || !!loading.unban || (!banned && !onHold)} onClick={unbanEntity}>{loading.unban? 'Unbanning…':'Unban'}</Button>
                  <Button size="sm" variant="outline" disabled={!validId || !validReason || !!loading.hold || onHold} onClick={holdEntity}>{loading.hold? 'Holding…':'Hold'}</Button>
                  <Button size="sm" onClick={()=>{ setOpenHistory(true); void loadHistory() }} disabled={!modId || !!loading.history}>{loading.history? 'Loading…':'View History'}</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        <Card className="rounded-2xl border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5"/> Authentication & Roles</CardTitle>
            <CardDescription>Review authentication status and role-based access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">Ensure admin routes forward auth headers to the backend and enforce RBAC.</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={openSessionsModal} disabled={!!loading.sessions}> {loading.sessions? 'Loading…':'View Sessions'} </Button>
              <Button size="sm" onClick={async()=>{ await fetch('/api/admin/security/roles', { cache:'no-store' }).then(r=>r.json()).then((d:RoleInfo)=>setRole(d.currentRole||'viewer')) }}>Refresh Role</Button>
              <Button variant="outline" size="sm" onClick={openRolesModal}>Roles & Permissions</Button>
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="rounded-2xl border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5"/> API Keys</CardTitle>
              <CardDescription>Rotate and audit API keys</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">No keys stored in client; use env/server only.</div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={doAuditKeys} disabled={!!loading.keys}>{loading.keys?'Auditing…':'Audit Keys'}</Button>
                <Button size="sm" onClick={doRotateKeys} disabled={!!loading.rotate}>{loading.rotate?'Rotating…':'Rotate Keys'}</Button>
              </div>
              {keys && keys.length>0 && (
                <div className="text-xs text-muted-foreground">Found {keys.length} keys</div>
              )}

            </CardContent>
          </Card>
        )}

        <Card className="rounded-2xl border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><GlobeLock className="h-5 w-5"/> CORS & Proxies</CardTitle>
            <CardDescription>Validate proxy forwarding and CORS policy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">Admin APIs proxy to http://localhost:5001 with auth header forwarding.</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={doProxyCheck} disabled={!!loading.proxy}>{loading.proxy?'Testing…':'Test Proxies'}</Button>
              <Button size="sm" onClick={()=>window.open('https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS','_blank')}>View Policy</Button>
            </div>
            {proxy && (
              <div className="text-xs text-muted-foreground">Upstream: {proxy.upstream} • Status: {proxy.ok? 'OK':'Fail'} {typeof proxy.latencyMs==='number'? `• ${proxy.latencyMs}ms`: ''}</div>
            )}
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="rounded-2xl border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5"/> Alerts</CardTitle>
              <CardDescription>Real-time security events ({liveMode})</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm max-h-64 overflow-auto border rounded p-2 bg-background">
                {events.length===0 ? (
                  <div className="text-muted-foreground">No recent activity</div>
                ) : events.map((e, i)=> (
                  <div key={i} className="border rounded p-2 flex items-center justify-between">
                    <span className="truncate">{e.type || 'event'} — {e.summary || ''}</span>
                    <span className="text-xs text-muted-foreground">{new Date(e.createdAt || Date.now()).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-end gap-2">
                <select className="h-8 px-2 border rounded" value={evLimit} onChange={(e)=>{ setEvLimit(parseInt(e.target.value)||10); setEvPage(1) }}>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <Button size="sm" variant="outline" disabled={evPage<=1} onClick={()=> setEvPage(p=>p-1)}>Prev</Button>
                <Button size="sm" variant="outline" onClick={()=> setEvPage(p=>p+1)}>Next</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="rounded-2xl border bg-card md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5"/> Recent Security Activity</CardTitle>
            <CardDescription>Last 24h</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm border rounded p-2 bg-background max-h-72 overflow-auto">
              {events.length===0 ? (
                <div className="text-muted-foreground">No recent activity</div>
              ) : (
                events.slice(0,10).map((e, i)=> (
                  <div key={i} className="border rounded p-2 flex items-center justify-between">
                    <span className="truncate">{e.type || 'event'} — {e.summary || ''}</span>
                    <span className="text-xs text-muted-foreground">{new Date(e.createdAt || Date.now()).toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sessions Modal */}
      <Dialog open={openSessions} onOpenChange={setOpenSessions}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Active Sessions</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {sessions.length===0 ? (
              <div className="text-muted-foreground">No sessions</div>
            ) : (
              <>
                {sessions.map((s)=> (
                  <div key={s.id} className="border rounded p-2 flex items-center justify-between">
                    <div className="truncate">
                      <div className="font-medium truncate">{s.user}</div>
                      <div className="text-xs text-muted-foreground truncate">{s.ip} • {s.userAgent}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-muted-foreground">{new Date(s.lastActive).toLocaleString()}</div>
                      <Button size="sm" variant="destructive" onClick={()=>revokeSession(s.id)} disabled={!!loading.revoke}>Revoke</Button>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">Showing {sessions.length} {typeof sessTotal==='number'? `of ${sessTotal}`:''}</span>
                  <div className="flex gap-2">
                    <select className="h-8 px-2 border rounded" value={sessLimit} onChange={(e)=>{ setSessLimit(parseInt(e.target.value)||10); setSessPage(1); void doLoadSessions() }}>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                    <Button size="sm" variant="outline" disabled={sessPage<=1} onClick={()=>{ setSessPage(p=>p-1); void doLoadSessions() }}>Prev</Button>
                    <Button size="sm" variant="outline" onClick={()=>{ setSessPage(p=>p+1); void doLoadSessions() }}>Next</Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Roles Modal */}
      <Dialog open={openRoles} onOpenChange={setOpenRoles}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Roles & Permissions</DialogTitle>
          </DialogHeader>
          {!roles ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : (
            <div className="space-y-3 text-sm">
              <div>Current role: <span className="font-medium">{roles.currentRole}</span></div>
              <div className="space-y-2">
                {roles.roles.map((r)=> (
                  <div key={r.name} className="border rounded p-2">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.permissions.join(', ')}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manage Reason Presets Modal */}
      <Dialog open={openManage} onOpenChange={setOpenManage}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Reason Presets</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="space-y-2">
              {reasonPresets.length === 0 && (
                <div className="text-muted-foreground">No presets yet</div>
              )}
              {reasonPresets.map((p, idx)=> (
                <div key={`${p}-${idx}`} className="flex items-center justify-between border rounded px-2 py-1">
                  <span className="truncate">{p}</span>
                  <Button size="sm" variant="destructive" onClick={()=>{
                    const arr = reasonPresets.filter((_,i)=>i!==idx)
                    setReasonPresets(arr)
                    try{ localStorage.setItem('moderation:presets', JSON.stringify(arr)) }catch{}
                  }}>Remove</Button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input className="h-9 bg-white" placeholder="Add new preset" value={newPreset} onChange={(e)=>setNewPreset(e.target.value)} />
              <Button size="sm" onClick={()=>{
                const v = newPreset.trim()
                if (!v) return
                if (reasonPresets.includes(v)) return
                const arr = [...reasonPresets, v]
                setReasonPresets(arr)
                setNewPreset("")
                try{ localStorage.setItem('moderation:presets', JSON.stringify(arr)) }catch{}
              }}>Add</Button>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={()=>setOpenManage(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
