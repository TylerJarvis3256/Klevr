'use client'

import { useCallback, useState } from 'react'
import { Upload, File, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  accept: string
  maxSize: number
  onUpload: (file: File) => Promise<void>
  isUploading: boolean
  className?: string
}

export function FileUpload({ accept, maxSize, onUpload, isUploading, className }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragActive, setIsDragActive] = useState(false)

  const handleFileSelect = useCallback((file: File) => {
    setError(null)

    // Validate file size
    if (file.size > maxSize) {
      setError(`File size must be less than ${maxSize / (1024 * 1024)} MB`)
      return
    }

    setSelectedFile(file)
  }, [maxSize])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleUpload = async () => {
    if (!selectedFile) return

    try {
      setError(null)
      await onUpload(selectedFile)
      setSelectedFile(null)
    } catch (err) {
      setError('Upload failed. Please try again.')
    }
  }

  const handleRemove = () => {
    setSelectedFile(null)
    setError(null)
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
          isDragActive
            ? 'border-accent-teal bg-teal-50'
            : 'border-secondary/30 hover:border-secondary/40',
          isUploading && 'pointer-events-none opacity-50'
        )}
        onClick={() => !isUploading && document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept={accept}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isUploading}
        />

        {selectedFile ? (
          <div className="flex items-center justify-center gap-3">
            <File className="h-8 w-8 text-accent-teal" />
            <div className="text-left">
              <p className="font-medium text-secondary">{selectedFile.name}</p>
              <p className="text-sm text-secondary/70">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            {!isUploading && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemove()
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ) : (
          <>
            <Upload className="mx-auto h-10 w-10 text-secondary/60 mb-3" />
            <p className="text-secondary font-medium">
              {isDragActive ? 'Drop your file here' : 'Drop your file here, or click to browse'}
            </p>
            <p className="text-sm text-secondary/70 mt-1">
              {accept.includes('pdf') && accept.includes('docx') ? 'PDF or DOCX' : accept}, max {maxSize / (1024 * 1024)} MB
            </p>
          </>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-status-error">{error}</p>
      )}

      {/* Upload button */}
      {selectedFile && !isUploading && (
        <Button onClick={handleUpload} className="w-full">
          Upload File
        </Button>
      )}

      {/* Loading state */}
      {isUploading && (
        <div className="flex items-center justify-center gap-2 text-accent-teal">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="font-medium">Uploading...</span>
        </div>
      )}
    </div>
  )
}
