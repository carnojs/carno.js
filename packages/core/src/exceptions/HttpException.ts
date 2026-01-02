import { formatValidationErrors, isObject } from "../utils";


export class HttpException {
  public message: string | object;

  constructor(public response: any, public statusCode: any) {
    this.initMessage()
  }

  public initMessage() {
    const formatted = formatValidationErrors(this.response)

    if (isObject(formatted)) {
      this.message = formatted as any
      return
    }

    this.message = formatted as string
  }

  public getResponse(): string | object {
    return this.message;
  }

  public getStatus(): number {
    return this.statusCode;
  }
}
