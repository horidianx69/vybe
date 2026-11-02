import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { homeFor } from "../utils/roleHome";

const ProtectedRoute = ({ children, role }) => {
    const { token, user, loading } = useAuth();

    if (loading) return null;

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (role && user?.role !== role) {
        return <Navigate to={homeFor(user?.role)} replace />;
    }

    return children;
};

export default ProtectedRoute;
