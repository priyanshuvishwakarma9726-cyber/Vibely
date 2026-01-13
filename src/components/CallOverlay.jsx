import { useRef, useEffect } from 'react'
import { Phone, Video, Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff } from 'lucide-react'
import { useCall } from '../context/CallContext'

export default function CallOverlay() {
    const {
        callState,
        callType,
        callerProfile,
        answerCall,
        endCall,
        localStream,
        remoteStream,
        toggleAudio,
        toggleVideo
    } = useCall()

    const localVideoRef = useRef(null)
    const remoteVideoRef = useRef(null)

    // Attach streams when they change
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream
        }
    }, [localStream, callState])

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream
        }
    }, [remoteStream, callState])

    if (callState === 'idle') return null

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center text-white">

            {/* Incoming Call UI */}
            {callState === 'incoming' && (
                <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-whatsapp-green animate-pulse">
                        <img
                            src={callerProfile?.avatar_url || `https://ui-avatars.com/api/?name=User&background=random`}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold">{callerProfile?.username || 'Unknown User'}</h2>
                        <p className="text-gray-400">Incoming {callType} call...</p>
                    </div>
                    <div className="flex gap-8 mt-4">
                        <button
                            onClick={endCall}
                            className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition"
                        >
                            <PhoneOff className="w-8 h-8" />
                        </button>
                        <button
                            onClick={answerCall}
                            className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition animate-bounce"
                        >
                            <Phone className="w-8 h-8" />
                        </button>
                    </div>
                </div>
            )}

            {/* Outgoing Call UI */}
            {callState === 'calling' && (
                <div className="flex flex-col items-center gap-6">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-600">
                        {/* Placeholder - ideally we pass callee info too */}
                        <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                            <Phone className="w-10 h-10 text-gray-500" />
                        </div>
                    </div>
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold">Calling...</h2>
                        <p className="text-gray-400">Waiting for response</p>
                    </div>
                    <button
                        onClick={endCall}
                        className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition mt-4"
                    >
                        <PhoneOff className="w-8 h-8" />
                    </button>
                </div>
            )}

            {/* Connected Call UI */}
            {callState === 'connected' && (
                <div className="relative w-full h-full flex items-center justify-center bg-black">
                    {/* Remote Video (Full Screen) */}
                    {callType === 'video' ? (
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-contain"
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center animate-pulse">
                                <Phone className="w-12 h-12 text-gray-400" />
                            </div>
                            <span className="text-xl">Voice Call Connected</span>
                        </div>
                    )}

                    {/* Local Video (PiP) */}
                    {callType === 'video' && (
                        <div className="absolute bottom-24 right-4 w-32 h-48 bg-gray-800 rounded-lg overflow-hidden border border-gray-600 shadow-xl">
                            <video
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}

                    {/* Controls */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-gray-900/80 px-8 py-4 rounded-full backdrop-blur-sm">
                        {/* Audio Toggle */}
                        <button onClick={toggleAudio} className="p-3 bg-gray-700 rounded-full hover:bg-gray-600">
                            <Mic className="w-6 h-6" />
                        </button>

                        {/* Video Toggle */}
                        {callType === 'video' && (
                            <button onClick={toggleVideo} className="p-3 bg-gray-700 rounded-full hover:bg-gray-600">
                                <VideoIcon className="w-6 h-6" />
                            </button>
                        )}

                        {/* End Call */}
                        <button onClick={endCall} className="p-4 bg-red-500 rounded-full hover:bg-red-600">
                            <PhoneOff className="w-8 h-8" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
