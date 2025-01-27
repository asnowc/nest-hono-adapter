import type { RequestHandler } from "@nestjs/common/interfaces";
import type { Server } from "node:http";

//see nest project: packages\core\router\route-params-factory.ts
export interface NestReqRequired {
  rawBody?: any;
  session?: any;
  files?: any;
  body: Record<string, any>;
  params: Record<string, string | undefined>;
  ip: string;
  hosts?: Record<string, string | undefined>;
  query: Record<string, string | undefined>;
  headers: Record<string, string | undefined>;
}

export type NestHandler<Req extends NestReqRequired, Res extends object> = RequestHandler<Req, Res>;

//see nest project: packages/core/nest-application.ts
export interface NestHttpServerRequired {
  once(event: "error", listener: (err: any) => void): this;
  removeListener(event: "error", listener: (...args: any[]) => void): this;
  // 必须返回一个对象或者字符串，否则 NestApplication.listen() 返回的 Promise 将用于不会解决
  address(): ReturnType<Server["address"]>;

  listen?(port: number, ...args: any[]): void;
  close?(callback: (err?: any) => void): void;
}
