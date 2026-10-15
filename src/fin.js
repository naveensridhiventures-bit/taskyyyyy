import { num } from './store'

const mk = a => a.map(([k, e]) => ({ k, e }))
export const INCOME_CATS = mk([['Salary', '💼'], ['Freelance', '🧑‍💻'], ['Business', '🏪'], ['Bonus', '🎁'], ['Interest', '🏦'], ['Dividends', '📈'], ['Rental income', '🏠'], ['Commission', '🤝'], ['Gift received', '🎉'], ['Refund', '↩️'], ['Cashback', '🪙'], ['Selling items', '🏷️'], ['Reimbursement', '🧾'], ['Debt received', '🤲'], ['Borrowed money', '🙏'], ['Other income', '✨']])
export const EXPENSE_CATS = mk([['Food & dining', '🍽️'], ['Groceries', '🛒'], ['Rent', '🏠'], ['EMI / Loan', '🏦'], ['Bills & utilities', '💡'], ['Mobile & internet', '📶'], ['Fuel', '⛽'], ['Transport', '🚌'], ['Shopping', '🛍️'], ['Clothes', '👕'], ['Health & medicine', '💊'], ['Gym & fitness', '🏋️'], ['Education', '🎓'], ['Entertainment', '🎬'], ['Travel', '✈️'], ['Subscriptions', '📺'], ['Family', '👨‍👩‍👧'], ['Gifts & donations', '🎁'], ['Insurance', '🛡️'], ['Investments', '📈'], ['Personal care', '💈'], ['Home & repairs', '🔧'], ['Taxes', '🧮'], ['Debt paid', '🤲'], ['Lent money', '💸'], ['Other expense', '✨']])

// money moved because of lending/borrowing is not real income or spending
export const DEBT_CATS = ['Debt received', 'Borrowed money', 'Debt paid', 'Lent money']
export const catEmoji = (type, name) => (type === 'transfer' ? '🔁' : [...INCOME_CATS, ...EXPENSE_CATS].find(c => c.k === name)?.e || '✨')

export const ACCOUNT_KINDS = [
  { k: 'bank', l: 'Bank', e: '🏦', c: 'linear-gradient(135deg,#4cc9f0,#5b6cff)' },
  { k: 'cash', l: 'Cash', e: '💵', c: 'linear-gradient(135deg,#3ddc97,#18a679)' },
  { k: 'wallet', l: 'UPI / Wallet', e: '📱', c: 'linear-gradient(135deg,#ffc531,#ff8a4c)' },
  { k: 'savings', l: 'Savings', e: '🐖', c: 'linear-gradient(135deg,#ff8fa0,#ff5d73)' },
  { k: 'card', l: 'Credit card', e: '💳', c: 'linear-gradient(135deg,#8b6cff,#c86bff)' }
]
export const kindOf = k => ACCOUNT_KINDS.find(x => x.k === k) || ACCOUNT_KINDS[0]

export const inr = n => `${n < 0 ? '-' : ''}₹${Math.abs(Math.round(n)).toLocaleString('en-IN')}`

export function balances(db) {
  const list = db.accounts.map(a => {
    let b = num(a.opening)
    db.finance.forEach(t => {
      const amt = num(t.amount)
      if (t.type === 'income' && t.account === a.id) b += amt
      else if (t.type === 'expense' && t.account === a.id) b -= amt
      else if (t.type === 'transfer') { if (t.account === a.id) b -= amt; if (t.toAccount === a.id) b += amt }
    })
    return { ...a, balance: b }
  })
  return { list, total: list.reduce((s, a) => s + a.balance, 0) }
}

export const remaining = d => Math.max(0, num(d.amount) - num(d.paid))
export function debtTotals(db) {
  let receive = 0, pay = 0
  db.debts.forEach(d => { if (d.direction === 'receive') receive += remaining(d); else pay += remaining(d) })
  return { receive, pay }
}

export function monthSummary(db, m) {
  let income = 0, expense = 0
  const cats = {}
  db.finance.forEach(t => {
    if (!t.date.startsWith(m) || DEBT_CATS.includes(t.category)) return
    const a = num(t.amount)
    if (t.type === 'income') income += a
    else if (t.type === 'expense') { expense += a; cats[t.category] = (cats[t.category] || 0) + a }
  })
  return { income, expense, cats: Object.entries(cats).sort((x, y) => y[1] - x[1]) }
}
