# Legacy Widget Rebuild Inventory

> **Status:** Discovery complete — backlog not yet started.
> **Compiled:** 2026-06-17 (session handoff doc — pick up here in a future session).
> **Purpose:** Inventory every legacy Perimeter widget, identify the canonical source to rebuild from, and track the perimeter-api backend work each rebuild needs in the new `perimeter-widgets` architecture.

## TL;DR

- The **canonical rebuild backlog is the 9 widgets in the `reactwidgets` repo** (the newest generation). All older repos are superseded or examples.
- The **`sermons` widget is already shipped** (`sermons@1.4.2`) and replaces every legacy sermon/audio widget.
- The real gating factor per widget is **perimeter-api backend readiness** — the new architecture forbids direct MinistryPlatform (MP) stored-proc calls; every widget must be backed by a perimeter-api endpoint (`@perimeter/api-client` + `api-hooks`), like sermons.
- Open product decisions: **GroupFinder** (likely a yes — high traffic, no React version) and the **MyWeek / MyFamilyEvents / MilestoneGamification / ParishProgress** cluster.

## Source repos (GitHub `perimeterchurch`)

| Repo | Generation / tech | Last push | Role | Disposition |
|---|---|---|---|---|
| `CustomWidgets` | MP toolkit + webpack | 2025-11 | Successor collection | Reference only |
| `customwidgetscode` | Turborepo refactor (HTML) | 2026-05 | Most recent *legacy* refactor | Reference only |
| `widgets` (`/liquid/sermons`) | Liquid templates | 2025-11 | Sermons liquid | Superseded by `sermons` |
| **`reactwidgets`** | **React/TS (Vite, Turbo)** | **2026-03** | **First React generation** | **CANONICAL rebuild source** |
| `widget-css` | raw CSS/HTML for MP webforms | 2026-01 | Styling assets | Reference only |

## Data-source patterns in `reactwidgets`

Two patterns exist today; **both must become perimeter-api calls** on rebuild:

1. **MPFetch + stored proc** — legacy `ministryplatform-fetch` lib calling MP custom-API stored procs directly. (7 widgets)
2. **`api.perimeter.org` REST** — already hits perimeter-api (sometimes via stale/old paths). (EventDetails, FrontierPledge)

`requireUser: true` widgets need the authenticated user-token-forwarding path (same as the BFF pattern in helpdesk/metrics).

---

## Part 1 — Canonical rebuild backlog (9 widgets)

Priority order is driven by backend readiness (build the cheap, already-backed ones first; greenfield API domains last).

### Backend-readiness legend
- ✅ endpoint exists
- ⚠️ domain/system exists in perimeter-api but the specific route is missing
- ❌ no domain yet — greenfield perimeter-api work

### 1. EventDetails — **Priority 1 (Low lift)**
- **Does:** Single event detail page rendered by event ID.
- **Auth:** public.
- **Legacy source:** `EventDetails/src/actions.ts` → `GET api.perimeter.org/mp/events/details/:id` (stale path).
- **perimeter-api:** ✅ `events/[id]` exists (`api/(authenticated)/events/[id]`).
- **Checklist:**
  - [ ] Confirm `events/[id]` returns the fields the widget renders (compare to legacy `types.ts`)
  - [ ] Add public variant or confirm auth requirement for embed context
  - [ ] Add `getEventDetails` to `@perimeter/api-client` + regen `api-hooks`
  - [ ] Scaffold widget via `pnpm create-widget`, port `Widget.tsx` + CSS
  - [ ] Tests + release

### 2. FrontierPledge — **Priority 2 (Low–Med lift)**
- **Does:** Pledge-entry form for a campaign. Lives on perimeter.org/my-perimeter. POSTs name/spouse/contact/pledge.
- **Auth:** public POST (uses `x-access: perimeter/frontierPledge` header today).
- **Legacy source:** `FrontierPledge/src/actions.ts` → `POST /giving/campaigns/frontier/pledge`.
- **perimeter-api:** ⚠️ giving system + `giving/pledges` (public) exist; **campaign-pledge POST route likely needs adding/confirming**.
- **Checklist:**
  - [ ] Verify whether `/giving/campaigns/frontier/pledge` exists or map to `giving/pledges`
  - [ ] Confirm pledge payload shape + notes-string formatting (legacy builds a multi-line `notes` field)
  - [ ] Decide auth/header model in new architecture (replace `x-access`)
  - [ ] api-client + api-hooks
  - [ ] Scaffold, port form components (contactSection, pledgeForm, submittedModal), tests, release

