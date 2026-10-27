'use client'

import { useId, useRef } from 'react'
import { compressImage } from '@/lib/compressImage'

export type ScrapPhotoItem = {
  id: string
  file: File
  previewUrl: string
}

const MAX_PHOTOS = 3

interface ScrapPhotoUploadProps {
  photos: ScrapPhotoItem[]
  onChange: (photos: ScrapPhotoItem[]) => void
  disabled?: boolean
}

export default function ScrapPhotoUpload({ photos, onChange, disabled }: ScrapPhotoUploadProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const baseId = useId()

  const addFiles = async (fileList: FileList | null) => {
    if (!fileList?.length || disabled) return

    const remaining = MAX_PHOTOS - photos.length
    if (remaining <= 0) return

    const toAdd = Array.from(fileList).slice(0, remaining)
    const next: ScrapPhotoItem[] = [...photos]

    for (const raw of toAdd) {
      if (!raw.type.startsWith('image/')) continue
      const file = await compressImage(raw)
      next.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      })
    }

    onChange(next)
  }

  const removePhoto = (id: string) => {
    const removed = photos.find((p) => p.id === id)
    if (removed) URL.revokeObjectURL(removed.previewUrl)
    onChange(photos.filter((p) => p.id !== id))
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="block font-bold text-[#ff7400] mb-1 text-sm" id={`${baseId}-label`}>
          Scrap photos <span className="font-normal text-gray-500">(optional, max {MAX_PHOTOS})</span>
        </p>
        <p className="text-xs text-gray-500 mb-2">
          Take a photo of your scrap so our team can review before pickup.
        </p>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        disabled={disabled || photos.length >= MAX_PHOTOS}
        onChange={(e) => {
          void addFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        disabled={disabled || photos.length >= MAX_PHOTOS}
        onChange={(e) => {
          void addFiles(e.target.files)
          e.target.value = ''
        }}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || photos.length >= MAX_PHOTOS}
          onClick={() => cameraInputRef.current?.click()}
          className="px-4 py-2.5 rounded-lg border-2 border-[#22c55e] text-[#16a34a] font-bold text-sm hover:bg-[#22c55e]/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Take photo
        </button>
        <button
          type="button"
          disabled={disabled || photos.length >= MAX_PHOTOS}
          onClick={() => galleryInputRef.current?.click()}
          className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-800 font-bold text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          From gallery
        </button>
      </div>

      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2" aria-labelledby={`${baseId}-label`}>
          {photos.map((photo) => (
            <li key={photo.id} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.previewUrl} alt="Scrap preview" className="w-full h-full object-cover" />
              <button
                type="button"
                disabled={disabled}
                onClick={() => removePhoto(photo.id)}
                className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/70 text-white text-sm font-bold hover:bg-black"
                aria-label="Remove photo"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function revokeScrapPhotoUrls(photos: ScrapPhotoItem[]) {
  photos.forEach((p) => URL.revokeObjectURL(p.previewUrl))
}
