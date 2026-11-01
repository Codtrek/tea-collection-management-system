# Estate Owner Advances: Addendum (EST-05 / EST-06)

**Decided:** 2026-11-01
**Status:** §1–2 built (branch `fix/dispatch-fert-payroll`)
**Amends:** EST-05 (the advances list) and EST-06 (Issue Advance Payment), and the sidebar's active-link rule.

## 1. Sidebar and permission

- **Finance order:** Estate Owner Payments → **Estate Owner Advances** (`/estates/advances`) → Payroll → Salary Advances. The URL is unchanged, so existing links still work.
- **Data-driven module `estateAdvances`:** it shows in Users & Roles as "Estate Owner Advances", and the link shows only to roles with `view` on it.
  - **Starting levels:** migration `2026-11-03-estate-advances.sql` seeds each role at its Estate Owner level: Administrator approve, Officer edit, Manager view. Nobody's access changed.
  - **Issue buttons:** every "Issue Advance" button needs `estateAdvances` `edit`. That covers the advances list, the `/estates` primary action and row action, and EST-03.
  - **Server:** it still keeps Managers read-only, as before.
- **Active link = the most specific match** (`components/layout/nav-match.ts` `activeNavTo`). The item that lights is the longest sidebar path the URL equals or sits under. So:
  - `/estates/advances/new` lights Estate Owner Advances, not Estate Owners;
  - `/estates/settlements/:id` lights Estate Owner Payments;
  - record pages (`/employees/EMP-…`, `/fertilizer/<batch>`) light their list's item.

  This replaced the old `end` list and the Agent Dispatch special case.
- **Breadcrumbs:** Home > Estate Owner Advances, then > New on the form.

## 2. Issue Advance flow

- **Where it starts:** "Issue Advance Payment" stays on `/estates` and on `/estates/advances`.
- **From an estate:** the row action on `/estates` and the EST-03 button pre-fill that estate (`?estate=EST-…`) in the shared searchable Combobox. If the pre-filled owner isn't Active, the field says so instead of showing a blank.
- **After submit:** the form goes to `/estates/advances?highlight=EADV-…`, and the new row is tinted.
- **Cancel:** goes back to wherever the form was opened from. A direct link with no in-app history falls back to the list.
