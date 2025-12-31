import { CONTROLLER } from "../../constants"
import { Metadata } from "../../domain/Metadata"
import { ProviderScope } from "../../domain/provider-scope"


type ControllerOptions = {
  path?: string,
  scope?: ProviderScope,
  children?: any[],
}


function normalizeOptions(pathOrOptions?: string | ControllerOptions): ControllerOptions {
  if (!pathOrOptions) {
    return {}
  }

  if (typeof pathOrOptions === 'string') {
    return { path: pathOrOptions }
  }

  return pathOrOptions
}

export function Controller(pathOrOptions?: string | ControllerOptions): ClassDecorator {
  return (target) => {
    const options = normalizeOptions(pathOrOptions)
    const controllers = Metadata.get(CONTROLLER, Reflect) || []

    controllers.push({provide: target, ...options})
    Metadata.set(CONTROLLER, controllers, Reflect)
  }
}
