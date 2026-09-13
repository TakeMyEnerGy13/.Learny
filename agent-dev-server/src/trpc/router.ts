import { createRouter } from './init';
import { createLearnerRouter } from './routers/learner.router.ts';
import type { createPlatformRouter } from './routers/platform.router';

export function createAppRouter(platformRouter: ReturnType<typeof createPlatformRouter>) {
  return createRouter({
    platform: platformRouter,
    // What Learny remembers about one learner between visits.
    learner: createLearnerRouter(),
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;
