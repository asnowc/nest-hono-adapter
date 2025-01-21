import type { HonoRequest } from "hono/request";
import type { NestHttpServerRequired, NestReqRequired } from "./_nest.ts";
import type { Context } from "hono";
import { getConnInfo } from "hono/cloudflare-workers";

export function createHonoReq(
  ctx: Context,
  info: {
    body: Record<string, any>;
    params: Record<string, string>;
    rawBody: any;
  },
): InternalHonoReq {
  const { body, params, rawBody } = info;
  const honoReq = ctx.req as InternalHonoReq;
  ctx.req.queries();
  ctx.req.query();
  const nestReq: Omit<NestReqRequired, "headers" | "query" | "ip"> = {
    rawBody,
    body,
    session: ctx.get("session") ?? {},
    hosts: {}, //TODO hosts
    files: {}, //TODO files
    params: params,
  };
  Object.assign(honoReq, nestReq);

  let ip: string | undefined;
  let headers: Record<string, any> | undefined;
  let query: Record<string, any> | undefined;
  Object.defineProperties(honoReq, {
    headers: {
      get() {
        return headers ?? (headers = Object.fromEntries(honoReq.raw.headers));
      },
      enumerable: true,
    },
    // HonoRequest already has a query attribute, so we need to use a Proxy to override it
    query: {
      value: new Proxy(ctx.req.query, {
        get(rawQuery, key: string) {
          if (!query) query = rawQuery.call(honoReq);
          return query[key];
        },
        ownKeys(rawQuery) {
          if (!query) query = rawQuery.call(honoReq);
          return Object.keys(query);
        },
        apply(rawQuery, thisArg, args) {
          return rawQuery.apply(thisArg, args as any);
        },
      }),
      enumerable: true,
      writable: false,
    },
    ip: {
      get() {
        return ip ?? (ip = getConnInfo(ctx).remote.address as string);
      },
      enumerable: true,
    },
  });

  return honoReq;
}

function mountResponse(ctx: Context, data: any) {
  Reflect.set(ctx, NEST_BODY, data);
}

export function createHonoRes(context: Context): InternalHonoRes {
  Reflect.set(context, "send", function (this: Context, response: any = this.newResponse(null)) {
    mountResponse(this, response);
  });
  return context as any as InternalHonoRes;
}
export function sendResult(ctx: Context, headers: Record<string, string>) {
  const body = Reflect.get(ctx, NEST_BODY);
  let response: Response;
  switch (typeof body) {
    case "string": {
      response = ctx.text(body);
      break;
    }
    case "object": {
      if (body === null) response = ctx.body(null);
      else if (body instanceof Response) response = body;
      else if (body instanceof ReadableStream) response = ctx.body(body);
      else if (body instanceof Uint8Array) response = ctx.body(ReadableStream.from([body]));
      else if (body instanceof Blob) response = ctx.body(body.stream());
      else response = ctx.json(body);
      break;
    }
    case "undefined": {
      response = ctx.body(null);
      break;
    }
    default:
      return ctx.text("HonoAdapter cannot convert unknown types", 500);
  }
  Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
  return response;
}

export type InternalHonoReq = NestReqRequired & HonoRequest;

export type InternalHonoRes = Omit<Context, "req"> & {
  send(data?: any): void;
};

const NEST_BODY = Symbol("nest_body");
const FakeHttpServer = Symbol("Fake HTTP Server");

export function isFakeHttpServer(server: any) {
  return Reflect.get(server, FakeHttpServer);
}
export function createNestRequiredHttpServer(): NestHttpServerRequired {
  return new Proxy(
    {
      once() {
        return this;
      },
      removeListener() {
        return this;
      },
      address() {
        return null;
      },
      then: undefined,
      [FakeHttpServer]: true,
    },
    {
      get(target, key) {
        if (typeof key === "symbol" || Object.hasOwn(target, key)) {
          //@ts-ignore
          return target[key];
        }
        console.trace("Nest Adapter: Nest uses undefined httpServer property", key);
        const value = function () {
          throw new Error(`Nest call undefined httpServer property '${String(key)}'`);
        };
        //@ts-ignore
        target[key] = value;
        return value;
      },
    },
  );
}
