import { useParams } from 'react-router-dom';

/**
 * Admin movie create/edit form page — stub.
 * Full implementation pending.
 */
export function AdminMovieFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = id !== undefined;

  return (
    <div>
      <h1>{isEdit ? 'Edit Movie' : 'Add Movie'}</h1>
      <p style={{ color: '#666' }}>Admin feature — implementation pending.</p>
    </div>
  );
}
