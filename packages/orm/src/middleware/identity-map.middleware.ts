import { CheetahMiddleware, Context, Injectable } from '@cheetah.js/core';
import { identityMapContext } from '../identity-map';

@Injectable()
export class IdentityMapMiddleware implements CheetahMiddleware {
  async handle(ctx: Context, next: () => void): Promise<void> {
    await identityMapContext.run(async () => {
      await next();
    });
  }
}
