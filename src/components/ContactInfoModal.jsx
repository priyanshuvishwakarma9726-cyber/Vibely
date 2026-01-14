import { X, User, Mail, AtSign, Info } from 'lucide-react'

export default function ContactInfoModal({ onClose, profile }) {
    if (!profile) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-whatsapp-dark w-full max-w-sm rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-whatsapp-green px-4 py-3 flex items-center justify-between text-white shrink-0">
                    <h2 className="text-lg font-medium">Contact Info</h2>
                    <button onClick={onClose}><X className="w-6 h-6" /></button>
                </div>

                <div className="p-6 flex flex-col items-center">
                    {/* Avatar */}
                    <div className="w-32 h-32 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4 overflow-hidden border-4 border-gray-100 dark:border-gray-600 shadow-md">
                        {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-16 h-16 text-gray-500" />
                        )}
                    </div>

                    {/* Name */}
                    <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">{profile.full_name || 'User'}</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">@{profile.username}</p>

                    {/* Details Card */}
                    <div className="w-full space-y-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl">
                        {/* About */}
                        <div className="flex items-start gap-3">
                            <Info className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div className="flex-1">
                                <span className="block text-xs uppercase text-gray-500 font-bold tracking-wider mb-0.5">About</span>
                                <p className="text-sm text-gray-800 dark:text-gray-200">{profile.about || "Hey there! I am using Vibely."}</p>
                            </div>
                        </div>

                        {/* Email (Optional, usually private but requested to see 'not just email' implying email was there) */}
                        {/* Note: Profiles table might not have email directly if RLS hides it or it's in auth.users. 
                            However, usually apps don't show email publicly. User requested "not just their email address".
                            If the current 'selectedChat' object has email (from search/sidebar join), we show it. 
                            Usually profiles table doesn't store email for privacy, but let's check if we have it in selectedChat.
                         */}
                        {profile.email && (
                            <div className="flex items-start gap-3">
                                <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                                <div className="flex-1">
                                    <span className="block text-xs uppercase text-gray-500 font-bold tracking-wider mb-0.5">Email</span>
                                    <p className="text-sm text-gray-800 dark:text-gray-200">{profile.email}</p>
                                </div>
                            </div>
                        )}

                        {/* Username again if needed for clarity */}
                        <div className="flex items-start gap-3">
                            <AtSign className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div className="flex-1">
                                <span className="block text-xs uppercase text-gray-500 font-bold tracking-wider mb-0.5">Username</span>
                                <p className="text-sm text-gray-800 dark:text-gray-200">@{profile.username}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 w-full">
                        <button
                            onClick={onClose}
                            className="w-full py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition font-medium"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
