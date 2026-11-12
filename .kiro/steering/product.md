---
inclusion: always
---

# Back to the Past — Product

A Kiroween hackathon entry (Resurrection category). Users enter a domain and travel through its history: every year the Internet Archive captured comes back to life, and an AI narrator tells the story of what changed and what died.

## Phase 1 (current scope)

1. **Time-travel slider** — Enter a domain, get one snapshot per year, drag a slider across years. The rendered page crossfades between versions.
2. **Ghost diff + narrator** — Compare two years. Elements that were removed appear as fading "ghosts" over the page; an LLM streams a short, spooky narrative of the changes ("In 2009, the Flash intro died...").

## Later phases (do NOT build yet)

- **Graveyard** — A tombstone per feature the site ever lost, with the years it lived.
- **Resurrect** — Rebuild a chosen year as a working, modern, deployable page.

## Principles

- The archive is the source of truth. Never invent snapshot content; the narrator only describes changes present in the computed diff.
- Snapshots are often broken (missing CSS/images). Degrade gracefully and say so in the UI — never fail silently.
- The demo must work in under 2 minutes: fast first paint, cached responses, a few curated example domains on the landing page.
- Halloween tone in copy and visuals, but the page under inspection stays readable.
