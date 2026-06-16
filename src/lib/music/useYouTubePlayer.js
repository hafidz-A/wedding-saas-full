import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Load the YouTube IFrame API once and resolve with the global `YT` namespace.
 * Safe to call repeatedly — reuses the in-flight / already-loaded API.
 */
function loadYouTubeApi() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return
    if (window.YT && window.YT.Player) return resolve(window.YT)

    if (!document.getElementById('yt-iframe-api')) {
      const tag = document.createElement('script')
      tag.id = 'yt-iframe-api'
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
    }

    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') prev()
      resolve(window.YT)
    }
    // Fallback poll in case the ready callback already fired for another player.
    const poll = window.setInterval(() => {
      if (window.YT && window.YT.Player) {
        window.clearInterval(poll)
        resolve(window.YT)
      }
    }, 200)
  })
}

/**
 * Drive background music from a YouTube video via a hidden IFrame player.
 * Returns imperative controls + a `ready` flag. No-op when `youtubeId` is falsy.
 *
 *   const yt = useYouTubePlayer({ youtubeId, loop, volume: 60 })
 *   yt.play(); yt.pause(); yt.mute(); yt.unmute();
 */
export function useYouTubePlayer({ youtubeId, loop = true, volume = 60 }) {
  const playerRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!youtubeId || typeof window === 'undefined') return undefined
    let destroyed = false

    // Hidden host the API turns into an <iframe>. Kept off-screen, not display:none
    // (some browsers won't play audio from a fully hidden iframe).
    const host = document.createElement('div')
    host.style.cssText =
      'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;'
    document.body.appendChild(host)

    loadYouTubeApi().then((YT) => {
      if (destroyed || !YT) return
      playerRef.current = new YT.Player(host, {
        videoId: youtubeId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          modestbranding: 1,
          playsinline: 1,
          loop: loop ? 1 : 0,
          // A single-video loop needs the video listed as its own playlist.
          playlist: loop ? youtubeId : undefined,
        },
        events: {
          onReady: (e) => {
            try { e.target.setVolume(volume) } catch {}
            if (!destroyed) setReady(true)
          },
          onStateChange: (e) => {
            // Belt-and-suspenders loop: replay when a non-playlist video ends.
            if (loop && e.data === YT.PlayerState.ENDED) {
              try { e.target.playVideo() } catch {}
            }
          },
        },
      })
    })

    return () => {
      destroyed = true
      try { playerRef.current?.destroy?.() } catch {}
      playerRef.current = null
      try { host.remove() } catch {}
      setReady(false)
    }
  }, [youtubeId, loop, volume])

  const play = useCallback(() => { try { playerRef.current?.playVideo?.() } catch {} }, [])
  const pause = useCallback(() => { try { playerRef.current?.pauseVideo?.() } catch {} }, [])
  const mute = useCallback(() => { try { playerRef.current?.mute?.() } catch {} }, [])
  const unmute = useCallback(() => { try { playerRef.current?.unMute?.() } catch {} }, [])

  return { ready, play, pause, mute, unmute }
}
