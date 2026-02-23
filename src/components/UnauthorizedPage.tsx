import { Link } from 'react-router-dom';

export function UnauthorizedPage() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>403 — Access Denied</h1>
      <p>You do not have permission to view this page.</p>
      <Link to="/">Return to Home</Link>
    </div>
  );
}
