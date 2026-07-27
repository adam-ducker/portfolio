'use client';

import Link from 'next/link';
import { logout } from '@/app/actions/auth';
import useMLBContext from '@/app/contexts/MLBContext';

type NavProps = {
  username: string | null;
};

const Nav = ({ username }: NavProps) => {
  const { title, status } = useMLBContext();

  return (
    <nav>
      <Link href="/">MLB Underground</Link>

      {username && (
        <ul>
          <li>Hi, {username}&nbsp;&nbsp;| </li>
          <li>
            <form action={logout}>
              <button className="link-button" type="submit">
                Log Out
              </button>
            </form>
          </li>
        </ul>
      )}

      {username && <div className={`mlb-bug ${status}`} title={title}></div>}
    </nav>
  );
};

export default Nav;
