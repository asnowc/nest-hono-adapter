import { Hono } from "hono";

import type { NestApplicationOptions } from "@nestjs/common/interfaces";
import type { Server as NodeHttpServer } from "node:http";

import type { NestHttpServerRequired } from "./_nest.ts";
import { createNestRequiredHttpServer, isFakeHttpServer } from "./_util.ts";
import { HonoRouterAdapter } from "./_adapter.ts";

export type InitHttpServerConfig = Pick<NestApplicationOptions, "httpsOptions" | "forceCloseConnections"> & {
  hono: Hono;
};
export interface CreateHonoAdapterOption {
  /** Called during server initialization */
  initHttpServer?(config: InitHttpServerConfig): NestHttpServerRequired;
  /** Obtain the address information for HTTP Server listening */
  address?: () => ReturnType<NodeHttpServer["address"]>;
  /** Call when shutting down the server */
  close?: () => Promise<void>;
  listen?: (config: InitHttpServerConfig & { port: number; hostname?: string }) => Promise<void>;
  /** Customize Hono instance */
  hono?: Hono;
}

/**
 * Adapter for using Hono with NestJS.
 */
export class HonoAdapter extends HonoRouterAdapter {
  #honoAdapterConfig: CreateHonoAdapterOption;
  constructor(config: CreateHonoAdapterOption = {}) {
    super(config.hono ?? new Hono());
    this.#honoAdapterConfig = config;
  }
  override listen(port: string | number, callback?: () => void): void;
  override listen(port: string | number, hostname: string, callback?: () => void): void;
  override async listen(port: string | number, ...args: any[]): Promise<void> {
    let callback = args[args.length - 1];
    if (typeof callback !== "function") callback = undefined;
    const config = this.#honoAdapterConfig;

    if (config.listen) {
      try {
        const hostname = typeof args[0] === "string" ? args[0] : undefined;
        await config.listen({
          ...this.#initHttServerOption!,
          port: +port,
          hostname,
          hono: this.instance,
        });
      } catch (error) {
        callback(error);
        return;
      }
    }
    if (isFakeHttpServer(this.httpServer)) {
      this.httpServer.address = config.address ?? (() => "127.0.0.1");
      callback?.();
    } else {
      try {
        port = +port;
        return this.httpServer.listen!(port, ...args);
      } catch (error) {
        callback?.(error);
      }
    }
  }
  //implement
  async close(): Promise<void> {
    if (isFakeHttpServer(this.httpServer)) return this.#honoAdapterConfig.close?.();
    return new Promise((resolve, reject) => {
      return this.httpServer.close!((err) => (err ? reject(err) : resolve()));
    });
  }
  #initHttServerOption?: Omit<InitHttpServerConfig, "hono">;
  //implement
  initHttpServer(options: NestApplicationOptions = {}) {
    const { forceCloseConnections, httpsOptions } = options;
    this.#initHttServerOption = { forceCloseConnections, httpsOptions };
    const httpServer = this.#honoAdapterConfig.initHttpServer?.({ ...this.#initHttServerOption!, hono: this.instance });
    this.httpServer = httpServer ?? createNestRequiredHttpServer();
  }
}
