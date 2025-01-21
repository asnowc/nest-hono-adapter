import { Controller, Get, Module, Req, Res } from "@nestjs/common";
import type { HonoResponse } from "nest-hono-adapter";
import type { HonoRequest } from "hono";

@Controller()
class ExampleController {
  @Get("req")
  req(@Req() req: HonoRequest) {
    return {
      query: req.query(),
      params: req.param(),
      headers: req.header("abc"),
    };
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
