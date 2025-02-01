import type { Context, Env, Hono, Next, Schema } from "hono";

import type { ServeStaticOptions } from "hono/serve-static";
import { bodyLimit as bodyLimitMid } from "hono/body-limit";
import { cors } from "hono/cors";
import type { RedirectStatusCode, StatusCode } from "hono/utils/http-status";

import { RequestMethod } from "@nestjs/common";
import type { ErrorHandler, RequestHandler } from "@nestjs/common/interfaces";
import { AbstractHttpAdapter } from "@nestjs/core/adapters/http-adapter.js";

import type { BlankEnv, BlankSchema } from "hono/types";
import type { NestHandler, NestHttpServerRequired } from "./_nest.ts";
import { createHonoReq, createHonoRes, InternalHonoReq, InternalHonoRes, sendResult } from "./_util.ts";
import type { HonoApplicationExtra, HonoBodyParser } from "./hono.impl.ts";
import type { CorsOptions, CorsOptionsDelegate } from "@nestjs/common/interfaces/external/cors-options.interface.js";

export type CORSOptions = Partial<NonNullable<Parameters<typeof cors>[0]>>;

const NEST_HEADERS = Symbol("nest_headers");

type NestHonoHandler = NestHandler<InternalHonoReq, InternalHonoRes>;

export interface HonoRouterAdapter<
  E extends Env = BlankEnv,
  S extends Schema = BlankSchema,
  BasePath extends string = "/",
> extends AbstractHttpAdapter<NestHttpServerRequired, InternalHonoReq, InternalHonoRes> {
  getInstance(): Hono<E, S, BasePath>;
  getInstance<T = any>(): T;
}

