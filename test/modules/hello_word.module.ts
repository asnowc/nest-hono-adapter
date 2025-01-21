import { Module, Controller, Get } from "@nestjs/common";

@Controller()
class TestController {
  @Get("hi")
  method() {
    return "hello word";
  }
}
@Module({ controllers: [TestController] })
export class AppModule {}
