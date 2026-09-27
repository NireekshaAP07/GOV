import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import Login from "./pages/Login";

const Overview = lazy(() => import("./pages/Overview"));
const Materials = lazy(() => import("./pages/Materials"));
const MaterialDetail = lazy(() => import("./pages/MaterialDetail"));
const ImportData = lazy(() => import("./pages/ImportData"));
const Duplicates = lazy(() => import("./pages/Duplicates"));
const Review = lazy(() => import("./pages/Review"));
const NationalMaterials = lazy(() => import("./pages/NationalMaterials"));
const NationalDetail = lazy(() =>
  import("./pages/NationalMaterials").then((module) => ({
    default: module.NationalDetail,
  })),
);
const Mappings = lazy(() => import("./pages/Mappings"));
const Procurement = lazy(() => import("./pages/Procurement"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Governance = lazy(() =>
  import("./pages/Governance").then((module) => ({ default: module.Audit })),
);
const HelpPage = lazy(() =>
  import("./pages/Governance").then((module) => ({ default: module.HelpPage })),
);
const SettingsPage = lazy(() =>
  import("./pages/Governance").then((module) => ({
    default: module.SettingsPage,
  })),
);

export default function App() {
  return (
    <Suspense
      fallback={
        <div className="route-loading" aria-label="Loading page">
          <span />
        </div>
      }
    >
      <Routes>
        <Route path="login" element={<Login />} />
        <Route element={<AppLayout />}>
          <Route index element={<Overview />} />
          <Route path="materials" element={<Materials />} />
          <Route path="materials/:id" element={<MaterialDetail />} />
          <Route path="import" element={<ImportData />} />
          <Route path="duplicates" element={<Duplicates />} />
          <Route path="reviews" element={<Review />} />
          <Route path="national-materials" element={<NationalMaterials />} />
          <Route path="national-materials/:id" element={<NationalDetail />} />
          <Route path="mappings" element={<Mappings />} />
          <Route path="procurement" element={<Procurement />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="audit" element={<Governance />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="help" element={<HelpPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
