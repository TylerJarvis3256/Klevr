'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="bg-white rounded-2xl border border-status-error/20 shadow-card p-12 text-center max-w-md">
            <div className="h-16 w-16 rounded-xl bg-status-error/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-status-error" aria-hidden="true" />
            </div>
            <h2 className="font-lora text-2xl font-semibold text-secondary mb-2">
              Something went wrong
            </h2>
            <p className="text-secondary/70 mb-6">
              We encountered an error while loading this page. Please try refreshing or
              contact support if the problem persists.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left mb-6 p-4 bg-status-error/5 rounded-xl">
                <summary className="text-sm font-medium text-status-error cursor-pointer mb-2">
                  Error details
                </summary>
                <pre className="text-xs text-secondary/70 overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <Button
              onClick={() => window.location.reload()}
              variant="cta"
              className="rounded-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Page
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
