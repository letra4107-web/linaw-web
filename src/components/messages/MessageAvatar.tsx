import { useState } from 'react';
import { savedAvatarUrl } from '../../lib/auth/savedProfiles';
import './message-avatars.css';

export function MessageAvatar({ url, name, className }: { url?: string | null; name: string; className: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const source = savedAvatarUrl(url);
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?';
  return <span className={`${className} message-profile-avatar`} aria-hidden="true">
    {source && source !== failedUrl ? <img src={source} alt="" className="h-full w-full object-cover" onError={() => setFailedUrl(source)} /> : initials}
  </span>;
}
