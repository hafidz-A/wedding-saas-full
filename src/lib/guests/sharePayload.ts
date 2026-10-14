/**
 * What to hand navigator.share() for a guest invite.
 *
 * Instagram (Direct) and Messenger only list themselves in the phone's share
 * sheet when the shared data carries a URL — a text-only share, even one with
 * a link inside it, leaves them out. So the guest's personal link goes in
 * `url`, and `text` is the rest of the message with that link taken out
 * (Android joins text + url into one message; iOS hands both to the app), so
 * the link isn't sent twice. A message without the link is shared as text.
 */
export function buildSharePayload(message: string, link: string): { text: string; url?: string } {
  if (!link || !message.includes(link)) return { text: message }
  const text = message
    .split(link)
    .join('')
    .split('\n')
    .map((line) => line.replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return { text, url: link }
}
