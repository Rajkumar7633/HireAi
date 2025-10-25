"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  sectionIds: string[]; // ["about","connections","posts","activity"]
  experienceLevel?: string; // to theme accents
  profileId?: string; // persist per-profile in localStorage
};

const levelColor: Record<string, string> = {
  student: "text-blue-700 border-blue-300 bg-blue-50",
  entry: "text-emerald-700 border-emerald-300 bg-emerald-50",
  mid: "text-indigo-700 border-indigo-300 bg-indigo-50",
  senior: "text-purple-700 border-purple-300 bg-purple-50",
  lead: "text-amber-700 border-amber-300 bg-amber-50",
  executive: "text-rose-700 border-rose-300 bg-rose-50",
};

export default function ProfileTabs({ sectionIds, experienceLevel, profileId }: Props) {
  const [active, setActive] = useState(sectionIds[0] || "");
  const obsRef = useRef<IntersectionObserver | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [underline, setUnderline] = useState<{ left: number; width: number }>({ left: 0, width: 0 });
  const theme = useMemo(() => {
    const key = String(experienceLevel || "").toLowerCase();
    return levelColor[key] || "text-slate-700 border-slate-300 bg-white";
  }, [experienceLevel]);

  // restore last tab and scroll
  useEffect(() => {
    try {
      const kTab = `profile:${profileId || 'global'}:lastTab`;
      const kScroll = `profile:${profileId || 'global'}:lastScroll`;
      const last = localStorage.getItem(kTab);
      const y = Number(localStorage.getItem(kScroll) || 0);
      if (last && sectionIds.includes(last)) setActive(last);
      if (y > 0) window.scrollTo({ top: y, behavior: "instant" as any });
    } catch {}
    // also try server prefs
    fetch("/api/social/prefs").then(r=>r.ok?r.json():null).then(j=>{
      if (j && typeof j.lastProfileTab === 'string' && sectionIds.includes(j.lastProfileTab)) setActive(j.lastProfileTab);
      if (j && typeof j.lastProfileScroll === 'number' && j.lastProfileScroll>0) window.scrollTo({ top: j.lastProfileScroll });
    }).catch(()=>{});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (obsRef.current) obsRef.current.disconnect();
    const io = new IntersectionObserver(
      (entries) => {
        // find the one most in view
        let topMost: IntersectionObserverEntry | null = null;
        for (const e of entries) {
          if (!topMost || e.intersectionRatio > (topMost?.intersectionRatio || 0)) {
            topMost = e;
          }
        }
        const id = topMost?.target?.id;
        if (id && sectionIds.includes(id)) {
          setActive(id);
          // update URL hash without scrolling
          try {
            const url = new URL(window.location.href);
            if (url.hash !== `#${id}`) {
              url.hash = id;
              history.replaceState(null, "", url.toString());
              localStorage.setItem(`profile:${profileId || 'global'}:lastTab`, id);
              // persist to server (fire-and-forget)
              fetch('/api/social/prefs', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lastProfileTab: id }) }).catch(()=>{});
            }
          } catch {}
          // update underline
          requestAnimationFrame(() => {
            if (!containerRef.current) return;
            const link = containerRef.current.querySelector<HTMLAnchorElement>(`a[data-tab='${id}']`);
            if (link) {
              const rect = link.getBoundingClientRect();
              const host = containerRef.current.getBoundingClientRect();
              setUnderline({ left: rect.left - host.left, width: rect.width });
            }
          });
        }
      },
      { rootMargin: "-120px 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    obsRef.current = io;
    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [sectionIds.join(",")]);

  // scroll shadow
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop;
      setScrolled(y > 8);
      try {
        localStorage.setItem(`profile:${profileId || 'global'}:lastScroll`, String(y));
        if (y % 100 < 2) fetch('/api/social/prefs', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lastProfileScroll: y }) }).catch(()=>{});
      } catch {}
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const onClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    // set hash immediately so the URL reflects selection
    try {
      const url = new URL(window.location.href);
      if (url.hash !== `#${id}`) {
        url.hash = id;
        history.replaceState(null, "", url.toString());
      }
    } catch {}
    // manual underline update immediately
    if (containerRef.current) {
      const link = containerRef.current.querySelector<HTMLAnchorElement>(`a[data-tab='${id}']`);
      if (link) {
        const rect = link.getBoundingClientRect();
        const host = containerRef.current.getBoundingClientRect();
        setUnderline({ left: rect.left - host.left, width: rect.width });
      }
    }
  };

  // keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End')) {
        const idx = Math.max(0, sectionIds.indexOf(active));
        let nextIdx = idx;
        if (e.key === 'ArrowLeft') nextIdx = Math.max(0, idx - 1);
        if (e.key === 'ArrowRight') nextIdx = Math.min(sectionIds.length - 1, idx + 1);
        if (e.key === 'Home') nextIdx = 0;
        if (e.key === 'End') nextIdx = sectionIds.length - 1;
        const id = sectionIds[nextIdx];
        if (id) {
          const el = document.getElementById(id);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, sectionIds.join(',')]);

  return (
    <div className={`sticky top-14 z-10 ${scrolled ? 'shadow-sm' : ''}`}>
      <div ref={containerRef} className="relative max-w-6xl mx-auto flex gap-2 text-sm px-6 py-2 bg-white/80 backdrop-blur border-b">
        {sectionIds.map((id) => (
          <a
            key={id}
            href={`#${id}`}
            onClick={(e) => onClick(e, id)}
            data-tab={id}
            className={
              "flex items-center gap-1.5 px-3 py-1.5 border rounded hover:bg-slate-50 transition " +
              (active === id ? theme + " shadow-sm" : "bg-white text-slate-700 border-slate-300")
            }
          >
            <span className="opacity-80">
              {id === 'about' ? 'ℹ️' : id === 'connections' ? '👥' : id === 'posts' ? '📝' : '⚡'}
            </span>
            <span>{id.charAt(0).toUpperCase() + id.slice(1)}</span>
          </a>
        ))}
        {/* animated underline */}
        <span
          className="absolute bottom-0 h-0.5 bg-slate-300 transition-all duration-200"
          style={{ left: underline.left, width: underline.width }}
        />
      </div>
    </div>
  );
}
