export interface FindResult<T> {
  store: T
  params: Record<string, any>
}

export interface ParamNode<T> {
  paramName: string | null
  names: Map<T, string>
  store: T | null
  inert: Node<T> | null
}

export interface Node<T> {
  part: string
  store: T | null
  inert: Map<number, Node<T>> | null
  params: ParamNode<T> | null
  wildcardStore: T | null
}


/**
 * * Empty object shared for static routes without parameters.
 * * Frozen for V8 optimization and immutability.
 * * Avoid allocating an empty object on every request in static routes.
 * */
const EMPTY_PARAMS: Readonly<Record<string, string>> = Object.freeze({});
const createNode = <T>(part: string, inert?: Node<T>[]): Node<T> => ({
  part,
  store: null,
  inert:
        inert !== undefined
            ? new Map(inert.map((child) => [child.part.charCodeAt(0), child]))
            : null,
  params: null,
  wildcardStore: null
})

const cloneNode = <T>(node: Node<T>, part: string) => ({
  ...node,
  part
})

const createParamNode = <T>(): ParamNode<T> => ({
  paramName: null,
  names: new Map(),
  store: null,
  inert: null
})

const ensureSameNameForStore = <T>(param: ParamNode<T>, store: T, name: string) => {
  const existing = param.names.get(store)

  if (!existing || existing === name) return

  throw new Error(`Route already registered with parameter "${existing}" for this handler`)
}

const ensureDefaultName = <T>(param: ParamNode<T>, name: string) => {
  if (param.paramName) return

  param.paramName = name
}

const persistStoreName = <T>(param: ParamNode<T>, store: T, name: string) => {
  if (param.names.has(store)) return

  param.names.set(store, name)
}

const registerParamName = <T>(param: ParamNode<T>, store: T, name: string) => {
  ensureSameNameForStore(param, store, name)

  ensureDefaultName(param, name)

  persistStoreName(param, store, name)
}

const resolveParamName = <T>(param: ParamNode<T>, store: T | null) => {
  if (store && param.names.has(store)) {
    return param.names.get(store)!
  }

  if (param.paramName) {
    return param.paramName
  }

  throw new Error('Unable to resolve parameter name for route')
}

export class Memoirist<T> {
  root: Record<string, Node<T>> = {}
  history: [string, string, T][] = []

  private routeCache = new Map<string, FindResult<T> | null>()

  private static regex = {
    static: /:[^/]+/,
    params: /:[^/]+/g
  }

  add(method: string, path: string, store: T): FindResult<T>['store'] {
    if (typeof path !== 'string')
      throw new TypeError('Route path must be a string')

    if (path === '') path = '/'
        else if (path[0] !== '/') path = `/${path}`

    this.invalidateCache()

    this.history.push([method, path, store])

    const isWildcard = path[path.length - 1] === '*'
    if (isWildcard) {
      // Slice off trailing '*'
      path = path.slice(0, -1)
    }

    const inertParts = path.split(Memoirist.regex.static)
    const paramParts = path.match(Memoirist.regex.params) || []

    if (inertParts[inertParts.length - 1] === '') inertParts.pop()

    let node: Node<T>

    if (!this.root[method]) node = this.root[method] = createNode<T>('/')
        else node = this.root[method]

    let paramPartsIndex = 0

    for (let i = 0; i < inertParts.length; ++i) {
      let part = inertParts[i]

      if (i > 0) {
        // Set param on the node
        const param = paramParts[paramPartsIndex++].slice(1)

        if (node.params === null) {
          node.params = createParamNode()
        }

        registerParamName(node.params, store, param)

        const params = node.params

        if (params.inert === null) {
          node = params.inert = createNode(part)
          continue
        }

        node = params.inert
      }

      for (let j = 0; ; ) {
        if (j === part.length) {
          if (j < node.part.length) {
            // Move the current node down
            const childNode = cloneNode(node, node.part.slice(j))
            Object.assign(node, createNode(part, [childNode]))
          }
          break
        }

        if (j === node.part.length) {
          // Add static child
          if (node.inert === null) node.inert = new Map()
                    else if (node.inert.has(part.charCodeAt(j))) {
                      // Re-run loop with existing static node
                      node = node.inert.get(part.charCodeAt(j))!
                      part = part.slice(j)
                      j = 0
                      continue
                    }

          // Create new node
          const childNode = createNode<T>(part.slice(j))
          node.inert.set(part.charCodeAt(j), childNode)
          node = childNode

          break
        }

        if (part[j] !== node.part[j]) {
          // Split the node
          const existingChild = cloneNode(node, node.part.slice(j))
          const newChild = createNode<T>(part.slice(j))

          Object.assign(
            node,
            createNode(node.part.slice(0, j), [
              existingChild,
              newChild
            ])
            )

          node = newChild

          break
        }

        ++j
      }
    }

    if (paramPartsIndex < paramParts.length) {
      // The final part is a parameter
      const param = paramParts[paramPartsIndex]
      const paramName = param.slice(1)

      if (node.params === null) {
        node.params = createParamNode()
      }

      registerParamName(node.params, store, paramName)

      if (node.params.store === null) {
        node.params.store = store
      } else if (node.params.store !== store) {
        throw new Error(`Route "${path}" already registered`)
      }

      return node.params.store!
    }

    if (isWildcard) {
      // The final part is a wildcard
      if (node.wildcardStore === null) node.wildcardStore = store

      return node.wildcardStore!
    }

    // The final part is static
    if (node.store === null) node.store = store

    return node.store!
  }

