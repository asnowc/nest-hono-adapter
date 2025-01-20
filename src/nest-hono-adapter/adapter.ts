import { createAdaptorServer, ServerType } from "@hono/node-server";

import { Context, Next, Hono, HonoRequest, Env, Schema } from "hono";
import { serveStatic } from "hono/deno";
import type { ServeStaticOptions } from "hono/serve-static";
import { bodyLimit as bodyLimitMid } from "hono/body-limit";
import { cors } from "hono/cors";
import { RedirectStatusCode, StatusCode } from "hono/utils/http-status";

import { Logger, RequestMethod } from "@nestjs/common";
import type { ErrorHandler, NestApplicationOptions, RequestHandler } from "@nestjs/common/interfaces";
import { AbstractHttpAdapter } from "@nestjs/core/adapters/http-adapter.js";
import * as http from "node:http";

import * as https from "node:https";
import type { BlankEnv, BlankSchema } from "hono/types";
import { NestHandler } from "./nest.ts";
import { createHonoRes, createHonoReq, sendResult, HonoReq, HonoRes } from "./_util.ts";
import type { HonoApplicationExtra, HonoBodyParser } from "./hono.impl.ts";

export type CORSOptions = NonNullable<Parameters<typeof cors>[0]>;

const NEST_HEADERS = Symbol("nest_headers");
type HonoContext = Context;

type NestHonoHandler = NestHandler<HonoReq, HonoRes>;

export interface HonoAdapter<E extends Env = BlankEnv, S extends Schema = BlankSchema, BasePath extends string = "/">
  extends AbstractHttpAdapter<ServerType, HonoReq, HonoRes> {
  getInstance(): Hono<E, S, BasePath>;
  getInstance<T = any>(): T;
}

/**
 * Adapter for using Hono with NestJS.
 */
export class HonoAdapter<E extends Env = BlankEnv, S extends Schema = BlankSchema, BasePath extends string = "/">
  extends AbstractHttpAdapter<ServerType, HonoReq, HonoRes>
  implements HonoApplicationExtra
{
  protected declare readonly instance: Hono<E, S, BasePath>;
  protected declare httpServer: ServerType;
  constructor(hono: Hono<E, S, BasePath> = new Hono<E, S, BasePath>()) {
    super(hono);
  }
  override listen(port: string | number, callback?: () => void): any;
  override listen(port: string | number, hostname: string, callback?: () => void): any;
  override listen(port: string | number, ...args: any[]): ServerType {
    port = +port;
    return this.httpServer.listen(port, ...args);
  }

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
        next
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
      })
    );
  }

  #bodyParsers: Map<string | undefined, HonoBodyParser> = new Map();
  useBodyParser(contentType: string, parser: HonoBodyParser) {
    this.#bodyParsers.set(contentType, parser);
  }
  //implement
  close(): Promise<void> {
    return new Promise((resolve) => this.httpServer.close(() => resolve()));
  }
  //implement
  initHttpServer(options: NestApplicationOptions) {
    const isHttpsEnabled = options?.httpsOptions;
    const createServer = isHttpsEnabled ? https.createServer : http.createServer;
    this.httpServer = createAdaptorServer({
      fetch: this.instance.fetch,
      createServer,
      overrideGlobalObjects: false,
    });
  }
  //implement
  useStaticAssets(path: string, options: ServeStaticOptions) {
    Logger.log("Registering static assets middleware");
    this.instance.use(path, serveStatic(options));
    return this;
  }
  //implement
  setViewEngine(options: any | string): this {
    throw new Error("Method not implemented."); //TODO setViewEngine
  }
  //implement
  getRequestHostname(ctx: HonoContext): string {
    return ctx.req.header().host;
  }
  //implement
  getRequestMethod(request: HonoRequest): string {
    return request.method;
  }
  //implement
  getRequestUrl(request: HonoRequest): string {
    return request.url;
  }
  // implement
  status(ctx: HonoContext, statusCode: StatusCode) {
    ctx.status(statusCode);
  }
  //implement
  /**
   * 回复数据
   */
  reply(ctx: HonoRes, body: any, statusCode?: StatusCode) {
    if (statusCode) ctx.status(statusCode);
    ctx.send(body);
  }
  /**
   * implement
   * 没有响应数据时，用于结束http响应
   */
  end(ctx: HonoRes, message?: string) {
    ctx.send(message ?? null);
  }
  //implement
  render(ctx: HonoRes, view: string | Promise<string>, options: any) {
    ctx.send(ctx.render(view));
  }

  //implement
  redirect(ctx: HonoRes, statusCode: RedirectStatusCode, url: string) {
    ctx.send(ctx.redirect(url, statusCode));
  }
  //implement
  setErrorHandler(handler: ErrorHandler<HonoReq, HonoRes>) {
    this.instance.onError(async (err: Error, ctx: HonoContext) => {
      await handler(err, createHonoReq(ctx, { body: {}, params: {}, rawBody: undefined }), createHonoRes(ctx));
      return sendResult(ctx, {});
    });
  }
  //implement
  setNotFoundHandler(handler: RequestHandler<HonoReq, HonoRes>) {
    this.instance.notFound(async (ctx: HonoContext) => {
      await handler(createHonoReq(ctx, { body: {}, params: {}, rawBody: undefined }), createHonoRes(ctx));
      return sendResult(ctx, {});
    });
  }

  //implement
  isHeadersSent(ctx: HonoRes): boolean {
    return ctx.finalized;
  }
  //implement
  setHeader(ctx: HonoContext, name: string, value: string) {
    Reflect.get(ctx, NEST_HEADERS)[name] = value.toLowerCase();
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
  enableCors(options?: CORSOptions) {
    this.instance.use(cors(options));
  }
  //implement
  createMiddlewareFactory(requestMethod: RequestMethod): (path: string, callback: Function) => any {
    return (path: string, callback: Function) => {
      async function handler(ctx: HonoContext, next: Function) {
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
}
function getRouteAndHandler(
  pathOrHandler: string | NestHonoHandler,
  handler?: NestHonoHandler
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
