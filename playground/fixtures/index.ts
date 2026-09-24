import type { HostFixture } from './types'
import { clampFont } from './clamp-font'
import { hiddenContainer } from './hidden-container'
import { manyInstances } from './many-instances'
import { modernColors } from './modern-colors'
import { narrowWrap } from './narrow-wrap'
import { overflowHidden } from './overflow-hidden'
import { resetCanvas } from './reset-canvas'
import { themeTransition } from './theme-transition'

/** design.md 第十三节的 8 个宿主场景，顺序同表 */
export const hostFixtures: HostFixture[] = [
  resetCanvas,
  themeTransition,
  clampFont,
  overflowHidden,
  modernColors,
  hiddenContainer,
  manyInstances,
  narrowWrap,
]
