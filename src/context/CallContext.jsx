import { createContext, useContext, useEffect, useState, useRef } from 'react'
import Peer from 'peerjs'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'

const CallContext = createContext({})

export const useCall = () => useContext(CallContext)

export const CallProvider = ({ children }) => {
    const { user } = useAuth()
    const [peer, setPeer] = useState(null)
    const [call, setCall] = useState(null)
    const [callState, setCallState] = useState('idle') // idle, calling, incoming, connected
    const [callType, setCallType] = useState('audio') // audio, video
    const [remotePeerId, setRemotePeerId] = useState(null)
    const [localStream, setLocalStream] = useState(null)
    const [remoteStream, setRemoteStream] = useState(null)

    // For "Calling..." UI details
    const [callerProfile, setCallerProfile] = useState(null)

    const localVideoRef = useRef(null)
    const remoteVideoRef = useRef(null)

    // Initialize PeerJS
    useEffect(() => {
        if (!user) return

        // Use a sanitized version of UUID just in case, removing dashes? 
        // PeerJS allows generic strings. Let's try raw UUID first.
        const newPeer = new Peer(user.id, {
            // debug: 3, 
        })

        newPeer.on('open', (id) => {
            console.log('My peer ID is: ' + id)
        })

        newPeer.on('call', async (incomingCall) => {
            console.log("Incoming call from:", incomingCall.peer)

            // Fetch caller profile for UI
            const { data } = await supabase.from('profiles').select('*').eq('id', incomingCall.peer).single()
            setCallerProfile(data)

            setCall(incomingCall)
            setRemotePeerId(incomingCall.peer)
            setCallState('incoming')
            // Determine type? PeerJS doesn't explicitly send type in metadata easily without data connection. 
            // We can assume video for now or check metadata if we send it.
            // Let's assume video enabled by default for simplicity, or check sending side.
            if (incomingCall.metadata && incomingCall.metadata.type) {
                setCallType(incomingCall.metadata.type)
            } else {
                setCallType('video') // Default
            }
        })

        setPeer(newPeer)

        return () => {
            newPeer.destroy()
        }
    }, [user])

    // Handle Stream Setup
    // We'll lazy load the stream only when needed to avoid camera light always on
    const getStream = async (type) => {
        const constraints = {
            audio: true,
            video: type === 'video'
        }
        return await navigator.mediaDevices.getUserMedia(constraints)
    }

    const startCall = async (remoteId, type) => {
        if (!peer) return
        setCallType(type)
        setCallState('calling')
        setRemotePeerId(remoteId)

        try {
            const stream = await getStream(type)
            setLocalStream(stream)

            // Fetch callee profile just for UI consistency if needed, wait for ChatWindow to pass it? 
            // We will just use remoteId for now or let ChatWindow invoke this.

            const outboundCall = peer.call(remoteId, stream, {
                metadata: { type }
            })
            setCall(outboundCall)

            outboundCall.on('stream', (userStream) => {
                setRemoteStream(userStream)
                setCallState('connected')
            })

            outboundCall.on('close', () => {
                endCall()
            })

            outboundCall.on('error', (err) => {
                console.error("Call error:", err)
                endCall()
            })

        } catch (err) {
            console.error("Failed to get local stream", err)
            setCallState('idle')
        }
    }

    const answerCall = async () => {
        if (!call) return

        try {
            const stream = await getStream(callType)
            setLocalStream(stream)

            call.answer(stream)
            setCallState('connected')

            call.on('stream', (userStream) => {
                setRemoteStream(userStream)
            })

            call.on('close', () => {
                endCall()
            })

        } catch (err) {
            console.error("Failed to answer call", err)
            endCall()
        }
    }

    const endCall = () => {
        if (call) call.close()
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop())
        }
        setCall(null)
        setLocalStream(null)
        setRemoteStream(null)
        setCallState('idle')
        setCallerProfile(null)
    }

    const toggleAudio = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled)
        }
    }

    const toggleVideo = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled)
        }
    }

    return (
        <CallContext.Provider value={{
            peer,
            callState,
            callType,
            callerProfile,
            localStream,
            remoteStream,
            startCall,
            answerCall,
            endCall,
            toggleAudio,
            toggleVideo,
            localVideoRef,
            remoteVideoRef
        }}>
            {children}
        </CallContext.Provider>
    )
}
