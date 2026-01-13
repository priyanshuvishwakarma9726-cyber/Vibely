/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Configured to class, but we are preventing the class from being added to force Light Mode

  theme: {
    extend: {
      colors: {
        whatsapp: {
          green: '#00a884',
          teal: '#008069',
          dark: '#111b21',   // Standard Dark bg
          darker: '#0b141a', // Deeper dark for sidebar
          light: '#f0f2f5',
          chat: '#efeae2',   // Light mode chat bg
          chatDark: '#0b141a', // Dark mode chat bg
          messageOut: '#d9fdd3',
          messageOutDark: '#005c4b', // Dark mode sent message
          messageIn: '#ffffff',
          messageInDark: '#202c33',  // Dark mode received message
          sidebar: '#ffffff',
          sidebarDark: '#111b21',
          header: '#f0f2f5',
          headerDark: '#202c33',
          input: '#f0f2f5',
          inputDark: '#2a3942',
        }
      }
    },
  },
  plugins: [],
}
