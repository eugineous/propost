import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

const ALLOWED_EMAIL = process.env.EUGINE_EMAIL ?? 'euginemicah@gmail.com'

// Explicit callback URL — must match what's in Google Cloud Console
const NEXTAUTH_URL = process.env.NEXTAUTH_URL ?? 'https://propost.vercel.app'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // Force account selection so the user can pick the right account
          prompt: 'select_account',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Single-user system — only Eugine can sign in
      if (user.email !== ALLOWED_EMAIL) {
        return false
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email as string
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Always redirect to the dashboard after sign in
      if (url.startsWith('/')) return `${baseUrl}${url}`
      if (url.startsWith(baseUrl)) return url
      return baseUrl
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  // Explicitly set the URL so NextAuth doesn't guess wrong
  ...(NEXTAUTH_URL && { url: NEXTAUTH_URL }),
}
