import { Seg } from '../ui'
import Learn from './Learn'
import Habits from './Habits'
import Focus from './Focus'
import Review from './Review'

export default function Grow({ sub, setSub }) {
  return (
    <>
      <Seg id="grow" value={sub} onChange={setSub} options={[{ k: 'learn', label: 'Learn' }, { k: 'habits', label: 'Habits' }, { k: 'focus', label: 'Focus' }, { k: 'review', label: 'Review' }]} />
      {sub === 'learn' && <Learn />}
      {sub === 'habits' && <Habits />}
      {sub === 'focus' && <Focus />}
      {sub === 'review' && <Review />}
    </>
  )
}
