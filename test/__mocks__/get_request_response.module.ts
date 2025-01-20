import { Module, Controller, Get, Res, Req } from "@nestjs/common";
import type { HonoResponse, HonoRequest } from "@asla/nest-hono-adapter";

@Controller()
class ExampleController {
  @Get("req")
  req(@Req() req: HonoRequest) {
    return req.path;
  }
  @Get("res")
  res(@Res() res: HonoResponse) {
    res.send(res.text("/res"));
  }
  @Get("resNoSend")
  resNoSend(@Res() res: HonoResponse) {}
}

@Module({
  controllers: [ExampleController],
})
export class OnlyGetReqAndResModule {
  constructor() {}
}
