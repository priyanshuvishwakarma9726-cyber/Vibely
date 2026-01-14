import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { MessageSquare } from 'lucide-react'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const { signIn, debugLogin, resetPassword } = useAuth()
    const navigate = useNavigate()

    const [rememberMe, setRememberMe] = useState(true)
    const [showForgotParams, setShowForgotParams] = useState(false)
    const [resetEmail, setResetEmail] = useState('')
    const [resetStatus, setResetStatus] = useState(null) // 'loading', 'success', 'error'

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

    const handleResetPassword = async (e) => {
        e.preventDefault()
        setResetStatus('loading')
        const { error } = await resetPassword(resetEmail)
        if (error) {
            setResetStatus('error')
            setError(error.message)
        } else {
            setResetStatus('success')
        }
    }

    return (
        <div className="min-h-screen bg-whatsapp-light dark:bg-black flex flex-col items-center justify-center p-4 transition-colors duration-200">
            {/* Header with Logo */}
            <div className="flex items-center gap-3 mb-8">
                <div className="bg-whatsapp-green p-2 rounded-full">
                    <MessageSquare className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-whatsapp-dark dark:text-white">Vibely Web</h1>
            </div>

            <div className="bg-white dark:bg-whatsapp-dark p-10 rounded-lg shadow-sm w-full max-w-md transition-colors duration-200">
                <h2 className="text-2xl font-light text-whatsapp-dark dark:text-white mb-6">Log in</h2>

                {error && <div className="bg-red-100 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                        <input
                            type="email"
                            required
                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-whatsapp-inputDark text-gray-900 dark:text-white focus:outline-none focus:border-whatsapp-green focus:ring-1 focus:ring-whatsapp-green transition-colors"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                        <input
                            type="password"
                            required
                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-whatsapp-inputDark text-gray-900 dark:text-white focus:outline-none focus:border-whatsapp-green focus:ring-1 focus:ring-whatsapp-green transition-colors"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center justify-between text-sm">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                className="rounded text-whatsapp-green focus:ring-whatsapp-green bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            <span className="text-gray-600 dark:text-gray-400">Remember me</span>
                        </label>
                        <button type="button" onClick={() => setShowForgotParams(true)} className="text-whatsapp-green hover:underline">
                            Forgot password?
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-whatsapp-green hover:bg-whatsapp-teal text-white font-medium py-2.5 rounded transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                    >
                        {loading ? 'Logging in...' : 'Log In'}
                    </button>


                </form>

                <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                    Don't have an account?{' '}
                    <Link to="/signup" className="text-whatsapp-green hover:underline font-medium">
                        Sign up
                    </Link>
                </div>
            </div>

            {/* Forgot Password Modal */}
            {
                showForgotParams && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-whatsapp-dark w-full max-w-sm rounded-lg shadow-xl p-6 animate-in fade-in zoom-in duration-200">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Reset Password</h3>

                            {resetStatus === 'success' ? (
                                <div className="text-center">
                                    <p className="text-green-600 dark:text-green-400 mb-4">Password reset link sent to your email!</p>
                                    <button
                                        onClick={() => { setShowForgotParams(false); setResetStatus(null) }}
                                        className="bg-whatsapp-green text-white px-4 py-2 rounded hover:bg-whatsapp-teal"
                                    >
                                        Close
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleResetPassword}>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Enter your email address and we'll send you a link to reset your password.</p>
                                    <input
                                        type="email"
                                        required
                                        placeholder="Enter your email"
                                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-whatsapp-inputDark text-gray-900 dark:text-white mb-4 focus:outline-none focus:border-whatsapp-green"
                                        value={resetEmail}
                                        onChange={(e) => setResetEmail(e.target.value)}
                                    />
                                    <div className="flex justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowForgotParams(false)}
                                            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={resetStatus === 'loading'}
                                            className="bg-whatsapp-green text-white px-4 py-2 rounded hover:bg-whatsapp-teal disabled:opacity-50"
                                        >
                                            {resetStatus === 'loading' ? 'Sending...' : 'Send Link'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                )
            }
        </div >
    )
}
