import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { MessageSquare } from 'lucide-react'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const { signIn, debugLogin } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const { error } = await signIn({ email, password })
            if (error) throw error
            navigate('/')
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
                <h2 className="text-2xl font-light text-whatsapp-dict mb-6">Log in</h2>

                {error && <div className="bg-red-100 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            required
                            className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:border-whatsapp-green focus:ring-1 focus:ring-whatsapp-green transition-colors"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
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
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-whatsapp-green hover:bg-whatsapp-teal text-white font-medium py-2.5 rounded transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                    >
                        {loading ? 'Logging in...' : 'Log In'}
                    </button>


                </form>

                <div className="mt-6 text-center text-sm text-gray-600">
                    Don't have an account?{' '}
                    <Link to="/signup" className="text-whatsapp-green hover:underline font-medium">
                        Sign up
                    </Link>
                </div>
            </div>
        </div>
    )
}
