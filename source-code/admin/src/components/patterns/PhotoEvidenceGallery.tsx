import { Camera, ImageOff } from 'lucide-react'
import type { EvidencePhoto } from '@/features/operations/collections/types'
import { formatDateTime } from '@/lib/format'

/*
  Evidence chain display (collection doc): agent collection photo → manager
  verification photo → handover photo, side by side with timestamps. First
  use in COL-03; reusable wherever evidence needs showing (complaints etc.).
  Mock build renders placeholder frames — real photos come from Cloudinary.
*/
const CHAIN: EvidencePhoto['label'][] = ['Agent collection photo', 'Manager verification photo', 'Handover photo']

export function PhotoEvidenceGallery({ photos }: { photos: EvidencePhoto[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {CHAIN.map((label) => {
        const photo = photos.find((p) => p.label === label)
        return (
          <figure key={label} className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface">
            <div
              className={
                photo
                  ? 'flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-brand-soft to-surface-sunken text-primary'
                  : 'flex aspect-[4/3] items-center justify-center bg-surface-sunken text-text-disabled'
              }
              role="img"
              aria-label={photo ? `${label}, taken ${formatDateTime(photo.timestamp)}` : `${label} not captured yet`}
            >
              {photo ? <Camera className="size-8" strokeWidth={1.5} /> : <ImageOff className="size-8" strokeWidth={1.5} />}
            </div>
            <figcaption className="px-3 py-2">
              <p className="text-[13px] font-medium text-text">{label}</p>
              {photo ? (
                <p className="tabular text-xs text-text-muted">
                  {formatDateTime(photo.timestamp)} · {photo.takenBy}
                </p>
              ) : (
                <p className="text-xs text-text-muted">Not captured yet</p>
              )}
            </figcaption>
          </figure>
        )
      })}
    </div>
  )
}
