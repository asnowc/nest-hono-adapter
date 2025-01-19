import { NestFactory } from "@nestjs/core";
import { HonoAdapter, NestHonoApplication } from "@asla/nest-hono-adapter";

export async function createNestHono(AppModule: new (...args: any[]) => any) {
  const adapter = new HonoAdapter();
  return {
    app: await NestFactory.create<NestHonoApplication>(AppModule, adapter),
    adapter,
    hono: adapter.getInstance(),
  };
}
