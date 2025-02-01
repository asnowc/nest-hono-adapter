import { NestFactory } from "@nestjs/core";
import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from "@nestjs/common";
import { HonoAdapter, HonoResponse, NestHonoApplication } from "nest-hono-adapter";

export async function createNestHono(AppModule: new (...args: any[]) => any) {
  const adapter = new HonoAdapter();
  const app = await NestFactory.create<NestHonoApplication>(AppModule, adapter, { logger: false });

  // app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(3000);
  return {
    app,
    adapter,
    hono: adapter.getInstance(),
  };
}

@Catch()
class HttpExceptionFilter implements ExceptionFilter {
  constructor() {
  }
  catch(error: HttpException | Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<HonoResponse>();
    if (error instanceof Error) {
      response.status(error instanceof HttpException ? error.getStatus() as any : 500);
      response.send(response.json(error.stack));
    } else {
      response.status(500);
      response.send(response.text(String(error)));
    }
    console.error(error);
  }
}
