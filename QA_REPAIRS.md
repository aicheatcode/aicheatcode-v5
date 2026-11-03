# AICHEATCODE repair verification · 2026-11-02

This update repairs browsing, adaptation and builder flows while retaining the existing visual identity and owner editor.

## Implemented

- Four primary navigation entries: Cari Prompt, Bina Prompt, Panduan and Koleksi Saya. Clean routes retain compatibility with existing hash links and source IDs.
- Catalog results group variants by task. Context and mode remain selectable in prompt details; every source variant remains accessible.
- BM/English search aliases, including caption/kapsyen and restaurant/restoran, plus reviewed metadata for genuine relevant examples.
- Adaptation input and generated builder drafts persist across tabs, navigation and reload. Original prompt records are never changed by adaptation.
- Save personal adaptation separately from bookmark of the original. Personal versions can be exported with their adapted text and source ID.
- Native mobile filter dialog, focus return, keyboard tab navigation, a single scrolling prompt content panel, and a header in document flow.
- The exact owner-supplied information-architecture prompt is added as USER-IA-001. All five brace placeholders have editable fields and BM labels.

## Passed

- `node scripts/test-repaired-flows.mjs`: genuine BM search results; task grouping; variant lookup; adaptation and builder reload; filter restoration; storage failure behavior; both square and brace placeholders; original text remains unchanged.
- `node scripts/test-catalog.mjs`: full catalog, original IDs, deduplication, filters, combined search, pagination, owner overrides/deletion and private extras.
- `node scripts/test-editor.mjs`: original inventory and editor merge/validation regression checks.
- Syntax checks of all changed/new browser JavaScript. `git diff --check`.
- Production build through the Sites build helper; root, catch-all and API routes built successfully.
- Browser: homepage search `caption restoran` returns two genuine tasks with eleven matching variants, including MA-120736.
- Browser: direct load of TASK-052401 with CSV-052492 selects Food business / Working deliverable and retains the exact source record.
- Browser: four adapted input values and output remain identical after switching source/input tabs and after reload. Saved adaptation export contains the filled text and CSV-052492 source ID.
- Browser: ArrowRight selects and focuses the next prompt tab; Escape closes details and returns focus to the opener.
- Browser: builder requires role/task/context, restores all generated fields and output after navigation/reload, and copies the exact output to clipboard.
- Browser: all five USER-IA-001 inputs replace their placeholders without changing the original text.
- Browser: results retain search/context after opening details and browser Back. Guide and privacy navigation work. Anonymous editor access displays the owner-only rejection.
- Browser responsive check in a 390×844 same-origin iframe (375px content width with scrollbar): no horizontal overflow; filters hidden from inline layout; filter dialog stays in viewport, applies a result count and returns focus; prompt tabs use two rows, source remains accessible and content has one scroll region.
- `public/data.json` and `public/prompt-catalog.json` are unchanged from the original checkout. The one owner-supplied addition is stored separately in `public/curated-prompts.json` and uses the existing editor merge path.

## Verification limits

Prompt effectiveness on an AI model, physical handset behavior and authenticated production editor writes were not tested. The browser checks use the managed local preview; a public smoke check follows deployment. Existing audience and editor authentication are preserved.
