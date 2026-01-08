import {Carno, Controller, Get} from "../../packages/core/src";

@Controller()
class BenchmarkController {
  @Get("/")
  health() {
    return "ok";
  }
}

const app = new Carno({ providers: [BenchmarkController] });
app.listen(3001);
