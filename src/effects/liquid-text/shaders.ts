export const vertex = /* glsl */ `
  attribute vec2 uv;
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`

/**
 * 纹理只用 alpha 通道：离屏画布上是白字，颜色在这里用 uColor 现填，主题切换只改 uniform、不重画纹理。
 * flowmap 的 R/G 存 xy 方向的速度、B 存速度长度：位移吃 R/G，色差吃 B——慢慢移只有形变，快速划才炸开
 */
export const fragment = /* glsl */ `
  precision highp float;

  uniform sampler2D tMap;
  uniform sampler2D tFlow;
  uniform vec4 uColor;
  uniform vec4 uAccent;
  uniform float uStrength;
  uniform float uChroma;
  uniform float uIdle;
  uniform float uTime;
  uniform float uHover;

  varying vec2 vUv;

  void main() {
    vec3 flow = texture2D(tFlow, vUv).rgb;

    // 静止时的表面微流：几组不同频率的波叠加，周期互质所以看不出重复。没有这一层，鼠标一停画面就冻住。
    // 前两组空间频率低于整个单词的尺度，单独放大只会整块字一起平移（读作「字在抖」）；
    // 后一组把空间频率提到 13~21，同一个字母的不同部位错开起伏，才有剪切感。权重 0.55 让高频只做质感
    vec2 idle = (
      vec2(
        sin(uTime * 0.61 + vUv.y * 9.0) + sin(uTime * 0.43 + vUv.x * 5.0),
        cos(uTime * 0.53 + vUv.x * 7.0) + cos(uTime * 0.37 + vUv.y * 4.0)
      )
      + 0.55 * vec2(
        sin(uTime * 1.13 + vUv.x * 21.0 + vUv.y * 13.0),
        cos(uTime * 0.97 + vUv.y * 19.0 - vUv.x * 15.0)
      )
    ) * uIdle;

    // 鼠标不在附近时也保留一半的响应力度，免得靠近的瞬间强度突然翻倍
    vec2 offset = flow.xy * uStrength * (0.5 + uHover * 0.5) + idle;
    float chroma = flow.b * uChroma;

    // 三个通道各偏一点，速度越快分得越开
    float r = texture2D(tMap, vUv - offset - vec2(chroma, 0.0)).a;
    float g = texture2D(tMap, vUv - offset * 1.12).a;
    float b = texture2D(tMap, vUv - offset * 1.24 + vec2(chroma, 0.0)).a;

    float alpha = (r + g + b) / 3.0;
    if (alpha < 0.003) discard;

    // 高光往 accent 偏而不是「提亮」：亮色主题下文字是深色压在浅底上，提亮等于变淡，看起来是字糊了
    float speed = clamp(flow.b * 1.2, 0.0, 1.0);
    vec4 base = mix(uColor, uAccent, speed * uHover * 0.75);

    // 三通道相对平均值的偏差就是彩色边缘；颜色自带的 alpha 乘进最终 alpha（宿主常用半透明色做「淡一档」的文字）
    vec3 fringe = vec3(r, g, b) - vec3(alpha);
    gl_FragColor = vec4(base.rgb + fringe * 1.6, alpha * base.a);
  }
`
