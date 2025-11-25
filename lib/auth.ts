import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import prisma from './prisma';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    // Development-only credentials provider
    CredentialsProvider({
      id: 'credentials',
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'admin@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null;
        }

        // In development, allow any of the seeded users with password "demo123"
        if (process.env.NODE_ENV === 'development' && credentials.password === 'demo123') {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: { role: true },
          });

          if (user && user.isActive) {
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              role: user.role.name,
              roleId: user.roleId,
            };
          }
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Handle credentials provider (development only)
      if (account?.provider === 'credentials') {
        return true;
      }

      if (account?.provider === 'google') {
        if (!user.email) {
          return false;
        }

        // Check if user exists in database
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: { role: true },
        });

        if (!existingUser) {
          // User doesn't exist - DENY ACCESS
          console.log(`Access denied for unregistered email: ${user.email}`);
          return '/auth/error?error=NotRegistered';
        }

        // User exists - update googleId if not set
        if (!existingUser.googleId) {
          await prisma.user.update({
            where: { email: user.email },
            data: {
              googleId: account.providerAccountId,
            },
          });
        }

        // Check if user is active
        if (!existingUser.isActive) {
          console.log(`Access denied for inactive user: ${user.email}`);
          return '/auth/error?error=AccountInactive';
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          include: { role: true },
        });

        if (dbUser) {
          session.user.id = dbUser.id;
          session.user.role = dbUser.role.name;
          session.user.roleId = dbUser.roleId;
          session.user.isActive = dbUser.isActive;
        }
      }
      return session;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.roleId = user.roleId;
        
        // For credentials login, role is already set in authorize()
        // For Google login, fetch from database
        if (account?.provider === 'google') {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            include: { role: true },
          });
          
          if (dbUser) {
            token.role = dbUser.role.name;
            token.roleId = dbUser.roleId;
            token.isActive = dbUser.isActive;
          }
        }
      }
      return token;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: process.env.NODE_ENV === 'development',
};
