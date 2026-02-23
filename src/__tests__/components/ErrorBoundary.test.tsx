import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Component that throws during render
function BrokenComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test render error');
  }
  return <div>Working Component</div>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console.error from ErrorBoundary in tests
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <BrokenComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Working Component')).toBeInTheDocument();
  });

  it('renders generic error message when child throws', () => {
    render(
      <ErrorBoundary>
        <BrokenComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
    expect(screen.getByText('Please try again.')).toBeInTheDocument();
  });

  it('does NOT expose stack traces or component names in error display', () => {
    render(
      <ErrorBoundary>
        <BrokenComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    const content = document.body.textContent ?? '';
    expect(content).not.toContain('Test render error');
    expect(content).not.toContain('BrokenComponent');
    expect(content).not.toContain('stack');
  });

  it('uses role="alert" for accessibility', () => {
    render(
      <ErrorBoundary>
        <BrokenComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback UI</div>}>
        <BrokenComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom fallback UI')).toBeInTheDocument();
  });
});
