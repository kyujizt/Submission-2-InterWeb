const CONFIG = {
  BASE_URL: 'https://story-api.dicoding.dev/v1',
  CACHE_NAME: 'StoryApp-V1',
  DATABASE_NAME: 'story-app-database',
  DATABASE_VERSION: 1,
  OBJECT_STORE_NAME: 'stories',
  // Push Notification Configuration using Dicoding API
  PUSH_MSG_VAPID_KEY: 'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk',
  PUSH_MSG_SUBSCRIBE_URL: 'https://story-api.dicoding.dev/v1/notifications/subscribe',
  PUSH_MSG_UNSUBSCRIBE_URL: 'https://story-api.dicoding.dev/v1/notifications/subscribe'  // Using DELETE method for unsubscribe
};

export default CONFIG;
