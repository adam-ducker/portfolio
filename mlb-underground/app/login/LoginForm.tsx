'use client';

import { useFormState } from 'react-dom';
import { login, LoginState } from '@/app/actions/auth';

const initialState: LoginState = { error: '' };

const LoginForm = () => {
  const [state, formAction] = useFormState(login, initialState);

  return (
    <div className="login-wrapper form">
      <div className="disclaimer">
        MLB Underground is not affiliated with <br />
        Major League Baseball, MLB or MLB.com
      </div>
      <form className="form" action={formAction}>
        <h2>Login to your MLB Underground Account</h2>
        <div className="form-inner">
          {state.error && <div className="error">{state.error}</div>}
          <div className="form-group">
            <input
              type="text"
              id="username"
              name="username"
              placeholder="Username"
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Password"
              autoComplete="current-password"
            />
          </div>
          <div className="form-group">
            <button className="btn btn-primary btn-block" type="submit">
              Login
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;
