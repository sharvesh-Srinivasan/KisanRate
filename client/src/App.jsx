import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Admin from "./pages/Admin";

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
      </Routes>
    </BrowserRouter>
  );
};

export default App;
