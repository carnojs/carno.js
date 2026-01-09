import 'reflect-metadata';
import { Carno, Controller, Get } from '../../packages/core/src';

@Controller('/')
class HealthController {
    @Get()
    health() {
        return "ok";
    }
}

const app = new Carno();
app.controllers([HealthController]);
app.listen(3002);
