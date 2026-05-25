import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Admin from "./pages/Admin";

// Props: { loading?: boolean, error?: string | null }
const App = ({ loading = false, error = null }) => {
  if (loading) {
    return <div className="min-h-screen bg-cream animate-pulse" />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center text-danger">
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
      </Routes>
    </BrowserRouter>
  );
};

export default App;
