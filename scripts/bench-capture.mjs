import { chromium } from '@playwright/test'
const BASE = process.env.CAP_BASE_URL || 'http://localhost:3100'
const URL = process.env.BENCH_URL || `${BASE}/lovebirds/demo-lovebirds`
const PRESET = process.env.BENCH_PRESET || 'swiftshader'
const PRESETS = {
  none: ['--hide-scrollbars'],
  swiftshader: ['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--disable-frame-rate-limit','--hide-scrollbars'],
  d3d11: ['--use-gl=angle','--use-angle=d3d11','--enable-webgl','--ignore-gpu-blocklist','--hide-scrollbars'],
  egl: ['--use-gl=egl','--enable-webgl','--ignore-gpu-blocklist','--hide-scrollbars'],
  gpu: ['--enable-gpu','--ignore-gpu-blocklist','--hide-scrollbars'],
}
const ARGS = PRESETS[PRESET] || PRESETS.swiftshader
const HEADLESS = process.env.BENCH_HEADLESS !== '0'
console.log('preset', PRESET, 'headless', HEADLESS, 'url', URL)

const browser = await chromium.launch({ headless: HEADLESS, args: ARGS })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
await page.goto(URL, { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts && document.fonts.ready).catch(()=>{})

await page.evaluate(() => {
  window.__b = {
    setScroll(y){ const l=window.__lenis; if(l&&l.scrollTo){l.scrollTo(y,{immediate:true,force:true}); try{l.raf(performance.now())}catch{}} else window.scrollTo(0,y) },
    raf(n){ return new Promise(r=>{let i=0;const s=()=>{i++; i>=n?r():requestAnimationFrame(s)};requestAnimationFrame(s)}) },
  }
})

const now = () => Number(process.hrtime.bigint() / 1000000n)
const max = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)
console.log('max scroll', max, 'lenis?', await page.evaluate(()=>!!window.__lenis))

// warm a few
for (let i=0;i<3;i++){ await page.evaluate((y)=>window.__b.setScroll(y), (i*max/3)); }

let evalT=0, rafT=0, shotT=0, shotNoFileT=0
const NIT = 15
for (let i=0;i<NIT;i++){
  const y = (i/NIT)*max
  let t=now(); await page.evaluate((y)=>window.__b.setScroll(y), y); evalT+=now()-t
  t=now(); await page.evaluate(()=>window.__b.raf(2)); rafT+=now()-t
  t=now(); await page.screenshot({ type:'jpeg', quality:88, path:`captures/_bench_${i}.jpg` }); shotT+=now()-t
  t=now(); await page.screenshot({ type:'jpeg', quality:88 }); shotNoFileT+=now()-t  // buffer, no disk
}
console.log(`per-iter avg over ${NIT}:`)
console.log('  setScroll evaluate :', (evalT/NIT).toFixed(0), 'ms')
console.log('  raf(2) wait        :', (rafT/NIT).toFixed(0), 'ms')
console.log('  screenshot to file :', (shotT/NIT).toFixed(0), 'ms')
console.log('  screenshot to buf  :', (shotNoFileT/NIT).toFixed(0), 'ms')
const hasGL = await page.evaluate(() => !!window.galacticScene)
console.log('  window.galacticScene present:', hasGL)
await page.evaluate((y)=>window.__b.setScroll(y), max*0.45)
await page.evaluate(()=>window.__b.raf(4))
await page.screenshot({ path: `captures/_bench_${PRESET}_final.png` })
console.log('  saved captures/_bench_'+PRESET+'_final.png')

await browser.close()
import('fs').then(fs=>{for(let i=0;i<NIT;i++){try{fs.rmSync(`captures/_bench_${i}.jpg`)}catch{}}})
