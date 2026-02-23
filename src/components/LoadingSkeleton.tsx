interface LoadingSkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
}

const skeletonStyle = {
  background: 'linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%)',
  backgroundSize: '200% 100%',
  animation: 'skeleton-loading 1.5s infinite',
  display: 'block',
} as const;

export function LoadingSkeleton({
  width = '100%',
  height = '1rem',
  borderRadius = '4px',
}: LoadingSkeletonProps) {
  return (
    <span
      aria-hidden="true"
      style={{ ...skeletonStyle, width, height, borderRadius }}
    />
  );
}

export function MovieCardSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading movie"
      style={{
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        overflow: 'hidden',
        padding: '0',
      }}
    >
      <LoadingSkeleton width="100%" height="300px" borderRadius="0" />
      <div style={{ padding: '1rem' }}>
        <LoadingSkeleton width="80%" height="1.25rem" />
        <div style={{ marginTop: '0.5rem' }}>
          <LoadingSkeleton width="40%" height="1rem" />
        </div>
        <div style={{ marginTop: '0.5rem' }}>
          <LoadingSkeleton width="60%" height="1rem" />
        </div>
      </div>
    </div>
  );
}
