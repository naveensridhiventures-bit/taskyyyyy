import { useState } from 'react'
import { EditCtx } from './editctx'
import { TaskForm } from './pages/Tasks'
import { LearnForm } from './pages/Learn'
import { TxnForm } from './pages/Txns'
import { DebtForm } from './pages/People'
import { HabitForm } from './pages/Habits'
import { GoalForm } from './pages/Goals'

// one place that opens the right edit sheet for whatever the user taps
export function EditProvider({ children }) {
  const [s, setS] = useState({ kind: null, item: null })
  const edit = (kind, item) => setS({ kind, item })
  const close = () => setS(x => ({ ...x, kind: null }))
  const common = { onClose: close, edit: s.item }
  return (
    <EditCtx.Provider value={edit}>
      {children}
      <TaskForm open={s.kind === 'task'} {...common} />
      <LearnForm open={s.kind === 'learn'} {...common} />
      <TxnForm open={s.kind === 'txn'} {...common} />
      <DebtForm open={s.kind === 'debt'} {...common} />
      <HabitForm open={s.kind === 'habit'} {...common} />
      <GoalForm open={s.kind === 'goal'} {...common} />
    </EditCtx.Provider>
  )
}