### 3. EventFinder — **Priority 3 (Med lift)**
- **Does:** Filterable/searchable event list with per-event add-to-calendar buttons.
- **Auth:** public (requires params).
- **Legacy source:** MP stored proc `api_custom_Event_Finder`.
- **perimeter-api:** ⚠️ events system exists, **no finder/list/search route**.
- **Checklist:**
  - [ ] Design events list/search endpoint (port `api_custom_Event_Finder` query + params)
  - [ ] Verify columns against live MP schema (use mp-explorer)
  - [ ] api-client + api-hooks
  - [ ] Scaffold; port EventList / EventCard / CalendarButton components
  - [ ] Note: legacy CalendarButton is a sub-component — reusable for AddToCalendar retirement
  - [ ] Tests, release

### 4. MyGivingHistory — **Priority 4 (Med lift, user-auth)**
- **Does:** Chart + table of a household's donations; filters; CSV download.
- **Auth:** **user** (`requireUser: true`).
- **Legacy source:** MP stored proc `api_custom_My_Giving_History_Widget`.
- **perimeter-api:** ❌ giving system exists, **no giving-history route**.
- **Checklist:**
  - [ ] Build authenticated giving-history endpoint (household-scoped, token-forwarded)
  - [ ] Port SP logic; verify columns vs live schema
  - [ ] api-client + api-hooks (authenticated path)
  - [ ] Scaffold; port Chart (+ tooltip), Table, Filters, DownloadButton (CSV)
  - [ ] Tests, release

### 5. MyShepherds — **Priority 5 (Med lift, user-auth)**
- **Does:** Shows the logged-in user's currently assigned shepherds/elders. Lives on perimeter.org.
- **Auth:** **user** (`requireUser: true`).
- **Legacy source:** MP stored proc `api_custom_My_Elder_Widget`.
- **perimeter-api:** ❌ **no elder/shepherd domain**.
- **Note:** Distinct from the separate `shepherding/` platform rebuild — this is a read-only perimeter.org website widget, not part of that app.
- **Checklist:**
  - [ ] Build authenticated shepherds/elders endpoint (port `api_custom_My_Elder_Widget`)
  - [ ] Verify MP elder-assignment tables/columns vs live schema
  - [ ] api-client + api-hooks (authenticated)
  - [ ] Scaffold; port ElderCard
  - [ ] Tests, release

### 6. Staff — **Priority 6 (Med lift)**
- **Does:** ELT + EMT leadership sections + searchable staff directory grouped by department. (Has a hardcoded special-case for Employee_ID 41 / Ryan Carson.)
- **Auth:** public.
- **Legacy source:** MP stored proc `api_custom_Staff_Widget` with `@ELT=1` / `@EMT=1` / search params.
- **perimeter-api:** ❌ **no staff domain**.
- **Checklist:**
  - [ ] Build staff endpoint(s) supporting ELT / EMT / search modes (port SP + params)
  - [ ] Decide whether to keep or relocate the Ryan Carson hardcode (department override) — ideally data-driven
  - [ ] Verify columns vs live schema
  - [ ] api-client + api-hooks
  - [ ] Scaffold; port ELTSection, EMTSection, StaffSection/List/Item, SearchBar
  - [ ] Tests, release

### 7. MissionTripFinder — **Priority 7 (Med lift, greenfield domain)**
- **Does:** Public list of open mission trips.
- **Auth:** public.
- **Legacy source:** MP stored proc `api_custom_Mission_Trip_Finder_Widget`.
- **perimeter-api:** ❌ **no missions domain** (build the missions system here — shared with MyMissions).
- **Checklist:**
  - [ ] Stand up missions system/domain in perimeter-api
  - [ ] Build mission-trip-finder endpoint
  - [ ] Verify MP mission-trip tables/columns vs live schema
  - [ ] api-client + api-hooks
  - [ ] Scaffold; port MissionTrip / TripList components
  - [ ] Tests, release

