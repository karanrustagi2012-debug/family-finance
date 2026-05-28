"use client";

import { auth, db } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged } from "firebase/auth";
import { Wallet, TrendingUp, PiggyBank, CreditCard, Zap, BarChart2, Tag, Home, PlusCircle, BarChart, Settings } from "lucide-react";
import {
  collection, addDoc, onSnapshot, query, orderBy,
  deleteDoc, doc, updateDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

const categories = [
  "Food & Dining", "Groceries", "Fuel", "Shopping", "Travel", "Rent",
  "Utilities", "Electricity", "Internet", "Mobile Recharge", "Entertainment",
  "Movies", "Subscriptions", "Medical", "Insurance", "Gym", "Self Care",
  "Education", "Investment", "SIP", "EMI", "Credit Card Bill", "Home Expenses",
  "Gifts", "Family", "Kids", "Petrol", "Car Maintenance", "Taxi", "Flight",
  "Hotel", "Miscellaneous",
];

const paymentMethods = ["UPI", "Cash", "Credit Card", "Debit Card", "Bank Transfer"];

const PIE_COLORS = [
  "#06b6d4","#3b82f6","#8b5cf6","#ec4899","#f59e0b",
  "#10b981","#ef4444","#f97316","#84cc16","#14b8a6",
  "#6366f1","#e879f9",
];

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const DEFAULT_BUDGETS: Record<string, number> = {
  "Food & Dining": 5000, "Groceries": 4000, "Fuel": 3000,
  "Shopping": 5000, "Travel": 8000, "Rent": 20000,
  "Utilities": 2000, "Electricity": 1500, "Internet": 1000,
  "Entertainment": 2000, "Medical": 3000, "Miscellaneous": 2000,
};

export default function HomePage() {

  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Food & Dining");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [monthlyIncome, setMonthlyIncome] = useState<number>(() => {
  if (typeof window !== "undefined") {
    return Number(localStorage.getItem("monthlyIncome") || 0);
  }
  return 0;
});
  const [budgets, setBudgets] = useState<Record<string, number>>(DEFAULT_BUDGETS);
  const [transactions, setTransactions] = useState<any[]>([]);

  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth());
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [filterPayment, setFilterPayment] = useState<string>("All");
  const [filterWho, setFilterWho] = useState<string>("All");

  const [activeTab, setActiveTab] = useState<"home" | "add" | "analytics" | "budgets">("home");

  // ── Step 1: Check redirect result first, then set up auth listener ─────────
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          setUser(result.user);
          toast.success("Logged in 🚀");
        }
      })
      .catch((err) => {
        console.error("Redirect error:", err);
      })
      .finally(() => {
        // Step 2: Now set up the persistent auth listener
        onAuthStateChanged(auth, (u) => {
          setUser(u);
          setAuthChecked(true);
        });
      });
  }, []);

  // ── Firestore ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { setTransactions([]); return; }
    const q = query(collection(db, "transactions"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const items: any[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      setTransactions(items);
    });
    return () => unsub();
  }, [user]);

  // ── Login ──────────────────────────────────────────────────────────────────
 const login = async () => {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const result = await signInWithPopup(auth, provider);
    setUser(result.user);
    toast.success("Logged in 🚀");
  } catch (error: any) {
    if (error.code === "auth/popup-blocked") {
      toast.error("Please allow popups for this site and try again.");
    } else {
      toast.error("Login failed. Please try again.");
    }
  }
};

  // ── Add / Edit ─────────────────────────────────────────────────────────────
  const addExpense = async () => {
    if (!user) { toast.error("Please log in first."); return; }
    if (!title.trim() || !amount) { toast.error("Fill in title and amount."); return; }
    try {
      if (editingId) {
        await updateDoc(doc(db, "transactions", editingId), {
          title, amount: Number(amount), category, paymentMethod,
        });
        setEditingId(null);
        toast.success("Updated ✅");
      } else {
        await addDoc(collection(db, "transactions"), {
          title, amount: Number(amount), category, paymentMethod,
          uid: user.uid,
          addedBy: user.displayName || "Unknown",
          addedByPhoto: user.photoURL || "",
          createdAt: new Date(),
        });
        toast.success("Saved 🚀");
      }
      setAmount(""); setTitle(""); setCategory("Food & Dining"); setPaymentMethod("UPI");
      setActiveTab("home");
    } catch { toast.error("Something went wrong."); }
  };

  const deleteTransaction = async (id: string, ownerUid: string) => {
    if (ownerUid !== user?.uid) { toast.error("You can only delete your own expenses."); return; }
    try { await deleteDoc(doc(db, "transactions", id)); toast.success("Deleted."); }
    catch { toast.error("Could not delete."); }
  };

  const editTransaction = (item: any) => {
    if (item.uid !== user?.uid) { toast.error("You can only edit your own expenses."); return; }
    setTitle(item.title); setAmount(item.amount.toString());
    setCategory(item.category); setPaymentMethod(item.paymentMethod);
    setEditingId(item.id); setActiveTab("add");
  };

  // ── Computed ───────────────────────────────────────────────────────────────
  const now = new Date();

  const thisMonthTx = transactions.filter((item) => {
    const d = item.createdAt?.toDate?.();
    return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const lastMonthTx = transactions.filter((item) => {
    const d = item.createdAt?.toDate?.();
    const lm = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const ly = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return d && d.getMonth() === lm && d.getFullYear() === ly;
  });

  const totalSpend = thisMonthTx.reduce((s, i) => s + Number(i.amount || 0), 0);
  const lastMonthTotal = lastMonthTx.reduce((s, i) => s + Number(i.amount || 0), 0);
  const pctChange = lastMonthTotal ? (((totalSpend - lastMonthTotal) / lastMonthTotal) * 100).toFixed(1) : null;
  const savings = monthlyIncome - totalSpend;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weeklySpend = transactions
    .filter((i) => { const d = i.createdAt?.toDate?.(); return d && d > sevenDaysAgo; })
    .reduce((s, i) => s + Number(i.amount || 0), 0);
  const creditUsage = transactions
    .filter((i) => i.paymentMethod === "Credit Card")
    .reduce((s, i) => s + Number(i.amount || 0), 0);

  const spendByPerson: Record<string, { name: string; photo: string; total: number }> = {};
  thisMonthTx.forEach((item) => {
    if (!spendByPerson[item.uid]) {
      spendByPerson[item.uid] = { name: item.addedBy || "Unknown", photo: item.addedByPhoto || "", total: 0 };
    }
    spendByPerson[item.uid].total += Number(item.amount || 0);
  });

  const filteredTransactions = transactions.filter((item) => {
    const d = item.createdAt?.toDate?.();
    if (!d) return false;
    if (d.getMonth() !== filterMonth || d.getFullYear() !== filterYear) return false;
    if (filterCategory !== "All" && item.category !== filterCategory) return false;
    if (filterPayment !== "All" && item.paymentMethod !== filterPayment) return false;
    if (filterWho !== "All" && item.addedBy !== filterWho) return false;
    return true;
  });

  const categoryMap: Record<string, number> = {};
  filteredTransactions.forEach((item) => {
    categoryMap[item.category] = (categoryMap[item.category] || 0) + Number(item.amount || 0);
  });
  const pieData = Object.entries(categoryMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const paymentMap: Record<string, number> = {};
  filteredTransactions.forEach((item) => {
    paymentMap[item.paymentMethod] = (paymentMap[item.paymentMethod] || 0) + Number(item.amount || 0);
  });
  const paymentPieData = Object.entries(paymentMap).map(([name, value]) => ({ name, value }));

  const monthlyComparison = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const m = d.getMonth(); const y = d.getFullYear();
    const total = transactions
      .filter((item) => { const td = item.createdAt?.toDate?.(); return td && td.getMonth() === m && td.getFullYear() === y; })
      .reduce((s, item) => s + Number(item.amount || 0), 0);
    return { month: MONTH_NAMES[m], total };
  });

  const biggestExpense = thisMonthTx.reduce(
    (max, item) => Number(item.amount) > Number(max?.amount || 0) ? item : max, null as any
  );
  const topCategory = pieData[0];
  const daysPassedThisMonth = now.getDate();
  const dailyAvg = daysPassedThisMonth > 0 ? Math.round(totalSpend / daysPassedThisMonth) : 0;

  const budgetProgress = Object.entries(budgets).map(([cat, budget]) => {
    const spent = thisMonthTx.filter((i) => i.category === cat).reduce((s, i) => s + Number(i.amount || 0), 0);
    const pct = Math.min((spent / budget) * 100, 100);
    return { cat, budget, spent, pct };
  });

  const uniqueNames = Array.from(new Set(transactions.map((i) => i.addedBy).filter(Boolean)));
  const availableYears = Array.from(
    new Set(transactions.map((i) => i.createdAt?.toDate?.()?.getFullYear()).filter(Boolean))
  ).sort((a: any, b: any) => b - a) as number[];
  if (!availableYears.includes(now.getFullYear())) availableYears.unshift(now.getFullYear());

  // ── Loading screen ─────────────────────────────────────────────────────────
  if (!authChecked) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-t-cyan-500 border-zinc-800 rounded-full animate-spin mb-4" />
        <p className="text-zinc-400 text-sm">Loading...</p>
      </main>
    );
  }

  // ── Login screen ───────────────────────────────────────────────────────────
  if (!user) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
        <h1 className="text-4xl font-bold mb-2">Family Finance OS</h1>
        <p className="text-zinc-400 mb-10 text-center">Real-time expense tracker for your family</p>
        <button onClick={login}
          className="bg-white text-black px-8 py-4 rounded-2xl font-semibold text-lg hover:scale-105 transition">
          Login with Google
        </button>
      </main>
    );
  }

  // ── Main app ───────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-black text-white pb-24">
      <Toaster position="top-center" />

      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">Family Finance OS</h1>
        <div className="flex items-center gap-2">
          {Object.values(spendByPerson).map((person, i) => (
            <div key={i} className="flex items-center gap-1 bg-zinc-800 px-2 py-1 rounded-full">
              {person.photo
                ? <img src={person.photo} className="w-5 h-5 rounded-full" alt="" />
                : <div className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center text-xs font-bold">{person.name[0]}</div>
              }
              <span className="text-xs text-zinc-300">{person.name.split(" ")[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── HOME TAB ── */}
      {activeTab === "home" && (
        <div className="px-4 py-4 space-y-4">
          {/* Income */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-zinc-400 text-sm">Monthly Income</p>
              {monthlyIncome > 0 && (
                <span className={`text-sm font-semibold ${savings >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {savings >= 0 ? "✅" : "⚠️"} ₹{Math.abs(savings).toLocaleString()} {savings >= 0 ? "saved" : "over"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">₹</span>
              <input type="number" placeholder="Set income" value={monthlyIncome || ""}
                onChange={(e) => {
  const val = Number(e.target.value);
  setMonthlyIncome(val);
  localStorage.setItem("monthlyIncome", val.toString());
}}
                className="bg-zinc-800 p-2 rounded-xl outline-none flex-1 text-lg font-semibold" />
            </div>
            {monthlyIncome > 0 && (
              <div className="mt-3 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${
                  (totalSpend/monthlyIncome) >= 1 ? "bg-red-500" : (totalSpend/monthlyIncome) >= 0.8 ? "bg-yellow-400" : "bg-emerald-400"
                }`} style={{ width: `${Math.min((totalSpend/monthlyIncome)*100, 100)}%` }} />
              </div>
            )}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Monthly Spend", value: `₹${totalSpend.toLocaleString()}`, icon: Wallet,
                sub: pctChange ? `${Number(pctChange)>0?"+":""}${pctChange}% vs last month` : "This month",
                subColor: pctChange && Number(pctChange) > 0 ? "text-red-400" : "text-emerald-400" },
              { label: "Savings", value: `₹${Math.abs(savings).toLocaleString()}`, icon: PiggyBank,
                sub: savings >= 0 ? "On track ✅" : "Overspent ⚠️",
                subColor: savings >= 0 ? "text-emerald-400" : "text-red-400" },
              { label: "Weekly Burn", value: `₹${weeklySpend.toLocaleString()}`, icon: TrendingUp,
                sub: "Last 7 days", subColor: "text-zinc-500" },
              { label: "Credit Used", value: `₹${creditUsage.toLocaleString()}`, icon: CreditCard,
                sub: "All time", subColor: "text-zinc-500" },
            ].map((card, i) => {
              const Icon = card.icon;
              return (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-zinc-400 text-xs">{card.label}</p>
                    <Icon className="text-cyan-400 w-4 h-4" />
                  </div>
                  <p className="text-xl font-bold">{card.value}</p>
                  <p className={`text-xs mt-1 ${card.subColor}`}>{card.sub}</p>
                </div>
              );
            })}
          </div>

          {/* Who spent what */}
          {Object.keys(spendByPerson).length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <p className="text-zinc-400 text-sm mb-3">Who spent what this month</p>
              <div className="space-y-3">
                {Object.values(spendByPerson).map((person, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {person.photo
                          ? <img src={person.photo} className="w-7 h-7 rounded-full" alt="" />
                          : <div className="w-7 h-7 rounded-full bg-cyan-500 flex items-center justify-center text-xs font-bold">{person.name[0]}</div>
                        }
                        <span className="font-medium text-sm">{person.name.split(" ")[0]}</span>
                      </div>
                      <span className="font-bold text-sm">₹{person.total.toLocaleString()}</span>
                    </div>
                    {totalSpend > 0 && (
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-cyan-500 transition-all"
                          style={{ width: `${(person.total / totalSpend) * 100}%` }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Smart Stats */}
          <div className="space-y-3">
            {biggestExpense && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap className="text-yellow-400 w-5 h-5 flex-shrink-0" />
                  <div>
                    <p className="text-zinc-400 text-xs">Biggest expense</p>
                    <p className="font-semibold text-sm">{biggestExpense.title}</p>
                    <p className="text-zinc-500 text-xs">{biggestExpense.category}</p>
                  </div>
                </div>
                <p className="text-cyan-400 font-bold">₹{Number(biggestExpense.amount).toLocaleString()}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart2 className="text-cyan-400 w-4 h-4" />
                  <p className="text-zinc-400 text-xs">Daily avg</p>
                </div>
                <p className="text-lg font-bold">₹{dailyAvg.toLocaleString()}</p>
                {monthlyIncome > 0 && (
                  <p className="text-zinc-500 text-xs mt-1">Safe: ₹{Math.round(monthlyIncome/30).toLocaleString()}/day</p>
                )}
              </div>
              {topCategory && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Tag className="text-purple-400 w-4 h-4" />
                    <p className="text-zinc-400 text-xs">Top category</p>
                  </div>
                  <p className="text-sm font-bold leading-tight">{topCategory.name}</p>
                  <p className="text-cyan-400 text-xs mt-1">₹{topCategory.value.toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold">Recent Transactions</p>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            {transactions.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-6">No transactions yet. Add your first!</p>
            ) : (
              <div className="space-y-3">
                {transactions.slice(0, 20).map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {item.addedByPhoto
                        ? <img src={item.addedByPhoto} className="w-8 h-8 rounded-full" alt="" />
                        : <div className="w-8 h-8 rounded-full bg-cyan-700 flex items-center justify-center text-xs font-bold">{(item.addedBy||"?")[0]}</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">{item.title}</p>
                        <p className={`font-bold text-sm ml-2 flex-shrink-0 ${item.uid === user.uid ? "text-white" : "text-cyan-400"}`}>
                          ₹{Number(item.amount).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-zinc-500 text-xs">{item.category} · {item.paymentMethod}</p>
                        <p className="text-zinc-600 text-xs ml-2 flex-shrink-0">{item.addedBy?.split(" ")[0]}</p>
                      </div>
                    </div>
                    {item.uid === user.uid && (
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => editTransaction(item)} className="text-xs bg-zinc-700 px-2 py-1 rounded-lg">✏️</button>
                        <button onClick={() => deleteTransaction(item.id, item.uid)} className="text-xs bg-red-900 px-2 py-1 rounded-lg">🗑</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ADD TAB ── */}
      {activeTab === "add" && (
        <div className="px-4 py-6 space-y-4">
          <h2 className="text-2xl font-bold">{editingId ? "Edit Expense" : "Add Expense"}</h2>
          <input placeholder="What did you spend on?" value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl outline-none text-lg" />
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 text-lg font-semibold">₹</span>
            <input placeholder="0" type="number" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 p-4 pl-8 rounded-2xl outline-none text-2xl font-bold" />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl outline-none text-base">
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl outline-none text-base">
            {paymentMethods.map((p) => <option key={p}>{p}</option>)}
          </select>
          <div className="grid grid-cols-4 gap-2">
            {[100, 200, 500, 1000].map((v) => (
              <button key={v} onClick={() => setAmount((prev) => String(Number(prev||0) + v))}
                className="bg-zinc-800 py-3 rounded-2xl text-sm font-semibold hover:bg-zinc-700 transition">
                +₹{v}
              </button>
            ))}
          </div>
          <button onClick={addExpense} className="w-full bg-cyan-500 py-4 rounded-2xl font-bold text-lg text-black">
            {editingId ? "Update Expense" : "Save Expense"}
          </button>
          {editingId && (
            <button onClick={() => { setEditingId(null); setTitle(""); setAmount(""); setActiveTab("home"); }}
              className="w-full bg-zinc-800 py-4 rounded-2xl font-semibold">Cancel</button>
          )}
        </div>
      )}

      {/* ── ANALYTICS TAB ── */}
      {activeTab === "analytics" && (
        <div className="px-4 py-4 space-y-4">
          {/* Filters */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <p className="text-sm text-zinc-400 mb-3">Filters</p>
            <div className="grid grid-cols-2 gap-2">
              <select value={filterMonth} onChange={(e) => setFilterMonth(Number(e.target.value))}
                className="bg-zinc-800 p-3 rounded-xl outline-none text-sm">
                {MONTH_NAMES.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <select value={filterYear} onChange={(e) => setFilterYear(Number(e.target.value))}
                className="bg-zinc-800 p-3 rounded-xl outline-none text-sm">
                {availableYears.map((y) => <option key={y}>{y}</option>)}
              </select>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-zinc-800 p-3 rounded-xl outline-none text-sm">
                <option>All</option>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
              <select value={filterPayment} onChange={(e) => setFilterPayment(e.target.value)}
                className="bg-zinc-800 p-3 rounded-xl outline-none text-sm">
                <option>All</option>
                {paymentMethods.map((p) => <option key={p}>{p}</option>)}
              </select>
              <select value={filterWho} onChange={(e) => setFilterWho(e.target.value)}
                className="bg-zinc-800 p-3 rounded-xl outline-none text-sm col-span-2">
                <option>All</option>
                {uniqueNames.map((n: string) => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div className="mt-3 text-cyan-400 text-sm font-semibold">
              {filteredTransactions.length} transactions · ₹{filteredTransactions.reduce((s,i) => s+Number(i.amount||0),0).toLocaleString()}
            </div>
          </div>

          {/* Category Donut */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <p className="font-semibold mb-4">Spend by Category</p>
            {pieData.length === 0
              ? <p className="text-zinc-500 text-center py-8 text-sm">No data for this period</p>
              : <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" paddingAngle={3}>
                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => `₹${Number(v).toLocaleString()}`}
                        contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2">
                    {pieData.slice(0, 6).map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-sm text-zinc-300">{item.name}</span>
                        </div>
                        <span className="text-sm font-semibold">₹{item.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </>
            }
          </div>

          {/* Payment Method Donut */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <p className="font-semibold mb-4">Spend by Payment Method</p>
            {paymentPieData.length === 0
              ? <p className="text-zinc-500 text-center py-8 text-sm">No data for this period</p>
              : <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={paymentPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                        {paymentPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => `₹${Number(v).toLocaleString()}`}
                        contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2">
                    {paymentPieData.map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-sm text-zinc-300">{item.name}</span>
                        </div>
                        <span className="text-sm font-semibold">₹{item.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </>
            }
          </div>

          {/* 6-month bar chart */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <p className="font-semibold mb-4">6-Month Comparison</p>
            <ResponsiveContainer width="100%" height={220}>
              <ReBarChart data={monthlyComparison} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="month" stroke="#71717a" tick={{ fontSize: 12 }} />
                <YAxis stroke="#71717a" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => `₹${Number(v).toLocaleString()}`}
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 12 }} />
                <Bar dataKey="total" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </ReBarChart>
            </ResponsiveContainer>
          </div>

          {/* Filtered list */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <p className="font-semibold mb-4">{MONTH_NAMES[filterMonth]} {filterYear} Transactions</p>
            {filteredTransactions.length === 0
              ? <p className="text-zinc-500 text-sm text-center py-6">No transactions match your filters.</p>
              : <div className="space-y-3">
                  {filteredTransactions.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      {item.addedByPhoto
                        ? <img src={item.addedByPhoto} className="w-7 h-7 rounded-full flex-shrink-0" alt="" />
                        : <div className="w-7 h-7 rounded-full bg-cyan-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{(item.addedBy||"?")[0]}</div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <p className="text-zinc-500 text-xs">{item.category} · {item.addedBy?.split(" ")[0]}</p>
                      </div>
                      <p className="font-bold text-sm flex-shrink-0">₹{Number(item.amount).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
            }
          </div>
        </div>
      )}

      {/* ── BUDGETS TAB ── */}
      {activeTab === "budgets" && (
        <div className="px-4 py-4 space-y-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-2">
            <p className="font-semibold mb-1">Category Budgets</p>
            <p className="text-zinc-400 text-sm">Tap the amount to change your budget.</p>
          </div>
          {budgetProgress.map(({ cat, budget, spent, pct }) => (
            <div key={cat} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-sm">{cat}</p>
                <div className="flex items-center gap-1">
                  <span className={`text-sm font-bold ${pct >= 100 ? "text-red-400" : pct >= 80 ? "text-yellow-400" : "text-emerald-400"}`}>
                    ₹{spent.toLocaleString()}
                  </span>
                  <span className="text-zinc-600 text-sm">/</span>
                  <input type="number" value={budget}
                    onChange={(e) => setBudgets((prev) => ({ ...prev, [cat]: Number(e.target.value) }))}
                    className="bg-zinc-800 text-sm w-20 px-2 py-1 rounded-lg outline-none text-right font-semibold" />
                </div>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${
                  pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-yellow-400" : "bg-emerald-400"
                }`} style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-zinc-600 text-xs">{pct.toFixed(0)}% used</span>
                <span className="text-zinc-600 text-xs">
                  {budget - spent >= 0 ? `₹${(budget-spent).toLocaleString()} left` : `₹${(spent-budget).toLocaleString()} over`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Bottom Nav ── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 flex items-center justify-around px-2 py-3 z-20">
        {[
          { tab: "home", icon: Home, label: "Home" },
          { tab: "add", icon: PlusCircle, label: "Add" },
          { tab: "analytics", icon: BarChart, label: "Analytics" },
          { tab: "budgets", icon: Settings, label: "Budgets" },
        ].map(({ tab, icon: Icon, label }) => (
          <button key={tab} onClick={() => setActiveTab(tab as any)}
            className={`flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition ${activeTab === tab ? "text-cyan-400" : "text-zinc-500"}`}>
            <Icon className="w-6 h-6" />
            <span className="text-xs">{label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}
