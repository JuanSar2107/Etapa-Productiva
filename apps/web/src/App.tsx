import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router';
import { Layout } from './components/Layout';
import { Alerta, Cargando } from './components/ui';
import { useUsuario } from './hooks/useUsuario';
import { AutorizacionDatosPage } from './pages/AutorizacionDatosPage';
import { EditorPlantillaPage } from './pages/EditorPlantillaPage';
import { EmpresasPage } from './pages/EmpresasPage';
import { EnviosPage } from './pages/EnviosPage';
import { ImportarCsvPage } from './pages/ImportarCsvPage';
import { LoginPage } from './pages/LoginPage';
import { PerfilPage } from './pages/PerfilPage';
import { PlantillasPage } from './pages/PlantillasPage';
import { SeguimientoPage } from './pages/SeguimientoPage';

/** Exige sesión y, salvo en la propia página de autorización, que el usuario haya aceptado el tratamiento de datos. */
function RutaProtegida() {
  const { data: usuario, isLoading, error } = useUsuario();
  const { pathname } = useLocation();

  if (isLoading) return <Cargando />;
  if (error) {
    return (
      <div className="mx-auto max-w-md p-6">
        <Alerta tipo="error">No se pudo conectar con el servidor. ¿Está corriendo el API?</Alerta>
      </div>
    );
  }
  if (!usuario) return <Navigate to="/login" replace />;
  if (!usuario.autorizacionDatosEn && pathname !== '/autorizacion-datos') {
    return <Navigate to="/autorizacion-datos" replace />;
  }
  return <Outlet />;
}

function RutaPublica() {
  const { data: usuario, isLoading } = useUsuario();
  if (isLoading) return <Cargando />;
  return usuario ? <Navigate to="/" replace /> : <Outlet />;
}

export function App() {
  return (
    <Routes>
      <Route element={<RutaPublica />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
      <Route element={<RutaProtegida />}>
        <Route element={<Layout />}>
          <Route path="/autorizacion-datos" element={<AutorizacionDatosPage />} />
          <Route path="/perfil" element={<PerfilPage />} />
          <Route path="/empresas" element={<EmpresasPage />} />
          <Route path="/empresas/importar" element={<ImportarCsvPage />} />
          <Route path="/envios" element={<EnviosPage />} />
          <Route path="/plantillas" element={<PlantillasPage />} />
          <Route path="/plantillas/nueva" element={<EditorPlantillaPage />} />
          <Route path="/plantillas/:id" element={<EditorPlantillaPage />} />
          <Route path="/seguimiento" element={<SeguimientoPage />} />
          <Route path="/" element={<Navigate to="/seguimiento" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
