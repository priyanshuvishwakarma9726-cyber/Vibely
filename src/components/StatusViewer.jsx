import { useState, useEffect } from 'react'
import { Plus, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const STORY_DURATION = 5000 // 5 seconds

export default function StatusViewer({ statuses, initialIndex, onClose }) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex)
    const [progress, setProgress] = useState(0)
    const currentStatus = statuses[currentIndex]

    useEffect(() => {
        setProgress(0)
        const startTime = Date.now()

        const timer = setInterval(() => {
            const elapsed = Date.now() - startTime
            const newProgress = (elapsed / STORY_DURATION) * 100

            if (newProgress >= 100) {
                handleNext()
            } else {
                setProgress(newProgress)
            }
        }, 100) // update every 100ms

        return () => clearInterval(timer)
    }, [currentIndex])

    const handleNext = () => {
        if (currentIndex < statuses.length - 1) {
            setCurrentIndex(prev => prev + 1)
        } else {
            onClose()
        }
    }

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1)
        }
    }

    if (!currentStatus) return null

    // If text only, use background color
    const isImage = currentStatus.media_url

    return (
        <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center">
            {/* Progress Bars */}
            <div className="absolute top-4 left-0 right-0 px-2 flex gap-1 z-20">
                {statuses.map((_, idx) => (
                    <div key={idx} className="h-1 bg-white/30 flex-1 rounded overflow-hidden">
                        <div
                            className="h-full bg-white transition-all duration-100 ease-linear"
                            style={{
                                width: idx < currentIndex ? '100%' :
                                    idx === currentIndex ? `${progress}%` : '0%'
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* Header Info */}
            <div className="absolute top-8 left-4 z-20 flex items-center gap-3">
                {/* Back Button */}
                <button onClick={onClose} className="bg-black/20 p-1 rounded-full text-white">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="w-10 h-10 rounded-full overflow-hidden border border-white">
                    <img src={currentStatus.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${currentStatus.profiles?.username}`} className="w-full h-full object-cover" />
                </div>
                <div className="text-white">
                    <p className="font-semibold text-sm">{currentStatus.profiles?.username}</p>
                    <p className="text-xs text-gray-300">{new Date(currentStatus.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
            </div>

            {/* Content */}
            <div className="w-full h-full flex items-center justify-center relative bg-gray-900">
                {isImage ? (
                    <img src={currentStatus.media_url} className="max-h-full max-w-full object-contain" />
                ) : (
                    <div
                        className="w-full h-full flex items-center justify-center text-center p-8 text-2xl font-bold text-white"
                        style={{ backgroundColor: currentStatus.background_color || '#00a884' }}
                    >
                        {currentStatus.caption}
                    </div>
                )}

                {isImage && currentStatus.caption && (
                    <div className="absolute bottom-10 left-0 right-0 text-center bg-black/40 p-2 text-white">
                        {currentStatus.caption}
                    </div>
                )}
            </div>

            {/* Navigation Hit Areas */}
            <div className="absolute inset-y-0 left-0 w-1/3 z-10 cursor-pointer" onClick={handlePrev}></div>
            <div className="absolute inset-y-0 right-0 w-1/3 z-10 cursor-pointer" onClick={handleNext}></div>
        </div>
    )
}
