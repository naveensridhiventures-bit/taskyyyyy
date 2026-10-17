import { createContext, useContext } from 'react'

// edit('task', item) opens the matching edit sheet from anywhere in the app
export const EditCtx = createContext(() => {})
export const useEdit = () => useContext(EditCtx)
