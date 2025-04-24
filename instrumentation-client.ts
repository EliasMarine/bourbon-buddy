import * as Sentry from '@sentry/nextjs'
// This export will instrument router navigations
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart; 