### 8. MyMissions — **Priority 8 (High lift, user-auth, greenfield domain)**
- **Does:** The logged-in user's mission trips — status, fundraising/donation progress, **support-letter rich-text editor**, leader section, participant tables, collapsible accordion. **Largest/most complex widget.**
- **Auth:** **user** (`requireUser: true`).
- **Legacy source:** MP stored proc `api_custom_MyMissionTrips_Current` (note: legacy `MyMissionTripsPast` exists separately — confirm whether past trips are in scope).
- **perimeter-api:** ❌ **no missions domain** (reuses the missions system from #7; needs auth + several write paths likely).
- **Checklist:**
  - [ ] Extend missions system with authenticated my-trips endpoint(s)
  - [ ] Determine letter-editor persistence: does it POST a support letter? Find the write endpoint/SP
  - [ ] Determine donation-section data source (overlaps giving domain)
  - [ ] Decide current-vs-past trips scope (legacy had two SPs)
  - [ ] api-client + api-hooks (authenticated, possibly mutations)
  - [ ] Scaffold; port the full component tree: tripsAccordion, tripContainer, status/description/donation/leader/letter sections, LetterEditor (rich text)
  - [ ] Tests, release

### 9. CheckInDashboard — **Priority (separate track — Med lift, greenfield)**
- **Does:** Room/check-in counts dashboard (the floor-TV style display). Has its own column-label plural mapping + color utils.
- **Auth:** public.
- **Legacy source:** MP stored proc `api_custom_Check_In_Dashboard`.
- **perimeter-api:** ❌ **no check-in domain**.
- **Note:** This is more of an internal/display dashboard than a public site widget — confirm it still has a home (and relationship to `floormapbuilder`) before investing.
- **Checklist:**
  - [ ] Confirm still in use / has a deploy target
  - [ ] Build check-in dashboard endpoint (port `api_custom_Check_In_Dashboard`)
  - [ ] Verify columns vs live schema
  - [ ] api-client + api-hooks
  - [ ] Scaffold; port RoomList + colors/format utils
  - [ ] Tests, release

### Backend work grouped by perimeter-api domain
| Domain | Widgets | State |
|---|---|---|
| Events | EventDetails, EventFinder | partial (detail ✅, finder ⚠️) |
| Giving | FrontierPledge, MyGivingHistory | partial (system ✅, routes ⚠️/❌) |
| **Missions** | MissionTripFinder, MyMissions | **greenfield** |
| Staff | Staff | greenfield |
| Shepherds/Elders | MyShepherds | greenfield |
| Check-in | CheckInDashboard | greenfield |

---

## Part 2 — Older / utility widgets (triage)

From `CustomWidgets` / `customwidgetscode`. Categorized:

### Retire — superseded by a Part-1 rebuild or the shipped sermons widget
- Sermon/audio: `SermonFinder`, `SermonDetails`, `SermonSeriesFinder`, `AudioFinder`, `AudioSeriesFinder` → **sermons** widget
- HTML versions of: `EventFinder`, `StaffWidget`, `MyShepherds` → React versions
- Missions HTML: `MissionTripFinder`, `MissionTripDetail(s)`, `MissionTripParticipantDetail`, `MyMissionTripsCurrent`/`Past` → MissionTripFinder + MyMissions

### Retire — pure examples / scaffolding (never production widgets)
- `WidgetTemplate`, `react-widget-template`, `ChartJS`, `FullCalendar`, `CustomAuth`, `PublicationWidgets` (toolkit demos; several have copy-pasted/placeholder READMEs)

### DECIDE — genuine widgets with no React equivalent (need product call)
| Widget | Purpose | Open question |
|---|---|---|
| `GroupFinder` | Filterable group finder (custom cards/ribbons, dynamic tags) | **Likely rebuild** — high traffic, no React version. Confirm + prioritize |
| `MyWeek` | Next week's events across the user's whole household | Keep? |
| `MyFamilyEvents` | Household/family event list (README mislabeled) | Overlaps MyWeek — consolidate? |
| `MilestoneGamification` | Journey milestones + per-user achievement check | Keep? |
| `ParishProgress` | Pledge-campaign progress by congregation/campus | Fold into giving-domain rebuild? |
| `AddToCalendar` | Add-to-calendar button (Sky event data) | Already a sub-component in EventFinder — retire standalone? |
| `ViewMessageInBrowser` | Email "view in browser" page | Utility, not a site widget — likely retire |
| `widget-css` extras: `prayer-wall`, `checkout-rush`, `opportunity-details`, `publicdonors` | Raw MP-webform widgets | Likely retire or fold into existing domains |

---

## Next-session starting point

1. Confirm the **GroupFinder + MyWeek/MyFamilyEvents/MilestoneGamification/ParishProgress** decisions (Part 2 "DECIDE").
2. Start with **EventDetails** (Priority 1) to validate the end-to-end rebuild flow against an already-backed endpoint.
3. For each greenfield domain (Missions, Staff, Shepherds, Check-in): use **mp-explorer** to inspect the stored procs / underlying MP tables before designing the perimeter-api endpoint, and **verify columns against the live schema**.
4. Follow the `creating-a-widget` skill for the actual scaffold → endpoint → api-hooks → style → test → release loop.

### Reference: legacy stored procs (data-source map)
| Widget | Stored proc / route | requireUser |
|---|---|---|
| CheckInDashboard | `api_custom_Check_In_Dashboard` | false |
| EventFinder | `api_custom_Event_Finder` (params) | false |
| MissionTripFinder | `api_custom_Mission_Trip_Finder_Widget` | false |
| MyGivingHistory | `api_custom_My_Giving_History_Widget` | **true** |
| MyMissions | `api_custom_MyMissionTrips_Current` | **true** |
| MyShepherds | `api_custom_My_Elder_Widget` | **true** |
| Staff | `api_custom_Staff_Widget` (`@ELT`/`@EMT`/search) | false |
| EventDetails | REST `api.perimeter.org/mp/events/details/:id` | false |
| FrontierPledge | REST `POST /giving/campaigns/frontier/pledge` | false (POST) |

## Stored procs to locate in the database

All MP custom-API procs are in the `dbo` schema: `[dbo].[api_custom_...]`. EventDetails and FrontierPledge use perimeter-api REST routes, not direct procs.

### Rebuild targets — only 3 require DB extraction; 4 have committed source
| Widget | Stored proc | DB action | Committed source body |
|---|---|---|---|
| EventFinder | `api_custom_Event_Finder` | **extract from DB** | none |
| MyGivingHistory | `api_custom_My_Giving_History_Widget` | **extract from DB** | none |
| CheckInDashboard | `api_custom_Check_In_Dashboard` | **extract from DB** | none |
| MissionTripFinder | `api_custom_Mission_Trip_Finder_Widget` | verify vs DB | `customwidgetscode/widgets/MissionTripFinder/StoredProc/` |
| MyShepherds | `api_custom_My_Elder_Widget` | verify vs DB | `customwidgetscode/widgets/MyShepherds/StoredProc/` |
| Staff | `api_custom_Staff_Widget` | verify vs DB | `customwidgetscode/widgets/StaffWidget/StoredProc/` |
| MyMissions | `api_custom_MyMissionTrips_Current` | verify vs DB | `reactwidgets/widgets/MyMissions/api_custom_MyMissionTrips_Current.sql` |

> Committed bodies can drift from the live DB — always diff against the running proc before porting.

### ⚠️ Naming collisions to resolve in the DB
- **Staff:** canonical = `api_custom_Staff_Widget`; legacy toolkit also has `api_custom_StaffWidget` (no underscores) — two distinct procs. Confirm which the live widget uses.
- **MyMissions:** reactwidgets uses `api_custom_MyMissionTrips_Current`; legacy `customwidgetscode` Current/Past widgets use `api_custom_MyMissionTrips_Current_Copy`. Confirm authoritative one before porting.

### Procs behind Part-2 DECIDE widgets (only if rebuilt; bodies committed in `CustomWidgets/Widgets/<widget>/`)
| Widget | Stored proc |
|---|---|
| GroupFinder | `api_custom_GroupWidget` |
| MyWeek | `api_custom_MyWeekWidget` |
| MyFamilyEvents | `api_custom_MyFamilyEvents` |
| MilestoneGamification | `api_custom_MilestoneGamification` |
| ParishProgress | `api_custom_CampaignProgress` |

### Sermons (already shipped — DO NOT rebuild, listed for reference)
`api_custom_Sermon_Finder_Widget`, `api_custom_Sermon_Series_Finder_Widget`, `api_custom_Sermon_Detail_Widget`, `api_custom_Audio_Finder_Widget` — superseded by the live `sermons` widget.

> The "latest card" output of `api_custom_Sermon_Series_Finder_Widget` is **not** covered by the sermons browse widget. It is being rebuilt as a separate small **Latest Sermon** card, already backed by the `GET /api/sermons/latest` endpoint (`getLatestSundaySermon`, api PR #163). See [`latest-sermon.md`](latest-sermon.md).

## Full per-repo widget → stored-proc inventory

Every widget in each live source repo with the stored proc(s) it calls. (`MPCustomWidgets` is excluded — it is initial-design framework templates, not in use.) `api_customWidget` references are the core `customWidget.js` runtime, not a real proc, and are omitted.

### `reactwidgets` — canonical rebuild source (newest)
| Widget | Stored proc(s) | Notes |
|---|---|---|
| CheckInDashboard | `api_custom_Check_In_Dashboard` | |
| EventDetails | _none_ | REST → perimeter-api `events/[id]` |
| EventFinder | `api_custom_Event_Finder` | |
| FrontierPledge | _none_ | REST → perimeter-api giving |
| MissionTripFinder | `api_custom_Mission_Trip_Finder_Widget` | |
| MyGivingHistory | `api_custom_My_Giving_History_Widget` | user-auth |
| MyMissions | `api_custom_MyMissionTrips_Current` | user-auth |
| MyShepherds | `api_custom_My_Elder_Widget` | user-auth |
| Staff | `api_custom_Staff_Widget` | `@ELT`/`@EMT`/search params |

### `customwidgetscode` — legacy refactor (superseded by reactwidgets / sermons)
| Widget | Stored proc(s) | Notes |
|---|---|---|
| AudioFinder | `api_custom_Sermon_Finder_Widget` | → shipped sermons |
| AudioSeriesFinder | `api_custom_Sermon_Series_Finder_Widget` | → shipped sermons |
| EventFinder | `api_custom_Event_Finder` | dup of reactwidgets |
| MissionTripDetail | `api_custom_Mission_Trip_Detail_Widget` | |
| MissionTripFinder | `api_custom_Mission_Trip_Finder_Widget` | dup |
| MissionTripParticipantDetail | `api_custom_Mission_Trip_Participant_Detail_Widget` | |
| MyMissionTripsCurrent | `api_custom_MyMissionTrips_Current_Copy` | ⚠️ `_Copy` variant |
| MyMissionTripsPast | `api_custom_MyMissionTrips_Current_Copy` | ⚠️ same proc as Current |
| MyShepherds | `api_custom_My_Elder_Widget` | dup |
| SermonDetails | `api_custom_Sermon_Detail_Widget` | → shipped sermons |
| SermonFinder | `api_custom_Sermon_Finder_Widget` | → shipped sermons |
| SermonSeriesFinder | `api_custom_Sermon_Series_Finder_Widget` | → shipped sermons |
| StaffWidget | `api_custom_Staff_Widget` | dup |

### `CustomWidgets` — MP toolkit demos/examples
| Widget | Stored proc(s) | Notes |
|---|---|---|
| AddToCalendar | _none_ | Sky/Calendar API; sub-component in EventFinder |
| ChartJS | `api_custom_Dashboard` | demo only |
| CustomAuth | `api_custom_GroupWidget` | demo (borrows GroupFinder proc) |
| FullCalendar | _none_ | Sky/Calendar API; demo |
| GroupFinder | `api_custom_GroupWidget` | DECIDE — likely rebuild |
| MilestoneGamification | `api_custom_MilestoneGamification` | DECIDE |
| MyFamilyEvents | `api_custom_MyFamilyEvents` | DECIDE |
| MyMissionTrips | `api_custom_MyMissionTrips` | older missions demo |
| MyWeek | `api_custom_MyWeekWidget` | DECIDE |
| ParishProgress | `api_custom_CampaignProgress` | DECIDE |
| PublicationWidgets | `api_custom_Publication_Messages` | demo |
| Staff | `api_custom_StaffWidget` | ⚠️ no-underscore variant of `Staff_Widget` |
| ViewMessageInBrowser | `api_custom_BrowserCommunication` | email utility |
| WidgetTemplate | `api_custom_GroupWidget` | scaffold template |

### MyMissionTrips proc lineage (untangle in DB)
Three variants exist across repos — confirm which is authoritative before porting MyMissions:
- `api_custom_MyMissionTrips` (CustomWidgets demo)
- `api_custom_MyMissionTrips_Current` (reactwidgets MyMissions — canonical)
- `api_custom_MyMissionTrips_Current_Copy` (customwidgetscode Current/Past)
