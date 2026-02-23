import { Link } from 'react-router-dom';
import { sanitizeText } from '@/utils/sanitize';
import type { CastMember } from '@/types/movie';

interface ActorCardProps {
  cast: CastMember;
}

/**
 * Renders an actor name and character name.
 * Actor name links to internal search — never to external URLs (OWASP A03).
 * All text fields are sanitized with DOMPurify (THR-006).
 */
export function ActorCard({ cast }: ActorCardProps) {
  const actorName = sanitizeText(cast.actorName);
  const characterName = sanitizeText(cast.characterName);

  return (
    <div style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>
      <Link to={`/search?q=${encodeURIComponent(actorName)}`}>{actorName}</Link>
      <span style={{ color: '#666', marginLeft: '0.5rem' }}>as {characterName}</span>
    </div>
  );
}
