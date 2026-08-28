import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { checkSystem, Category } from "./api.js";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import { Navbar } from "./components/Navbar.js";
import { SelectRequesterPage } from "./pages/SelectRequesterPage.js";
import { CreateTicketPage } from "./pages/CreateTicketPage.js";

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
  const { currentRequester, isLoading } = useRequester();

  if (isLoading) {
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

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="card shadow-sm p-4 text-center">
      <h2 className="h4 text-success">{title}</h2>
      <p className="text-muted">Ready for the next feature implementation.</p>
    </div>
  );
}

export default function App() {
  return (
    <RequesterProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/lab1" element={<Lab1Screen />} />
          <Route path="/select-requester" element={<SelectRequesterPage />} />
          <Route
            path="/tickets"
            element={
              <ProtectedLayout>
                <PlaceholderPage title="My Tickets Screen" />
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
          <Route path="*" element={<Navigate to="/tickets" replace />} />
        </Routes>
      </BrowserRouter>
    </RequesterProvider>
  );
}