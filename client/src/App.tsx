import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { checkSystem, Category } from "./api.js";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import { Navbar } from "./components/Navbar.js";
import { SelectRequesterPage } from "./pages/SelectRequesterPage.js";
import { CreateTicketPage } from "./pages/CreateTicketPage.js";
import { TicketListPage } from "./pages/TicketListPage.js";
import { TicketDetailPage } from "./pages/TicketDetailPage.js";

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

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { currentRequester, loading } = useRequester();

  if (loading) {
    return <div className="p-5 text-center">Loading user context...</div>;
  }

  if (!currentRequester) {
    return <Navigate to="/select-requester" replace />;
  }

  return (
    <>
      <Navbar />
      <main className="container py-4">{children}</main>
    </>
  );
}

export default function App() {
  return (
    <RequesterProvider>
      <BrowserRouter>
        <Routes>
          {/* หน้าแรกสุดของระบบ: วิ่งไปหน้า Select Requester เสมอ */}
          <Route path="/" element={<Navigate to="/select-requester" replace />} />
          <Route path="/lab1" element={<Lab1Screen />} />
          <Route path="/select-requester" element={<SelectRequesterPage />} />

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

          {/* Catch-all Route: ต้องอยู่บรรทัดสุดท้าย */}
          <Route path="*" element={<Navigate to="/select-requester" replace />} />
        </Routes>
      </BrowserRouter>
    </RequesterProvider>
  );
}