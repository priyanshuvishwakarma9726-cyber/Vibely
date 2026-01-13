import Sidebar from '../components/Sidebar'
import ChatPlaceholder from '../components/ChatPlaceholder'
import ChatWindow from '../components/ChatWindow'
import { useChat } from '../context/ChatContext'

export default function Home() {
    const { selectedUser } = useChat()

    return (
        <>
            <Sidebar />
            {selectedUser ? <ChatWindow /> : <ChatPlaceholder />}
        </>
    )
}
