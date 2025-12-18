'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Bookmark, ChevronDown, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface SavedSearch {
  id: string
  name: string
  query_config: any
  frequency: string
}

interface SavedSearchesDropdownProps {
  onLoadSearch: (config: any) => void
  onNewSearch: () => void
}

export function SavedSearchesDropdown({ onLoadSearch, onNewSearch }: SavedSearchesDropdownProps) {
  const [searches, setSearches] = useState<SavedSearch[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchSavedSearches()
  }, [])

  async function fetchSavedSearches() {
    try {
      setIsLoading(true)
      const res = await fetch('/api/saved-searches')

      // If API doesn't exist yet (404), just return empty array
      if (res.status === 404) {
        setSearches([])
        return
      }

      if (!res.ok) {
        throw new Error('Failed to fetch saved searches')
      }

      const data = await res.json()
      setSearches(data.searches || [])
    } catch (error) {
      console.error('Error fetching saved searches:', error)
      // Silent fail - set empty array
      setSearches([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoadSearch = (search: SavedSearch) => {
    onLoadSearch(search.query_config)
    toast.success(`Loaded "${search.name}"`)
  }

  const canAddMore = searches.length < 3

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full">
          <Bookmark className="h-4 w-4 mr-2" />
          Saved Searches
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-accent-teal" />
          </div>
        ) : searches.length === 0 ? (
          <div className="px-3 py-4 text-center">
            <p className="text-sm text-secondary/70 mb-2">No saved searches yet</p>
            <Button
              onClick={onNewSearch}
              variant="ghost"
              size="sm"
              className="w-full rounded-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Save your first search
            </Button>
          </div>
        ) : (
          <>
            {searches.map((search) => (
              <DropdownMenuItem
                key={search.id}
                onClick={() => handleLoadSearch(search)}
                className="cursor-pointer"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{search.name}</span>
                  <span className="text-xs text-secondary/60">
                    {search.frequency.charAt(0) + search.frequency.slice(1).toLowerCase()}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={onNewSearch}
              disabled={!canAddMore}
              className="cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-2" />
              {canAddMore ? 'Save new search' : 'Maximum 3 saved (upgrade to add more)'}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
