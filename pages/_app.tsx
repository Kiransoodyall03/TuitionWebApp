import '../styles/global.css'; // Adjust if you use a different path
import UserProvider from '../services/userContext';
import type { AppProps } from 'next/app';

function MyApp({ Component, pageProps }: AppProps) {
  return( 
    <UserProvider>
      <Component {...pageProps} />
    </UserProvider>
  );
}

export default MyApp;