import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const ThemeContext = createContext({})

export const useTheme = () => useContext(ThemeContext)

export const ThemeProvider = ({ children }) => {
    const [darkMode, setDarkMode] = useState(false)

    useEffect(() => {
        // Load preference
        const savedMode = localStorage.getItem('darkMode') === 'true'
        setDarkMode(savedMode)
        if (savedMode) {
            document.documentElement.classList.add('dark')
        }
    }, [])

    const toggleDarkMode = () => {
        setDarkMode(prev => {
            const newMode = !prev
            localStorage.setItem('darkMode', newMode.toString())
            if (newMode) {
                document.documentElement.classList.add('dark')
            } else {
                document.documentElement.classList.remove('dark')
            }
            return newMode
        })
    }

    const value = {
        darkMode,
        toggleDarkMode
    }

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    )
}
