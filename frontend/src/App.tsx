import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import RegistrarProduccion from './pages/RegistrarProduccion';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Rutas Protegidas dentro del Layout */}
        <Route path="/" element={<Layout />}>
          <Route index element={<RegistrarProduccion />} />
          {/* Aquí se agregarán más rutas en el futuro: ventas, caja, etc. */}
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
