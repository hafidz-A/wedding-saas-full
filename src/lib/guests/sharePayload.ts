/**
 * What to hand navigator.share() for a guest invite.
 *
 * The shared text must read exactly like the couple's "Pesan WhatsApp untuk
 * tamu" — same sentences, same paragraphs, link where they put it.
 *
 * Instagram (Direct) and Messenger only list themselves in the phone's share
 * sheet when the share carries a `url`, and the OS always places that url
 * AFTER the text. So the link can only travel as `url` without reordering
 * the message when it is the message's last thing: then { text: rest, url }
 * reads identically. When the link sits mid-message the whole message is
 * shared as text, wording untouched.
 */
export function buildSharePayload(message: string, link: string): { text: string; url?: string } {
  const trimmed = message.replace(/\s+$/, '')
  if (link && trimmed.endsWith(link)) {
    return { text: trimmed.slice(0, -link.length).replace(/[ \t]+$/, ''), url: link }
  }
  return { text: message }
}
