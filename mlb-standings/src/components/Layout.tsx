import { Outlet, NavLink } from 'react-router-dom';

const Layout = () => {
  return (
    <div>
      <header>
        <div className="tabs">
          <NavLink to="/" className={({ isActive }) => isActive ? "tab selected" : "tab"}>All</NavLink>
          <NavLink to="/league" className={({ isActive }) => isActive ? "tab selected" : "tab"}>League</NavLink>
          <NavLink to="/division" className={({ isActive }) => isActive ? "tab selected" : "tab"}>Division</NavLink>
          <NavLink to="/wildcard" className={({ isActive }) => isActive ? "tab selected" : "tab"}>Wildcard</NavLink>
        </div>
      </header>
      <main>
        <Outlet /> 
      </main>
    </div>
  );
}

          /* <div className="tab"><a href="/mlb?tab=division">Divisions</a></div>
          <div className="tab"><a href="/mlb?tab=wildcard">Wildcard</a></div>
          <div className="tab"><a href="/mlb?tab=playoffs">Playoffs</a></div> */

export default Layout;