  find(method: string, url: string): FindResult<T> | null {
    const cacheKey = this.buildCacheKey(method, url)

    if (this.routeCache.has(cacheKey)) {
      return this.routeCache.get(cacheKey)!
    }

    const root = this.root[method]
    if (!root) return null

    const result = matchRoute(url, url.length, root, 0)

    this.routeCache.set(cacheKey, result)

    return result
  }

  updateStore(
    method: string,
    path: string,
    oldStore: T,
    newStore: T
  ): boolean {
    const node = this.findNode(method, path)

    if (!node) {
      return false
    }

    if (node.store === oldStore) {
      node.store = newStore
      this.updateHistoryStore(method, path, newStore)
      this.invalidateCache()

      return true
    }

    if (node.params?.store === oldStore) {
      node.params.store = newStore

      const paramName = node.params.names.get(oldStore)
      if (paramName) {
        node.params.names.set(newStore, paramName)
      }

      this.updateHistoryStore(method, path, newStore)
      this.invalidateCache()

      return true
    }

    if (node.wildcardStore === oldStore) {
      node.wildcardStore = newStore
      this.updateHistoryStore(method, path, newStore)
      this.invalidateCache()

      return true
    }

    return false
  }

  private buildCacheKey(method: string, url: string): string {
    const normalizedMethod = method.toLowerCase()

    return `${normalizedMethod}:${url}`
  }

  private invalidateCache(): void {
    this.routeCache.clear()
  }

  private updateHistoryStore(method: string, path: string, newStore: T): void {
    const normalizedPath = this.normalizePath(path)

    for (let i = 0; i < this.history.length; i++) {
      const [m, p] = this.history[i]

      if (m === method && this.normalizePath(p) === normalizedPath) {
        this.history[i] = [method, p, newStore]

        break
      }
    }
  }

  private normalizePath(path: string): string {
    if (path === '') {
      return '/'
    }

    return path[0] !== '/' ? `/${path}` : path
  }

  private findNode(method: string, path: string): Node<T> | null {
    if (path === '') {
      path = '/'
    } else if (path[0] !== '/') {
      path = `/${path}`
    }

    const isWildcard = path[path.length - 1] === '*'

    if (isWildcard) {
      path = path.slice(0, -1)
    }

    const inertParts = path.split(Memoirist.regex.static)
    const paramParts = path.match(Memoirist.regex.params) || []

    if (inertParts[inertParts.length - 1] === '') {
      inertParts.pop()
    }

    let node = this.root[method]

    if (!node) {
      return null
    }

    let paramPartsIndex = 0

    for (let i = 0; i < inertParts.length; ++i) {
      let part = inertParts[i]

      if (i > 0) {
        paramPartsIndex++

        if (!node.params?.inert) {
          return null
        }

        node = node.params.inert
      }

      for (let j = 0; ; ) {
        if (j === part.length) {
          break
        }

        if (j === node.part.length) {
          if (!node.inert?.has(part.charCodeAt(j))) {
            return null
          }

          node = node.inert.get(part.charCodeAt(j))!
          part = part.slice(j)
          j = 0

          continue
        }

        if (part[j] !== node.part[j]) {
          return null
        }

        ++j
      }
    }

    return node
  }
}

const matchRoute = <T>(
  url: string,
  urlLength: number,
  node: Node<T>,
  startIndex: number
  ): FindResult<T> | null => {
  const part = node?.part
  const endIndex = startIndex + part.length

  // Only check the pathPart if its length is > 1 since the parent has
  // already checked that the url matches the first character
  if (part.length > 1) {
    if (endIndex > urlLength) return null

    if (part.length < 15) {
      // Using a loop is faster for short strings
      for (let i = 1, j = startIndex + 1; i < part.length; ++i, ++j)
        if (part.charCodeAt(i) !== url.charCodeAt(j)) return null
    } else if (url.substring(startIndex, endIndex) !== part) return null
  }

  if (endIndex === urlLength) {
    // Reached the end of the URL
    if (node.store !== null)
      return {
      store: node.store,
        params: EMPTY_PARAMS
    }

    if (node.wildcardStore !== null)
      return {
      store: node.wildcardStore,
        params: { '*': '' }
    }

    return null
  }

  if (node.inert !== null) {
    const inert = node.inert.get(url.charCodeAt(endIndex))

    if (inert !== undefined) {
      const route = matchRoute(url, urlLength, inert, endIndex)

      if (route !== null) return route
    }
  }

  if (node.params !== null) {
    const param = node.params
    const slashIndex = url.indexOf('/', endIndex)

    if (slashIndex !== endIndex) {
      // Params cannot be empty
      if (slashIndex === -1 || slashIndex >= urlLength) {
        if (param.store !== null) {
          const params: Record<string, string> = {}
          const paramName = resolveParamName(param, param.store)

          params[paramName] = url.substring(endIndex, urlLength)

          return {
            store: param.store,
            params
          }
        }
      } else if (param.inert !== null) {
        const route = matchRoute(
          url,
          urlLength,
          param.inert,
          slashIndex
          )

        if (route !== null) {
          const paramName = resolveParamName(param, route.store)
          const paramValue = url.substring(endIndex, slashIndex)

          if (route.params === EMPTY_PARAMS) {
            route.params = { [paramName]: paramValue }
          } else {
            route.params[paramName] = paramValue
          }

          return route
        }
      }
    }
  }

  if (node.wildcardStore !== null)
    return {
    store: node.wildcardStore,
      params: {
      '*': url.substring(endIndex, urlLength)
    }
  }

  return null
}

export default Memoirist
