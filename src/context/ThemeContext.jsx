import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const ThemeContext = createContext({})

export const useTheme = () => useContext(ThemeContext)

export const ThemeProvider = ({ children }) => {
    const [darkMode, setDarkMode] = useState(false)

    useEffect(() => {
        // FORCE LIGHT MODE: User requested removal of dark theme
        setDarkMode(false)
        document.documentElement.classList.remove('dark')
        localStorage.setItem('darkMode', 'false')
    }, [])

    const toggleDarkMode = () => {
        // Disabled
        setDarkMode(false)
        document.documentElement.classList.remove('dark')
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
