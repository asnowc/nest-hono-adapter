import { HonoRequest } from "hono/request";
import { NestReq } from "./nest.ts";
import type { ServeStaticOptions } from "hono/serve-static";
import type { Context } from "hono";

export type HonoReq = NestReq & HonoRequest;

export type HonoRes = Omit<Context, "req"> & {
  send(data?: any): void;
};
export interface HonoApplicationExtra {
  useBodyParser(contentType: string, parser: HonoBodyParser): void;

  /**
   * Sets a base directory for public assets.
   * Example `app.useStaticAssets('public', { root: '/' })`
   * @returns {this}
   */
  useStaticAssets(path: string, options: ServeStaticOptions): this;
}

export type HonoBodyParser = (context: HonoRequest) => Promise<any> | any;
