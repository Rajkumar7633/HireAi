"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { CustomChart } from "@/components/charts"

export default function AdminJobOversightPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jobs, setJobs] = useState<any[]>([])
  const [query, setQuery] = useState(() => searchParams?.get('q') || "")
  const [status, setStatus] = useState(() => searchParams?.get('status') || "")
  const [sortBy, setSortBy] = useState<'title'|'company'|'status'|'createdAt'>(() => (searchParams?.get('sortBy') as any) || "createdAt")
  const [sortDir, setSortDir] = useState<'asc'|'desc'>(() => (searchParams?.get('sortDir') as any) || "desc")
  const [page, setPage] = useState(() => parseInt(searchParams?.get('page') || '1') || 1)
  const [limit, setLimit] = useState(() => parseInt(searchParams?.get('limit') || '10') || 10)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [preview, setPreview] = useState<any|null>(null)
  const [serverTotal, setServerTotal] = useState<number|undefined>(undefined)
  const [serverPaging, setServerPaging] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [counts, setCounts] = useState<{open:number;paused:number;closed:number;today:number}>({open:0,paused:0,closed:0,today:0})
  const [timeseries, setTimeseries] = useState<any[]>([])
  const [byStatus, setByStatus] = useState<any[]>([])
  const [byCompany, setByCompany] = useState<any[]>([])
  const [totalJobs, setTotalJobs] = useState(0)
  const [hired, setHired] = useState(0)
  const [companyIds, setCompanyIds] = useState<string[]>(() => {
    const p = searchParams?.get("companyId") || ""
    return p ? p.split(',').map(s=>s.trim()).filter(Boolean) : []
  })
  const [range, setRange] = useState<'all'|'24h'|'7d'>(() => {
    const r = (searchParams?.get('range') || '').toLowerCase()
    return r === '24h' || r === '7d' ? r : 'all'
  })
  const [liveMode, setLiveMode] = useState<'sse'|'polling'>('sse')
  const [lastUpdated, setLastUpdated] = useState<string>("")

  // Configurable polling intervals
  const JOBS_POLL_MS = 8000
  const METRICS_POLL_MS = 8000
  const [companies, setCompanies] = useState<Array<{companyId:string; name:string; logoUrl?:string; total:number; hired:number; open:number; paused:number; closed:number}>>([])
  const selectedCompanyProfiles = useMemo(()=>{
    const map = new Map(companies.map(c=>[c.companyId,c]))
    return companyIds.map(id=> map.get(id)).filter(Boolean) as typeof companies
  }, [companies, companyIds])
  const [refreshingJobs, setRefreshingJobs] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = jobs.filter((j) => {
      const mQ = !q || [j.title, j.company, j.location].filter(Boolean).join(" ").toLowerCase().includes(q)
      const mS = !status || (j.status || "").toLowerCase() === status
      return mQ && mS
    })
    base.sort((a:any,b:any)=>{
      const av = (sortBy==='title'?a.title:sortBy==='company'?a.company:sortBy==='status'?a.status:a.createdAt)||''
      const bv = (sortBy==='title'?b.title:sortBy==='company'?b.company:sortBy==='status'?b.status:b.createdAt)||''
      const cmp = String(av).localeCompare(String(bv))
      return sortDir==='asc'?cmp:-cmp
    })
    return base
  }, [jobs, query, status, sortBy, sortDir])

  const totalPages = useMemo(()=> Math.max(1, Math.ceil(filtered.length/limit)), [filtered.length, limit])
  const pageItems = useMemo(()=> filtered.slice((page-1)*limit, (page-1)*limit+limit), [filtered, page, limit])

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ page: String(page), limit: String(limit), sortBy, sortDir, q: query, status, ...(companyIds.length?{companyId: companyIds.join(',')}: {}) })
        const res = await fetch(`/api/admin/jobs?${params.toString()}`, { cache: "no-store" })
        if (!res.ok) {
          // fallback to recruiter jobs if admin endpoint not present
          const r2 = await fetch(`/api/recruiter/job-descriptions`, { cache: "no-store" }).catch(() => null)
          if (r2 && r2.ok) {
            const d2 = await r2.json()
            const items = Array.isArray(d2) ? d2 : d2.items || d2.jobs || []
            const pickId = (j:any)=> (typeof j?.companyId === 'object' && j.companyId?._id)? String(j.companyId._id): String(j?.companyId || j?.company || j?.org || '')
            setJobs(companyIds.length? items.filter((j:any)=> companyIds.includes(pickId(j))): items)
            setServerPaging(false)
          } else {
            // final fallback to local DB route
            const r3 = await fetch(`/api/job-descriptions`, { cache: "no-store" }).catch(() => null)
            if (r3 && r3.ok) {
              const d3 = await r3.json()
              const items = Array.isArray(d3) ? d3 : d3.items || d3.jobs || d3.jobs || []
              const pickId = (j:any)=> (typeof j?.companyId === 'object' && j.companyId?._id)? String(j.companyId._id): String(j?.companyId || j?.company || j?.org || '')
              setJobs(companyIds.length? items.filter((j:any)=> companyIds.includes(pickId(j))): items)
              setServerPaging(false)
            } else {
              throw new Error("No jobs endpoint available")
            }
          }
        } else {
          const data = await res.json()
          let items = Array.isArray(data) ? data : data.items || data.jobs || []
          // If admin returns empty, try fallbacks
          if (!items || items.length === 0) {
            const r2 = await fetch(`/api/recruiter/job-descriptions`, { cache: "no-store" }).catch(() => null)
            if (r2 && r2.ok) {
              const d2 = await r2.json()
              const alt = Array.isArray(d2) ? d2 : d2.items || d2.jobs || []
              const pickId = (j:any)=> (typeof j?.companyId === 'object' && j.companyId?._id)? String(j.companyId._id): String(j?.companyId || j?.company || j?.org || '')
              items = companyIds.length? alt.filter((j:any)=> companyIds.includes(pickId(j))): alt
            } else {
              const r3 = await fetch(`/api/job-descriptions`, { cache: "no-store" }).catch(() => null)
              if (r3 && r3.ok) {
                const d3 = await r3.json()
                const alt = Array.isArray(d3) ? d3 : d3.items || d3.jobs || d3.jobs || []
                const pickId = (j:any)=> (typeof j?.companyId === 'object' && j.companyId?._id)? String(j.companyId._id): String(j?.companyId || j?.company || j?.org || '')
                items = companyIds.length? alt.filter((j:any)=> companyIds.includes(pickId(j))): alt
              }
            }
          }
          setJobs(items)
          setLastUpdated(new Date().toLocaleTimeString())
          const total = data.total || data.count || undefined
          setServerTotal(total)
          setServerPaging(!!total)
        }
      } catch (e: any) {
        setError(e.message || "Failed to load jobs")
      } finally {
        setLoading(false)
      }
    }
    run()
    // re-run on paging/sort/search changes for server mode
  }, [page, limit, sortBy, sortDir, companyIds])

  // Background polling for jobs
  useEffect(()=>{
    let timer: any
    const tick = async ()=>{
      try {
        const params = new URLSearchParams({ page: String(page), limit: String(limit), sortBy, sortDir, q: query, status, ...(companyIds.length?{companyId: companyIds.join(',')}: {}) })
        const res = await fetch(`/api/admin/jobs?${params.toString()}`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json().catch(()=>({}))
          const items = Array.isArray(data) ? data : data.items || data.jobs || []
          setJobs(items)
          setLastUpdated(new Date().toLocaleTimeString())
        }
      } catch {}
    }
    timer = setInterval(tick, JOBS_POLL_MS)
    return ()=>{ if (timer) clearInterval(timer) }
  }, [companyIds, page, limit, sortBy, sortDir, query, status])

  // Persist selected rows in localStorage
  useEffect(()=>{
    try {
      const raw = localStorage.getItem('admin_jobs_selected')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') setSelected(parsed)
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Restore selected companies from localStorage if URL has none
  useEffect(()=>{
    try {
      const hasUrlCompanies = !!(searchParams?.get('companyId') || '')
      if (!hasUrlCompanies && (!companyIds || companyIds.length===0)) {
        const raw = localStorage.getItem('admin_jobs_companies')
        if (raw) {
          const arr = JSON.parse(raw)
          if (Array.isArray(arr) && arr.length>0) setCompanyIds(arr)
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist selected companies to localStorage whenever they change
  useEffect(()=>{
    try { localStorage.setItem('admin_jobs_companies', JSON.stringify(companyIds)) } catch {}
  }, [companyIds])
  useEffect(()=>{
    try { localStorage.setItem('admin_jobs_selected', JSON.stringify(selected)) } catch {}
  }, [selected])

  // Keyboard shortcut: Alt+R to refresh jobs
  useEffect(()=>{
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault()
        void refreshJobs()
      }
    }
    window.addEventListener('keydown', onKey)
    return ()=> window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function refreshJobs(){
    if (refreshingJobs) return
    setRefreshingJobs(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), sortBy, sortDir, q: query, status, ...(companyIds.length?{companyId: companyIds.join(',')}: {}) })
      const res = await fetch(`/api/admin/jobs?${params.toString()}`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json().catch(()=>({}))
        const items = Array.isArray(data) ? data : data.items || data.jobs || []
        setJobs(items)
        setLastUpdated(new Date().toLocaleTimeString())
      }
    } catch {}
    setRefreshingJobs(false)
  }

  // Metrics: prefer SSE, fallback to polling. Honor range filter.
  useEffect(() => {
    let es: EventSource | null = null
    let timer: any
    const apply = (data: any) => {
      setCounts(data.counts || { open: 0, paused: 0, closed: 0, today: 0 })
      setTimeseries((data.timeseries || []).map((r: any) => ({ name: r.date, value: r.posted })))
      setByStatus((data.byStatus || []).map((r: any) => ({ name: r.status, value: r.count })))
      setByCompany((data.byCompany || []).map((r: any) => ({ name: r.company, value: r.count })))
      setTotalJobs(Number(data.totalJobs || 0))
      setHired(Number(data.hired || 0))
      setLastUpdated(new Date().toLocaleTimeString())
    }
    const startPolling = () => {
      const load = async () => {
        try {
          setStatsLoading(true)
          const parts: string[] = []
          if (companyIds.length) parts.push(`companyId=${encodeURIComponent(companyIds.join(','))}`)
          if (range !== 'all') parts.push(`range=${encodeURIComponent(range)}`)
          const qs = parts.length? `?${parts.join('&')}` : ""
          const res = await fetch(`/api/admin/jobs/stats${qs}`, { cache: 'no-store' })
          if (res.ok) apply(await res.json())
        } finally {
          setStatsLoading(false)
        }
      }
      load()
      timer = setInterval(load, METRICS_POLL_MS)
    }
    // One-shot fetch immediately to populate before SSE
    (async ()=>{
      try {
        const parts: string[] = []
        if (companyIds.length) parts.push(`companyId=${encodeURIComponent(companyIds.join(','))}`)
        if (range !== 'all') parts.push(`range=${encodeURIComponent(range)}`)
        const qs = parts.length? `?${parts.join('&')}` : ""
        const res = await fetch(`/api/admin/jobs/stats${qs}`, { cache: 'no-store' })
        if (res.ok) apply(await res.json())
      } catch {}
    })()
    try {
      const parts: string[] = []
      if (companyIds.length) parts.push(`companyId=${encodeURIComponent(companyIds.join(','))}`)
      if (range !== 'all') parts.push(`range=${encodeURIComponent(range)}`)
      const qs = parts.length? `?${parts.join('&')}` : ""
      es = new EventSource(`/api/admin/jobs/stats/stream${qs}`)
      es.onmessage = (e) => {
        if (!e?.data) return
        try { apply(JSON.parse(e.data)) } catch {}
      }
      es.onerror = () => {
        es?.close()
        es = null
        if (!timer) startPolling()
        setLiveMode('polling')
      }
      setLiveMode('sse')
    } catch {
      startPolling()
      setLiveMode('polling')
    }
    return () => {
      es?.close()
      if (timer) clearInterval(timer)
    }
  }, [companyIds, range])

  // Load companies list for filter panel (and poll every 30s)
  useEffect(()=>{
    let timer: any
    const load = async ()=>{
      try {
        const res = await fetch('/api/admin/jobs/stats/companies', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setCompanies(Array.isArray(data?.companies)? data.companies: [])
        }
      } catch {}
    }
    load()
    timer = setInterval(load, 30000)
    return ()=>{ if (timer) clearInterval(timer) }
  }, [])

  // Keep URL in sync with selection (without scrolling or reload)
  useEffect(()=>{
    if (!pathname) return
    const params = new URLSearchParams(searchParams?.toString() || "")
    if (companyIds.length > 0) {
      params.set('companyId', companyIds.join(','))
    } else {
      params.delete('companyId')
    }
    if (range && range !== 'all') params.set('range', range)
    else params.delete('range')
    if (query) params.set('q', query); else params.delete('q')
    if (status) params.set('status', status); else params.delete('status')
    if (sortBy) params.set('sortBy', sortBy)
    if (sortDir) params.set('sortDir', sortDir)
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyIds, range, query, status, sortBy, sortDir])

  const bulkAction = async (action:'pause'|'close') => {
    const ids = Object.keys(selected).filter((k)=>selected[k])
    if (ids.length===0) return
    setLoading(true)
    try {
      await Promise.all(ids.map(id=>fetch(`/api/admin/jobs/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({action})}).catch(()=>null)))
      setJobs((prev)=>prev.map(j=> ids.includes(j.id||j._id)?{...j, status: action==='pause'?'paused':'closed'}:j))
      setSelected({})
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 md:px-8 pt-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Job Oversight</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={refreshingJobs} onClick={()=>{ void refreshJobs() }}>
            {refreshingJobs ? 'Refreshing…' : 'Refresh Jobs'}
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/admin">Back</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/admin/jobs/new">New Job</Link>
          </Button>
        </div>

      {/* Company Filter + Metrics & Insights */}
      <Card className="rounded-2xl border bg-card">
        <CardHeader className="px-6 pt-6 pb-2">
          <CardTitle className="text-xl flex items-center gap-2">Metrics & Insights {liveMode==='sse' ? (<span className="text-xs px-2 py-0.5 rounded-full bg-green-600/15 text-green-600 border border-green-600/30">Live</span>) : (<span className="text-xs px-2 py-0.5 rounded-full bg-amber-600/15 text-amber-600 border border-amber-600/30">Polling</span>)} <span className="text-xs text-muted-foreground">{lastUpdated ? `• Updated ${lastUpdated}` : ''}</span> <Button size="sm" variant="outline" onClick={()=>{ setLastUpdated(''); /* force immediate refresh */ fetch(`/api/admin/jobs/stats${(companyIds.length||range!=='all')?`?${[companyIds.length?`companyId=${encodeURIComponent(companyIds.join(','))}`:'', (range!=='all')?`range=${encodeURIComponent(range)}`:''].filter(Boolean).join('&')}`:''}`, { cache:'no-store' }).then(r=>r.ok?r.json():null).then(d=>{ if (d){ setCounts(d.counts||{open:0,paused:0,closed:0,today:0}); setTimeseries((d.timeseries||[]).map((r:any)=>({name:r.date,value:r.posted}))); setByStatus((d.byStatus||[]).map((r:any)=>({name:r.status,value:r.count}))); setByCompany((d.byCompany||[]).map((r:any)=>({name:r.company,value:r.count}))); setTotalJobs(Number(d.totalJobs||0)); setHired(Number(d.hired||0)); setLastUpdated(new Date().toLocaleTimeString()); } }) }}>Refresh</Button></CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6 space-y-4">
          {/* Companies list */}
          {companies.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-muted-foreground">Companies {companyIds.length>0 && (<span className="ml-2 text-xs">• Selected {companyIds.length}</span>)}</div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={()=>setCompanyIds([])}>Clear Selection</Button>
                  <Button size="sm" variant="outline" onClick={()=>setCompanyIds([])}>All Companies</Button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {companies.map((c)=> (
                  <button key={c.companyId} onClick={()=>setCompanyIds((prev)=>{
                      const id = c.companyId!=='unknown'?c.companyId: ""
                      if (!id) return []
                      return prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]
                    })}
                    className={`flex items-center gap-2 border rounded-xl p-2 text-left hover:bg-muted ${companyIds.includes(c.companyId)? 'ring-2 ring-primary' : ''}`}>
                    {c.logoUrl? (<img src={c.logoUrl} alt={c.name} className="h-6 w-6 rounded object-cover"/>): (<div className="h-6 w-6 rounded bg-muted" />)}
                    <div>
                      <div className="text-sm font-medium truncate max-w-[10rem]">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.total} jobs · {c.hired} hired</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Range selector */}
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground">Range</div>
            <select className="h-8 px-2 border rounded" value={range} onChange={(e)=>setRange(e.target.value as any)}>
              <option value="all">All</option>
              <option value="24h">Last 24h</option>
              <option value="7d">Last 7d</option>
            </select>
          </div>
          {/* Selected companies pills */}
          {selectedCompanyProfiles.length>0 && (
            <div className="flex flex-wrap gap-2">
              {selectedCompanyProfiles.map((c)=> (
                <span key={c.companyId} className="inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs">
                  {c.logoUrl? (<img src={c.logoUrl} alt={c.name} className="h-4 w-4 rounded"/>): null}
                  <span>{c.name}</span>
                  <button className="ml-1 text-muted-foreground hover:text-foreground" onClick={()=>setCompanyIds(prev=>prev.filter(id=>id!==c.companyId))}>×</button>
                </span>
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
            <div className="rounded-2xl border p-4 bg-background">
              <div className="text-xs text-muted-foreground">Open</div>
              <div className="text-2xl font-semibold">{counts.open}</div>
            </div>
            <div className="rounded-2xl border p-4 bg-background">
              <div className="text-xs text-muted-foreground">Paused</div>
              <div className="text-2xl font-semibold">{counts.paused}</div>
            </div>
            <div className="rounded-2xl border p-4 bg-background">
              <div className="text-xs text-muted-foreground">Closed</div>
              <div className="text-2xl font-semibold">{counts.closed}</div>
            </div>
            <div className="rounded-2xl border p-4 bg-background">
              <div className="text-xs text-muted-foreground">Posted Today</div>
              <div className="text-2xl font-semibold">{counts.today}</div>
            </div>
            <div className="rounded-2xl border p-4 bg-background">
              <div className="text-xs text-muted-foreground">Total Jobs</div>
              <div className="text-2xl font-semibold">{totalJobs}</div>
            </div>
            <div className="rounded-2xl border p-4 bg-background">
              <div className="text-xs text-muted-foreground">Hired</div>
              <div className="text-2xl font-semibold">{hired}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="rounded-2xl border">
              <CardHeader className="px-4 pt-4 pb-2"><CardTitle className="text-base">Jobs Posted Over Time</CardTitle></CardHeader>
              <CardContent className="p-4">
                {!statsLoading && timeseries.length > 0 ? (
                  <CustomChart type="line" data={timeseries} dataKey="value" nameKey="name" height={260} yTickCount={6} softFill themeVariant="neon" xInterval="preserveStartEnd" showLegend showDots />
                ) : (
                  <div className="text-sm text-muted-foreground">No data</div>
                )}
              </CardContent>
            </Card>
            <Card className="rounded-2xl border">
              <CardHeader className="px-4 pt-4 pb-2"><CardTitle className="text-base">Status Distribution</CardTitle></CardHeader>
              <CardContent className="p-4">
                {!statsLoading && byStatus.length > 0 ? (
                  <CustomChart type="bar" data={byStatus} dataKey="value" nameKey="name" height={260} themeVariant="neon" showLegend itemColors={{ open: "#10b981", paused: "#f59e0b", closed: "#ef4444" }} />
                ) : (
                  <div className="text-sm text-muted-foreground">No data</div>
                )}
              </CardContent>
            </Card>
          </div>
          <Card className="rounded-2xl border">
            <CardHeader className="px-4 pt-4 pb-2"><CardTitle className="text-base">Top Companies by Posting</CardTitle></CardHeader>
            <CardContent className="p-4">
              {!statsLoading && byCompany.length > 0 ? (
                <CustomChart type="bar" data={byCompany} dataKey="value" nameKey="name" height={260} themeVariant="neon" />
              ) : (
                <div className="text-sm text-muted-foreground">No data</div>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
      </div>

      <Card className="rounded-2xl border bg-card">
        <CardHeader className="px-6 pt-6 pb-2">
          <CardTitle className="text-xl">Filters & Actions</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="grid grid-cols-12 gap-3 mb-4">
            <div className="col-span-12 md:col-span-6">
              <Label htmlFor="q">Search</Label>
              <Input id="q" placeholder="Search title, company or location" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="col-span-6 md:col-span-3">
              <Label htmlFor="status">Status</Label>
              <select id="status" className="h-10 px-3 border rounded w-full" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All</option>
                <option value="open">Open</option>
                <option value="paused">Paused</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="col-span-6 md:col-span-3">
              <Label>Sort</Label>
              <div className="flex gap-2">
                <select className="h-10 px-3 border rounded w-full" value={sortBy} onChange={(e)=>setSortBy(e.target.value as any)}>
                  <option value="createdAt">Created</option>
                  <option value="title">Title</option>
                  <option value="company">Company</option>
                  <option value="status">Status</option>
                </select>
                <select className="h-10 px-3 border rounded" value={sortDir} onChange={(e)=>setSortDir(e.target.value as any)}>
                  <option value="asc">Asc</option>
                  <option value="desc">Desc</option>
                </select>
              </div>
            </div>
            <div className="col-span-6 md:col-span-3 flex items-end gap-2">
              <Button variant="outline" onClick={() => { setQuery(""); setStatus(""); setPage(1) }}>Reset</Button>
              <select className="h-10 px-3 border rounded" value={limit} onChange={(e)=>{setLimit(parseInt(e.target.value)||10); setPage(1)}}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {/* Bulk actions */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Selected {Object.values(selected).filter(Boolean).length}</span>
              <Button size="sm" variant="outline" disabled={!Object.values(selected).some(Boolean)} onClick={()=>setSelected({})}>Clear Selected</Button>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={!Object.values(selected).some(Boolean)} onClick={()=>bulkAction('pause')}>Pause</Button>
              <Button size="sm" variant="destructive" disabled={!Object.values(selected).some(Boolean)} onClick={()=>bulkAction('close')}>Close</Button>
            </div>
          </div>

          {loading && (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 w-full animate-pulse rounded bg-muted" />
              ))}
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 border rounded p-3">{error}</div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-10 border rounded">No jobs found for this company.</div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 lg:col-span-8 space-y-2">
                <div className="grid grid-cols-12 text-sm font-semibold text-muted-foreground px-2">
                <div className="col-span-4">Title</div>
                <div className="col-span-2">Company</div>
                <div className="col-span-2">Location</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>
              {(serverPaging ? jobs : pageItems).map((j, idx) => {
                const id = j.id || j._id || j.slug || idx
                return (
                  <div key={id} className={`grid grid-cols-12 items-center border rounded px-3 py-2 ${idx % 2 === 0 ? 'bg-muted/20' : ''}`} onClick={()=>setPreview(j)}>
                    <div className="col-span-4">
                      <div className="font-medium truncate flex items-center gap-2">
                        <input type="checkbox" onClick={(e)=>e.stopPropagation()} checked={!!selected[id]} onChange={(e)=>setSelected(s=>({...s,[id]:e.target.checked}))} />
                        <span className="truncate">{j.title || j.name || "Untitled"}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{j.slug || j._id || id}</div>
                    </div>
                    <div className="col-span-2 truncate">{j.company || j.org || "—"}</div>
                    <div className="col-span-2 truncate">{j.location || "—"}</div>
                    <div className="col-span-2">
                      <Badge variant={j.status === 'open' ? 'default' : j.status === 'closed' ? 'destructive' : 'secondary'}>
                        {j.status || 'unknown'}
                      </Badge>
                    </div>
                    <div className="col-span-2 flex justify-end gap-2">
                      <Button asChild size="sm" variant="outline"><Link href={`/dashboard/admin/jobs/${id}`}>Open</Link></Button>
                    </div>
                  </div>
                )
              })}
              </div>
              {/* Preview */}
              <div className="col-span-12 lg:col-span-4">
                <Card className="rounded-2xl border bg-card h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!preview ? (
                      <div className="text-sm text-muted-foreground">Select a job to preview</div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-xl font-semibold">{preview.title || 'Untitled'}</div>
                        <div className="text-sm text-muted-foreground">{preview.company || '—'} • {preview.location || '—'}</div>
                        <div>
                          <Badge variant={preview.status === 'open' ? 'default' : preview.status === 'closed' ? 'destructive' : 'secondary'}>{preview.status || 'unknown'}</Badge>
                        </div>
                        {preview.description && (
                          <p className="text-sm whitespace-pre-wrap">{preview.description}</p>
                        )}
                        <div className="flex gap-2 pt-2">
                          <Button asChild size="sm" variant="outline"><Link href={preview.href || '/dashboard/recruiter/job-descriptions'}>Open</Link></Button>
                          <Button size="sm" variant="outline" onClick={()=>setPreview(null)}>Clear</Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          {/* Pagination */}
          {!loading && !error && filtered.length > 0 && !serverPaging && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">Page {page} of {totalPages}</div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</Button>
                <Button size="sm" variant="outline" disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Next</Button>
              </div>
            </div>
          )}
          {serverPaging && (
            <div className="text-sm text-muted-foreground mt-4">Server paging active • Showing {jobs.length} items · Total {serverTotal ?? '—'}</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
