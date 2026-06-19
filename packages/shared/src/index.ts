export type CookieCategory = 'necessary' | 'functional' | 'analytics' | 'marketing' | 'uncategorized';
export type ClassificationSource = 'known_db' | 'name_pattern' | 'domain_heuristic' | 'duration_heuristic' | 'manual' | 'unknown';
export type ClassificationConfidence = 'high' | 'medium' | 'low' | 'none';
export type ScanStatus = 'pending' | 'running' | 'done' | 'failed';
export type ConsentAction = 'accepted' | 'rejected' | 'customized';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CookieCategoryConfig {
  id: CookieCategory;
  label: string;
  description: string;
  required: boolean;
}

export const COOKIE_CATEGORIES: CookieCategoryConfig[] = [
  { id: 'necessary', label: 'Necessary', description: 'Essential cookies required for the website to function properly.', required: true },
  { id: 'functional', label: 'Functional', description: 'Cookies that enable enhanced functionality and personalization.', required: false },
  { id: 'analytics', label: 'Analytics', description: 'Cookies that help us understand how visitors interact with the website.', required: false },
  { id: 'marketing', label: 'Marketing', description: 'Cookies used to deliver personalized advertising and track ad campaigns.', required: false },
  { id: 'uncategorized', label: 'Uncategorized', description: 'Cookies that have not yet been classified.', required: false },
];
