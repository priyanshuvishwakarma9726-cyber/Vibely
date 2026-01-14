import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const ChatContext = createContext({})

export const useChat = () => useContext(ChatContext)

export const ChatProvider = ({ children }) => {
    const { user } = useAuth()
    const [selectedChat, setSelectedChat] = useState(null)
    const [onlineUsers, setOnlineUsers] = useState(new Set())

    useEffect(() => {
        if (!user) return

        const channel = supabase.channel('global')

        channel
            .on('presence', { event: 'sync' }, () => {
                const newState = channel.presenceState()
                const ids = new Set()
                for (const id in newState) {
                    ids.add(id)
                }
                setOnlineUsers(ids)
            })
            .on('presence', { event: 'join' }, ({ key }) => {
                setOnlineUsers(prev => {
                    const newSet = new Set(prev)
                    newSet.add(key)
                    return newSet
                })
            })
            .on('presence', { event: 'leave' }, ({ key }) => {
                setOnlineUsers(prev => {
                    const newSet = new Set(prev)
                    newSet.delete(key)
                    return newSet
                })
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({ online_at: new Date().toISOString() })
                }
            })

        return () => { supabase.removeChannel(channel) }
    }, [user])

    const value = {
        selectedChat,
        selectedUser: selectedChat,
        selectChat: (chat) => setSelectedChat(chat),
        onlineUsers,
    }

    return (
        <ChatContext.Provider value={value}>
            {children}
        </ChatContext.Provider>
    )
}
