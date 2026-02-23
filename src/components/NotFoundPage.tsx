import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>404 — Page Not Found</h1>
      <p>The page you are looking for does not exist.</p>
      <Link to="/">Return to Home</Link>
    </div>
  );
}
