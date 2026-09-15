import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { checkSystem, Category } from "./api.js";
import { AuthProvider, useAuth } from "./context/AuthContext.js";
import { Navbar } from "./components/Navbar.js";
import { LoginPage } from "./pages/LoginPage.js";
import { ChangePasswordPage } from "./pages/ChangePasswordPage.js";
import { CreateTicketPage } from "./pages/CreateTicketPage.js";
import { TicketListPage } from "./pages/TicketListPage.js";
import { TicketDetailPage } from "./pages/TicketDetailPage.js";
import { StaffTicketQueuePage } from "./pages/staff/StaffTicketQueuePage.js";
import { StaffTicketDetailPage } from "./pages/staff/StaffTicketDetailPage.js";

type UiState = "idle" | "loading" | "success" | "error";

function Lab1Screen() {
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);

  async function handleCheck() {
    setState("loading");
    try {
      const result = await checkSystem();
      setCategories(result.categories);
      setState("success");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-4">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>

      <button
        className="btn btn-success"
        onClick={handleCheck}
        disabled={state === "loading"}
      >
        {state === "loading" ? "Loading…" : "Check System"}
      </button>

      {state === "error" && (
        <div className="alert alert-danger mt-3" role="alert">
          Offline — System unavailable
        </div>
      )}

      {state === "success" && (
        <div className="mt-3">
          <div className="alert alert-success" role="alert">
            Online
          </div>
          <h2 className="h5 mb-3">Categories</h2>
          <ul className="list-group">
            {categories.map((cat) => (
              <li key={cat.id} className="list-group-item">
                {cat.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Replaces the Lab 2 ProtectedLayout that gated on RequesterContext. Gates
// on the authenticated session instead (FR-08), and additionally enforces
// the mandatory-password-change block on the client side (BR-02) — this is
// a UX convenience only; the real enforcement is server-side
// (blockIfMustChangePassword in every protected API route), per the
// handout's "hiding a button is not authorization" instruction.
function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="p-5 text-center text-muted">Checking session…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  return (
    <>
      <Navbar />
      <main className="container py-4">{children}</main>
    </>
  );
}

function StaffOnlyLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user || (user.role !== "IT_STAFF" && user.role !== "ADMINISTRATOR")) {
    return <Navigate to={user ? "/tickets" : "/login"} replace />;
  }
  return <ProtectedLayout>{children}</ProtectedLayout>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/lab1" element={<Lab1Screen />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />

          {/* Protected Routes สำหรับระบบตั๋ว */}
          <Route
            path="/tickets"
            element={
              <ProtectedLayout>
                <TicketListPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/tickets/new"
            element={
              <ProtectedLayout>
                <CreateTicketPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/tickets/:id"
            element={
              <ProtectedLayout>
                <TicketDetailPage />
              </ProtectedLayout>
            }
          />
          <Route path="/queue" element={<StaffOnlyLayout><StaffTicketQueuePage /></StaffOnlyLayout>} />
          <Route path="/queue/:id" element={<StaffOnlyLayout><StaffTicketDetailPage /></StaffOnlyLayout>} />

          {/* Catch-all Route: ต้องอยู่บรรทัดสุดท้าย */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
