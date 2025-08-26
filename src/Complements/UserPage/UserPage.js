import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";


const numberOr = (v, fallback = 0) => {
  const n = typeof v === "string" ? v.trim() : v;
  const parsed = Number(n);
  return Number.isFinite(parsed) ? parsed : fallback;
};


const COLORS = [
  "#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6",
  "#14b8a6", "#e11d48", "#a3e635", "#06b6d4", "#fb7185"
];

// Fallback
const DEFAULT_CATEGORIES = [
  { id: 1, name: "Housing" },
  { id: 2, name: "Food" },
  { id: 3, name: "Transportation" },
  { id: 4, name: "Entertainment" },
  { id: 5, name: "Others" },
  { id: 6, name: "Income" },
];

export default function TransactionManager({
  authToken,
  apiBase = "https://localhost:7026/api/Transaction",
  categoriesApiBase = "https://localhost:7026/api/Category",
  currency = "USD",
}) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({ categoryId: "", type: "expense", amount: "", description: "" });

  const [pieData, setPieData] = useState([]);
  const [pieLoading, setPieLoading] = useState(false);

  const [categories, setCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(false);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${authToken}`,
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(apiBase, { headers });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(data);
    } catch (err) {
      setError(err?.message || "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  const fetchPie = async () => {
    try {
      setPieLoading(true);
      const res = await fetch(`${apiBase}/piechart`, { headers });
      if (!res.ok) throw new Error(await res.text());
      const raw = await res.json();
      // Soportar camelCase y PascalCase
      const mapped = (raw || []).map(r => ({
        name: r.CategoryName ?? r.categoryName ?? `Cat ${r.CategoryId ?? r.categoryId}`,
        value: Number(r.Total ?? r.total ?? 0)
      }));
      setPieData(mapped);
    } catch (err) {
      console.error("/piechart error:", err);
      setError(prev => prev ?? (err?.message || "No se pudo cargar el piechart"));
    } finally {
      setPieLoading(false);
    }
  };

  const fetchCategories = async () => {
    const attempts = [categoriesApiBase, categoriesApiBase.endsWith("s") ? categoriesApiBase : `${categoriesApiBase}s`];
    setCatLoading(true);
    try {
      let data = null;
      for (const url of attempts) {
        try {
          const res = await fetch(url, { headers });
          if (!res.ok) throw new Error(await res.text());
          data = await res.json();
          break;
        } catch (_) {  }
      }
      if (!data) throw new Error("No se pudo obtener categorías del backend");

      const mapped = (data || []).map(c => ({
        id: Number(c.categoryId ?? c.CategoryId ?? c.id ?? c.Id),
        name: String(c.categoryName ?? c.CategoryName ?? c.name ?? c.Name ?? "")
      })).filter(c => Number.isFinite(c.id) && c.name);

      setCategories(mapped.length ? mapped : DEFAULT_CATEGORIES);
    } catch (err) {
      console.warn("Categories fallback (DEFAULT_CATEGORIES). Error:", err);
      setCategories(DEFAULT_CATEGORIES);
    } finally {
      setCatLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchPie();
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, categoriesApiBase, authToken]);

  const budget = useMemo(() => {
    return transactions.reduce((acc, t) => acc + (t.type === "income" ? t.amount : -t.amount), 0);
  }, [transactions]);

  const categoryMap = useMemo(() => {
    const m = new Map();
    for (const c of categories) m.set(String(c.id), c.name);
    return m;
  }, [categories]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const categoryId = numberOr(form.categoryId, NaN);
    const amount = numberOr(form.amount, NaN);

    if (!Number.isFinite(categoryId) || categoryId <= 0) {
      setError("Select a valid category");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid amount (> 0)");
      return;
    }

    const payload = {
      categoryId,
      type: form.type,
      amount,
      description: form.description?.trim() || undefined,
    };

    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      setForm({ categoryId: "", type: form.type, amount: "", description: "" });
      await Promise.all([fetchTransactions(), fetchPie()]);
    } catch (err) {
      setError(err?.message || "No se pudo crear la transacción");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this transaction?")) return;
    try {
      const res = await fetch(`${apiBase}/${id}`, { method: "DELETE", headers });
      if (!res.ok) throw new Error(await res.text());
      setTransactions(prev => prev.filter(t => t.transactionsId !== id));
      fetchPie();
    } catch (err) {
      setError(err?.message || "Could not delete transaction");
    }
  };

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-end flex-wrap gap-3 mb-3">
        <div>
          <h1 className="h3 fw-bold mb-1">Expense Tracker</h1>
          <small className="text-secondary">Add expenses and income</small>
        </div>
        <div className="text-end">
          <div className="text-secondary small">Current Budget</div>
          <div className={`display-6 fw-bold ${budget >= 0 ? "text-success" : "text-danger"}`}>
            {budget.toLocaleString(undefined, { style: "currency", currency })}
          </div>
        </div>
      </div>

      {/* Formulario */}
      <div className="card shadow-sm mb-4">   
        <div className="card-body">
          <h2 className="h5 mb-3">New Transaction</h2>
          <form onSubmit={handleSubmit} className="row g-3 align-items-end">
            <div className="col-12 col-md-2">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={form.categoryId}
                onChange={(e) => setForm(f => ({ ...f, categoryId: e.target.value }))}
                disabled={catLoading}
              >
                <option value="">{catLoading ? "Loading…" : "Select a category"}</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">Amount</label>
              <input type="number" min={0} step="0.01" className="form-control" placeholder="0.00"
                value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">Description</label>
              <input type="text" className="form-control" placeholder="Optional"
                value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <div className="col-12 col-md-1 d-grid">
              <button type="submit" className="btn btn-dark" disabled={loading}>
                {loading ? "Guardando…" : "Agregar"}
              </button>
            </div>
          </form>
          {error && <div className="mt-3 text-danger small">{error}</div>}
        </div>
      </div>

      {/* Pie Chart */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="h5 mb-0">Expenses by Category</h2>
            <button onClick={fetchPie} className="btn btn-outline-secondary btn-sm" disabled={pieLoading}>
              {pieLoading ? "Updating…" : "Refresh"}
            </button>
          </div>
          <div style={{ width: "100%", height: 320 }}>
            {pieData.length === 0 && !pieLoading ? (
              <div className="d-flex align-items-center justify-content-center h-100 text-secondary small">
                No expense data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} innerRadius={60} label>
                    {pieData.map((_, idx) => (
                      <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => Number(value).toLocaleString(undefined, { style: "currency", currency })} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card shadow-sm">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="h5 mb-0">Transactions</h2>
            <button onClick={fetchTransactions} className="btn btn-outline-secondary btn-sm" disabled={loading}>
              {loading ? "Updating…" : "Refresh"}
            </button>
          </div>
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th className="text-end">Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="text-center text-secondary py-4">No transactions.</td>
                  </tr>
                )}
                {transactions.map((t) => (
                  <tr key={t.transactionsId}>
                    <td>{new Date(t.date).toLocaleString()}</td>
                    <td>
                      <span className={`badge rounded-pill ${t.type === "income" ? "text-bg-success" : "text-bg-danger"}`}>
                        {t.type}
                      </span>
                    </td>
                    <td>{categoryMap.get(String(t.categoryId)) ?? t.categoryId}</td>
                    <td>{t.description || "—"}</td>
                    <td className="text-end">
                      {(t.type === "income" ? t.amount : -t.amount).toLocaleString(undefined, { style: "currency", currency })}
                    </td>
                    <td>
                      <button onClick={() => handleDelete(t.transactionsId)} className="btn btn-link text-danger p-0">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

TransactionManager.propTypes = {
  authToken: PropTypes.string.isRequired,
  apiBase: PropTypes.string,
  categoriesApiBase: PropTypes.string,
  currency: PropTypes.string,
};
