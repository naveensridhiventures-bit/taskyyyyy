import { Seg } from '../ui'
import Diet from './Diet'
import Gym from './Gym'
import Body from './Body'

export default function Health({ sub, setSub }) {
  return (
    <>
      <Seg id="health" value={sub} onChange={setSub} options={[{ k: 'diet', label: 'Diet' }, { k: 'gym', label: 'Gym' }, { k: 'body', label: 'Body' }]} />
      {sub === 'diet' && <Diet />}
      {sub === 'gym' && <Gym />}
      {sub === 'body' && <Body />}
    </>
  )
}
