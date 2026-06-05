# The Market ON James North - Store Deals QR Code App

A real-time public deals board with an admin dashboard designed to be accessed via QR codes. Built with Next.js 16 and Firebase.

## Features
- **Public Deals Board**: Real-time deals viewing with categorizing, sorting, and searching.
- **Admin Dashboard**: Manage your store deals securely behind Firebase authentication.
- **Live Updates**: Any deals you modify update instantly on customer screens.
- **QR Code Generator**: Integrated QR generator with customizable sizes, easily printable for physical displays.

## Setup & Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env.local` file at the root of the project with your Firebase configuration:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY="your_api_key"
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your_project_id.firebaseapp.com"
   NEXT_PUBLIC_FIREBASE_PROJECT_ID="your_project_id"
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your_project_id.firebasestorage.app"
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
   NEXT_PUBLIC_FIREBASE_APP_ID="your_app_id"
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Go to [http://localhost:3000](http://localhost:3000) to view the public board, and [http://localhost:3000/admin](http://localhost:3000/admin) to access the admin dashboard.

## Deployment

Deploy this project on [Vercel](https://vercel.com/) or Firebase Hosting. Uncheck any build caching and make sure to copy all the `.env.local` environment variables into your hosting provider's configuration.
