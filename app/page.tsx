"use client";

import { auth, db } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup, getRedirectResult, onAuthStateChanged } from "firebase/auth";
import { Wallet, TrendingUp, PiggyBank, CreditCard, Zap, BarChart2, Tag, Home, PlusCircle, BarChart, Settings, Lightbulb, RefreshCw, Download, CheckCircle2, Scale } from "lucide-react";
import {
  collection, addDoc, onSnapshot, query, orderBy,
  deleteDoc, doc, updateDoc, setDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

// ── Constants ────────────────────────────────────────────────────────────────

const categories = [
  "Food & Dining", "Groceries", "Fuel", "Shopping", "Travel", "Rent",
  "Utilities", "Electricity", "Internet", "Mobile Recharge", "Entertainment",
  "Movies", "Subscriptions", "Medical", "Insurance", "Gym", "Self Care",
  "Education", "Investment", "SIP", "EMI", "Credit Card Bill", "Home Expenses",
  "Gifts", "Family", "Kids", "Petrol", "Car Maintenance", "Taxi", "Flight",
  "Hotel", "Miscellaneous",
];

const paymentMethods = ["UPI", "Cash", "Credit Card", "Debit Card", "Bank Transfer"];

const creditCards = [
  "HDFC Regalia",
  "HDFC Swiggy",
  "Corporate HDFC",
  "Amazon ICICI Card",
];

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

const FINANCIAL_TIPS = [
  { tip: "Follow the 50/30/20 rule — 50% needs, 30% wants, 20% savings. It's the simplest budgeting framework that actually works.", icon: "💡" },
  { tip: "Set up a SIP on the 1st of every month, right after salary credit. Automate savings before you can spend it.", icon: "📈" },
  { tip: "An emergency fund of 6 months of expenses is your financial safety net. Start with ₹1,000 and build from there.", icon: "🛡️" },
  { tip: "Credit card rewards are great — but only if you pay the full bill every month. Partial payments attract 36–42% annual interest.", icon: "💳" },
  { tip: "Review your subscriptions every 3 months. Most households pay for 2–3 services they barely use.", icon: "🔄" },
  { tip: "UPI spends feel invisible because no cash leaves your hand. Track them weekly — most people are surprised by the total.", icon: "📱" },
  { tip: "Increase your SIP amount by 10% every year when you get a salary hike. This one habit can double your corpus over time.", icon: "🚀" },
  { tip: "Term insurance should be 10–15x your annual income. It's the cheapest and most important financial protection you can buy.", icon: "❤️" },
  { tip: "Avoid lifestyle inflation — when income goes up, don't let expenses rise at the same rate. Save the difference instead.", icon: "⚖️" },
  { tip: "Gold as jewellery is not an investment. Consider Sovereign Gold Bonds instead — they pay 2.5% interest on top of gold returns.", icon: "🪙" },
  { tip: "File your ITR even if your income is below the taxable limit. It builds a financial track record useful for loans and visas.", icon: "📋" },
  { tip: "If you have a home loan, try to prepay even ₹5,000 extra every year. It can cut years off your loan tenure.", icon: "🏠" },
  { tip: "Index funds beat most actively managed mutual funds over 10+ years, with much lower expense ratios. Consider Nifty 50 index funds.", icon: "📊" },
  { tip: "Couples who discuss money weekly are statistically less likely to fight about it. Your GharKhata is a great starting point!", icon: "👫" },
  { tip: "Before any big purchase, wait 72 hours. If you still want it after 3 days, it's probably not just an impulse buy.", icon: "⏳" },
  { tip: "Never combine insurance and investment. Avoid traditional money-back policies; keep term insurance and mutual funds separate.", icon: "❌" },
  { tip: "Check your free credit score (CIBIL) quarterly. Look out for any wrong accounts or errors that could hurt your loan eligibility.", icon: "🔍" },
  { tip: "When booking flights, clear your browser cookies or use incognito mode. Dynamic pricing can artificially bump up airfares.", icon: "✈️" },
  { tip: "Buy grocery staples in bulk once a month. Items like rice, oil, and lentils are significantly cheaper when bought in larger quantities.", icon: "🌾" },
  { tip: "Track your net worth once every six months. Seeing your total assets minus liabilities grow over time is incredibly motivating.", icon: "🏆" },
  { tip: "Keep your emergency fund in a separate bank account or a liquid mutual fund so you aren't tempted to swipe it for routine expenses.", icon: "🏦" },
  { tip: "Health insurance is non-negotiable. Don't rely solely on corporate insurance; get a personal family floater policy early in life.", icon: "🏥" },
  { tip: "Automate your utility bill payments (electricity, internet, postpaid). Missing due dates costs money in late fees and drops credit scores.", icon: "🔌" },
  { tip: "Before availing a 'No Cost EMI', check if there's a processing fee or if a cash discount is being discarded behind the scenes.", icon: "🏷️" },
  { tip: "Rent items you'll only use once or twice (like heavy travel gear or event outfits) instead of buying them outright.", icon: "👔" },
  { tip: "If you have high-interest debts like personal loans or credit card dues, pay them off aggressively before focusing heavily on investments.", icon: "📉" },
  { tip: "When dining out, check for payment app discounts or dining memberships before the bill arrives. You can easily save 10-25%.", icon: "🍽️" },
  { tip: "Keep separate credit cards for different purposes—one for fixed bills and another for shopping to easily track your spending ceilings.", icon: "🃏" },
  { tip: "When you get an annual bonus, use the 30/70 rule: spend 30% on treating yourself and assign 70% toward long-term goals or debt.", icon: "🎁" },
  { tip: "Review your bank statements line-by-line twice a year. You'll often find forgotten app renewals, SMS charges, or old mandates.", icon: "📝" },
  { tip: "Invest in upgrading your professional skills. Your primary source of income is your greatest wealth generator early on.", icon: "🧠" },
  { tip: "Do not invest in complex derivative products like Options or Futures unless you are an absolute financial professional.", icon: "⚠️" },
  { tip: "Keep an digital or physical folder for all your financial documents—wills, insurance policies, and passwords. Inform your partner.", icon: "📂" },
  { tip: "When buying an automobile, factor in insurance renewals, periodic maintenance, and fuel costs—not just the monthly loan EMI.", icon: "🚗" },
  { tip: "Maintain a strict 'fun budget' line item. Complete restriction leads to burnout; allow yourself guilt-free spending money.", icon: "🍿" },
  { tip: "Compare insurance quotes online across portals before renewing your car or health insurance. Agents often bake in extra margins.", icon: "💻" },
  { tip: "Avoid buying financial products pitched directly by relatives or neighborhood uncles out of sheer obligation. Evaluate independently.", icon: "🛑" },
  { tip: "If you're investing for a goal less than 3 years away (like a trip or deposit), stick to low-risk instruments like FD or Arbitrage funds.", icon: "⏱️" },
  { tip: "Diversify your investments. Having all money in equity, or all in real estate, leaves you highly exposed to market cycles.", icon: "🧩" },
  { tip: "Understand the difference between direct and regular mutual funds. Direct funds save you commission costs, compounding your returns.", icon: "🎯" },
  { tip: "Calculate your hourly wage rate (Income divided by work hours). Before buying a ₹5,000 item, ask if it's worth 10 hours of labor.", icon: "⏱️" },
  { tip: "Don't pause your SIPs during a stock market crash. Market corrections are exactly when your money buys more mutual fund units.", icon: "📉" },
  { tip: "Shop for non-perishable household goods online during subscription delivery windows or sale days to claim cashbacks.", icon: "📦" },
  { tip: "Ensure you assign nominees to all your bank accounts, demat accounts, and mutual fund portfolios. It takes minutes but saves years of hassle.", icon: "✍️" },
  { tip: "Teach your family members how to manage money and use tracking platforms. Financial transparency ensures unity.", icon: "🏫" },
  { tip: "Be wary of lifestyle creep when moving houses. A bigger house usually means higher electricity bills, maintenance, and furniture expenses.", icon: "🛋️" },
  { tip: "Check if your credit card offers free airport lounge access or movie ticket buy-one-get-one deals before paying out of pocket.", icon: "🎟️" },
  { tip: "The best time to start investing was yesterday; the second best time is today. Compounding requires time, not massive principal.", icon: "⏳" },
  { tip: "Avoid retail therapy. If you are feeling stressed or down, step away from shopping apps and go for a walk instead.", icon: "🚶" },
  { tip: "Celebrate milestones! Building financial discipline is hard work. When you cross a savings or debt goal, reward yourself reasonably.", icon: "🎉" },
];

const getTodaysTip = () => {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return FINANCIAL_TIPS[dayOfYear % FINANCIAL_TIPS.length];
};

// ── Component ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Food & Dining");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [selectedCard, setSelectedCard] = useState(creditCards[0]);
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [currentTip, setCurrentTip] = useState(getTodaysTip);
  const [tipIndex, setTipIndex] = useState(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return dayOfYear % FINANCIAL_TIPS.length;
  });

  // Global income state map from Firestore
  const [incomeMap, setIncomeMap] = useState<Record<string, { name: string; photo: string; amount: number }>>({});
  // Local state for user income input buffer
  const [localIncome, setLocalIncome] = useState("");

  const [budgets, setBudgets] = useState<Record<string, number>>(DEFAULT_BUDGETS);
  const [transactions, setTransactions] = useState<any[]>([]);
  
  // Real-time stream state for dynamic recurring subscriptions
  const [recurringBills, setRecurringBills] = useState<any[]>([]);

  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth());
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [filterPayment, setFilterPayment] = useState<string>("All");
  const [filterWho, setFilterWho] = useState<string>("All");

  const [activeTab, setActiveTab] = useState<"home" | "add" | "analytics" | "budgets">("home");

  // ── Auth ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => { if (result?.user) { setUser(result.user); toast.success("Logged in 🚀"); } })
      .catch(console.error)
      .finally(() => { onAuthStateChanged(auth, (u) => { setUser(u); setAuthChecked(true); }); });
  }, []);

  // ── Firestore: transactions ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { setTransactions([]); return; }
    const q = query(collection(db, "transactions"), orderBy("expenseDate", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const items: any[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      setTransactions(items);
    });
    return () => unsub();
  }, [user]);

  // ── Firestore: incomes ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, "incomes"), (snap) => {
      const map: Record<string, { name: string; photo: string; amount: number }> = {};
      snap.forEach((d) => { map[d.id] = d.data() as any; });
      setIncomeMap(map);
    });
    return () => unsub();
  }, [user]);

  // ── Firestore: dynamic subscriptions ────────────────────────────────────────
  useEffect(() => {
    if (!user) { setRecurringBills([]); return; }
    const unsub = onSnapshot(collection(db, "subscriptions"), (snap) => {
      const items: any[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      setRecurringBills(items);
    });
    return () => unsub();
  }, [user]);

  // Sync global income changes down to local form field
  useEffect(() => {
    if (user && incomeMap[user.uid]) {
      setLocalIncome(incomeMap[user.uid].amount.toString());
    }
  }, [incomeMap, user]);

  const saveIncome = async (value: number) => {
    if (!user) return;
    const ref = doc(db, "incomes", user.uid);
    await setDoc(ref, { name: user.displayName || "Unknown", photo: user.photoURL || "", amount: value }, { merge: true });
  };

  const totalHouseholdIncome = Object.values(incomeMap).reduce((s, v) => s + v.amount, 0);

  // ── Login ────────────────────────────────────────────────────────────────────
  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
      toast.success("Logged in 🚀");
    } catch (error: any) {
      if (error.code === "auth/popup-blocked") toast.error("Please allow popups and try again.");
      else toast.error("Login failed. Please try again.");
    }
  };

  // ── Add / Edit ───────────────────────────────────────────────────────────────
  const addExpense = async () => {
    if (!user) { toast.error("Please log in first."); return; }
    if (!title.trim() || !amount) { toast.error("Fill in title and amount."); return; }
    
    const paymentLabel = paymentMethod === "Credit Card" ? "Credit Card - " + selectedCard : paymentMethod;
    try {
      if (editingId) {
        await updateDoc(doc(db, "transactions", editingId), {
          title, amount: Number(amount), category,
          paymentMethod: paymentLabel,
          expenseDate,
        });
        setEditingId(null);
        toast.success("Updated ✅");
      } else {
        await addDoc(collection(db, "transactions"), {
          title, amount: Number(amount), category,
          paymentMethod: paymentLabel,
          uid: user.uid,
          addedBy: user.displayName || "Unknown",
          addedByPhoto: user.photoURL || "",
          createdAt: new Date(),
          expenseDate,
        });
        toast.success("Saved 🚀");
      }
      setAmount(""); setTitle(""); setCategory("Food & Dining");
      setPaymentMethod("UPI"); setSelectedCard(creditCards[0]);
      setExpenseDate(new Date().toISOString().split("T")[0]);
      setActiveTab("home");
    } catch { toast.error("Something went wrong."); }
  };

  // One tap recurring activation mechanism
  const logRecurringBill = async (bill: any) => {
    if (!user) return;
    try {
      await addDoc(collection(db, "transactions"), {
        title: bill.title,
        amount: Number(bill.amount),
        category: bill.category,
        paymentMethod: bill.paymentMethod,
        uid: user.uid,
        addedBy: user.displayName || "Unknown",
        addedByPhoto: user.photoURL || "",
        createdAt: new Date(),
        expenseDate: new Date().toISOString().split("T")[0],
      });
      toast.success(`Logged ${bill.title} 🧾`);
    } catch {
      toast.error("Failed to quick-log bill.");
    }
  };

  const deleteTransaction = async (id: string, ownerUid: string) => {
    if (ownerUid !== user?.uid) { toast.error("You can only delete your own expenses."); return; }
    
    const isConfirmed = window.confirm("Are you sure you want to delete this expense entry?");
    if (!isConfirmed) return;

    try { 
      await deleteDoc(doc(db, "transactions", id)); 
      toast.success("Deleted."); 
    } catch { 
      toast.error("Could not delete."); 
    }
  };

  const editTransaction = (item: any) => {
    if (item.uid !== user?.uid) { toast.error("You can only edit your own expenses."); return; }
    setTitle(item.title); setAmount(item.amount.toString());
    setCategory(item.category);
    if (item.paymentMethod && item.paymentMethod.indexOf("Credit Card -") === 0) {
      setPaymentMethod("Credit Card");
      setSelectedCard(item.paymentMethod.split("- ")[1] || creditCards[0]);
    } else {
      setPaymentMethod(item.paymentMethod || "UPI");
    }
    setExpenseDate(item.expenseDate || new Date().toISOString().split("T")[0]);
    setEditingId(item.id); setActiveTab("add");
  };

  const refreshTip = () => {
    const next = (tipIndex + 1) % FINANCIAL_TIPS.length;
    setTipIndex(next);
    setCurrentTip(FINANCIAL_TIPS[next]);
  };

  // ── CSV Data Export Feature ──
  const exportToCSV = () => {
    if (filteredTransactions.length === 0) {
      toast.error("No transactions to export for current filter view.");
      return;
    }
    const headers = ["Date", "Description", "Amount (INR)", "Category", "Payment Method", "Logged By"];
    const rows = filteredTransactions.map((t) => [
      t.expenseDate || "",
      `"${t.title.replace(/"/g, '""')}"`,
      t.amount,
      t.category,
      t.paymentMethod || "",
      t.addedBy || "Unknown",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `GharKhata_Report_${MONTH_NAMES[filterMonth]}_${filterYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Spreadsheet generated successfully! 📊");
  };

  // ── Computed States Evaluated Against expenseDate ──
  const now = new Date();

  const thisMonthTx = transactions.filter((item) => {
    if (!item.expenseDate) return false;
    const [y, m] = item.expenseDate.split("-").map(Number);
    return (m - 1) === now.getMonth() && y === now.getFullYear();
  });

  const lastMonthTx = transactions.filter((item) => {
    if (!item.expenseDate) return false;
    const [y, m] = item.expenseDate.split("-").map(Number);
    const lm = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const ly = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return (m - 1) === lm && y === ly;
  });

  const totalSpend = thisMonthTx.reduce((s, i) => s + Number(i.amount || 0), 0);
  const lastMonthTotal = lastMonthTx.reduce((s, i) => s + Number(i.amount || 0), 0);
  const pctChange = lastMonthTotal ? (((totalSpend - lastMonthTotal) / lastMonthTotal) * 100).toFixed(1) : null;
  const savings = totalHouseholdIncome - totalSpend;

  // Derive which dynamic bills haven't been matched to this month's transactions yet
  const pendingBills = recurringBills.filter((blueprint) => {
    return !thisMonthTx.some((tx) => tx.title.toLowerCase() === blueprint.title.toLowerCase());
  });

  const sevenDaysAgo = new Date(); 
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weeklySpend = transactions
    .filter((i) => {
      if (!i.expenseDate) return false;
      return new Date(i.expenseDate) >= sevenDaysAgo;
    })
    .reduce((s, i) => s + Number(i.amount || 0), 0);

  const creditUsage = transactions
    .filter((i) => i.paymentMethod && i.paymentMethod.indexOf("Credit Card") === 0)
    .reduce((s, i) => s + Number(i.amount || 0), 0);

  const spendByPerson: Record<string, { name: string; photo: string; total: number }> = {};
  thisMonthTx.forEach((item) => {
    if (!spendByPerson[item.uid]) spendByPerson[item.uid] = { name: item.addedBy || "Unknown", photo: item.addedByPhoto || "", total: 0 };
    spendByPerson[item.uid].total += Number(item.amount || 0);
  });

  const filteredTransactions = transactions.filter((item) => {
    if (!item.expenseDate) return false;
    const [y, m] = item.expenseDate.split("-").map(Number);
    if ((m - 1) !== filterMonth || y !== filterYear) return false;
    if (filterCategory !== "All" && item.category !== filterCategory) return false;
    if (filterPayment !== "All" && item.paymentMethod !== filterPayment) return false;
    if (filterWho !== "All" && item.addedBy !== filterWho) return false;
    return true;
  });

  const categoryMap: Record<string, number> = {};
  filteredTransactions.forEach((item) => { categoryMap[item.category] = (categoryMap[item.category] || 0) + Number(item.amount || 0); });
  const pieData = Object.entries(categoryMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const monthlyComparison = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const m = d.getMonth(); const y = d.getFullYear();
    const total = transactions
      .filter((item) => {
        if (!item.expenseDate) return false;
        const [itemY, itemM] = item.expenseDate.split("-").map(Number);
        return (itemM - 1) === m && itemY === y;
      })
      .reduce((s, item) => s + Number(item.amount || 0), 0);
    return { month: MONTH_NAMES[m], total };
  });

  const biggestExpense = thisMonthTx.reduce((max, item) => Number(item.amount) > Number(max?.amount || 0) ? item : max, null as any);
  const topCategory = pieData[0];
  const daysPassedThisMonth = now.getDate();
  const dailyAvg = daysPassedThisMonth > 0 ? Math.round(totalSpend / daysPassedThisMonth) : 0;

  const budgetProgress = Object.entries(budgets).map(([cat, budget]) => {
    const spent = thisMonthTx.filter((i) => i.category === cat).reduce((s, i) => s + Number(i.amount || 0), 0);
    const pct = Math.min((spent / budget) * 100, 100);
    return { cat, budget, spent, pct };
  });

  const uniqueNames = Array.from(new Set(transactions.map((i) => i.addedBy).filter(Boolean)));
  const uniquePayments = Array.from(new Set(transactions.map((i) => i.paymentMethod).filter(Boolean)));
  
  const availableYears = Array.from(
    new Set(transactions.map((i) => i.expenseDate ? Number(i.expenseDate.split("-")[0]) : null).filter(Boolean))
  ).sort((a: any, b: any) => b - a) as number[];
  if (!availableYears.includes(now.getFullYear())) availableYears.unshift(now.getFullYear());

  if (!authChecked) return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
      <div className="w-8 h-8 border-4 border-t-cyan-500 border-zinc-800 rounded-full animate-spin mb-4" />
      <p className="text-zinc-400 text-sm">Loading...</p>
    </main>
  );

  if (!user) return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-2">Family Finance OS</h1>
      <p className="text-zinc-400 mb-10 text-center">Real-time expense tracker for your family</p>
      <button onClick={login} className="bg-white text-black px-8 py-4 rounded-2xl font-semibold text-lg hover:scale-105 transition">
        Login with Google
      </button>
    </main>
  );

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
              <span className="text-xs text-zinc-300">{(person.name || "Unknown").split(" ")[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── HOME TAB ── */}
      {activeTab === "home" && (
        <div className="px-4 py-4 space-y-4">

          {/* Financial Tip of the Day */}
          <div className="bg-gradient-to-br from-cyan-950 to-zinc-900 border border-cyan-800/40 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="text-cyan-400 w-4 h-4" />
                <p className="text-cyan-400 text-xs font-semibold uppercase tracking-wider">Tip of the Day</p>
              </div>
              <button onClick={refreshTip} className="text-zinc-500 hover:text-cyan-400 transition" title="Next tip">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-sm text-zinc-200 leading-relaxed">
              <span className="mr-1">{currentTip.icon}</span>{currentTip.tip}
            </p>
            <p className="text-zinc-600 text-xs mt-2">{tipIndex + 1} of {FINANCIAL_TIPS.length} tips</p>
          </div>

          {/* One-Tap Recurring Bill Queue */}
          {pendingBills.length > 0 && (
            <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">One-Tap Bill Approvals</p>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                {pendingBills.map((bill, index) => (
                  <div key={bill.id || index} className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-3 min-w-[200px] flex flex-col justify-between space-y-2">
                    <div>
                      <p className="text-xs text-zinc-400 font-medium truncate">{bill.title}</p>
                      <p className="text-base font-bold text-white">₹{Number(bill.amount).toLocaleString()}</p>
                    </div>
                    <button 
                      onClick={() => logRecurringBill(bill)}
                      className="text-xs bg-cyan-500 text-black font-semibold py-1 px-2.5 rounded-lg hover:bg-cyan-400 transition-colors w-full text-center"
                    >
                      Approve & Log
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shared Household Income Display */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-zinc-400 text-sm font-medium">Household Income</p>
              {totalHouseholdIncome > 0 && (
                <span className={`text-sm font-semibold ${savings >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {savings >= 0 ? "✅" : "⚠️"} ₹{Math.abs(savings).toLocaleString()} {savings >= 0 ? "saved" : "over budget"}
                </span>
              )}
            </div>

            <div className="space-y-3 mb-3">
              {Object.entries(incomeMap).map(([uid, data]) => (
                <div key={uid} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {data.photo
                      ? <img src={data.photo} className="w-7 h-7 rounded-full" alt="" />
                      : <div className="w-7 h-7 rounded-full bg-cyan-700 flex items-center justify-center text-xs font-bold">{(data.name || "?")[0]}</div>
                    }
                    <span className="text-sm font-medium">{(data.name || "Unknown").split(" ")[0]}</span>
                    {uid === user.uid && <span className="text-xs text-zinc-500">(you)</span>}
                  </div>
                  <span className="text-sm font-bold text-emerald-400">₹{(data.amount || 0).toLocaleString()}</span>
                </div>
              ))}
              {Object.keys(incomeMap).length === 0 && (
                <p className="text-zinc-500 text-xs">No income set yet. Add yours below.</p>
              )}
            </div>

            {totalHouseholdIncome > 0 && (
              <div className="bg-zinc-800 rounded-xl p-2 mb-3 flex justify-between items-center">
                <span className="text-xs text-zinc-400">Combined total</span>
                <span className="text-sm font-bold text-white">₹{totalHouseholdIncome.toLocaleString()}</span>
              </div>
            )}

            <div>
              <p className="text-xs text-zinc-500 mb-1">Your monthly income</p>
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">₹</span>
                <input
                  type="number"
                  placeholder="Set your income"
                  value={localIncome}
                  onChange={(e) => setLocalIncome(e.target.value)}
                  onBlur={() => saveIncome(Number(localIncome))}
                  className="bg-zinc-800 p-2 rounded-xl outline-none flex-1 text-lg font-semibold text-white"
                />
              </div>
            </div>

            {totalHouseholdIncome > 0 && (
              <div className="mt-3 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${
                  (totalSpend / totalHouseholdIncome) >= 1 ? "bg-red-500"
                  : (totalSpend / totalHouseholdIncome) >= 0.8 ? "bg-yellow-400"
                  : "bg-emerald-400"
                }`} style={{ width: `${Math.min((totalSpend / totalHouseholdIncome) * 100, 100)}%` }} />
              </div>
            )}
          </div>

          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Monthly Spend", value: `₹${totalSpend.toLocaleString()}`, icon: Wallet,
                sub: pctChange ? `${Number(pctChange) > 0 ? "+" : ""}${pctChange}% vs last month` : "This month",
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

          {/* Monthly Share Distribution */}
          {Object.keys(spendByPerson).length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-4">
              <div>
                <p className="text-zinc-400 text-sm mb-3">Who spent what this month</p>
                <div className="space-y-3">
                  {Object.values(spendByPerson).map((person, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {person.photo
                            ? <img src={person.photo} className="w-7 h-7 rounded-full" alt="" />
                            : <div className="w-7 h-7 rounded-full bg-cyan-500 flex items-center justify-center text-xs font-bold">{(person.name || "?")[0]}</div>
                          }
                          <span className="font-medium text-sm">{(person.name || "Unknown").split(" ")[0]}</span>
                        </div>
                        <span className="font-bold text-sm">₹{person.total.toLocaleString()}</span>
                      </div>
                      {totalSpend > 0 && (
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-cyan-500 transition-all" style={{ width: `${(person.total / totalSpend) * 100}%` }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Fair Share Income-Proportional Monitor Component */}
              {totalHouseholdIncome > 0 && totalSpend > 0 && (
                <div className="border-t border-zinc-800 pt-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Scale className="w-4 h-4 text-purple-400" />
                    <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Fair Share Balance</p>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(incomeMap).map(([uid, incData]) => {
                      const incPct = (incData.amount / totalHouseholdIncome) * 100;
                      const spendPct = ((spendByPerson[uid]?.total || 0) / totalSpend) * 100;
                      const delta = spendPct - incPct;

                      return (
                        <div key={uid} className="bg-zinc-950 p-2.5 rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <span className="font-medium text-zinc-300">{incData.name.split(" ")[0]}</span>
                            <p className="text-zinc-500 text-[10px] mt-0.5">
                              Income Share: {incPct.toFixed(0)}% • Spend Share: {spendPct.toFixed(0)}%
                            </p>
                          </div>
                          <span className={`font-bold px-2 py-0.5 rounded-md ${
                            Math.abs(delta) <= 5 ? "bg-emerald-950 text-emerald-400" 
                            : delta > 5 ? "bg-red-950 text-red-400" 
                            : "bg-amber-950 text-amber-400"
                          }`}>
                            {Math.abs(delta) <= 5 ? "In Balance" : delta > 0 ? `+${delta.toFixed(0)}% Over Share` : `${delta.toFixed(0)}% Under Share`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Smart Metrics Summary */}
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
                {totalHouseholdIncome > 0 && (
                  <p className="text-zinc-500 text-xs mt-1">Safe: ₹{Math.round(totalHouseholdIncome / 30).toLocaleString()}/day</p>
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

          {/* Recent Ledger History */}
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
                        : <div className="w-8 h-8 rounded-full bg-cyan-700 flex items-center justify-center text-xs font-bold">{(item.addedBy || "?")[0]}</div>
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
                        <p className="text-zinc-500 text-xs">{item.category} - {item.paymentMethod}{item.expenseDate ? " - " + item.expenseDate : ""}</p>
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

          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Date of expense</label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl outline-none text-base text-white"
            />
          </div>

          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl outline-none text-base">
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>

          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl outline-none text-base">
            {paymentMethods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>

          {paymentMethod === "Credit Card" && (
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Select Card</label>
              <select
                value={selectedCard}
                onChange={(e) => setSelectedCard(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl outline-none text-base"
              >
                {creditCards.map((card) => (
                  <option key={card} value={card}>
                    {card}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={addExpense}
            className="w-full bg-cyan-500 text-black font-bold p-4 rounded-2xl mt-4 text-lg hover:scale-[1.02] transition active:scale-95"
          >
            {editingId ? "Update Expense" : "Add Expense"}
          </button>

          {editingId && (
            <button
              onClick={() => {
                setEditingId(null);
                setActiveTab("home");
              }}
              className="w-full bg-zinc-800 text-white font-bold p-4 rounded-2xl mt-2 text-lg hover:bg-zinc-700 transition"
            >
              Cancel Edit
            </button>
          )}
        </div>
      )}

      {/* ── ANALYTICS TAB ── */}
      {activeTab === "analytics" && (
        <div className="px-4 py-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Analytics</h2>
            <button 
              onClick={exportToCSV}
              className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 active:scale-95 transition text-cyan-400 px-3 py-2 rounded-xl flex items-center gap-2 text-xs font-medium"
            >
              <Download className="w-3.5 h-3.5" />
              Excel Export
            </button>
          </div>

          {/* Filters Matrix */}
          <div className="grid grid-cols-2 gap-3">
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(Number(e.target.value))}
              className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl outline-none text-sm"
            >
              {MONTH_NAMES.map((m, i) => (
                <option key={m} value={i}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(Number(e.target.value))}
              className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl outline-none text-sm"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl outline-none text-sm"
            >
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={filterWho}
              onChange={(e) => setFilterWho(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl outline-none text-sm"
            >
              <option value="All">Everyone</option>
              {uniqueNames.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>

            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl outline-none text-sm col-span-2"
            >
              <option value="All">All Payment Methods & Cards</option>
              {uniquePayments.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Category Pie Chart */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <p className="font-semibold mb-4 text-zinc-200">Spend by Category</p>
            {pieData.length > 0 ? (
              <>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
  formatter={(value: any) => "₹" + Number(value).toLocaleString()}
  contentStyle={{ backgroundColor: "#18181b", border: "none", borderRadius: "8px", color: "#fff" }}
  itemStyle={{ color: "#fff" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3 mt-6">
                  {pieData.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                        />
                        <span className="text-zinc-300">{entry.name}</span>
                      </div>
                      <span className="font-semibold text-white">₹{entry.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-zinc-500 text-sm text-center py-10">No data for selected filters.</p>
            )}
          </div>

          {/* Monthly Comparison Bar Chart */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <p className="font-semibold mb-4 text-zinc-200">Last 6 Months</p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ReBarChart data={monthlyComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="month" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#a1a1aa"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => "₹" + (val / 1000) + "k"}
                  />
                  <Tooltip
  cursor={{ fill: "#27272a" }}
  formatter={(value: any) => "₹" + Number(value).toLocaleString()}
  contentStyle={{ backgroundColor: "#18181b", border: "none", borderRadius: "8px", color: "#fff" }}
/>
                  <Bar dataKey="total" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </ReBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── BUDGETS TAB ── */}
      {activeTab === "budgets" && (
        <div className="px-4 py-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold">Monthly Budgets</h2>
            <button className="text-cyan-400 text-sm font-medium hover:text-cyan-300 transition">Edit</button>
          </div>

          <div className="space-y-4">
            {budgetProgress.map((b, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-zinc-200">{b.cat}</p>
                  <p className="text-sm">
                    <span className={b.spent > b.budget ? "text-red-400 font-bold" : "text-white font-semibold"}>
                      ₹{b.spent.toLocaleString()}
                    </span>
                    <span className="text-zinc-500"> / ₹{b.budget.toLocaleString()}</span>
                  </p>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      b.pct >= 100 ? "bg-red-500" : b.pct >= 80 ? "bg-yellow-400" : "bg-emerald-400"
                    }`}
                    style={{ width: `${b.pct}%` }}
                  />
                </div>
                {b.pct >= 100 && (
                  <p className="text-red-400 text-xs mt-2 font-medium">
                    Over budget by ₹{(b.spent - b.budget).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── BOTTOM NAVIGATION ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-zinc-800 flex items-center justify-around p-4 pb-safe z-50">
        <button
          onClick={() => setActiveTab("home")}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeTab === "home" ? "text-cyan-400" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Home className="w-6 h-6" />
          <span className="text-[10px] font-medium">Home</span>
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeTab === "analytics" ? "text-cyan-400" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <BarChart className="w-6 h-6" />
          <span className="text-[10px] font-medium">Analytics</span>
        </button>
        
        <button
          onClick={() => {
            setEditingId(null);
            setTitle("");
            setAmount("");
            setActiveTab("add");
          }}
          className="relative -top-5 bg-cyan-500 text-black p-4 rounded-full shadow-lg shadow-cyan-500/20 hover:scale-110 hover:bg-cyan-400 transition-all active:scale-95"
        >
          <PlusCircle className="w-7 h-7" />
        </button>

        <button
          onClick={() => setActiveTab("budgets")}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeTab === "budgets" ? "text-cyan-400" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Wallet className="w-6 h-6" />
          <span className="text-[10px] font-medium">Budgets</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors">
          <Settings className="w-6 h-6" />
          <span className="text-[10px] font-medium">Settings</span>
        </button>
      </div>
    </main>
  );
}