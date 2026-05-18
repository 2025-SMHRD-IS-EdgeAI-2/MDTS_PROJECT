import React, { createContext, useContext, useState } from 'react'
import { AlertModal } from '../components/ui'

const AlertContext = createContext()

export function AlertProvider({ children }) {
  const [alert, setAlert] = useState({ isOpen: false, title: '', message: '', type: 'info', onConfirm: null, onCancel: null, isConfirm: false })

  const showAlert = (message, title = '알림', type = 'info') => {
    setAlert({ isOpen: true, title, message, type, onConfirm: null, onCancel: null, isConfirm: false })
  }

  const showConfirm = (message, onConfirm, title = '확인', type = 'warning') => {
    setAlert({ isOpen: true, title, message, type, onConfirm, isConfirm: true })
  }

  const handleConfirm = () => {
    if (alert.onConfirm) alert.onConfirm()
    setAlert(prev => ({ ...prev, isOpen: false }))
  }

  const handleCancel = () => {
    setAlert(prev => ({ ...prev, isOpen: false }))
  }

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <AlertModal 
        isOpen={alert.isOpen}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        isConfirm={alert.isConfirm}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </AlertContext.Provider>
  )
}

export const useAlert = () => {
  const context = useContext(AlertContext)
  if (!context) throw new Error('useAlert must be used within an AlertProvider')
  return context
}
