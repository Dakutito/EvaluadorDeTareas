import { useState } from 'react';
import { uid, PROVIDERS, detectProvider, callLLM } from './lib.js';

export default function Admin({ sec, users, setUsers, subjects, setSubjects, cfg, setCfg }) {
  const [d, setD] = useState(cfg);
  const [t, setT] = useState(null);
  const [nu, setNu] = useState({ nombre: '', user: '', pass: '' });
  const [ns, setNs] = useState({ nombre: '', docente: '', paralelos: '' });
  const [newParallel, setNewParallel] = useState({});
  const docentes = users.filter((u) => u.rol === 'docente');
  const dname = (id) => users.find((u) => u.id === id)?.nombre || '';
  const subjectParallels = (subject) => {
    if (Array.isArray(subject.paralelos)) return subject.paralelos;
    if (typeof subject.paralelos === 'string' && subject.paralelos.trim()) {
      return subject.paralelos.split(',').map((nombre) => ({
        id: uid(),
        nombre: nombre.trim(),
        docente: '',
      })).filter((p) => p.nombre);
    }
    return [];
  };

  const onKey = (v) => {
    const k = v.trim(); const p = detectProvider(k);
    setD(p && p !== d.provider ? { ...d, key: k, provider: p, model: PROVIDERS[p].model } : { ...d, key: k });
    setT(null);
  };
  const test = async () => {
    setT({ s: 'run' });
    try { await callLLM(d, 'Responde solo con este JSON: {"ok":true}'); setT({ s: 'ok' }); }
    catch (e) { setT({ s: 'err', m: e.message }); }
  };
  const saveApi = (e) => { e.preventDefault(); setCfg({ ...d, key: d.key.trim() }); setT({ s: 'saved' }); };

  const addUser = (e) => {
    e.preventDefault();
    const user = nu.user.trim();
    if (users.some((x) => x.user === user)) return alert('Ese usuario ya existe. Elige otro.');
    setUsers([...users, { id: uid(), rol: 'docente', nombre: nu.nombre.trim(), user, pass: nu.pass }]);
    setNu({ nombre: '', user: '', pass: '' });
  };
  const delUser = (id) => {
    if (!confirm('¿Eliminar este docente?')) return;
    setUsers(users.filter((u) => u.id !== id));
    setSubjects(subjects.map((s) => ({
      ...s,
      docentes: (s.docentes || []).filter((x) => x !== id),
      paralelos: subjectParallels(s).map((p) => p.docente === id ? { ...p, docente: '' } : p),
    })));
  };
  const addSubject = (e) => {
    e.preventDefault();
    const docentesAsignados = ns.docente ? [ns.docente] : [];
    const paralelos = ns.paralelos
      .split(',')
      .map((nombre) => nombre.trim())
      .filter(Boolean)
      .map((nombre) => ({
        id: uid(),
        nombre,
        docente: ns.docente,
      }));
    setSubjects([...subjects, {
      id: uid(),
      nombre: ns.nombre.trim(),
      docentes: docentesAsignados,
      paralelos,
    }]);
    setNs({ nombre: '', docente: '', paralelos: '' });
  };
  const addParallel = (sid) => {
    const nombre = (newParallel[sid] || '').trim();
    if (!nombre) return;
    setSubjects(subjects.map((s) => {
      if (s.id !== sid) return s;
      const paralelos = subjectParallels(s);
      if (paralelos.some((p) => p.nombre.toLowerCase() === nombre.toLowerCase())) return s;
      return { ...s, paralelos: [...paralelos, { id: uid(), nombre, docente: '' }] };
    }));
    setNewParallel({ ...newParallel, [sid]: '' });
  };
  const setParallelTeacher = (sid, pid, docente) => {
    setSubjects(subjects.map((s) => {
      if (s.id !== sid) return s;
      const paralelos = subjectParallels(s).map((p) => p.id === pid ? { ...p, docente } : p);
      const docentesAsignados = [...new Set([
        ...(s.docentes || []),
        ...paralelos.map((p) => p.docente).filter(Boolean),
      ])];
      return { ...s, paralelos, docentes: docentesAsignados };
    }));
  };
  const removeParallel = (sid, pid) => {
    setSubjects(subjects.map((s) => {
      if (s.id !== sid) return s;
      const paralelos = subjectParallels(s).filter((p) => p.id !== pid);
      const docentesAsignados = [...new Set([
        ...(s.docentes || []),
        ...paralelos.map((p) => p.docente).filter(Boolean),
      ])];
      return { ...s, paralelos, docentes: docentesAsignados };
    }));
  };
  const assign = (sid, did) => setSubjects(subjects.map((s) => (s.id === sid && !s.docentes.includes(did) ? { ...s, docentes: [...s.docentes, did] } : s)));
  const unassign = (sid, did) => setSubjects(subjects.map((s) => (s.id === sid ? { ...s, docentes: s.docentes.filter((x) => x !== did) } : s)));

  if (sec === 'ia') return (
    <div className="stack">
      <div className="head"><h1>Modelo de IA</h1><p className="muted">Una sola clave para todos los docentes. Se guarda únicamente en este navegador.</p></div>
      <p className={cfg.key ? 'ok' : 'alert'}>{cfg.key ? `Configurada: ${PROVIDERS[cfg.provider].label} · ${cfg.model}` : 'Todavía no hay una API key guardada.'}</p>
      <form className="panel stack" onSubmit={saveApi}>
        <label>API key<input type="password" value={d.key} onChange={(e) => onKey(e.target.value)} placeholder="Pega tu clave; el proveedor se detecta solo" autoComplete="off" required /></label>
        <div className="grid2">
          <label>Proveedor
            <select value={d.provider} onChange={(e) => setD({ ...d, provider: e.target.value, model: PROVIDERS[e.target.value].model })}>
              {Object.entries(PROVIDERS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          <label>Modelo<input value={d.model} onChange={(e) => setD({ ...d, model: e.target.value })} required /></label>
        </div>
        <div className="row">
          <button type="button" className="btn" onClick={test} disabled={!d.key || t?.s === 'run'}>{t?.s === 'run' ? 'Probando…' : 'Probar conexión'}</button>
          <button type="submit" className="btn primary">Guardar configuración</button>
        </div>
        {t?.s === 'ok' && <p className="ok" role="status">La conexión funciona. Ahora guarda la configuración.</p>}
        {t?.s === 'saved' && <p className="ok" role="status">Configuración guardada.</p>}
        {t?.s === 'err' && <p className="error" role="alert">No se pudo conectar: {t.m}</p>}
      </form>
    </div>
  );

  if (sec === 'docentes') return (
    <div className="stack">
      <div className="head"><h1>Docentes</h1><p className="muted">Crea cuentas y asigna a cada docente una o varias asignaturas.</p></div>
      <form className="panel grid4" onSubmit={addUser}>
        <label>Nombre completo<input value={nu.nombre} onChange={(e) => setNu({ ...nu, nombre: e.target.value })} required /></label>
        <label>Usuario<input value={nu.user} onChange={(e) => setNu({ ...nu, user: e.target.value })} required /></label>
        <label>Contraseña<input value={nu.pass} onChange={(e) => setNu({ ...nu, pass: e.target.value })} required minLength={4} /></label>
        <button className="btn primary" type="submit">Agregar docente</button>
      </form>
      <div className="panel">
        {docentes.length === 0 ? <p className="muted">Aún no hay docentes. Agrega el primero con el formulario de arriba.</p> : (
          <table><thead><tr><th>Nombre</th><th>Usuario</th><th>Asignaturas</th><th></th></tr></thead><tbody>
            {docentes.map((u) => (
              <tr key={u.id}><td>{u.nombre}</td><td>{u.user}</td>
                <td>
                  <div className="chips">
                    {subjects.filter((s) => s.docentes.includes(u.id)).map((s) => <span className="chip" key={s.id}>{s.nombre}<button aria-label={`Quitar ${s.nombre}`} onClick={() => unassign(s.id, u.id)}>×</button></span>)}
                  </div>
                  <select value="" onChange={(e) => e.target.value && assign(e.target.value, u.id)}>
                    <option value="">{subjects.some((s) => !s.docentes.includes(u.id)) ? 'Agregar asignatura…' : 'No hay más asignaturas'}</option>
                    {subjects.filter((s) => !s.docentes.includes(u.id)).map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </td>
                <td className="r"><button className="btn danger" onClick={() => delUser(u.id)}>Eliminar</button></td></tr>
            ))}
          </tbody></table>
        )}
      </div>
    </div>
  );

  return (
    <div className="stack">
      <div className="head"><h1>Asignaturas</h1><p className="muted">Crea asignaturas y elige qué docentes pueden trabajar en cada una.</p></div>
      <form className="panel grid4" onSubmit={addSubject}>
        <label>Nombre de la asignatura<input value={ns.nombre} onChange={(e) => setNs({ ...ns, nombre: e.target.value })} required /></label>
        <label>Docente
          <select value={ns.docente} onChange={(e) => setNs({ ...ns, docente: e.target.value })}>
            <option value="">{docentes.length ? 'Asignar después' : 'Primero crea un docente'}</option>
            {docentes.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </select>
        </label>
        <label>Paralelos<input value={ns.paralelos} onChange={(e) => setNs({ ...ns, paralelos: e.target.value })} placeholder="Ej: A, B, C" /></label>
        <button className="btn primary" type="submit">Crear asignatura</button>
      </form>
      {subjects.length === 0 && <div className="panel"><p className="muted">Aún no hay asignaturas. Crea la primera con el formulario de arriba.</p></div>}
      <div className="cards">
        {subjects.map((s) => (
          <div className="card" key={s.id}>
            <h3>{s.nombre}</h3>
            <div className="parallel-list">
              <label>Paralelos</label>
              {subjectParallels(s).map((p) => (
                <div className="parallel-row" key={p.id}>
                  <input
                    className="parallel-name"
                    value={p.nombre}
                    readOnly
                    aria-label={`Paralelo ${p.nombre}`}
                  />
                  <select
                    value={p.docente || ''}
                    onChange={(e) => setParallelTeacher(s.id, p.id, e.target.value)}
                  >
                    <option value="">Asignar docente…</option>
                    {docentes.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                  </select>
                  <button
                    className="parallel-remove"
                    type="button"
                    aria-label={`Eliminar paralelo ${p.nombre}`}
                    onClick={() => removeParallel(s.id, p.id)}
                  >×</button>
                </div>
              ))}
              <div className="parallel-row parallel-add">
                <input
                  value={newParallel[s.id] || ''}
                  onChange={(e) => setNewParallel({ ...newParallel, [s.id]: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addParallel(s.id);
                    }
                  }}
                  placeholder="Ej: A"
                />
                <button className="btn parallel-add-btn" type="button" onClick={() => addParallel(s.id)}>Agregar</button>
              </div>
            </div>
            <button className="btn danger" onClick={() => confirm('¿Eliminar esta asignatura?') && setSubjects(subjects.filter((x) => x.id !== s.id))}>Eliminar asignatura</button>
          </div>
        ))}
      </div>
    </div>
  );
}
