import { CarnoClosure } from "./CarnoClosure";
import { Context } from "./Context";

export interface CarnoMiddleware {
  handle(context: Context, next: CarnoClosure): Promise<void>;
}
