/** patch：原地更新、下一帧生效；rebuild：排一次重建（按帧合并） */
type Route = 'patch' | 'rebuild'

/**
 * 参数表的一行。
 * - `color`：值是任意 CSS 颜色串，没传时继承父元素的计算 color；写了 `fallback` 的，没传时取那个参数的值
 * - `object`：值按键与默认值浅合并，没传的子项回到默认值（不保留上一次的值）
 */
type ParamSpec
  = | { readonly type: 'number', readonly default: number, readonly route: Route }
    | { readonly type: 'boolean', readonly default: boolean, readonly route: Route }
    | { readonly type: 'color', readonly route: 'patch', readonly fallback?: string }
    | { readonly type: 'object', readonly default: Readonly<Record<string, number>>, readonly route: Route }

export type ParamTable = Readonly<Record<string, ParamSpec>>

type ValueOf<S> = S extends { type: 'number' } ? number
  : S extends { type: 'boolean' } ? boolean
    : S extends { type: 'color' } ? string | undefined
      : S extends { type: 'object', default: infer D } ? { -readonly [K in keyof D]: number }
        : never

type OptionOf<S> = S extends { type: 'object' } ? Partial<ValueOf<S>> : Exclude<ValueOf<S>, undefined>

type ConstructorOf<S> = S extends { type: 'number' } ? NumberConstructor
  : S extends { type: 'boolean' } ? BooleanConstructor
    : S extends { type: 'color' } ? StringConstructor
      : ObjectConstructor

/** 当前生效的参数值：颜色类没传时是 undefined（继承），其余都已填上默认值 */
export type ParamValues<T> = { -readonly [K in keyof T]: ValueOf<T[K]> }

/** 调用方传的选项：全部可选，显式传 undefined 等于恢复默认 */
export type Options<T> = { [K in keyof T]?: OptionOf<T[K]> | undefined }

/** 选项类型映射：键名 → 原生类型构造器，供框架壳声明 props */
export type OptionTypes<T> = { -readonly [K in keyof T]: ConstructorOf<T[K]> }

function resolve(spec: ParamSpec, value: unknown): unknown {
  if (spec.type === 'object')
    return { ...spec.default, ...(value as object | undefined) }
  if (value !== undefined)
    return value
  return spec.type === 'color' ? undefined : spec.default
}

/** 按参数表把选项补全成参数值 */
export function resolveParams<T extends ParamTable>(table: T, options: Options<T> = {}): ParamValues<T> {
  const input = options as Record<string, unknown>
  const values: Record<string, unknown> = {}
  for (const [key, spec] of Object.entries(table))
    values[key] = resolve(spec, input[key])
  return values as ParamValues<T>
}

/**
 * 把 patch 原地写进 values，返回其中走重建的键名。
 * 不比较新旧值，只按键名查表；表里没有的键忽略。
 */
export function applyPatch<T extends ParamTable>(table: T, values: ParamValues<T>, patch: Options<T>): string[] {
  const target = values as Record<string, unknown>
  const rebuild: string[] = []
  for (const [key, value] of Object.entries(patch)) {
    if (!Object.hasOwn(table, key))
      continue
    const spec = table[key]!
    target[key] = resolve(spec, value)
    if (spec.route === 'rebuild')
      rebuild.push(key)
  }
  return rebuild
}

const constructors = { number: Number, boolean: Boolean, color: String, object: Object } as const

/** 由参数表派生选项类型映射 */
export function optionTypesOf<T extends ParamTable>(table: T): OptionTypes<T> {
  const types: Record<string, unknown> = {}
  for (const [key, spec] of Object.entries(table))
    types[key] = constructors[spec.type]
  return types as OptionTypes<T>
}
