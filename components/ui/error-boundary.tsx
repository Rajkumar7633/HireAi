"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * ErrorBoundary — catches runtime JS errors in any child component tree.
 * Prevents one broken widget from crashing the entire dashboard.
 *
 * @example
 * <ErrorBoundary>
 *   <SomeComplexComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // In production, this is where you'd send to Sentry
    console.error("[ErrorBoundary] Caught error:", error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-red-200 bg-red-50 space-y-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-red-800">Something went wrong</h3>
            <p className="text-sm text-red-600 mt-1 max-w-sm">
              {process.env.NODE_ENV === "development"
                ? this.state.error?.message || "An unexpected error occurred"
                : "An unexpected error occurred. Please try refreshing."}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={this.handleReset}
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="mr-2 h-3 w-3" />
            Try Again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * withErrorBoundary — HOC to wrap any component in an error boundary.
 *
 * @example
 * const SafeChart = withErrorBoundary(AnalyticsChart)
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}
