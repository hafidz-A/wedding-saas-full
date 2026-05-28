import type { SectionSchema } from './types'

export const heroSchema: SectionSchema = {
  type: 'hero',
  label: { id: 'Pembuka', en: 'Hero' },
  fields: [
    { key: 'coupleName',       label: { id: 'Nama pasangan', en: 'Couple name' },        type: 'text' },
    { key: 'brideName',        label: { id: 'Nama mempelai wanita', en: 'Bride name' },   type: 'text' },
    { key: 'groomName',        label: { id: 'Nama mempelai pria', en: 'Groom name' },     type: 'text' },
    { key: 'weddingDate',      label: { id: 'Tanggal pernikahan', en: 'Wedding date' },   type: 'datetime' },
    { key: 'venue',            label: { id: 'Lokasi acara', en: 'Venue' },                type: 'text' },
    { key: 'welcomeText',      label: { id: 'Teks sambutan', en: 'Welcome text' },        type: 'textarea', rows: 2 },
    { key: 'scrollHint',       label: { id: 'Petunjuk scroll', en: 'Scroll hint' },       type: 'text' },
    { key: 'countdownEnabled', label: { id: 'Tampilkan hitung mundur', en: 'Show countdown' }, type: 'boolean' },
    { key: 'gateImage',        label: { id: 'Gambar gerbang', en: 'Gate image' },         type: 'image' },
    { key: 'blastPhotos',      label: { id: 'Foto sebaran', en: 'Blast photos' },         type: 'imageArray' },
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
    gateImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2000&q=80',
    blastPhotos: [
      'https://images.unsplash.com/photo-1525186402429-b4ff38bedec6?auto=format&fit=crop&w=500&q=80',
      'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=500&q=80',
      'https://images.unsplash.com/photo-1502635385003-ee1e6a1a742d?auto=format&fit=crop&w=500&q=80',
      'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=500&q=80',
    ],
  },
}
