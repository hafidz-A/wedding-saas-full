'use client'

import { useCallback, useState } from 'react'
import { uploadFile } from './uploadFile'

export function useUpload(slug: string) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = useCallback(
    async (file: File): Promise<string | null> => {
      setIsUploading(true)
      setError(null)
      try {
        const { url } = await uploadFile(slug, file)
        return url
      } catch (e: any) {
        setError(e?.message || 'Upload failed')
        return null
      } finally {
        setIsUploading(false)
      }
    },
    [slug],
  )

  return { upload, isUploading, error }
}
