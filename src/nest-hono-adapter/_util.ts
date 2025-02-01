import type { NestHttpServerRequired, NestReqRequired } from "./_nest.ts";
import type { Context } from "hono";

export function createHonoReq(
  ctx: Context,
  info: {
    body: Record<string, any>;
    params: Record<string, string>;
    rawBody: any;
  },
): InternalHonoReq {
  const { params, rawBody } = info;
  let body = info.body ?? {};
  const honoReq = ctx as InternalHonoReq;
  if (Object.hasOwn(honoReq, IS_HONO_REQUEST)) return honoReq;
  const nestReq: Omit<NestReqRequired, "headers" | "query" | "body" | "ip"> = {
    rawBody,
    session: ctx.get("session") ?? {},
    //hosts: {}, //nest sets up hosts automatically
    files: {}, //TODO files
    params: params,
  };
  Object.assign(honoReq, nestReq);

  let ip: string | undefined;
  let headers: Record<string, any> | undefined;
  let query: Record<string, any> | undefined;

  Object.defineProperties(honoReq, {
    headers: {
      get(this: Context) {
        return headers ?? (headers = Object.fromEntries(this.req.raw.headers));
      },
      enumerable: true,
    },
    query: {
      get(this: Context) {
        return query ?? (query = this.req.query());
      },
      enumerable: true,
    },
    // Hono Context already has a body attribute, so we need to use a Proxy to override it
    body: {
      value: new Proxy(ctx.body, {
        get(rawBody, key: string) {
          return body[key];
        },
        ownKeys(rawBody) {
          return Object.keys(body);
        },
        apply(rawBody, thisArg, args) {
          return rawBody.apply(ctx, args as any);
        },
      }),
      enumerable: true,
      writable: false,
    },
    ip: {
      get() {
        return "";
      },
      enumerable: true,
    },
    [IS_HONO_REQUEST]: {
      value: true,
    },
  });

  return honoReq;
}
const IS_HONO_REQUEST = Symbol("Is Hono Request");

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
      else if (body instanceof Uint8Array) response = ctx.body(body);
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

export type InternalHonoReq = NestReqRequired & Context;

export type InternalHonoRes = Context & {
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
