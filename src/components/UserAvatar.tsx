import React from 'react';
import { User as UserIcon } from 'lucide-react';
import { User } from '../types';

interface UserAvatarProps {
  user?: Partial<User> | null;
  avatarUrl?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  iconClassName?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  avatarUrl: explicitAvatarUrl,
  name: explicitName,
  size = 'md',
  className = '',
  iconClassName = ''
}) => {
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14 sm:w-16 sm:h-16',
    xl: 'w-16 h-16 sm:w-20 sm:h-20'
  };

  const iconSizes = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7 sm:w-8 sm:h-8',
    xl: 'w-8 h-8 sm:w-10 sm:h-10'
  };

  const rawUrl = explicitAvatarUrl ?? user?.avatarUrl;
  const displayName = explicitName || user?.name || 'User';

  // Per platform policy: Only genuinely uploaded custom assets are shown.
  // Random Unsplash profile placeholders or stock photo URLs are never used as user avatars.
  const isCustomUserUpload = Boolean(
    rawUrl &&
    typeof rawUrl === 'string' &&
    rawUrl.trim() !== '' &&
    !rawUrl.includes('unsplash.com') &&
    !rawUrl.includes('dicebear') &&
    rawUrl !== 'default_person_icon'
  );

  if (isCustomUserUpload) {
    return (
      <img
        src={rawUrl}
        alt={displayName}
        className={`${sizeClasses[size]} rounded-full object-cover border border-neutral-200 dark:border-neutral-700 shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center shrink-0 select-none ${className}`}
      title={displayName}
      aria-label={`${displayName}'s default profile icon`}
    >
      <UserIcon className={`${iconSizes[size]} text-neutral-500 dark:text-neutral-400 stroke-[2] ${iconClassName}`} />
    </div>
  );
};
