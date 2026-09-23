import React, { Suspense, lazy, useEffect } from "react";
import ReactDOM from "react-dom/client";
import {
  HashRouter,
  Routes,
  Route,
  NavLink,
  Link,
  useLocation,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRegisterSW } from "virtual:pwa-register/react";
import {
  House,
  Map,
  MapPin,
  BookOpen,
  Settings,
  WifiOff,
  Plane,
} from "lucide-react";
import { SettingsProvider, useOnline } from "./app/context";
import Home from "./pages/Home";
import { Notice } from "./components/UI";
import "./styles/app.css";
const FlightForm = lazy(() => import("./pages/FlightForm")),
  FlightDetails = lazy(() => import("./pages/FlightDetails")),
  Airports = lazy(() => import("./pages/Airports")),
  Passport = lazy(() => import("./pages/Passport")),
  SettingsPage = lazy(() => import("./pages/Settings")),
  MapPage = lazy(() => import("./pages/MapPage")),
  ImportExport = lazy(() => import("./pages/ImportExport")),
  Aircraft = lazy(() => import("./pages/Aircraft")),
  Timeline = lazy(() => import("./pages/Timeline")),
  Connections = lazy(() => import("./pages/Connections")),
  Notifications = lazy(() => import("./pages/Notifications")),
  Diagnostics = lazy(() => import("./pages/Diagnostics")),
  About = lazy(() => import("./pages/About"));
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: string }
> {
  state = { error: "" };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  render() {
    return this.state.error ? (
      <main className="content">
        <h1>FlyHrag couldn’t open this view.</h1>
        <Notice error>{this.state.error}</Notice>
        <p>Your saved records have not been deleted.</p>
        <button className="button primary" onClick={() => location.reload()}>
          Reload FlyHrag
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
const client = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});
function Shell() {
  const online = useOnline(),
    location = useLocation();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW: (_url, registration) => {
      if (registration)
        setInterval(() => {
          if (navigator.onLine && document.visibilityState === "visible")
            void registration.update();
        }, 60 * 60000);
    },
  });
  useEffect(() => {
    if (!offlineReady) return;
    const timeout = setTimeout(() => setOfflineReady(false), 5000);
    return () => clearTimeout(timeout);
  }, [offlineReady, setOfflineReady]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return (
    <>
      <div className="app-topbar">
        <Link to="/" className="wordmark">
          <img src={`${import.meta.env.BASE_URL}icons/mark.svg`} alt="" />
          Fly<span>Hrag</span>
        </Link>
        <span className="topbar-caption">YOUR WORLD OF FLIGHT</span>
      </div>
      {!online && (
        <div className="offline-bar">
          <WifiOff size={15} /> Offline · viewing saved information
        </div>
      )}
      <main className="content">
        <Suspense
          fallback={<div className="skeleton">Opening your journey…</div>}
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/add" element={<FlightForm />} />
            <Route path="/flight/:id" element={<FlightDetails />} />
            <Route path="/flight/:id/edit" element={<FlightForm />} />
            <Route path="/flight/:id/aircraft" element={<Aircraft />} />
            <Route path="/flight/:id/timeline" element={<Timeline />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/airports" element={<Airports />} />
            <Route path="/airport/:id" element={<Airports />} />
            <Route path="/favorites" element={<Airports />} />
            <Route path="/passport" element={<Passport />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/import" element={<ImportExport />} />
            <Route path="/export" element={<ImportExport />} />
            <Route path="/connections" element={<Connections />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/diagnostics" element={<Diagnostics />} />
            <Route path="/about" element={<About />} />
            <Route
              path="*"
              element={
                <Notice>
                  Page not found. <Link to="/">Return to your journeys</Link>
                </Notice>
              }
            />
          </Routes>
        </Suspense>
      </main>
      <nav className="bottom-nav" aria-label="Main navigation">
        {(
          [
            ["/", "Home", House],
            ["/map", "Map", Map],
            ["/airports", "Airports", MapPin],
            ["/passport", "Passport", BookOpen],
            ["/settings", "Settings", Settings],
          ] as const
        ).map(([url, label, Icon]) => (
          <NavLink key={url} to={url} end={url === "/"}>
            <Icon size={22} strokeWidth={1.7} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      {(needRefresh || offlineReady) && (
        <div className="update-toast" role="status">
          <Plane size={20} />
          <p>
            {needRefresh
              ? "A new FlyHrag version is ready. Save any edits before updating."
              : "FlyHrag is ready for offline journeys."}
          </p>
          {needRefresh && (
            <button
              className="text-button"
              onClick={() => updateServiceWorker(true)}
            >
              Update
            </button>
          )}
          <button
            className="text-button"
            onClick={() => {
              setNeedRefresh(false);
              setOfflineReady(false);
            }}
          >
            Dismiss
          </button>
        </div>
      )}
    </>
  );
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={client}>
        <SettingsProvider>
          <HashRouter>
            <Shell />
          </HashRouter>
        </SettingsProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
