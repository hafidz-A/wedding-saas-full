import type { SectionSchema } from './types'
import { demoImg } from '@/lib/demoImages'

export const heroSchema: SectionSchema = {
  type: 'hero',
  label: { id: 'Pembuka', en: 'Hero' },
  fields: [
    { key: 'coupleName',       label: { id: 'Nama pasangan', en: 'Couple name' },        type: 'text', linkedGroup: 'couple' },
    { key: 'brideName',        label: { id: 'Nama mempelai wanita', en: 'Bride name' },   type: 'text', linkedGroup: 'couple' },
    { key: 'groomName',        label: { id: 'Nama mempelai pria', en: 'Groom name' },     type: 'text', linkedGroup: 'couple' },
    { key: 'weddingDate',      label: { id: 'Tanggal pernikahan', en: 'Wedding date' },   type: 'datetime' },
    { key: 'venue',            label: { id: 'Lokasi acara', en: 'Venue' },                type: 'text' },
    { key: 'welcomeText',      label: { id: 'Teks sambutan', en: 'Welcome text' },        type: 'textarea', rows: 2 },
    { key: 'scrollHint',       label: { id: 'Petunjuk scroll', en: 'Scroll hint' },       type: 'text' },
    { key: 'countdownEnabled', label: { id: 'Tampilkan hitung mundur', en: 'Show countdown' }, type: 'boolean' },
    { key: 'gateImage',        label: { id: 'Gambar gerbang', en: 'Gate image' },         type: 'image' },
    // Each blast photo is its own animated element scattering from the gate —
    // past 12 the scatter turns into clutter and the open animation chugs.
    { key: 'blastPhotos',      label: { id: 'Foto sebaran', en: 'Blast photos' },         type: 'imageArray', maxItems: 12 },
  ],
  defaults: {
    monogram: 'A & H',
    coupleName: 'Aurelia & Hadyan',
    brideName: 'Aurelia',
    groomName: 'Hadyan',
    weddingDate: '2026-12-12T16:00:00',
    venue: 'The Grand Ballroom, Jakarta',
    welcomeText: 'Welcome, our dear guest',
    scrollHint: 'Scroll to enter',
    countdownEnabled: true,
    gateImage: demoImg('coupleGate', 2000),
    blastPhotos: [
      demoImg('bridePortrait', 500),
      demoImg('storyWedding', 500),
      demoImg('storyFirstMeet', 500),
      demoImg('coupleClassic', 500),
    ],
  },
}
