import { Carno } from '@carno.js/core';
import { Orm } from './orm';
import { OrmService } from './orm.service';
import { EntityStorage } from './domain/entities';
import { IdentityMapMiddleware } from './middleware/identity-map.middleware';

export const CarnoOrm = new Carno({
  exports: [Orm, OrmService, EntityStorage, IdentityMapMiddleware],
})