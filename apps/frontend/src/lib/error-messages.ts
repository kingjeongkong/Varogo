export const ERROR_MESSAGES: Record<string, string> = {
  // --- Auth ---
  INVALID_CREDENTIALS: 'Incorrect email or password.',
  EMAIL_ALREADY_IN_USE: 'An account with this email already exists.',
  EMAIL_CONFLICT_OAUTH: 'An account with this email already exists. Please log in with your email and password.',
  NOT_AUTHENTICATED: 'Please log in to continue.',
  INVALID_TOKEN: 'Your session has expired. Please log in again.',
  MISSING_REFRESH_TOKEN: 'Your session has expired. Please log in again.',
  INVALID_REFRESH_TOKEN: 'Your session has expired. Please log in again.',
  USER_NOT_FOUND: 'Your session has expired. Please log in again.',
  INVALID_RESET_TOKEN: 'This reset link is invalid or has expired.',

  // --- Products ---
  PRODUCT_NOT_FOUND: 'Product not found.',
  PRODUCT_ANALYSIS_FAILED: 'Analysis failed. Please try again.',

  // --- Voice Profile ---
  VOICE_EXTRACTION_FAILED: 'Voice profile extraction failed. Please try again.',
  VOICE_PROFILE_REQUIRED: 'Please set up your voice profile before generating posts.',
  VOICE_UNITS_INSUFFICIENT: 'Not enough Threads posts to build a voice profile.',

  // --- Threads ---
  THREADS_TOKEN_EXCHANGE_FAILED: 'Failed to connect Threads account. Please try again.',
  THREADS_LONG_LIVED_TOKEN_FAILED: 'Failed to connect Threads account. Please try again.',
  THREADS_PROFILE_FETCH_FAILED: 'Failed to fetch Threads profile. Please try again.',
  THREADS_OAUTH_STATE_EXPIRED: 'Connection request expired. Please try again.',
  THREADS_INVALID_OAUTH_STATE: 'Invalid connection request. Please try again.',
  THREADS_TOKEN_REFRESH_FAILED: 'Your Threads connection has expired. Please reconnect your account.',
  THREADS_TOKEN_EXPIRED: 'Your Threads connection has expired. Please reconnect your account.',
  THREADS_POSTS_FETCH_FAILED: 'Failed to fetch Threads posts. Please try again.',
  THREADS_PUBLISH_TIMEOUT: 'Threads is taking longer than usual. Please try again in a moment.',
  THREADS_PUBLISH_CONTAINER_FAILED: 'Failed to prepare post for Threads. Please try again.',
  THREADS_PUBLISH_FAILED: 'Failed to publish to Threads. Please try again.',
  THREADS_POST_CONTENT_REJECTED: 'Threads rejected the post content. Please try again.',
  THREADS_POST_EXPIRED: 'The post expired before publishing. Please try again.',
  THREADS_CONNECTION_NOT_FOUND: 'Threads account not connected.',
  THREADS_API_ERROR: 'Threads API returned an error. Please try again.',
  THREADS_KEYWORDS_FAILED: 'Failed to generate keywords. Please try again.',

  // --- Post Draft ---
  POST_DRAFT_NOT_FOUND: 'Post draft not found.',
  POST_DRAFT_ALREADY_PUBLISHED: 'This post has already been published.',
  POST_DRAFT_INVALID_OPTION: 'Invalid option selected.',
  POST_DRAFT_NO_OPTION_SELECTED: 'Please select an option before publishing.',
  POST_DRAFT_PUBLISH_CONFLICT: 'This post is already being published. Please refresh.',
};
