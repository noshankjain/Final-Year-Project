import { format } from 'date-fns';

export const formatDate = (date) => {
  if (!date) return '';
  return format(new Date(date), 'MMM dd, yyyy');
};

export const formatPercent = (val, decimals = 1) => {
  if (val === undefined || val === null) return '0%';
  return `${(val * 100).toFixed(decimals)}%`;
};

export const truncateUUID = (uuid) => {
  if (!uuid) return '';
  return uuid.slice(0, 8) + '...';
};

export const formatFeatureName = (key) => {
  if (!key) return '';
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const cn = (...classes) => classes.filter(Boolean).join(' ');
