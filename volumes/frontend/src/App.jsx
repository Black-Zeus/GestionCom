import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import SessionEvents from '@/components/session/SessionEvents';
import AppRouter from '@/routes/AppRouter';

const App = () => (
  <ThemeProvider>
    <BrowserRouter>
      <SessionEvents />
      <AppRouter />
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3500,
          className: 'text-sm',
        }}
      />
    </BrowserRouter>
  </ThemeProvider>
);

export default App;
