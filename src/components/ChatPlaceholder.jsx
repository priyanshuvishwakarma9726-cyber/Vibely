import { MessageSquare, Lock } from 'lucide-react'

export default function ChatPlaceholder() {
    return (
        <div className="flex-1 bg-whatsapp-chat border-b-[6px] border-whatsapp-green/0 h-full flex flex-col items-center justify-center text-center p-8">
            <div className="max-w-md space-y-8">
                <div className="relative inline-flex items-center justify-center">
                    {/* Illustration */}
                    <div className="w-64 h-64 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <MessageSquare className="w-32 h-32 text-gray-300" />
                    </div>
                </div>

                <div className="space-y-4">
                    <h1 className="text-3xl font-light text-whatsapp-dark mt-4">Welcome to Vibely</h1>
                    <p className="text-gray-500 leading-relaxed">
                        Send and receive messages without keeping your phone online.<br />
                        Use Vibely on up to 4 linked devices and 1 phone.
                    </p>
                </div>

                <div className="pt-8 flex items-center justify-center gap-2 text-xs text-gray-400">
                    <Lock className="w-3 h-3" />
                    <span>Your personal messages are end-to-end encrypted</span>
                </div>
            </div>
        </div>
    )
}
