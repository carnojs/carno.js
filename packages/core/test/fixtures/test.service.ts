import { Service } from '../../src';

@Service()
export class TestService {
  getData() {
    return { message: 'Hello from TestService' };
  }
}
