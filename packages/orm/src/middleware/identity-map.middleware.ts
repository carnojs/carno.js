import { CarnoMiddleware, CarnoClosure, Context, Service } from '@carno.js/core';
import { identityMapContext } from '../identity-map';

@Service()
export class IdentityMapMiddleware implements CarnoMiddleware {
  async handle(ctx: Context, next: CarnoClosure): Promise<void> {
    await identityMapContext.run(async () => {
      await next();
    });
  }
}
