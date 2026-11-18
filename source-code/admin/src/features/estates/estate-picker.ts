/*
  The estate owner picker on Issue Advance Payment (Estate-Owner-Advances-Addendum §5): every
  estate owner, A–Z by estate name — inactive ones listed but not selectable. Search matches the
  estate name, owner, EST- ID or route, anywhere, case-insensitive (via Combobox's filterOptions).
  Pure; tested in estate-picker.test.ts.
*/

interface PickerEstate {
  id: string
  estateName: string
  ownerName: string
  route: string
}

export const INACTIVE_REASON = "Inactive estates can't receive advances"

/** The option's second line: "K. Perera · EST-0001 · Route 3". */
export const estateOptionMeta = (e: PickerEstate) => `${e.ownerName} · ${e.id} · ${e.route || 'No route'}`

/** What typing matches against. */
export const estateSearchText = (e: PickerEstate) => `${e.estateName} ${e.ownerName} ${e.id} ${e.route}`
