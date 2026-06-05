import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import FarmerLogin from "./pages/FarmerLogin";
import FarmerDashboard from "./pages/FarmerDashboard";
import FarmerWarehouse from "./pages/FarmerWarehouse";

// Props: { loading?: boolean, error?: string | null }
const App = ({ loading = false, error = null }) => {
  if (loading) {
    return <div className="min-h-screen app-shell animate-pulse" />;
  }

  if (error) {
    return (
      <div className="min-h-screen app-shell flex items-center justify-center text-danger">
        {error}
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/farmer/login" element={<FarmerLogin />} />
        <Route path="/farmer/dashboard" element={<FarmerDashboard />} />
        <Route path="/farmer/warehouse" element={<FarmerWarehouse />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