export abstract class HonoRouterAdapter
  extends AbstractHttpAdapter<NestHttpServerRequired, InternalHonoReq, InternalHonoRes>
  implements HonoApplicationExtra {
  declare protected readonly instance: Hono;
  declare protected httpServer: NestHttpServerRequired;

  private createRouteHandler(routeHandler: NestHonoHandler) {
    return async (ctx: Context, next?: Next): Promise<Response> => {
      const nestHeaders: Record<string, string> = {};
      Reflect.set(ctx, NEST_HEADERS, nestHeaders);
      let body: any;
      const contentType = ctx.req.header("Content-Type");
      if (contentType) {
        const parser = this.#bodyParsers.get(contentType);
        if (parser) body = await parser(ctx.req);
      }
      await routeHandler(
        createHonoReq(ctx, { body, params: ctx.req.param(), rawBody: undefined }),
        createHonoRes(ctx),
        next,
      );
      return sendResult(ctx, nestHeaders);
    };
  }

  /**
   * Router
   */
  override all(handler: NestHonoHandler): void;
  override all(path: string, handler: NestHonoHandler): void;
  override all(pathOrHandler: string | NestHonoHandler, handler?: NestHonoHandler) {
    const [routePath, routeHandler] = getRouteAndHandler(pathOrHandler, handler);
    this.instance.all(routePath, this.createRouteHandler(routeHandler));
  }
  override get(pathOrHandler: string | NestHonoHandler, handler?: NestHonoHandler) {
    const [routePath, routeHandler] = getRouteAndHandler(pathOrHandler, handler);
    this.instance.get(routePath, this.createRouteHandler(routeHandler));
  }
  override post(pathOrHandler: string | NestHonoHandler, handler?: NestHonoHandler) {
    const [routePath, routeHandler] = getRouteAndHandler(pathOrHandler, handler);
    this.instance.post(routePath, this.createRouteHandler(routeHandler));
  }
  override put(pathOrHandler: string | NestHonoHandler, handler?: NestHonoHandler) {
    const [routePath, routeHandler] = getRouteAndHandler(pathOrHandler, handler);
    this.instance.put(routePath, this.createRouteHandler(routeHandler));
  }
  override delete(pathOrHandler: string | NestHonoHandler, handler?: NestHonoHandler) {
    const [routePath, routeHandler] = getRouteAndHandler(pathOrHandler, handler);
    this.instance.delete(routePath, this.createRouteHandler(routeHandler));
  }
  override patch(pathOrHandler: string | NestHonoHandler, handler?: NestHonoHandler) {
    const [routePath, routeHandler] = getRouteAndHandler(pathOrHandler, handler);
    this.instance.patch(routePath, this.createRouteHandler(routeHandler));
  }
  override options(pathOrHandler: string | NestHonoHandler, handler?: NestHonoHandler) {
    const [routePath, routeHandler] = getRouteAndHandler(pathOrHandler, handler);
    this.instance.options(routePath, this.createRouteHandler(routeHandler));
  }
  /**  */

  override use(pathOrHandler: string | NestHonoHandler, handler?: NestHonoHandler) {
    const [routePath, routeHandler] = getRouteAndHandler(pathOrHandler, handler);
    this.instance.use(routePath, this.createRouteHandler(routeHandler));
  }

  useBodyLimit(bodyLimit: number) {
    this.instance.use(
      bodyLimitMid({
        maxSize: bodyLimit,
        onError: () => {
          throw new Error("Body too large");
        },
      }),
    );
  }

  #bodyParsers: Map<string | undefined, HonoBodyParser> = new Map();
  useBodyParser(contentType: string, parser: HonoBodyParser): void;
  /**
   * @param rawBody When NestApplicationOptions.bodyParser is set to true, rawBody will be true
   */
  useBodyParser(contentType: string, rawBody?: boolean | HonoBodyParser, parser?: HonoBodyParser) {
    if (typeof rawBody === "function") {
      parser = rawBody;
    } else if (typeof parser !== "function") {
      return;
    }
    this.#bodyParsers.set(contentType, parser);
  }

  //implement
  useStaticAssets(path: string, options: ServeStaticOptions): never {
    throw new Error("Method useStaticAssets not implemented."); //TODO useStaticAssets
  }
  //implement
  setViewEngine(options: any | string): never {
    throw new Error("Method setViewEngine not implemented."); //TODO setViewEngine
  }
  //implement
  getRequestHostname(request: InternalHonoReq): string {
    return request.req.header("Host") ?? "";
  }
  //implement
  getRequestMethod(request: InternalHonoReq): string {
    return request.req.method;
  }
  //implement
  getRequestUrl(request: InternalHonoReq): string {
    return request.req.url;
  }
  // implement
  status(res: InternalHonoRes, statusCode: StatusCode) {
    res.status(statusCode);
  }
  //implement
  /**
   * 回复数据
   */
  reply(res: InternalHonoRes, body: any, statusCode?: StatusCode) {
    if (statusCode) res.status(statusCode);
    res.send(body);
  }
  /**
   * implement
   * 没有响应数据时，用于结束http响应
   */
  end(res: InternalHonoRes, message?: string) {
    res.send(message ?? null);
  }
  //implement
  render(res: InternalHonoRes, view: string | Promise<string>, options: any) {
    res.send(res.render(view));
  }

  //implement
  redirect(res: InternalHonoRes, statusCode: RedirectStatusCode, url: string) {
    res.send(res.redirect(url, statusCode));
  }
  //implement
  setErrorHandler(handler: ErrorHandler<InternalHonoReq, InternalHonoRes>) {
    this.instance.onError(async (err: Error, ctx: Context) => {
      await handler(err, createHonoReq(ctx, { body: {}, params: {}, rawBody: undefined }), createHonoRes(ctx));
      return sendResult(ctx, {});
    });
  }
  //implement
  setNotFoundHandler(handler: RequestHandler<InternalHonoReq, InternalHonoRes>) {
    this.instance.notFound(async (ctx: Context) => {
      await handler(createHonoReq(ctx, { body: {}, params: {}, rawBody: undefined }), createHonoRes(ctx));
      return sendResult(ctx, {});
    });
  }

  //implement
  isHeadersSent(res: InternalHonoRes): boolean {
    return res.finalized;
  }
  //implement
  setHeader(res: InternalHonoRes, name: string, value: string) {
    Reflect.get(res, NEST_HEADERS)[name] = value.toLowerCase();
  }

  //implement
  getType(): string {
    return "hono";
  }
  #isParserRegistered: boolean = false;
  // implement nest 初始化时设定的一些默认解析器
  registerParserMiddleware(prefix: string = "", rawBody?: boolean) {
    if (this.#isParserRegistered) return;

    this.useBodyParser("application/x-www-form-urlencoded", (honoReq) => honoReq.parseBody());
    this.useBodyParser("multipart/form-data", (honoReq) => honoReq.parseBody());
    this.useBodyParser("application/json", (honoReq) => honoReq.json());
    this.useBodyParser("text/plain", (honoReq) => honoReq.text());

    this.#isParserRegistered = true;
  }

  //implement
  override enableCors(options?: CORSOptions): void;
  override enableCors(options: any): void;
  override enableCors(options?: any) {
    this.instance.use(cors(options));
  }
  //implement
  createMiddlewareFactory(requestMethod: RequestMethod): (path: string, callback: Function) => any {
    return (path: string, callback: Function) => {
      async function handler(ctx: Context, next: Function) {
        await callback(ctx.req, ctx, next);
      }
      const hono = this.instance;
      switch (requestMethod) {
        case RequestMethod.ALL:
          hono.all(path, handler);
          break;
        case RequestMethod.GET:
          hono.get(path, handler);
          break;
        case RequestMethod.POST:
          hono.post(path, handler);
          break;
        case RequestMethod.PUT:
          hono.put(path, handler);
          break;
        case RequestMethod.DELETE:
          hono.delete(path, handler);
          break;
        case RequestMethod.PATCH:
          hono.patch(path, handler);
          break;
        case RequestMethod.OPTIONS:
          hono.options(path, handler);
          break;
        // case RequestMethod.HEAD:
        // case RequestMethod.SEARCH:
        // case RequestMethod.PROPFIND:
        // case RequestMethod.PROPPATCH:
        // case RequestMethod.MKCOL:
        // case RequestMethod.COPY:
        // case RequestMethod.MOVE:
        // case RequestMethod.LOCK:
        // case RequestMethod.UNLOCK:
        default:
          console.warn("createMiddlewareFactory: 不支持的方法", requestMethod, RequestMethod[requestMethod]);
          break;
      }
    };
  }

  //implement
  applyVersionFilter(): () => () => any {
    throw new Error("Versioning not yet supported in Hono"); //TODO applyVersionFilter
  }
  //@ts-ignore nest 10 implement
  override getHeader = undefined;
  //@ts-ignore nest 10 implement
  override appendHeader = undefined;
}
function getRouteAndHandler(
  pathOrHandler: string | NestHonoHandler,
  handler?: NestHonoHandler,
): [string, NestHonoHandler] {
  let path: string;
  if (typeof pathOrHandler === "function") {
    handler = pathOrHandler;
    path = "";
  } else {
    path = pathOrHandler;
    handler = handler!;
  }
  return [path, handler];
}

function transformsNestCrosOption(options: CorsOptions | CorsOptionsDelegate<InternalHonoReq> = {}): CORSOptions {
  if (typeof options === "function") throw new Error("options must be an object");
  let { origin } = options;
  if (typeof origin === "function") origin = undefined; //TODO
  return {
    //@ts-ignore 需要转换
    origin, //TODO
    allowHeaders: toArray(options.allowedHeaders),
    allowMethods: toArray(options.methods),
    exposeHeaders: toArray(options.exposedHeaders),
    credentials: options.credentials,
    maxAge: options.maxAge,
  };
}
function toArray<T>(item?: T | T[]): T[] | undefined {
  if (!item) return undefined;
  return item instanceof Array ? item : [item];
}
