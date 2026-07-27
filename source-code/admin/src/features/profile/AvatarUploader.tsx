import { useRef } from 'react'
import { Camera } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'

const MAX_BYTES = 2 * 1024 * 1024 // 2 MB

/*
  Profile-picture control for the Profile card. Mock build stores the image as a
  data URL via AuthContext.updateAvatar (persisted to localStorage); swaps to a
  Cloudinary upload when the profile backend lands — consumers just read
  user.avatarUrl either way.
*/
export function AvatarUploader() {
  const { user, updateAvatar } = useAuth()
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)

  if (!user) return null

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file after a remove
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast('Please choose an image file', 'danger')
      return
    }
    if (file.size > MAX_BYTES) {
      toast('Image must be 2 MB or smaller', 'danger')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      updateAvatar(reader.result as string)
      toast('Profile picture updated')
    }
    reader.onerror = () => toast('Could not read that image', 'danger')
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <Avatar src={user.avatarUrl} name={user.name} size="lg" />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label="Change profile picture"
          className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border-2 border-surface bg-primary text-white shadow-[var(--shadow-1)] hover:bg-primary-hover"
        >
          <Camera className="size-3.5" strokeWidth={2} />
        </button>
        <input ref={inputRef} type="file" accept="image/*" onChange={onFile} className="sr-only" />
      </div>

      {user.avatarUrl && (
        <button
          type="button"
          onClick={() => {
            updateAvatar(null)
            toast('Profile picture removed')
          }}
          className="text-xs font-medium text-text-muted underline-offset-2 hover:text-danger-fg hover:underline"
        >
          Remove
        </button>
      )}
    </div>
  )
}
