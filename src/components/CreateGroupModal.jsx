import { useState, useEffect, useRef } from 'react'
import { X, Check, Search, User, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function CreateGroupModal({ onClose, onGroupCreated }) {
    const { user } = useAuth()
    const [step, setStep] = useState(1) // 1: Select Members, 2: Group Info
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [selectedUsers, setSelectedUsers] = useState([])
    const [groupName, setGroupName] = useState('')
    const [loading, setLoading] = useState(false)

    // Search Users
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.trim().length > 0) {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .ilike('username', `%${searchQuery}%`)
                    .neq('id', user.id)
                    .limit(10)
                setSearchResults(data || [])
            } else {
                setSearchResults([])
            }
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery, user.id])

    const toggleUser = (profile) => {
        if (selectedUsers.find(u => u.id === profile.id)) {
            setSelectedUsers(prev => prev.filter(u => u.id !== profile.id))
        } else {
            setSelectedUsers(prev => [...prev, profile])
        }
    }

    const createGroup = async () => {
        if (!groupName.trim()) return
        setLoading(true)
        try {
            // 1. Create Group
            const { data: group, error: groupError } = await supabase
                .from('groups')
                .insert([{
                    name: groupName,
                    created_by: user.id
                }])
                .select()
                .single()

            if (groupError) throw groupError

            // 2. Add Members (Admin + Selected)
            const members = [
                { group_id: group.id, user_id: user.id, role: 'admin' },
                ...selectedUsers.map(u => ({
                    group_id: group.id,
                    user_id: u.id,
                    role: 'member'
                }))
            ]

            const { error: membersError } = await supabase
                .from('group_members')
                .insert(members)

            if (membersError) throw membersError

            onGroupCreated(group)
            onClose()

        } catch (err) {
            console.error(err)
            alert("Failed to create group")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-whatsapp-dark w-full max-w-md rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 h-[500px] flex flex-col">
                {/* Header */}
                <div className="bg-whatsapp-green px-4 py-3 flex items-center justify-between text-white shrink-0">
                    <h2 className="text-lg font-medium">{step === 1 ? 'Add Group Participants' : 'New Group'}</h2>
                    <button onClick={onClose}><X className="w-6 h-6" /></button>
                </div>

                {step === 1 ? (
                    <>
                        <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                            {selectedUsers.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto mb-2 pb-2 custom-scrollbar">
                                    {selectedUsers.map(u => (
                                        <div key={u.id} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-full px-2 py-1 min-w-fit">
                                            <div className="w-5 h-5 bg-gray-300 rounded-full overflow-hidden">
                                                {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : null}
                                            </div>
                                            <span className="text-xs dark:text-gray-200">{u.username}</span>
                                            <button onClick={() => toggleUser(u)}><X className="w-3 h-3 text-gray-500" /></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="relative bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center px-3 py-2">
                                <Search className="w-4 h-4 text-gray-500" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Search users..."
                                    className="bg-transparent border-none outline-none ml-2 text-sm w-full dark:text-gray-200"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {searchResults.map(profile => {
                                const isSelected = !!selectedUsers.find(u => u.id === profile.id)
                                return (
                                    <div
                                        key={profile.id}
                                        onClick={() => toggleUser(profile)}
                                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                                    >
                                        <div className="relative">
                                            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-gray-500 overflow-hidden">
                                                {profile.avatar_url ? (
                                                    <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                                                ) : (
                                                    <User className="w-5 h-5" />
                                                )}
                                            </div>
                                            {isSelected && (
                                                <div className="absolute -bottom-1 -right-1 bg-whatsapp-green rounded-full p-0.5 border-2 border-white">
                                                    <Check className="w-3 h-3 text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900 dark:text-white">{profile.username}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">{profile.about}</div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                            {selectedUsers.length > 0 && (
                                <button
                                    onClick={() => setStep(2)}
                                    className="bg-whatsapp-green text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg hover:bg-whatsapp-teal transition"
                                >
                                    <Users className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col p-6 items-center">
                        <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full mb-6 flex items-center justify-center">
                            <Users className="w-10 h-10 text-gray-400" />
                        </div>

                        <div className="w-full mb-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Group Subject</label>
                            <input
                                type="text"
                                placeholder="Type group subject here..."
                                className="w-full border-b-2 border-whatsapp-green outline-none py-2 bg-transparent text-gray-900 dark:text-white placeholder-gray-400"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                            />
                        </div>

                        <div className="w-full flex-1">
                            <span className="text-xs uppercase text-gray-500 font-bold tracking-wider">Participants: {selectedUsers.length}</span>
                            <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                                {selectedUsers.map(u => u.username).join(', ')}
                            </div>
                        </div>

                        <button
                            onClick={createGroup}
                            disabled={loading}
                            className="bg-whatsapp-green text-white px-6 py-2 rounded-full shadow hover:bg-whatsapp-teal transition disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? 'Creating...' : <Check className="w-5 h-5" />}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
