import { useStore } from './store.jsx';
import { Layout, LogoutModal, Toast } from './ui.jsx';
import Auth from './screens/Auth.jsx';
import { HomeScreen, ReportScreen, NotificationsScreen } from './screens/Main.jsx';
import { ScanScreen, ManualScreen } from './screens/Scan.jsx';
import { BudgetScreen, BudgetEditScreen } from './screens/Budget.jsx';
import { GoalsScreen, GoalDetailScreen, GoalFormScreen, GoalDepositScreen, GoalDeactivateScreen } from './screens/Goals.jsx';
import ProfileScreen from './screens/Profile.jsx';

// nama rute -> { menu sidebar yang aktif, teks breadcrumb, komponen }
const ROUTES = {
  home: ['home', 'Beranda', HomeScreen],
  report: ['report', 'Laporan Keuangan', ReportScreen],
  notifications: ['notifications', 'Notifikasi', NotificationsScreen],
  scan: ['scan', 'Scan Struk', ScanScreen],
  manual: ['scan', 'Scan Struk', ManualScreen],
  budget: ['budget', 'Anggaran', BudgetScreen],
  'budget-edit': ['budget', 'Anggaran', BudgetEditScreen],
  goals: ['goals', 'Target', GoalsScreen],
  'goal-detail': ['goals', 'Target', GoalDetailScreen],
  'goal-new': ['goals', 'Target', GoalFormScreen],
  'goal-edit': ['goals', 'Target', GoalFormScreen],
  'goal-deposit': ['goals', 'Target', GoalDepositScreen],
  'goal-deactivate': ['goals', 'Target', GoalDeactivateScreen],
  profile: ['profile', 'Profil', ProfileScreen],
};

export default function App() {
  const { token, route } = useStore();

  if (!token) {
    return <><Auth /><Toast /></>;
  }

  const [active, crumb, Screen] = ROUTES[route.name] || ROUTES.home;
  return (
    <>
      <Layout active={active} crumb={crumb}>
        {/* key memastikan state layar direset setiap pindah rute / id */}
        <Screen key={`${route.name}/${route.id ?? ''}`} id={route.id} mode={route.name === 'goal-edit' ? 'edit' : 'new'} />
      </Layout>
      <LogoutModal />
      <Toast />
    </>
  );
}
