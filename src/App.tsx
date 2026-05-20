import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Budget } from './pages/Budget';
import { Accounts } from './pages/Accounts';
import { Invoice } from './pages/Invoice';
import { Tags } from './pages/Tags';
import { Calendar } from './pages/Calendar';
import { Categories } from './pages/Categories';
import { IncomeSources } from './pages/IncomeSources';
import { Settlements } from './pages/Settlements';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/invoice" element={<Invoice />} />
          <Route path="/tags" element={<Tags />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/income" element={<IncomeSources />} />
          <Route path="/settlements" element={<Settlements />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
