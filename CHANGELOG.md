### 0.3.0

feat!: @Req() gets Context instead of HonoRequest

```ts
import type { Context } from "hono";

@Controller()
class ExampleController {
  @Get("req")
  req(@Req() ctx: Context) {}
}
```
