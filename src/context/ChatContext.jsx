import { createContext, useContext, useState } from 'react'

const ChatContext = createContext({})

export const useChat = () => useContext(ChatContext)

export const ChatProvider = ({ children }) => {
    const [selectedChat, setSelectedChat] = useState(null)

    const value = {
        selectedChat, // Can be a User profile OR a Group object
        selectedUser: selectedChat, // Deprecated alias for backward compat
        selectChat: (chat) => setSelectedChat(chat),
    }

    return (
        <ChatContext.Provider value={value}>
            {children}
        </ChatContext.Provider>
    )
}
