import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './App.scss';
import Layout from './components/Layout';
import Standings from './components/Standings';

const teamId = 119;

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Standings standingsType="sport" teamId={teamId} /> },
      { path: 'league', element: <Standings standingsType="league" teamId={teamId} /> },
      { path: 'division', element: <Standings standingsType="division" teamId={teamId} /> },
    ],
  },
]);

const App = () => {
  return <RouterProvider router={router} />;
}

export default App;