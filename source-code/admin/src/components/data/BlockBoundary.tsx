import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorState } from './ErrorState'

interface Props {
  /** what the block shows, for the message: "Couldn't show {label}" */
  label: string
  /** refetch the data; the boundary also resets itself */
  onRetry?: () => void
  /** the block's data changed (e.g. a refetch landed): try rendering again */
  resetKey?: unknown
  children: ReactNode
}

interface State {
  failed: boolean
  resetKey: unknown
}

/**
 * Keeps one block's failure inside that block: if it throws while rendering, it shows an inline
 * error with Retry and the rest of the page keeps working (Dashboard-Addendum §5).
 */
export class BlockBoundary extends Component<Props, State> {
  state: State = { failed: false, resetKey: this.props.resetKey }

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true }
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    // new data for the block: render it again
    return props.resetKey !== state.resetKey ? { failed: false, resetKey: props.resetKey } : null
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`Dashboard block "${this.props.label}" failed to render`, error, info.componentStack)
  }

  private retry = () => {
    this.setState({ failed: false })
    this.props.onRetry?.()
  }

  render() {
    if (this.state.failed) return <BlockError label={this.props.label} onRetry={this.retry} />
    return this.props.children
  }
}

/** The inline error a block shows — for a render error or a section the server couldn't load. */
export function BlockError({ label, message, onRetry }: { label: string; message?: string; onRetry?: () => void }) {
  return (
    <section role="alert" aria-label={`${label}: error`}>
      <ErrorState
        title={`Couldn't show ${label}`}
        description={message ?? 'Something went wrong in this part of the page. The rest of the page still works.'}
        onRetry={onRetry}
      />
    </section>
  )
}
