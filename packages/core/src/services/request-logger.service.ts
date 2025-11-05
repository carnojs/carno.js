import { Injectable } from "../commons/decorators/Injectable.decorator";
import { ProviderScope } from "../domain/provider-scope";
import { Context } from "../domain/Context";
import { LoggerService, LoggerAdapter } from "./logger.service";


@Injectable({ scope: ProviderScope.REQUEST })
export class RequestLogger implements LoggerAdapter {

  private childLogger: LoggerAdapter;

  constructor(
    private logger: LoggerService,
    private context: Context
  ) {
    this.initializeChildLogger();
  }


  private initializeChildLogger() {
    this.childLogger = this.logger.child({ trackingId: this.context.trackingId });
  }


  info(message: string, ...args: any[]) {
    this.childLogger.info(message, ...args);
  }


  warn(message: string, ...args: any[]) {
    this.childLogger.warn(message, ...args);
  }


  error(message: string, ...args: any[]) {
    this.childLogger.error(message, ...args);
  }


  debug(message: string, ...args: any[]) {
    this.childLogger.debug(message, ...args);
  }


  fatal(message: string, ...args: any[]) {
    this.childLogger.fatal(message, ...args);
  }


  trace(message: string, ...args: any[]) {
    this.childLogger.trace(message, ...args);
  }
}
