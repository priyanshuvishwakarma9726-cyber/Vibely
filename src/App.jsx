import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ChatProvider } from './context/ChatContext'
import { ThemeProvider } from './context/ThemeContext'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Home from './pages/Home'
import { CallProvider } from './context/CallContext'
import CallOverlay from './components/CallOverlay'

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth()
  // Note: Loading state is handled inside AuthProvider basically (won't render children until loaded)
  // But useAuth exposes user. If loading is false and user is null > redirect.
  // Actually AuthProvider logic: {!loading && children}
  // So here, if we are rendering, loading is false.

  if (!user) return <Navigate to="/login" />
  return children
}

const AppLayout = ({ children }) => {
  return (
    <div className="relative min-h-screen bg-[#d1d7db] dark:bg-whatsapp-darker transition-colors duration-200">
      {/* Green Background Strip */}
      <div className="absolute top-0 left-0 w-full h-32 bg-[#00a884] dark:bg-whatsapp-headerDark z-0 transition-colors duration-200"></div>
      {/* Main Content */}
      <div className="relative z-10 h-screen p-0 xl:p-5 flex justify-center items-center">
        <div className="w-full max-w-[1700px] h-full xl:h-[calc(100vh-40px)] bg-white dark:bg-whatsapp-dark xl:shadow-lg xl:rounded overflow-hidden flex transition-colors duration-200">
          {children}
        </div>
      </div>
    </div>
  )
}

const CallProviderWrapper = ({ children }) => (
  <CallProvider>
    <CallOverlay />
    {children}
  </CallProvider>
)

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={
            <ProtectedRoute>
              <AppLayout>
                <ChatProvider>
                  <CallProviderWrapper>
                    <Home />
                  </CallProviderWrapper>
                </ChatProvider>
              </AppLayout>
            </ProtectedRoute>
          } />
        </Routes>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App
