import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SignIn from "./pages/AuthPages/SignIn";
import NotFound from "./pages/OtherPage/NotFound";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import OnlyGuestRoute from "./layout/OnlyGuestRoute";
import PrivateRoute from "./layout/PrivateRoute";
import ParkingSchedulePage from "./pages/ParkingSchedulePage/ParkingSchedulePage";
import ParkingActivityPage from "./pages/ParkingActivityPage/ParkingActivityPage";
import ScannerPage from "./pages/ScannerPage/ScannerPage";
import UpdatePasswordPage from "./pages/UpdatePassword/UpdatePasswordPage";

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Auth Routes (Only accessible by guests) */}
          <Route
            path="/signin"
            element={
              <OnlyGuestRoute>
                <SignIn />
              </OnlyGuestRoute>
            }
          />

          {/* Private Routes (Only accessible by authenticated users) */}
          <Route
            element={
              <PrivateRoute>
                <AppLayout />
              </PrivateRoute>
            }
          >
            <Route index path="/" element={<ScannerPage />} />
            <Route index path="/activity" element={<ParkingActivityPage />} />
            <Route index path="/schedule" element={<ParkingSchedulePage />} />
            <Route index path="/update-password" element={<UpdatePasswordPage />} />
          </Route>

          {/* Fallback Route (Page Not Found) */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}
