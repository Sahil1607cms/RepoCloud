import React from 'react'
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { AuthProvider } from "./context/AuthContext";
import { DeploymentProvider } from "./hooks/useDeployements";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DeploymentProvider>
          <AppRoutes />
        </DeploymentProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;