// Backend API response types — shared across features.
// Types that come from the backend contract belong here.
// Feature-specific input/form types belong in each feature's types.ts.

export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  createdAt: string;
}
