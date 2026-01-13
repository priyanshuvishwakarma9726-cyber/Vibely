import { Search, MoreVertical, MessageSquarePlus, CircleDashed, User, Users, Camera, Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useChat } from '../context/ChatContext'
import { supabase } from '../lib/supabase'
import { useState, useEffect, useRef } from 'react'
import SettingsModal from './SettingsModal'
import CreateGroupModal from './CreateGroupModal'
import StatusViewer from './StatusViewer'

export default function Sidebar() {
    const { user, signOut } = useAuth()
    const { selectChat, selectedChat } = useChat()

    const [activeTab, setActiveTab] = useState('chats') // chats, status
    const [showMenu, setShowMenu] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [searching, setSearching] = useState(false)

    const [showCreateGroup, setShowCreateGroup] = useState(false)
    const [myGroups, setMyGroups] = useState([])

    // Status Logic
    const [myStatus, setMyStatus] = useState([])
    const [friendsStatus, setFriendsStatus] = useState({}) // userId -> [statuses]
    const [viewingStatus, setViewingStatus] = useState(null)
    const statusInputRef = useRef(null)

    // Debounced search effect
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.trim().length > 0) {
                setSearching(true)
                try {
                    let query = supabase
                        .from('profiles')
                        .select('*')
                        .neq('id', user.id)
                        .limit(10)

                    // Check for Tag (username#1234)
                    if (searchQuery.includes('#')) {
                        const [usernamePart, tagPart] = searchQuery.split('#');
                        if (usernamePart) query = query.ilike('username', `${usernamePart}%`)
                        if (tagPart) query = query.ilike('discriminator', `${tagPart}%`)
                    } else {
                        // Regular username search
                        query = query.ilike('username', `%${searchQuery}%`)
                    }

                    const { data: byUsername, error: err1 } = await query

                    const { data: byName, error: err2 } = await supabase
                        .from('profiles')
                        .select('*')
                        .ilike('full_name', `%${searchQuery}%`)
                        .neq('id', user.id)
                        .limit(10)

                    if (err1) console.error("Search error 1:", err1)
                    if (err2) console.error("Search error 2:", err2)

                    // Merge results
                    const all = [...(byUsername || []), ...(byName || [])]
                    const unique = Array.from(new Map(all.map(item => [item.id, item])).values())
                    setSearchResults(unique.slice(0, 10))

                } catch (err) {
                    console.error("Search exception:", err)
                    setSearchResults([])
                } finally {
                    setSearching(false)
                }
            } else {
                setSearchResults([])
            }
        }, 500)

        return () => clearTimeout(timer)
    }, [searchQuery, user.id])

    // Fetch My Groups
    useEffect(() => {
        const fetchGroups = async () => {
            // Fetch groups where I am a member
            const { data, error } = await supabase
                .from('group_members')
                .select('group_id, groups(*)')
                .eq('user_id', user.id)

            if (data) {
                const groups = data.map(item => item.groups).filter(g => g !== null)
                setMyGroups(groups)
            }
        }
        fetchGroups()
    }, [user.id])

    // Fetch Statuses
    useEffect(() => {
        if (activeTab !== 'status') return

        const fetchStatuses = async () => {
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

            // Fetch all statuses created in last 24h
            const { data, error } = await supabase
                .from('status_updates')
                .select('*, profiles(username, avatar_url)')
                .gte('created_at', yesterday)
                .order('created_at', { ascending: true })

            if (data) {
                // Separate mine and others
                const mine = data.filter(s => s.user_id === user.id)
                setMyStatus(mine)

                const others = data.filter(s => s.user_id !== user.id)
                // Group by user
                const grouped = {}
                others.forEach(s => {
                    if (!grouped[s.user_id]) grouped[s.user_id] = []
                    grouped[s.user_id].push(s)
                })
                setFriendsStatus(grouped)
            }
        }
        fetchStatuses()
    }, [activeTab, user.id])

    const handleSelectChat = (chat, type = 'user') => {
        selectChat({ ...chat, type })
        setSearchQuery('')
        setSearchResults([])
        setActiveTab('chats')
    }

    const handleUploadStatus = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `status/${user.id}-${Date.now()}.${fileExt}`
            const { error: uploadError } = await supabase.storage
                .from('chat-media')
                .upload(fileName, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(fileName)

            await supabase.from('status_updates').insert({
                user_id: user.id,
                media_url: publicUrl,
                caption: ''
            })

            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
            const { data } = await supabase
                .from('status_updates')
                .select('*, profiles(username, avatar_url)')
                .gte('created_at', yesterday)
                .eq('user_id', user.id)
            if (data) setMyStatus(data)

        } catch (err) {
            console.error(err)
            alert("Failed to upload status")
        }
    }

    return (
        <div className={`w-full md:w-[400px] flex flex-col bg-white dark:bg-whatsapp-dark border-r border-gray-200 dark:border-gray-700 h-full transition-colors duration-200 ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
            {/* Header */}
            <div className="bg-whatsapp-header dark:bg-whatsapp-headerDark px-4 py-3 flex justify-between items-center border-b border-gray-200 dark:border-gray-700 shrink-0 transition-colors duration-200">
                <div
                    className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition"
                    title="Profile"
                    onClick={() => setShowSettings(true)}
                >
                    <User className="w-6 h-6 text-gray-500 dark:text-gray-300" />
                </div>

                <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400">
                    <button
                        title="Status"
                        onClick={() => setActiveTab(activeTab === 'status' ? 'chats' : 'status')}
                        className={activeTab === 'status' ? 'text-whatsapp-green' : ''}
                    >
                        <CircleDashed className="w-6 h-6" />
                    </button>
                    <button title="New Chat">
                        <MessageSquarePlus className="w-6 h-6" />
                    </button>
                    <div className="relative">
                        <button title="Menu" onClick={() => setShowMenu(!showMenu)}>
                            <MoreVertical className="w-6 h-6" />
                        </button>
                        {showMenu && (
                            <div className="absolute right-0 top-8 bg-white dark:bg-whatsapp-darker shadow-lg rounded py-2 w-48 z-10 border border-gray-100 dark:border-gray-700">
                                <button
                                    className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm"
                                    onClick={() => {
                                        setShowMenu(false)
                                        setShowCreateGroup(true)
                                    }}
                                >
                                    New group
                                </button>
                                <button
                                    className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm"
                                    onClick={() => {
                                        setShowMenu(false)
                                        setShowSettings(true)
                                    }}
                                >
                                    Settings
                                </button>
                                <button
                                    onClick={() => signOut()}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-red-600 text-sm"
                                >
                                    Log out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* TAB CONTENT: STATUS */}
            {activeTab === 'status' ? (
                <div className="flex-1 overflow-y-auto bg-white dark:bg-whatsapp-dark custom-scrollbar transition-colors duration-200">
                    {/* My Status */}
                    <div className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <div className="relative">
                            <div
                                className={`w-12 h-12 rounded-full overflow-hidden p-[2px] ${myStatus.length > 0 ? 'border-2 border-whatsapp-green' : 'bg-gray-200 dark:bg-gray-600'}`}
                                onClick={() => myStatus.length > 0 && setViewingStatus(myStatus)}
                            >
                                {user.user_metadata.avatar_url ? (
                                    <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover rounded-full" />
                                ) : (
                                    <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                                        <User className="w-6 h-6 text-gray-500" />
                                    </div>
                                )}
                            </div>
                            <button
                                className="absolute bottom-0 right-0 bg-whatsapp-green text-white rounded-full p-0.5 border-2 border-white dark:border-whatsapp-dark shadow-sm"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    statusInputRef.current?.click()
                                }}
                            >
                                <Plus className="w-3 h-3" />
                            </button>
                            <input type="file" hidden ref={statusInputRef} onChange={handleUploadStatus} accept="image/*" />
                        </div>
                        <div className="flex-1" onClick={() => myStatus.length > 0 ? setViewingStatus(myStatus) : statusInputRef.current?.click()}>
                            <h3 className="font-semibold text-gray-900 dark:text-white">My Status</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {myStatus.length > 0 ? 'Click to view' : 'Click to add status update'}
                            </p>
                        </div>
                    </div>

                    <div className="px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800/30">
                        Recent Updates
                    </div>

                    {/* Friends Status */}
                    {Object.keys(friendsStatus).length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            No recent updates from friends.
                        </div>
                    ) : (
                        Object.entries(friendsStatus).map(([userId, statuses]) => {
                            const profile = statuses[0].profiles
                            if (!profile) return null
                            return (
                                <div
                                    key={userId}
                                    className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                    onClick={() => setViewingStatus(statuses)}
                                >
                                    <div className="w-12 h-12 rounded-full p-[2px] border-2 border-whatsapp-green overflow-hidden">
                                        <div className="w-full h-full rounded-full overflow-hidden">
                                            <img src={profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.username}`} className="w-full h-full object-cover" />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">{profile.username}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(statuses[statuses.length - 1].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            ) : (
                /* TAB CONTENT: CHATS */
                <>
                    {/* Search Bar */}
                    <div className="p-3 bg-white dark:bg-whatsapp-dark border-b border-gray-100 dark:border-gray-700 shrink-0 transition-colors duration-200">
                        <div className="relative bg-whatsapp-input dark:bg-whatsapp-inputDark rounded-lg flex items-center px-4 py-1.5 focus-within:ring-1 focus-within:ring-white dark:focus-within:ring-gray-600">
                            <div className="w-6 h-6 flex items-center justify-start text-gray-500 dark:text-gray-400">
                                <Search className="w-4 h-4" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search or start new chat"
                                className="w-full bg-transparent border-none outline-none text-sm ml-2 placeholder-gray-500 dark:placeholder-gray-400 text-gray-700 dark:text-gray-200"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Chat List or Search Results or Groups */}
                    <div className="flex-1 overflow-y-auto bg-white dark:bg-whatsapp-dark custom-scrollbar transition-colors duration-200">
                        {searchQuery.length > 0 ? (
                            /* Search Results */
                            <div className="pb-2">
                                <div className="px-4 py-3 text-teal-600 dark:text-teal-400 text-xs font-bold uppercase tracking-wider">
                                    Search Results
                                </div>
                                {searching && searchResults.length === 0 ? (
                                    <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-4">Searching...</div>
                                ) : searchResults.length === 0 ? (
                                    <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-4">No users found</div>
                                ) : (
                                    searchResults.map(profile => (
                                        <div
                                            key={profile.id}
                                            onClick={() => handleSelectChat(profile, 'user')}
                                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-50 dark:border-gray-700 last:border-0"
                                        >
                                            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-gray-500 overflow-hidden">
                                                {profile.avatar_url ? (
                                                    <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                                                ) : (
                                                    <User className="w-6 h-6" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-900 dark:text-white">{profile.full_name || profile.username}</div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400 truncate">@{profile.username}</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            /* Groups & Chats List */
                            <div>
                                {myGroups.length > 0 && (
                                    <div className="px-4 py-3 text-teal-600 dark:text-teal-400 text-xs font-bold uppercase tracking-wider">
                                        My Groups
                                    </div>
                                )}
                                {myGroups.map(group => (
                                    <div
                                        key={group.id}
                                        onClick={() => handleSelectChat(group, 'group')}
                                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-50 dark:border-gray-700 last:border-0"
                                    >
                                        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-gray-500 overflow-hidden">
                                            <Users className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900 dark:text-white">{group.name}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">Group</div>
                                        </div>
                                    </div>
                                ))}

                                {myGroups.length === 0 && (
                                    <div className="flex flex-col items-center justify-center text-center p-6 h-24 text-gray-400 dark:text-gray-500">
                                        <span className="text-sm">No chats yet.</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Modals & Viewers */}
            {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
            {showCreateGroup && (
                <CreateGroupModal
                    onClose={() => setShowCreateGroup(false)}
                    onGroupCreated={(group) => {
                        setMyGroups(prev => [...prev, group])
                        handleSelectChat(group, 'group')
                    }}
                />
            )}
            {viewingStatus && (
                <StatusViewer
                    statuses={viewingStatus}
                    initialIndex={0}
                    onClose={() => setViewingStatus(null)}
                />
            )}
        </div>
    )
}
