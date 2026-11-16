import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useStore } from './store.jsx'
import { WithNav } from './ui.jsx'
import { Login, Register, Splash, Welcome } from './screens/Auth.jsx'
import { Home, Notifications, Report } from './screens/Main.jsx'
import { Confirm, ManualInput, Scan, ScanError, Success } from './screens/Scan.jsx'
import { Budget, BudgetEdit } from './screens/Budget.jsx'
import { GoalDetail, GoalNew, Goals, Profile } from './screens/Goals.jsx'

// Hanya bisa diakses setelah masuk
function Protected() {
  const { state } = useStore()
  return state.user ? <Outlet /> : <Navigate to="/welcome" replace />
}

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<Protected />}>
          {/* Layar dengan navigasi bawah */}
          <Route element={<WithNav />}>
            <Route path="/home" element={<Home />} />
            <Route path="/report" element={<Report />} />
            <Route path="/budget" element={<Budget />} />
            <Route path="/target" element={<Goals />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* Layar tanpa navigasi bawah */}
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/scan/confirm" element={<Confirm />} />
          <Route path="/scan/error" element={<ScanError />} />
          <Route path="/scan/success" element={<Success />} />
          <Route path="/scan/manual" element={<ManualInput />} />
          <Route path="/budget/edit" element={<BudgetEdit />} />
          <Route path="/target/new" element={<GoalNew />} />
          <Route path="/target/:id" element={<GoalDetail />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
