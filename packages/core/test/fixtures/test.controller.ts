import { Controller, Get } from '../../src';
import { TestService } from './test.service';

@Controller({ path: '/test' })
export class TestController {
  constructor(private readonly testService: TestService) {}

  @Get()
  get() {
    return this.testService.getData();
  }
}
