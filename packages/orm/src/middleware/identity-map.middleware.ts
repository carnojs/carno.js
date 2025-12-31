import { CarnoMiddleware, Context, Injectable } from '@carno.js/core';
import { identityMapContext } from '../identity-map';

@Injectable()
export class IdentityMapMiddleware implements CarnoMiddleware {
  async handle(ctx: Context, next: () => void): Promise<void> {
    await identityMapContext.run(async () => {
      await next();
    });
  }
}
