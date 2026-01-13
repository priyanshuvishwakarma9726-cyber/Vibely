import { X, User, Trash2, UserPlus, LogOut, Check } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useChat } from '../context/ChatContext'

export default function GroupInfoModal({ onClose }) {
    const { user } = useAuth()
    const { selectedChat, selectChat } = useChat() // selectedChat is the group
    const [members, setMembers] = useState([])
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)

    // Add User State
    const [showAddUser, setShowAddUser] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState([])

    useEffect(() => {
        fetchMembers()
    }, [selectedChat.id])

    const fetchMembers = async () => {
        setLoading(true)
        // Join group_members with profiles
        const { data, error } = await supabase
            .from('group_members')
            .select('role, user_id, profiles(*)')
            .eq('group_id', selectedChat.id)

        if (data) {
            setMembers(data)
            const myRole = data.find(m => m.user_id === user.id)?.role
            setIsAdmin(myRole === 'admin')
        }
        setLoading(false)
    }

    const removeMember = async (userId) => {
        if (!confirm("Remove this user from the group?")) return
        const { error } = await supabase
            .from('group_members')
            .delete()
            .match({ group_id: selectedChat.id, user_id: userId })

        if (!error) {
            setMembers(prev => prev.filter(m => m.user_id !== userId))
        }
    }

    const leaveGroup = async () => {
        if (!confirm("Are you sure you want to leave this group?")) return
        await supabase
            .from('group_members')
            .delete()
            .match({ group_id: selectedChat.id, user_id: user.id })

        selectChat(null) // Deselect
        onClose()
    }

    // Search for new members
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.trim().length > 0) {
                // Find users NOT in group
                const memberIds = members.map(m => m.user_id)
                // Note: supabase 'not.in' limits might apply, but for now ok
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .ilike('username', `%${searchQuery}%`)
                    .not('id', 'in', `(${memberIds.join(',')})`)
                    .limit(5)

                setSearchResults(data || [])
            } else {
                setSearchResults([])
            }
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery, members])

    const addMember = async (profile) => {
        const { error } = await supabase.from('group_members').insert({
            group_id: selectedChat.id,
            user_id: profile.id,
            role: 'member'
        })

        if (!error) {
            fetchMembers()
            setShowAddUser(false)
            setSearchQuery('')
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-whatsapp-dark w-full max-w-md rounded-lg shadow-xl overflow-hidden flex flex-col h-[500px] animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-whatsapp-green px-4 py-3 flex items-center justify-between text-white shrink-0">
                    <h2 className="text-lg font-medium">Group Info</h2>
                    <button onClick={onClose}><X className="w-6 h-6" /></button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {/* Header Info */}
                    <div className="flex flex-col items-center mb-6">
                        <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                            <User className="w-10 h-10 text-gray-500" />
                        </div>
                        <h3 className="text-xl font-medium text-gray-900 dark:text-white">{selectedChat.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Group · {members.length} participants</p>
                    </div>

                    {/* Add Member (Admin Only) */}
                    {isAdmin && (
                        <div className="mb-4">
                            {!showAddUser ? (
                                <button
                                    onClick={() => setShowAddUser(true)}
                                    className="flex items-center gap-3 w-full p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg text-whatsapp-green"
                                >
                                    <div className="w-10 h-10 bg-whatsapp-green/10 rounded-full flex items-center justify-center">
                                        <UserPlus className="w-5 h-5" />
                                    </div>
                                    <span className="font-medium">Add Participant</span>
                                </button>
                            ) : (
                                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium dark:text-gray-200">Add Participant</span>
                                        <button onClick={() => setShowAddUser(false)}><X className="w-4 h-4 text-gray-500" /></button>
                                    </div>
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Search..."
                                        className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:text-white mb-2"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    <div className="max-h-32 overflow-y-auto">
                                        {searchResults.map(p => (
                                            <div key={p.id} onClick={() => addMember(p)} className="flex items-center gap-2 p-2 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer rounded">
                                                <div className="w-6 h-6 bg-gray-300 rounded-full overflow-hidden">
                                                    {p.avatar_url && <img src={p.avatar_url} className="w-full h-full object-cover" />}
                                                </div>
                                                <span className="text-sm truncate flex-1 dark:text-gray-200">{p.username}</span>
                                                <Check className="w-4 h-4 text-whatsapp-green" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Members List */}
                    <div className="space-y-1">
                        {loading ? <div className="text-center py-4 text-gray-500">Loading members...</div> : (
                            members.map(item => {
                                const isMe = item.user_id === user.id
                                const isCreator = item.role === 'admin'
                                return (
                                    <div key={item.user_id} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg group">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                                                {item.profiles?.avatar_url ? (
                                                    <img src={item.profiles.avatar_url} className="w-full h-full object-cover" />
                                                ) : (
                                                    <User className="w-5 h-5 text-gray-400" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                                    {isMe ? "You" : item.profiles?.username}
                                                    {isCreator && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 rounded border border-green-200">Admin</span>}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.profiles?.about || "Hey there! I am using Vibely."}</div>
                                            </div>
                                        </div>

                                        {isAdmin && !isMe && (
                                            <button
                                                onClick={() => removeMember(item.user_id)}
                                                className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 rounded transition"
                                                title="Remove"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-700">
                    <button
                        onClick={leaveGroup}
                        className="flex items-center justify-center gap-2 w-full py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Exit Group</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
