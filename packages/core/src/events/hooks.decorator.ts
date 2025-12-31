import { CONTROLLER_EVENTS } from "../constants"
import { Metadata } from "../domain/Metadata"
import { OnEvent, EventType } from "./on-event"

export function OnApplicationInit(priority: number = 0): MethodDecorator {
    return (target, propertyKey: any) => {
        const anotherEvents: OnEvent[] = Metadata.get(CONTROLLER_EVENTS, Reflect) || []
        anotherEvents.push({ methodName: propertyKey, eventName: EventType.OnApplicationInit, target: target.constructor, priority })
        Metadata.set(CONTROLLER_EVENTS, anotherEvents, Reflect)
    }
}

export function OnApplicationShutdown(priority: number = 0): MethodDecorator {
    return (target, propertyKey: any) => {
        const anotherEvents: OnEvent[] = Metadata.get(CONTROLLER_EVENTS, Reflect) || []
        anotherEvents.push({ methodName: propertyKey, eventName: EventType.OnApplicationShutdown, target: target.constructor, priority })
        Metadata.set(CONTROLLER_EVENTS, anotherEvents, Reflect)
    }
}

export function OnApplicationBoot(priority: number = 0) {
    return (target: Function, propertyKey: any) => {
        const anotherEvents: OnEvent[] = Metadata.get(CONTROLLER_EVENTS, Reflect) || []
        anotherEvents.push({ methodName: propertyKey, eventName: EventType.OnApplicationBoot, target: target.constructor, priority })
        Metadata.set(CONTROLLER_EVENTS, anotherEvents, Reflect)
    }
}
