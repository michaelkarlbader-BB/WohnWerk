import { seiteSchuetzen } from '@/features/konto/seite-schuetzen'
import { RahmenTestSeite } from './rahmen-test-seite'

// Server shell of the test page: checks access itself like every signed-in page (BUG-2).
export default async function RahmenTestPage() {
  await seiteSchuetzen()
  return <RahmenTestSeite />
}
