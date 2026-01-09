import { Service } from '@carno.js/core';
import { ConnectionOptions } from 'bullmq';

@Service()
export class ConnectionManagerService {
  private defaultConnection?: ConnectionOptions;

  setDefaultConnection(connection?: ConnectionOptions): void {
    this.defaultConnection = connection;
  }

  getConnection(override?: ConnectionOptions): ConnectionOptions | undefined {
    if (override) {
      return override;
    }

    return this.defaultConnection;
  }

  hasConnection(): boolean {
    return this.defaultConnection !== undefined;
  }
}
