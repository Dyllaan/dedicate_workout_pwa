# Workout Service Professionalization

**Date:** 2026-07-17
**Status:** Approved
**Approach:** Balanced Professionalization (Approach 2)

## Goal

Improve code quality across the workout service by eliminating redundancy, fixing coupling issues, closing test gaps, and hardening against edge cases. No new features are implemented in this phase; viable feature ideas are noted for future consideration.

## Non-Goals

- Package restructuring (dao/ rename, DTO package flattening, analysis package consolidation)
- New user-facing features
- Schema redesign
- Breaking API changes

## Sections

1. **Redundancy Elimination** — PaginationUtils, @CurrentUserId, strip @Autowired
2. **Coupling Fixes** — Rename DAO→DtoConvertible, extract toDTO() into mappers (Option A: service pre-loads)
3. **Bug Fixes & Hardening** — Cache key collision, N+1, no-op endpoint, spurious null check, @Version locking, date parsing
4. **Repository Consolidation** — Extract analysis repo, slim main repo (30+ → ~12 methods)
5. **Consistency Pass** — FetchType, timestamps, @Autowired
6. **Test Gap Closure** — P1 algorithms, P2 PresetFactory, P3 periodisation, P4 lightweight services
7. **Feature Ideas (Noted)** — Personal Records, Streaks, Exercise Alternatives, Volume Trends, Readiness Trends, Template Suggestions

## Execution Order

1. Sections 1, 3, 5 in parallel (independent, low-risk)
2. Task 8 (@Version) MUST complete before Tasks 12-14 (mapper extraction)
3. Section 2 after @Version migration (stable entity fields)
4. Section 4 after mappers (fewer call sites)
5. Section 6 alongside all sections

## Rollback Strategy

All changes are additive or surgically contained. Each item is independently reversible via git revert.
