import { useState, useRef, useEffect } from 'react'
import { X, Camera, RefreshCw, Moon, Sun, Check } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'

export default function SettingsModal({ onClose }) {
    const { user } = useAuth()
    const { darkMode, toggleDarkMode } = useTheme()
    const [loading, setLoading] = useState(false)
    const [username, setUsername] = useState(user.user_metadata?.username || '')
    const [discriminator, setDiscriminator] = useState('')
    const [fullName, setFullName] = useState(user.user_metadata?.full_name || '')
    const [about, setAbout] = useState('')
    const [avatarUrl, setAvatarUrl] = useState('')
    const fileInputRef = useRef(null)
    const [copySuccess, setCopySuccess] = useState(false)

    // Load initial profile data from DB (in case metadata is stale)
    useEffect(() => {
        const fetchProfile = async () => {
            const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
            if (data) {
                setUsername(data.username || '')
                setFullName(data.full_name || '')
                setAbout(data.about || '')
                setAvatarUrl(data.avatar_url || '')
                setDiscriminator(data.discriminator || '0000')
            }
        }
        fetchProfile()
    }, [user.id])

    const fullUniqueId = `${username}#${discriminator}`

    const handleSave = async () => {
        setLoading(true)
        try {
            // Update profile in DB
            const { error } = await supabase.from('profiles').update({
                // username, // Don't update username as it's not editable here and might overwrite with empty
                full_name: fullName,
                about,
                avatar_url: avatarUrl
            }).eq('id', user.id)

            if (error) throw error

            // Update Auth User Metadata to keep session in sync so Sidebar updates immediately
            const { error: authError } = await supabase.auth.updateUser({
                data: {
                    full_name: fullName,
                    avatar_url: avatarUrl,
                }
            })

            if (authError) console.error("Error updating auth metadata:", authError)

            onClose()
        } catch (err) {
            console.error(err)
            alert("Failed to update settings")
        } finally {
            setLoading(false)
        }
    }

    const handleAvatarUpload = async (e) => {
        if (!e.target.files || !e.target.files[0]) return

        const file = e.target.files[0]
        const fileExt = file.name.split('.').pop()
        const fileName = `avatars/${user.id}-${Date.now()}.${fileExt}` // storage path

        try {
            const { error: uploadError } = await supabase.storage
                .from('chat-media') // Reusing chat-media bucket for simplicity
                .upload(fileName, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(fileName)
            setAvatarUrl(publicUrl)
        } catch (err) {
            console.error(err)
            alert("Failed to upload image")
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-whatsapp-dark w-full max-w-md rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="bg-whatsapp-green px-4 py-3 flex items-center justify-between text-white">
                    <h2 className="text-lg font-medium">Settings</h2>
                    <button onClick={onClose}><X className="w-6 h-6" /></button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Avatar Section */}
                    <div className="flex flex-col items-center gap-3">
                        <div className="relative w-24 h-24">
                            <img
                                src={avatarUrl || `https://ui-avatars.com/api/?name=${fullName}&background=random`}
                                alt="Profile"
                                className="w-24 h-24 rounded-full object-cover border-4 border-gray-100 dark:border-gray-700"
                            />
                            <button
                                className="absolute bottom-0 right-0 bg-whatsapp-teal text-white p-2 rounded-full shadow hover:bg-teal-700 transition"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Camera className="w-4 h-4" />
                            </button>
                            <input
                                type="file"
                                hidden
                                ref={fileInputRef}
                                accept="image/*"
                                onChange={handleAvatarUpload}
                            />
                        </div>
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-whatsapp-light mb-1">Email</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 focus:outline-none cursor-not-allowed"
                                value={user.email}
                                disabled
                                readOnly
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-whatsapp-light mb-1">Unique ID</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 focus:outline-none font-mono"
                                    value={fullUniqueId}
                                    readOnly
                                />
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(fullUniqueId)
                                        setCopySuccess(true)
                                        setTimeout(() => setCopySuccess(false), 2000)
                                    }}
                                    className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium text-gray-600 dark:text-gray-300 min-w-[70px]"
                                    title="Copy Unique ID"
                                >
                                    {copySuccess ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Search format: username#1234</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-whatsapp-light mb-1">Display Name</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded dark:bg-whatsapp-inputDark dark:text-white focus:outline-none focus:border-whatsapp-green"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-whatsapp-light mb-1">About</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded dark:bg-whatsapp-inputDark dark:text-white focus:outline-none focus:border-whatsapp-green"
                                value={about}
                                onChange={(e) => setAbout(e.target.value)}
                            />
                        </div>
                        {/* Toggle Theme - Optional addition since user mentioned dark mode earlier, checking if context supports it */}
                        <div className="flex items-center justify-between pt-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-whatsapp-light">Dark Mode</span>
                            <button
                                onClick={toggleDarkMode}
                                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                {darkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-600" />}
                            </button>
                        </div>
                    </div>

                    {/* Save Button */}
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full bg-whatsapp-green hover:bg-whatsapp-teal text-white py-2.5 rounded font-medium flex items-center justify-center gap-2 transition disabled:opacity-70"
                    >
                        {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    )
}
