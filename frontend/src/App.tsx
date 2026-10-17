import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import RequireAdmin from './components/RequireAdmin';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RegistrarProduccion from './pages/RegistrarProduccion';
import HistorialProduccion from './pages/HistorialProduccion';
import RegistrarVenta from './pages/RegistrarVenta';
import RegistrarFiado from './pages/RegistrarFiado';
import RegistrarConsumo from './pages/RegistrarConsumo';
import RegistrarQuesera from './pages/RegistrarQuesera';
import CobrarFiado from './pages/CobrarFiado';
import LiquidacionQuesera from './pages/LiquidacionQuesera';
import RegistrarEgreso from './pages/RegistrarEgreso';
import CierreCaja from './pages/CierreCaja';
import RegistrarCorreccion from './pages/RegistrarCorreccion';
import HistorialCaja from './pages/HistorialCaja';
import EstadoClientes from './pages/EstadoClientes';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Rutas Protegidas dentro del Layout */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="produccion" element={<HistorialProduccion />} />
          <Route path="registrar" element={<RegistrarProduccion />} />
          <Route path="venta-directa" element={<RegistrarVenta />} />
          <Route path="fiados" element={<RegistrarFiado />} />
          <Route path="consumo" element={<RegistrarConsumo />} />
          <Route path="quesera" element={<RegistrarQuesera />} />
          <Route path="cobrar-fiado" element={<RequireAdmin><CobrarFiado /></RequireAdmin>} />
          <Route path="liquidacion-quesera" element={<RequireAdmin><LiquidacionQuesera /></RequireAdmin>} />
          <Route path="egresos" element={<RequireAdmin><RegistrarEgreso /></RequireAdmin>} />
          <Route path="cierre-caja" element={<RequireAdmin><CierreCaja /></RequireAdmin>} />
          <Route path="correcciones" element={<RegistrarCorreccion />} />
          <Route path="historial-caja" element={<RequireAdmin><HistorialCaja /></RequireAdmin>} />
          <Route path="clientes" element={<RequireAdmin><EstadoClientes /></RequireAdmin>} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

