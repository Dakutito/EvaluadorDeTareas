import { useState, useEffect } from 'react';
import { load, save, PROVIDERS } from './lib.js';
import Admin from './Admin.jsx';
import Evaluator from './Evaluator.jsx';

const ADMIN = { id: 'admin', nombre: 'Administrador', user: 'admin', pass: 'admin123', rol: 'admin' };

const loadUsers = () => {
  const stored = load('users', [ADMIN]);
  if (!Array.isArray(stored)) return [ADMIN];
  const otherUsers = stored.filter((u) => u?.id !== 'admin' && u?.user !== 'admin');
  return [ADMIN, ...otherUsers];
};

function Login({ users, onLogin }) {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const go = (e) => {
    e.preventDefault();
    const x = users.find((a) => a.user === u.trim() && a.pass === p);
    x ? onLogin(x.id) : setErr('Usuario o contraseña incorrectos. Revisa los datos e inténtalo de nuevo.');
  };
  return (
    <div className="login">
      <form className="login-box" onSubmit={go}>
        <h1>Evaluador de resúmenes</h1>
        <p className="muted">Califica trabajos con tu rúbrica y obtén retroalimentación automática.</p>
        <label>Usuario<input value={u} onChange={(e) => setU(e.target.value)} autoFocus autoComplete="username" /></label>
        <label>Contraseña<input type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" /></label>
        {err && <p className="error" role="alert">{err}</p>}
        <button className="btn primary" type="submit">Iniciar sesión</button>
        <small className="muted">Primer ingreso: admin / admin123</small>
      </form>
    </div>
  );
}

export default function App() {
  const [users, setUsers] = useState(loadUsers);
  const [subjects, setSubjects] = useState(() => load('subjects', []));
  const [cfg, setCfg] = useState(() => load('cfg', { provider: 'openai', model: PROVIDERS.openai.model, key: '' }));
  const [meId, setMeId] = useState(() => load('me', null));
  const [view, setView] = useState('tareas');
  useEffect(() => { save('users', users); }, [users]);
  useEffect(() => { save('subjects', subjects); }, [subjects]);
  useEffect(() => { save('cfg', cfg); }, [cfg]);
  useEffect(() => { save('me', meId); }, [meId]);

  const me = users.find((u) => u.id === meId);
  if (!me) return <Login users={users} onLogin={(id) => { setView('tareas'); setMeId(id); }} />;
  const isAdmin = me.rol === 'admin';
  const NAV = isAdmin
    ? [['docentes', 'Docentes'], ['asignaturas', 'Asignaturas'], ['ia', 'Modelo de IA']]
    : [['tareas', 'Mis tareas'], ['misasig', 'Mis asignaturas']];
  const v = NAV.some(([k]) => k === view) ? view : NAV[0][0];

  return (
    <div className="app">
      <aside className="side">
        <div className="logo">Evaluador<span>de resúmenes</span></div>
        <nav>{NAV.map(([k, l]) => <button key={k} className={v === k ? 'on' : ''} onClick={() => setView(k)}>{l}</button>)}</nav>
        <div className="me">
          <b>{me.nombre}</b><small>{isAdmin ? 'Administrador' : 'Docente'}</small>
          <button className="btn side-btn" onClick={() => setMeId(null)}>Cerrar sesión</button>
        </div>
      </aside>
      <main>
        {!isAdmin
          ? <Evaluator key={me.id} me={me} subjects={subjects} cfg={cfg} view={v} go={setView} />
          : <Admin sec={v} users={users} setUsers={setUsers} subjects={subjects} setSubjects={setSubjects} cfg={cfg} setCfg={setCfg} />}
      </main>
    </div>
  );
}
