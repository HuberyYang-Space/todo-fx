import type { ParamTable } from '../../src/compute/params'
import { describe, expect, it } from 'vitest'
import { applyPatch, optionTypesOf, resolveParams } from '../../src/compute/params'

const table = {
  color: { type: 'color', route: 'patch' },
  accent: { type: 'color', route: 'patch', fallback: 'color' },
  strength: { type: 'number', default: 0.5, route: 'patch' },
  padding: { type: 'number', default: 48, route: 'rebuild' },
  debug: { type: 'boolean', default: false, route: 'patch' },
  flowmap: { type: 'object', default: { falloff: 0.3, alpha: 0.6 }, route: 'rebuild' },
} as const satisfies ParamTable

describe('resolveParams', () => {
  it('没传的取默认值，颜色类没传为 undefined（继承）', () => {
    expect(resolveParams(table)).toEqual({
      color: undefined,
      accent: undefined,
      strength: 0.5,
      padding: 48,
      debug: false,
      flowmap: { falloff: 0.3, alpha: 0.6 },
    })
  })

  it('传了的覆盖默认值；对象类按子项与默认值合并', () => {
    const values = resolveParams(table, { strength: 1, accent: 'red', flowmap: { alpha: 0.1 } })
    expect(values.strength).toBe(1)
    expect(values.accent).toBe('red')
    expect(values.flowmap).toEqual({ falloff: 0.3, alpha: 0.1 })
  })

  it('显式传 undefined 等于没传', () => {
    expect(resolveParams(table, { strength: undefined, flowmap: undefined })).toEqual(resolveParams(table))
  })

  it('不共享默认值对象：改一个实例的值不影响参数表', () => {
    const values = resolveParams(table)
    values.flowmap.alpha = 1
    expect(table.flowmap.default.alpha).toBe(0.6)
  })
})

describe('applyPatch', () => {
  it('原地改值，只返回走重建的键', () => {
    const values = resolveParams(table)
    const rebuild = applyPatch(table, values, { strength: 2, padding: 10, color: 'blue' })
    expect(values).toMatchObject({ strength: 2, padding: 10, color: 'blue' })
    expect(rebuild).toEqual(['padding'])
  })

  it('值为 undefined 恢复默认，重建类照样排重建', () => {
    const values = resolveParams(table, { padding: 10, color: 'blue' })
    const rebuild = applyPatch(table, values, { padding: undefined, color: undefined })
    expect(values.padding).toBe(48)
    expect(values.color).toBeUndefined()
    expect(rebuild).toEqual(['padding'])
  })

  it('不比较新旧值：重建类参数传同样的值也排重建', () => {
    const values = resolveParams(table)
    expect(applyPatch(table, values, { padding: 48 })).toEqual(['padding'])
  })

  it('对象类没传的子项回到默认值', () => {
    const values = resolveParams(table, { flowmap: { falloff: 0.9, alpha: 0.9 } })
    applyPatch(table, values, { flowmap: { alpha: 0.2 } })
    expect(values.flowmap).toEqual({ falloff: 0.3, alpha: 0.2 })
  })

  it('表里没有的键忽略，原型链上的名字也不算', () => {
    const values = resolveParams(table)
    const before = { ...values }
    const patch = JSON.parse('{"nope": 1, "toString": 1, "__proto__": {"strength": 9}}')
    expect(applyPatch(table, values, patch)).toEqual([])
    expect(values).toEqual(before)
  })
})

describe('optionTypesOf', () => {
  it('每个键映射到原生类型构造器', () => {
    expect(optionTypesOf(table)).toEqual({
      color: String,
      accent: String,
      strength: Number,
      padding: Number,
      debug: Boolean,
      flowmap: Object,
    })
  })
})
