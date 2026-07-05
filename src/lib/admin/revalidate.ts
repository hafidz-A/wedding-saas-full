import 'server-only'
import { revalidatePath } from 'next/cache'

/** Fire the standard revalidations after any admin action that changes an
 *  invitation's state (comp / plan / suspend / publish / quota / refund). */
export function revalidateInvitation(): void {
  revalidatePath('/[template]/[slug]', 'page')
  revalidatePath('/[template]/[slug]/dashboard', 'page')
  revalidatePath('/profile', 'page')
}
