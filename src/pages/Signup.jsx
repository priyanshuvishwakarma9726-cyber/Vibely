import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { MessageSquare } from 'lucide-react'

export default function Signup() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [username, setUsername] = useState('')
    const [fullName, setFullName] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const { signUp } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        // Basic validation
        if (username.length < 3) {
            setError("Username must be at least 3 characters")
            setLoading(false)
            return
        }

        try {
            // 1. Sign up the user
            const { data, error: authError } = await signUp({
                email,
                password,
            })

            if (authError) throw authError

            if (data?.user) {
                // 2. Create profile
                const discriminator = Math.floor(1000 + Math.random() * 9000).toString(); // Generate 4 digit tag
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([
                        {
                            id: data.user.id,
                            username,
                            full_name: fullName,
                            about: 'Hey there! I am using Vibely.',
                            discriminator: discriminator, // Store the tag
                            status: 'online',
                        }
                    ])

                if (profileError) {
                    // Check for unique key violation
                    if (profileError.code === '23505') {
                        throw new Error('Username already taken')
                    }
                    throw profileError
                }

                navigate('/')
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-whatsapp-light flex flex-col items-center justify-center p-4">
            {/* Header with Logo */}
            <div className="flex items-center gap-3 mb-8">
                <div className="bg-whatsapp-green p-2 rounded-full">
                    <MessageSquare className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-whatsapp-dark">Vibely Web</h1>
            </div>

            <div className="bg-white p-10 rounded-lg shadow-sm w-full max-w-md">
                <h2 className="text-2xl font-light text-whatsapp-dict mb-6">Create Account</h2>

                {error && <div className="bg-red-100 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input
                            type="text"
                            required
                            className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:border-whatsapp-green focus:ring-1 focus:ring-whatsapp-green transition-colors"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="John Doe"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2 text-gray-500">@</span>
                            <input
                                type="text"
                                required
                                className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded focus:outline-none focus:border-whatsapp-green focus:ring-1 focus:ring-whatsapp-green transition-colors"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="username"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            required
                            className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:border-whatsapp-green focus:ring-1 focus:ring-whatsapp-green transition-colors"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                            type="password"
                            required
                            className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:border-whatsapp-green focus:ring-1 focus:ring-whatsapp-green transition-colors"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-whatsapp-green hover:bg-whatsapp-teal text-white font-medium py-2.5 rounded transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                    >
                        {loading ? 'Signing up...' : 'Sign Up'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link to="/login" className="text-whatsapp-green hover:underline font-medium">
                        Log in
                    </Link>
                </div>
            </div>
        </div>
    )
}
