import { afterEach, describe, expect, it, beforeEach } from 'bun:test'
import { Carno, Controller, Get } from '../src';

describe('Carno', () => {
  @Controller()
  class TestController {

    @Get()
    async test() {
      return 'Test'
    }
  }

  let carno: Carno | null

  beforeEach(() => {
    carno = null;
  })

  afterEach(async () => {
    carno?.close(true)
  })

  it('should create a instance of Carno with controller', async () => {
    carno = new Carno({
      providers: [TestController]
    })
    await carno.listen(3000)

    const injector = carno.getInjector()
    const match = injector.router.find('get', '/')
    expect(match).not.toBeNull()
  });

  it('should create a instance of Carno without controller', async () => {
    carno = new Carno()
    await carno.listen(3000)

    const injector = carno.getInjector()
    const match = injector.router.find('get', '/')

    expect(match).toBeNull()
  })

  it('should use a plugin', async () => {
    Controller()(TestController) // Reload the decorator
    const plugin = new Carno({
      exports: [TestController]
    })

    carno = new Carno()
    carno.use(plugin)
    await carno.listen(3000)

    const injector = carno.getInjector()
    const match = injector.router.find('get', '/')

    expect(match).not.toBeNull()
  })
})