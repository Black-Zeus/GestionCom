import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import SessionEvents from '@/components/session/SessionEvents';
import AppRouter from '@/routes/AppRouter';

const App = () => (
  <ThemeProvider>
    <BrowserRouter>
      <SessionEvents />
      <AppRouter />
    </BrowserRouter>
  </ThemeProvider>
);

export default App;
