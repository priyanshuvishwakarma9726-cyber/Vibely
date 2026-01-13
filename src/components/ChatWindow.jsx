import { useState, useEffect, useRef } from 'react'
import { MoreVertical, Search, Paperclip, Smile, Mic, Send, Check, CheckCheck, User, Image as ImageIcon, X, Play, Pause, Loader2, Trash2, Ban, Lock, Users, Video as VideoIcon, Phone, Reply, Download, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useChat } from '../context/ChatContext'
import { useCall } from '../context/CallContext'
import { supabase } from '../lib/supabase'
import GroupInfoModal from './GroupInfoModal'

export default function ChatWindow() {
    const { user } = useAuth()
    const { selectedChat, selectChat } = useChat()
    const { startCall } = useCall()
    const isGroup = selectedChat?.type === 'group'

    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [showMenu, setShowMenu] = useState(false)
    const [isBlocked, setIsBlocked] = useState(false)
    const [amIBlocked, setAmIBlocked] = useState(false)
    const [groupMembers, setGroupMembers] = useState({})
    const messagesEndRef = useRef(null)

    // Features State
    const [replyingTo, setReplyingTo] = useState(null)
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, messageId: null, senderId: null, content: null })
    const [showGroupInfo, setShowGroupInfo] = useState(false)

    // Media
    const fileInputRef = useRef(null)
    const mediaRecorderRef = useRef(null)
    const [isRecording, setIsRecording] = useState(false)
    const [isUploading, setIsUploading] = useState(false)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    // Check Blocking (Only for 1:1)
    useEffect(() => {
        if (!selectedChat || isGroup) return
        setIsBlocked(false)
        setAmIBlocked(false)

        const checkBlocking = async () => {
            const { data: myBlock } = await supabase.from('blocked_users').select('*').eq('blocker_id', user.id).eq('blocked_id', selectedChat.id).single()
            setIsBlocked(!!myBlock)

            const { data: theirBlock } = await supabase.from('blocked_users').select('*').eq('blocker_id', selectedChat.id).eq('blocked_id', user.id).single()
            setAmIBlocked(!!theirBlock)
        }
        checkBlocking()
    }, [selectedChat, user.id, isGroup])

    // Load Messages with Reply content logic
    const fetchMessages = async () => {
        if (!selectedChat) return
        setMessages([])
        setLoading(true)

        // We select *, and ideally we could join for reply. 
        // For simplicity, we fetch all messages, then we can resolve reply content from memory if loaded, or we fetch individually.
        // Actually, fetching everything is fine. We will map reply_to ID to content on render.
        let query = supabase.from('messages').select('*').order('created_at', { ascending: true })

        if (isGroup) {
            query = query.eq('group_id', selectedChat.id)
        } else {
            query = query.is('group_id', null)
                .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedChat.id}),and(sender_id.eq.${selectedChat.id},receiver_id.eq.${user.id})`)
        }

        const { data } = await query
        if (data) {
            const visible = data.filter(m => !(m.deleted_by || []).includes(user.id))
            setMessages(visible)
            scrollToBottom()

            if (isGroup) {
                const userIds = [...new Set(visible.map(m => m.sender_id))]
                if (userIds.length > 0) {
                    const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', userIds)
                    if (profiles) {
                        const map = {}
                        profiles.forEach(p => map[p.id] = p)
                        setGroupMembers(prev => ({ ...prev, ...map }))
                    }
                }
            }
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchMessages()

        const filter = isGroup ? `group_id=eq.${selectedChat.id}` : null
        const channel = supabase.channel(`chat:${selectedChat.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter }, (payload) => {
                // Simplistic filter
                let isValid = false
                if (isGroup) isValid = payload.new.group_id === selectedChat.id
                else if (!payload.new.group_id) {
                    isValid = (payload.new.sender_id === selectedChat.id && payload.new.receiver_id === user.id) ||
                        (payload.new.sender_id === user.id && payload.new.receiver_id === selectedChat.id)
                }

                if (isValid) {
                    if (payload.eventType === 'INSERT') {
                        setMessages(prev => {
                            if (prev.find(m => m.id === payload.new.id)) return prev
                            return [...prev, payload.new]
                        })
                        scrollToBottom()
                    } else if (payload.eventType === 'UPDATE') {
                        setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m))
                    }
                }
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [selectedChat, user.id, isGroup])


    // --- Actions ---
    const handleAddReaction = async (emoji) => {
        const msg = messages.find(m => m.id === contextMenu.messageId)
        if (!msg) return

        const currentReactions = msg.reactions || {}
        // Structure: { "❤️": ["uid1", "uid2"] }
        const users = currentReactions[emoji] || []

        let newUsers
        if (users.includes(user.id)) {
            newUsers = users.filter(u => u !== user.id) // Toggle off
        } else {
            newUsers = [...users, user.id] // Toggle on
        }

        const newReactions = { ...currentReactions, [emoji]: newUsers }
        if (newUsers.length === 0) delete newReactions[emoji]

        await supabase.from('messages').update({ reactions: newReactions }).eq('id', contextMenu.messageId)
        setContextMenu({ ...contextMenu, visible: false })
    }

    const handleReply = () => {
        const msg = messages.find(m => m.id === contextMenu.messageId)
        if (msg) setReplyingTo(msg)
        setContextMenu({ ...contextMenu, visible: false })
    }

    const exportChat = () => {
        if (messages.length === 0) return
        const text = messages.map(m => {
            const sender = m.sender_id === user.id ? 'Me' : (groupMembers[m.sender_id]?.username || 'Them')
            const content = m.message_type === 'deleted' ? '(deleted)' : m.content
            return `[${new Date(m.created_at).toLocaleString()}] ${sender}: ${content}`
        }).join('\n')

        const blob = new Blob([text], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `chat_export_${selectedChat.id}.txt`
        a.click()
        setShowMenu(false)
    }

    // --- Sending ---
    const sendMessage = async (content, type) => {
        const payload = {
            sender_id: user.id,
            content: content,
            message_type: type,
            reply_to: replyingTo ? replyingTo.id : null // Add reply_to
        }

        if (isGroup) {
            payload.group_id = selectedChat.id
            payload.receiver_id = user.id
        } else {
            payload.receiver_id = selectedChat.id
        }

        const { error } = await supabase.from('messages').insert([payload])
        if (!error) {
            setReplyingTo(null) // Clear reply
            setNewMessage('')
        }
    }

    // --- Helpers ---
    const getReplyContent = (replyId) => {
        const m = messages.find(msg => msg.id === replyId)
        if (!m) return "Message not found"
        return m.message_type === 'text' ? m.content : `[${m.message_type}]`
    }

    // Responsive Mobile Back
    const handleMobileBack = () => selectChat(null)

    return (
        <div className={`flex-1 flex flex-col h-full bg-[#efeae2] dark:bg-whatsapp-chatDark relative transition-colors duration-200 ${selectedChat ? 'flex' : 'hidden md:flex'}`} onClick={() => setContextMenu({ ...contextMenu, visible: false })}>
            <div className="absolute inset-0 z-0 opacity-[0.06] bg-chat-pattern pointer-events-none dark:opacity-[0.03]"></div>

            {/* Header */}
            <div className="bg-whatsapp-header dark:bg-whatsapp-headerDark px-4 py-2.5 flex justify-between items-center border-b border-gray-200 dark:border-gray-700 z-10 shrink-0">
                <div className="flex items-center gap-3 cursor-pointer">
                    {/* Back Button Mobile */}
                    <button className="md:hidden text-gray-600 dark:text-gray-300 mr-1" onClick={handleMobileBack}>
                        <ArrowLeft className="w-6 h-6" />
                    </button>

                    <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center overflow-hidden">
                        {isGroup ? (
                            <Users className="w-6 h-6 text-gray-500 dark:text-gray-300" />
                        ) : (
                            selectedChat.avatar_url ? <img src={selectedChat.avatar_url} className="w-full h-full object-cover" /> : <User className="w-6 h-6 text-gray-500 dark:text-gray-300" />
                        )}
                    </div>
                    <div>
                        <h2 className="text-gray-900 dark:text-white font-medium leading-none">{isGroup ? selectedChat.name : selectedChat.username}</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{isGroup ? 'Group Info' : 'Contact Info'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-6 text-gray-500 dark:text-gray-400">
                    {!isGroup && !isBlocked && (
                        <div className="hidden md:flex items-center gap-4">
                            <button className="hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-full" onClick={() => startCall(selectedChat.id, 'video')}><VideoIcon className="w-5 h-5" /></button>
                            <button className="hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-full" onClick={() => startCall(selectedChat.id, 'audio')}><Phone className="w-5 h-5" /></button>
                        </div>
                    )}
                    <div className="relative">
                        <MoreVertical className="w-5 h-5 cursor-pointer" onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }} />
                        {showMenu && (
                            <div className="absolute right-0 top-8 bg-white dark:bg-whatsapp-darker shadow-lg rounded py-2 w-48 z-10 border border-gray-100 dark:border-gray-700">
                                {isGroup ? (
                                    <button className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm" onClick={() => { setShowMenu(false); setShowGroupInfo(true); }}>Group info</button>
                                ) : (
                                    <button className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-red-600 text-sm" onClick={async () => {
                                        if (isBlocked) await supabase.from('blocked_users').delete().match({ blocker_id: user.id, blocked_id: selectedChat.id })
                                        else await supabase.from('blocked_users').insert([{ blocker_id: user.id, blocked_id: selectedChat.id }])
                                        setIsBlocked(!isBlocked); setShowMenu(false);
                                    }}>{isBlocked ? 'Unblock' : 'Block'}</button>
                                )}
                                <button className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm flex items-center gap-2" onClick={exportChat}>
                                    <Download className="w-4 h-4" /> Export Chat
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Body */}
            {showGroupInfo && <GroupInfoModal onClose={() => setShowGroupInfo(false)} />}

            <div className="flex-1 overflow-y-auto p-4 z-10 space-y-2 custom-scrollbar">
                {messages.map(msg => {
                    const isMe = msg.sender_id === user.id
                    const isDeleted = msg.message_type === 'deleted'

                    // Reply info
                    const replyContent = msg.reply_to ? getReplyContent(msg.reply_to) : null

                    // Reactions
                    const reactions = msg.reactions || {}
                    const reactionCounts = Object.entries(reactions).map(([emoji, uids]) => ({ emoji, count: uids.length })).filter(r => r.count > 0)

                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group max-w-full`}>
                            <div
                                onContextMenu={(e) => {
                                    e.preventDefault()
                                    if (isDeleted) return
                                    setContextMenu({ visible: true, x: e.pageX, y: e.pageY, messageId: msg.id, senderId: msg.sender_id, content: msg.message_type === 'text' ? msg.content : 'media' })
                                }}
                                className={`
                                    relative max-w-[85%] md:max-w-[65%] px-2 py-1.5 text-sm rounded-lg shadow-sm 
                                    ${isMe ? 'bg-whatsapp-messageOut dark:bg-whatsapp-messageOutDark rounded-tr-none' : 'bg-whatsapp-messageIn dark:bg-whatsapp-messageInDark rounded-tl-none'}
                                `}
                            >
                                {/* Reply Quote Box */}
                                {replyContent && (
                                    <div className={`mb-1 p-2 rounded bg-black/5 dark:bg-black/20 border-l-4 ${isMe ? 'border-green-600' : 'border-teal-500'} text-xs truncate max-w-full opacity-80`}>
                                        {replyContent}
                                    </div>
                                )}

                                <div className="pr-12 md:pr-10 pb-2 pl-1 break-words">
                                    {isDeleted ? (
                                        <span className="italic text-gray-500 flex gap-1"><Ban className="w-3 h-3" /> Deleted</span>
                                    ) : (
                                        <>
                                            {msg.message_type === 'text' && <span className="text-gray-900 dark:text-white leading-relaxed">{msg.content}</span>}
                                            {msg.message_type === 'image' && <img src={msg.content} className="max-w-full max-h-64 rounded object-cover" />}
                                        </>
                                    )}
                                </div>

                                {/* Reactions Display */}
                                {reactionCounts.length > 0 && (
                                    <div className="absolute -bottom-3 right-0 bg-white dark:bg-gray-700 rounded-full px-1.5 py-0.5 shadow border border-gray-100 dark:border-gray-600 flex gap-0.5 text-xs">
                                        {reactionCounts.map(r => <span key={r.emoji}>{r.emoji}{r.count > 1 ? r.count : ''}</span>)}
                                    </div>
                                )}

                                <div className="absolute bottom-1 right-2 text-[10px] text-gray-500">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Context Menu */}
            {contextMenu.visible && (
                <div className="fixed bg-white dark:bg-whatsapp-darker shadow-2xl rounded-lg z-[100] py-2 w-48 border border-gray-100 dark:border-gray-600" style={{ top: contextMenu.y, left: contextMenu.x }}>
                    {/* Reactions Row */}
                    <div className="flex justify-between px-3 pb-2 mb-1 border-b border-gray-100 dark:border-gray-700">
                        {['👍', '❤️', '😂', '😮', '😢', '🎉'].map(emoji => (
                            <button key={emoji} className="hover:scale-125 transition text-lg" onClick={() => handleAddReaction(emoji)}>{emoji}</button>
                        ))}
                    </div>
                    <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm flex gap-2" onClick={handleReply}><Reply className="w-4 h-4" /> Reply</button>
                    <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm flex gap-2" onClick={async () => {
                        const content = contextMenu.content || 'media'
                        await navigator.clipboard.writeText(content)
                        setContextMenu({ ...contextMenu, visible: false })
                    }}><Check className="w-4 h-4" /> Copy</button>
                    {contextMenu.senderId === user.id && (
                        <button className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 text-sm flex gap-2" onClick={async () => {
                            await supabase.from('messages').update({ content: 'deleted', message_type: 'deleted' }).eq('id', contextMenu.messageId)
                            setContextMenu({ ...contextMenu, visible: false })
                        }}><Trash2 className="w-4 h-4" /> Delete</button>
                    )}
                </div>
            )}

            {/* Replying Banner */}
            {replyingTo && (
                <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 flex justify-between items-center border-l-4 border-teal-500 ml-4 mb-2 rounded-r mr-4 relative z-10">
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-teal-600 dark:text-teal-400 font-bold text-xs">Replying to message</span>
                        <span className="text-gray-500 dark:text-gray-400 text-sm truncate">{replyingTo.message_type === 'text' ? replyingTo.content : 'Media'}</span>
                    </div>
                    <button onClick={() => setReplyingTo(null)}><X className="w-5 h-5 text-gray-500" /></button>
                </div>
            )}

            {/* Input Form (Recycled) */}
            {(isBlocked || amIBlocked) && !isGroup ? (
                <div className="p-4 bg-gray-100 text-center text-gray-500 text-sm">Cannot message this user</div>
            ) : (
                <form onSubmit={(e) => { e.preventDefault(); sendMessage(newMessage, 'text') }} className="bg-whatsapp-input dark:bg-whatsapp-inputDark px-4 py-3 flex items-center gap-3 z-10 shrink-0 transition-colors duration-200">
                    <button type="button" className="text-gray-500 data-[theme=dark]:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                        <Smile className="w-6 h-6" />
                    </button>

                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                                const file = e.target.files[0]
                                const type = 'image'
                                setIsUploading(true)
                                const upload = async () => {
                                    try {
                                        const fileExt = file.name.split('.').pop()
                                        const fileName = `uploads/${Date.now()}.${fileExt}`
                                        const { error: uploadError } = await supabase.storage.from('chat-media').upload(fileName, file)
                                        if (uploadError) throw uploadError
                                        const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(fileName)
                                        await sendMessage(publicUrl, type)
                                    } catch (err) { console.error(err); alert("Failed") }
                                    finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = '' }
                                }
                                upload()
                            }
                        }}
                    />
                    <button
                        type="button"
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading || isRecording}
                    >
                        <Paperclip className="w-6 h-6" />
                    </button>

                    <div className="flex-1 bg-white dark:bg-whatsapp-darker rounded-lg flex items-center px-4 py-2 transition-colors duration-200">
                        <input
                            type="text"
                            placeholder={isRecording ? "Recording audio..." : "Type a message"}
                            className="w-full border-none outline-none text-sm text-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-transparent"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            disabled={isRecording || isUploading}
                        />
                    </div>

                    {newMessage.trim() ? (
                        <button type="submit" className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                            <Send className="w-6 h-6" />
                        </button>
                    ) : (
                        isRecording ? (
                            <button
                                type="button"
                                onClick={() => {
                                    if (mediaRecorderRef.current && isRecording) {
                                        mediaRecorderRef.current.stop()
                                        setIsRecording(false)
                                    }
                                }}
                                className="text-red-500 hover:text-red-600 animate-pulse"
                            >
                                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                    <X className="w-5 h-5" />
                                </div>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={async () => {
                                    try {
                                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                                        const mediaRecorder = new MediaRecorder(stream)
                                        mediaRecorderRef.current = mediaRecorder
                                        const audioChunks = []
                                        mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunks.push(event.data) }
                                        mediaRecorder.onstop = async () => {
                                            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
                                            const audioFile = new File([audioBlob], "voice_note.webm", { type: "audio/webm" })

                                            setIsUploading(true)
                                            try {
                                                const fileName = `uploads/${Date.now()}.webm`
                                                const { error: uploadError } = await supabase.storage.from('chat-media').upload(fileName, audioFile)
                                                if (uploadError) throw uploadError
                                                const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(fileName)
                                                await sendMessage(publicUrl, 'audio')
                                            } catch (err) { console.error(err) }
                                            finally { setIsUploading(false) }

                                            stream.getTracks().forEach(track => track.stop())
                                        }
                                        mediaRecorder.start()
                                        setIsRecording(true)
                                    } catch (err) { console.error(err); alert("Mic Error") }
                                }}
                                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
                                disabled={isUploading}
                            >
                                {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Mic className="w-6 h-6" />}
                            </button>
                        )
                    )}
                </form>
            )}
        </div>
    )
}
