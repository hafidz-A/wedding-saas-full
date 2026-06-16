export interface LibraryTrack {
  id: string
  title: string
  url: string
}

/**
 * Built-in background tracks the couple can pick without uploading or pasting a
 * link. These SoundHelix samples are free to use and reliably hosted — swap them
 * for licensed wedding instrumentals by dropping files into /public/music and
 * pointing these urls at them (e.g. '/music/track-1.mp3').
 */
export const MUSIC_LIBRARY: LibraryTrack[] = [
  { id: 'lib-1', title: 'Instrumental 1', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 'lib-2', title: 'Instrumental 2', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 'lib-3', title: 'Instrumental 3', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' },
]
