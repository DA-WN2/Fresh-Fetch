import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShieldAlert,
  TrendingUp,
  Zap,
  Bell,
  ClipboardList,
  Truck,
  Users,
  Leaf,
  Plus,
  Edit,
  Trash2,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  User,
  Phone,
  RefreshCw,
} from "lucide-react";
import "../styles/ManagerDashboard.css";

const ManagerDashboard = () => {
  const [activeTab, setActiveTab] = useState("OVERVIEW");

  // --- FIX 2: SAVE ACTIVITY LOG TO LOCAL STORAGE ---
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem("manager_notifications");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // Keep LocalStorage synced whenever notifications change
  useEffect(() => {
    localStorage.setItem(
      "manager_notifications",
      JSON.stringify(notifications),
    );
  }, [notifications]);

  // WASTE REPORT STATE
  const [wasteReport, setWasteReport] = useState([]);
  const [isWasteModalOpen, setIsWasteModalOpen] = useState(false);

  const navigate = useNavigate();

  // --- 1. DATA STATE ---
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [impactData, setImpactData] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [agents, setAgents] = useState([]);

  // --- NEW: Store Profile State ---
  const [storeProfile, setStoreProfile] = useState({ name: "", address: "" });

  const [pendingEvaluations, setPendingEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [restockForms, setRestockForms] = useState({});

  // --- 2. MODAL STATES ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    stock_quantity: "",
    expiry_date: "",
    category_id: 1,
    supplier_id: "",
  });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  // Stores the IDs of products that have active orders
  const [reorderedItems, setReorderedItems] = useState([]);

  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [evalData, setEvalData] = useState({
    orderId: null,
    freshness: 10,
    time_score: 10,
    price_score: 10,
  });

  // --- 3. API CALLS ---
  const fetchWasteReport = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(
        "http://127.0.0.1:8000/api/manager/waste-report/",
        {
          headers: { Authorization: `Token ${token}` },
        },
      );
      setWasteReport(res.data);
      setIsWasteModalOpen(true);
    } catch (err) {
      alert("Failed to fetch waste report.");
    }
  };

  const fetchDashboardData = async () => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== "manager") {
      navigate("/login");
      return;
    }

    const headers = { Authorization: `Token ${token}` };

    try {
      // ADDED THE STORE PROFILE ENDPOINT
      const [
        invRes,
        ordRes,
        impactRes,
        suppRes,
        agentsRes,
        evalRes,
        profileRes,
      ] = await Promise.all([
        axios.get("http://127.0.0.1:8000/api/manager/inventory/", { headers }),
        axios.get("http://127.0.0.1:8000/api/manager/orders/", { headers }),
        axios.get("http://127.0.0.1:8000/api/manager/impact-report/", {
          headers,
        }),
        axios.get("http://127.0.0.1:8000/api/manager/supplier-scores/", {
          headers,
        }),
        axios.get("http://127.0.0.1:8000/api/manager/delivery-agents/", {
          headers,
        }),
        axios.get("http://127.0.0.1:8000/api/manager/pending-evaluations/", {
          headers,
        }),
        axios.get("http://127.0.0.1:8000/api/manager/store-profile/", {
          headers,
        }),
      ]);

      setInventory(invRes.data);
      setOrders(ordRes.data);
      setImpactData(impactRes.data);
      setSuppliers(suppRes.data);
      setAgents(agentsRes.data);
      setPendingEvaluations(evalRes.data);
      setStoreProfile(profileRes.data); // Set store address

      const activeRestocks = invRes.data
        .filter((item) => item.is_reordered)
        .map((item) => item.id);

      setReorderedItems(activeRestocks);
      setLoading(false);
    } catch (error) {
      console.error("Dashboard Load Error", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [navigate]);

  // --- NEW: Update Store Address API Call ---
  const updateStoreAddress = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.put(
        "http://127.0.0.1:8000/api/manager/store-profile/",
        { address: storeProfile.address },
        { headers: { Authorization: `Token ${token}` } },
      );
      setNotifications((prev) => [
        {
          id: Date.now(),
          time: "Just now",
          message: res.data.message,
          type: "success",
        },
        ...prev,
      ]);
    } catch (err) {
      alert("Failed to update store address.");
    }
  };

  // --- 4. CRUD & ACTION OPERATIONS ---

  const openModal = (product = null) => {
    if (product) {
      setFormData({
        name: product.name,
        price: product.original_price,
        stock_quantity: product.stock_quantity,
        expiry_date: product.expiry_date || "",
        category_id: product.category_id || 1,
        supplier_id:
          product.supplier_id || (suppliers.length > 0 ? suppliers[0].id : ""),
      });
      setEditId(product.id);
    } else {
      setFormData({
        name: "",
        price: "",
        stock_quantity: "",
        expiry_date: "",
        category_id: 1,
        supplier_id: suppliers.length > 0 ? suppliers[0].id : "",
      });
      setEditId(null);
    }
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Token ${token}` };

    try {
      if (editId) {
        await axios.put(
          `http://127.0.0.1:8000/api/manager/inventory/${editId}/`,
          formData,
          { headers },
        );
        setNotifications((prev) => [
          {
            id: Date.now(),
            time: "Just now",
            message: `${formData.name} updated.`,
            type: "success",
          },
          ...prev,
        ]);
      } else {
        await axios.post(
          `http://127.0.0.1:8000/api/manager/inventory/`,
          formData,
          { headers },
        );
        setNotifications((prev) => [
          {
            id: Date.now(),
            time: "Just now",
            message: `${formData.name} added to catalog.`,
            type: "success",
          },
          ...prev,
        ]);
      }
      setIsModalOpen(false);
      fetchDashboardData();
    } catch (err) {
      alert("Failed to save product.");
    }
  };

  const promptDeleteProduct = (product) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  const executeDeleteProduct = async () => {
    if (!productToDelete) return;
    const token = localStorage.getItem("token");

    try {
      await axios.delete(
        `http://127.0.0.1:8000/api/manager/inventory/${productToDelete.id}/`,
        {
          headers: { Authorization: `Token ${token}` },
        },
      );
      setNotifications((prev) => [
        {
          id: Date.now(),
          time: "Just now",
          message: `${productToDelete.name} deleted.`,
          type: "alert",
        },
        ...prev,
      ]);
      setIsDeleteModalOpen(false);
      setProductToDelete(null);
      fetchDashboardData();
    } catch (err) {
      alert("Failed to delete product.");
    }
  };

  const runPricingEngine = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.post(
        "http://127.0.0.1:8000/api/manager/run-pricing-engine/",
        {},
        { headers: { Authorization: `Token ${token}` } },
      );

      setNotifications((prev) => [
        {
          id: Date.now(),
          time: "Just now",
          message: `${res.data.discounted} items discounted.`,
          type: "success",
        },
        ...prev,
      ]);

      if (res.data.expired_items && res.data.expired_items.length > 0) {
        res.data.expired_items.forEach((itemInfo) => {
          setNotifications((prev) => [
            {
              id: Math.random(),
              time: "ACTION REQUIRED",
              message: `CRITICAL: ${itemInfo} expired. Removed from Online Store. PLEASE REMOVE FROM OFFLINE SHELF IMMEDIATELY.`,
              type: "alert",
            },
            ...prev,
          ]);
        });
      }

      fetchDashboardData();
    } catch (err) {
      alert("Pricing engine failed.");
    }
  };

  const submitAudit = async (productId, physicalCount) => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.post(
        "http://127.0.0.1:8000/api/manager/report-audit/",
        { product_id: productId, physical_count: physicalCount },
        { headers: { Authorization: `Token ${token}` } },
      );
      const type = res.data.discrepancy > 0 ? "alert" : "success";
      setNotifications((prev) => [
        {
          id: Date.now(),
          time: "Just now",
          message: `Audit: ${res.data.product_name} discrepancy of ${res.data.discrepancy} recorded.`,
          type,
        },
        ...prev,
      ]);
      fetchDashboardData();
    } catch (err) {
      alert("Audit submission failed.");
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `http://127.0.0.1:8000/api/manager/update-order-status/${orderId}/`,
        { status: newStatus },
        { headers: { Authorization: `Token ${token}` } },
      );

      setNotifications((prev) => [
        {
          id: Date.now(),
          time: "Just now",
          message: `Order #${orderId} marked as ${newStatus}.`,
          type: "success",
        },
        ...prev,
      ]);
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update status.");
    }
  };

  const handleRestockChange = (productId, field, value) => {
    setRestockForms((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value,
      },
    }));
  };

  const handleReorder = async (product) => {
    const token = localStorage.getItem("token");

    const formState = restockForms[product.id] || {};
    const qty = parseInt(formState.quantity) || 50;
    const suppId =
      formState.supplier_id || (suppliers.length > 0 ? suppliers[0].id : null);
    const targetDate = formState.target_date || "";

    if (!suppId) {
      alert("No suppliers available in the system!");
      return;
    }

    try {
      const res = await axios.post(
        "http://127.0.0.1:8000/api/manager/trigger-restock/",
        {
          product_id: product.id,
          quantity: qty,
          supplier_id: suppId,
          target_date: targetDate,
        },
        { headers: { Authorization: `Token ${token}` } },
      );
      setNotifications((prev) => [
        {
          id: Date.now(),
          time: "Just now",
          message: res.data.message,
          type: "success",
        },
        ...prev,
      ]);
      setReorderedItems((prev) => [...prev, product.id]);
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.error || "Reorder failed.");
    }
  };

  const handleUploadPhoto = async (orderId, file) => {
    if (!file) return;

    const token = localStorage.getItem("token");
    const formDataObj = new FormData();
    formDataObj.append("image", file);

    try {
      const res = await axios.post(
        `http://127.0.0.1:8000/api/manager/upload-photo/${orderId}/`,
        formDataObj,
        {
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );

      setNotifications((prev) => [
        {
          id: Date.now(),
          time: "Just now",
          message: res.data.message,
          type: "success",
        },
        ...prev,
      ]);

      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to upload photo.");
    }
  };

  const assignAgent = async (orderId) => {
    const agentId = document.getElementById(`agent-select-${orderId}`).value;
    if (!agentId) {
      alert("Please select an available agent from the dropdown first.");
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const res = await axios.post(
        `http://127.0.0.1:8000/api/manager/assign-agent/${orderId}/`,
        { agent_id: agentId },
        { headers: { Authorization: `Token ${token}` } },
      );
      setNotifications((prev) => [
        {
          id: Date.now(),
          time: "Just now",
          message: res.data.message,
          type: "success",
        },
        ...prev,
      ]);
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to assign agent.");
    }
  };

  const submitEvaluation = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.post(
        `http://127.0.0.1:8000/api/manager/evaluate-supplier/${evalData.orderId}/`,
        {
          freshness: evalData.freshness,
          time_score: evalData.time_score,
          price_score: evalData.price_score,
        },
        { headers: { Authorization: `Token ${token}` } },
      );

      setNotifications((prev) => [
        {
          id: Date.now(),
          time: "Just now",
          message: res.data.message,
          type: "success",
        },
        ...prev,
      ]);

      setIsEvalModalOpen(false);
      fetchDashboardData();
    } catch (err) {
      alert("Failed to submit evaluation.");
    }
  };

  if (loading)
    return <div className="loading-screen">Loading Branch Intelligence...</div>;

  const pendingOrders = orders.filter(
    (o) => o.status.toLowerCase() === "pending",
  ).length;
  const lowStockCount = inventory.filter((i) => i.stock_quantity <= 5).length;

  return (
    <div className="manager-dashboard">
      <aside className="manager-sidebar">
        <div className="sidebar-header">
          <h1>Fresh-Fetch.</h1>
          <p>Manager Enterprise Suite</p>
        </div>
        <nav className="sidebar-nav">
          <button
            className={`sidebar-btn ${activeTab === "OVERVIEW" ? "active" : ""}`}
            onClick={() => setActiveTab("OVERVIEW")}
          >
            <LayoutDashboard size={20} /> Overview
          </button>
          <button
            className={`sidebar-btn ${activeTab === "CATALOG" ? "active" : ""}`}
            onClick={() => setActiveTab("CATALOG")}
          >
            <Package size={20} /> Catalog
          </button>
          <button
            className={`sidebar-btn ${activeTab === "ORDERS" ? "active" : ""}`}
            onClick={() => setActiveTab("ORDERS")}
          >
            <ClipboardList size={20} /> Fulfillment
          </button>
          <button
            className={`sidebar-btn ${activeTab === "AUDIT" ? "active" : ""}`}
            onClick={() => setActiveTab("AUDIT")}
          >
            <ShieldAlert size={20} /> Theft Audit
          </button>
          <button
            className={`sidebar-btn ${activeTab === "SUPPLIERS" ? "active" : ""}`}
            onClick={() => setActiveTab("SUPPLIERS")}
          >
            <Users size={20} /> Suppliers
          </button>
          <button
            className={`sidebar-btn ${activeTab === "IMPACT" ? "active" : ""}`}
            onClick={() => setActiveTab("IMPACT")}
          >
            <Leaf size={20} /> Sustainability
          </button>
        </nav>
      </aside>

      <main className="manager-main">
        <header className="manager-header">
          <div className="header-breadcrumb">
            Branch Admin &gt; <span>{activeTab}</span>
          </div>
          <button
            className="logout-btn"
            onClick={() => {
              localStorage.clear();
              navigate("/login");
            }}
          >
            Logout
          </button>
        </header>

        <div className="manager-content">
          <div className="content-left">
            {activeTab === "OVERVIEW" && (
              <>
                <div className="stats-grid">
                  <StatCard
                    title="Active Orders"
                    value={pendingOrders}
                    type="urgent"
                  />
                  <StatCard
                    title="Inventory Alerts"
                    value={lowStockCount}
                    type="warning"
                  />
                  <StatCard
                    title="Sustainability Score"
                    value={`${impactData?.sustainability_score || 100}/100`}
                    type="success"
                  />
                </div>

                {/* --- NEW: STORE PICKUP ADDRESS EDITOR --- */}
                <div
                  className="dashboard-card"
                  style={{ marginBottom: "24px" }}
                >
                  <h3
                    className="card-title"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <MapPin color="#3b82f6" size={20} /> Store Pickup Address
                  </h3>
                  <p
                    style={{
                      fontSize: "14px",
                      color: "#64748b",
                      marginBottom: "12px",
                    }}
                  >
                    Update your store's address so delivery agents know where to
                    pick up orders.
                  </p>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <input
                      type="text"
                      value={storeProfile.address || ""}
                      onChange={(e) =>
                        setStoreProfile({
                          ...storeProfile,
                          address: e.target.value,
                        })
                      }
                      placeholder="Enter full store address (e.g. 123 Main St, Block B)"
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: "6px",
                        border: "1px solid var(--border)",
                        outline: "none",
                      }}
                    />
                    <button
                      onClick={updateStoreAddress}
                      className="action-btn btn-blue"
                    >
                      Save Address
                    </button>
                  </div>
                </div>

                {lowStockCount > 0 && (
                  <div
                    className="dashboard-card"
                    style={{ borderColor: "#ef4444", borderWidth: "2px" }}
                  >
                    <h3 className="card-title" style={{ color: "#ef4444" }}>
                      <ShieldAlert size={20} /> Low Stock Action Required
                    </h3>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px",
                      }}
                    >
                      {inventory
                        .filter((i) => i.stock_quantity <= 5)
                        .map((item) => {
                          const formState = restockForms[item.id] || {
                            quantity: 50,
                            supplier_id:
                              item.supplier_id ||
                              (suppliers.length > 0 ? suppliers[0].id : ""),
                            target_date: "",
                          };

                          return (
                            <div
                              key={item.id}
                              className="inventory-item"
                              style={{
                                backgroundColor: "#fef2f2",
                                padding: "16px",
                                borderRadius: "8px",
                                border: "1px solid #fecaca",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "flex-start",
                                  marginBottom: "12px",
                                }}
                              >
                                <div>
                                  <strong
                                    style={{
                                      fontSize: "16px",
                                      color: "#0f172a",
                                    }}
                                  >
                                    {item.name}
                                  </strong>
                                  <div
                                    style={{
                                      fontSize: "13px",
                                      color: "#ef4444",
                                      fontWeight: "bold",
                                      marginTop: "4px",
                                    }}
                                  >
                                    Only {item.stock_quantity} units left!
                                  </div>
                                </div>
                                {reorderedItems.includes(item.id) && (
                                  <span
                                    style={{
                                      backgroundColor: "#10b981",
                                      color: "white",
                                      padding: "4px 10px",
                                      borderRadius: "20px",
                                      fontSize: "0.8rem",
                                      fontWeight: "bold",
                                    }}
                                  >
                                    Order Placed ✓
                                  </span>
                                )}
                              </div>

                              {!reorderedItems.includes(item.id) && (
                                <div
                                  style={{
                                    display: "flex",
                                    gap: "8px",
                                    alignItems: "center",
                                    background: "white",
                                    padding: "10px",
                                    borderRadius: "6px",
                                    border: "1px solid #fecaca",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      width: "80px",
                                    }}
                                  >
                                    <label
                                      style={{
                                        fontSize: "0.7rem",
                                        color: "#64748b",
                                        fontWeight: "bold",
                                        marginBottom: "2px",
                                      }}
                                    >
                                      QTY
                                    </label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={formState.quantity || ""}
                                      placeholder="50"
                                      onChange={(e) =>
                                        handleRestockChange(
                                          item.id,
                                          "quantity",
                                          e.target.value,
                                        )
                                      }
                                      style={{
                                        padding: "8px",
                                        borderRadius: "6px",
                                        border: "1px solid #cbd5e1",
                                        outline: "none",
                                        fontSize: "0.9rem",
                                      }}
                                    />
                                  </div>

                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      flex: 1,
                                    }}
                                  >
                                    <label
                                      style={{
                                        fontSize: "0.7rem",
                                        color: "#64748b",
                                        fontWeight: "bold",
                                        marginBottom: "2px",
                                      }}
                                    >
                                      VENDOR
                                    </label>
                                    <select
                                      value={
                                        formState.supplier_id ||
                                        (suppliers.length > 0
                                          ? suppliers[0].id
                                          : "")
                                      }
                                      onChange={(e) =>
                                        handleRestockChange(
                                          item.id,
                                          "supplier_id",
                                          e.target.value,
                                        )
                                      }
                                      style={{
                                        padding: "8px",
                                        borderRadius: "6px",
                                        border: "1px solid #cbd5e1",
                                        outline: "none",
                                        fontSize: "0.9rem",
                                        width: "100%",
                                      }}
                                    >
                                      {suppliers.map((s) => (
                                        <option key={s.id} value={s.id}>
                                          {s.name} ({s.reliability_score}/10)
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      width: "130px",
                                    }}
                                  >
                                    <label
                                      style={{
                                        fontSize: "0.7rem",
                                        color: "#64748b",
                                        fontWeight: "bold",
                                        marginBottom: "2px",
                                      }}
                                    >
                                      TARGET DATE
                                    </label>
                                    <input
                                      type="date"
                                      value={formState.target_date || ""}
                                      onChange={(e) =>
                                        handleRestockChange(
                                          item.id,
                                          "target_date",
                                          e.target.value,
                                        )
                                      }
                                      style={{
                                        padding: "8px",
                                        borderRadius: "6px",
                                        border: "1px solid #cbd5e1",
                                        outline: "none",
                                        fontSize: "0.9rem",
                                      }}
                                    />
                                  </div>

                                  <button
                                    className="action-btn btn-blue"
                                    style={{
                                      alignSelf: "flex-end",
                                      height: "36px",
                                      padding: "0 16px",
                                    }}
                                    onClick={() => handleReorder(item)}
                                  >
                                    Order Stock
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                <div className="dashboard-card">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <h3 className="card-title">
                      <Zap color="#eab308" /> Shelf-Aware Pricing Engine
                    </h3>
                    <button
                      className="action-btn btn-blue"
                      onClick={runPricingEngine}
                    >
                      Run Auto-Discount
                    </button>
                  </div>
                  <p
                    style={{
                      fontSize: "14px",
                      color: "#64748b",
                      marginTop: "10px",
                    }}
                  >
                    Automatically applies 30% discounts to items expiring within
                    3 days to reduce food waste.
                  </p>
                </div>
              </>
            )}

            {activeTab === "CATALOG" && (
              <div className="dashboard-card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "16px",
                  }}
                >
                  <h3 className="card-title" style={{ margin: 0 }}>
                    <Package color="#3b82f6" /> Branch Catalog
                  </h3>
                  <button
                    className="action-btn btn-blue"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                    onClick={() => openModal()}
                  >
                    <Plus size={16} /> Add Product
                  </button>
                </div>
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Expiry</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.name}</strong>
                          {item.expiry === "Near Expiry" && (
                            <span
                              style={{
                                marginLeft: "8px",
                                fontSize: "10px",
                                backgroundColor: "#fef08a",
                                color: "#854d0e",
                                padding: "2px 6px",
                                borderRadius: "4px",
                              }}
                            >
                              Discounted
                            </span>
                          )}
                          {item.expiry === "Expired" && (
                            <span
                              style={{
                                marginLeft: "8px",
                                fontSize: "10px",
                                backgroundColor: "#fee2e2",
                                color: "#ef4444",
                                padding: "2px 6px",
                                borderRadius: "4px",
                              }}
                            >
                              Expired
                            </span>
                          )}
                        </td>
                        <td>₹{item.current_price}</td>
                        <td>{item.stock_quantity}</td>
                        <td
                          style={{
                            color:
                              item.expiry === "Expired"
                                ? "#ef4444"
                                : item.expiry === "Near Expiry"
                                  ? "#f59e0b"
                                  : "#475569",
                            fontWeight:
                              item.expiry === "Expired" ? "bold" : "normal",
                          }}
                        >
                          {item.expiry}
                        </td>
                        <td style={{ display: "flex", gap: "8px" }}>
                          <button
                            style={{
                              background: "none",
                              border: "none",
                              color: "#3b82f6",
                              cursor: "pointer",
                            }}
                            onClick={() => openModal(item)}
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            style={{
                              background: "none",
                              border: "none",
                              color: "#ef4444",
                              cursor: "pointer",
                            }}
                            onClick={() => promptDeleteProduct(item)}
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "AUDIT" && (
              <div className="dashboard-card">
                <h3 className="card-title">
                  <ShieldAlert color="#ef4444" /> Stock Discrepancy Audit
                </h3>
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>System Record</th>
                      <th>Physical Count</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.name}</strong>
                        </td>
                        <td>{item.stock_quantity} Units</td>
                        <td>
                          <input
                            type="number"
                            id={`audit-${item.id}`}
                            placeholder="Counted..."
                            className="audit-input"
                          />
                        </td>
                        <td>
                          <button
                            className="action-btn btn-yellow"
                            onClick={() =>
                              submitAudit(
                                item.id,
                                document.getElementById(`audit-${item.id}`)
                                  .value,
                              )
                            }
                          >
                            Sync Stock
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "SUPPLIERS" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "24px",
                }}
              >
                <div
                  className="dashboard-card"
                  style={{ borderColor: "#f59e0b", borderWidth: "2px" }}
                >
                  <h3 className="card-title" style={{ color: "#d97706" }}>
                    <Bell size={20} /> Pending Delivery Evaluations
                  </h3>
                  {pendingEvaluations.length === 0 ? (
                    <p style={{ color: "#64748b", fontSize: "14px" }}>
                      All deliveries have been successfully evaluated!
                    </p>
                  ) : (
                    <table className="audit-table">
                      <thead>
                        <tr>
                          <th>Supplier</th>
                          <th>Product Delivered</th>
                          <th>Qty</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingEvaluations.map((ev) => (
                          <tr key={ev.id}>
                            <td>
                              <strong>{ev.supplier_name}</strong>
                            </td>
                            <td>{ev.product_name}</td>
                            <td>{ev.quantity} Units</td>
                            <td>
                              <button
                                className="action-btn btn-yellow"
                                onClick={() => {
                                  setEvalData({
                                    orderId: ev.id,
                                    freshness: 10,
                                    time_score: 10,
                                    price_score: 10,
                                  });
                                  setIsEvalModalOpen(true);
                                }}
                              >
                                Evaluate Delivery
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="dashboard-card">
                  <h3 className="card-title">
                    <Users color="#8b5cf6" /> Live Supplier Reliability
                  </h3>
                  <div className="supplier-grid">
                    {suppliers.map((supplier, idx) => (
                      <div key={idx} className="supplier-item">
                        <strong>{supplier.name}</strong>
                        <p
                          style={{
                            fontSize: "14px",
                            color: "#475569",
                            marginTop: "4px",
                          }}
                        >
                          Score:{" "}
                          <span
                            style={{
                              fontWeight: "bold",
                              color:
                                supplier.reliability_score > 8
                                  ? "#10b981"
                                  : "#ef4444",
                            }}
                          >
                            {supplier.reliability_score}/10
                          </span>{" "}
                          ({supplier.status})
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "IMPACT" && (
              <div className="dashboard-card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "20px",
                  }}
                >
                  <h3 className="card-title" style={{ margin: 0 }}>
                    <Leaf color="#10b981" /> Branch Environmental Impact
                  </h3>
                  <button
                    className="action-btn btn-blue"
                    onClick={fetchWasteReport}
                  >
                    Generate Waste Report
                  </button>
                </div>

                <div className="impact-stats">
                  <div
                    className="impact-stat"
                    style={{
                      padding: "16px",
                      backgroundColor: "#f8fafc",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <h4
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                        textTransform: "uppercase",
                      }}
                    >
                      Carbon Footprint (Loss)
                    </h4>
                    <p
                      style={{
                        fontSize: "24px",
                        fontWeight: "black",
                        color: "#ef4444",
                      }}
                    >
                      {impactData?.carbon_footprint_kg || 0}{" "}
                      <span style={{ fontSize: "14px", fontWeight: "normal" }}>
                        kg CO2e
                      </span>
                    </p>
                  </div>
                  <div
                    className="impact-stat"
                    style={{
                      padding: "16px",
                      backgroundColor: "#f8fafc",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <h4
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                        textTransform: "uppercase",
                      }}
                    >
                      Financial Shrinkage
                    </h4>
                    <p
                      style={{
                        fontSize: "24px",
                        fontWeight: "black",
                        color: "#f59e0b",
                      }}
                    >
                      ₹{impactData?.financial_loss || 0}
                    </p>
                  </div>
                  <div
                    className="impact-stat"
                    style={{
                      padding: "16px",
                      backgroundColor: "#f8fafc",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <h4
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                        textTransform: "uppercase",
                      }}
                    >
                      Incidents (Theft / Expiry)
                    </h4>
                    <p
                      style={{
                        fontSize: "24px",
                        fontWeight: "black",
                        color: "#3b82f6",
                      }}
                    >
                      {impactData?.theft_incidents || 0} /{" "}
                      {impactData?.expiry_incidents || 0}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "ORDERS" && (
              <div
                style={{
                  background: "white",
                  padding: "2.5rem",
                  borderRadius: "var(--radius-card)",
                  border: "1px solid var(--border)",
                  boxShadow: "var(--shadow-subtle)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "2.5rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <Package color="var(--primary)" size={24} />
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "1.25rem",
                        color: "var(--text-main)",
                        fontWeight: "700",
                      }}
                    >
                      Live Fulfillment Queue
                    </h3>
                  </div>

                  <button
                    onClick={() => {
                      fetchDashboardData();
                      setNotifications((prev) => [
                        {
                          id: Date.now(),
                          time: "Just now",
                          message:
                            "Live Queue Synced: Fetched latest customer orders.",
                          type: "success",
                        },
                        ...prev,
                      ]);
                    }}
                    className="action-btn btn-blue"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 16px",
                    }}
                  >
                    <RefreshCw size={16} /> Sync Latest Orders
                  </button>
                </div>

                <div
                  style={{
                    background: "#f8fafc",
                    padding: "1.5rem",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    marginBottom: "2.5rem",
                    display: "flex",
                    gap: "2rem",
                    overflowX: "auto",
                  }}
                >
                  <div>
                    <h4
                      style={{
                        margin: "0 0 10px 0",
                        fontSize: "0.9rem",
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                      }}
                    >
                      Delivery Fleet Status
                    </h4>
                    <div style={{ display: "flex", gap: "1rem" }}>
                      {agents.map((agent) => (
                        <div
                          key={agent.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            background: "white",
                            padding: "8px 16px",
                            borderRadius: "20px",
                            border: "1px solid var(--border)",
                            fontSize: "0.85rem",
                            fontWeight: "600",
                            color: "var(--text-main)",
                          }}
                        >
                          <span
                            style={{
                              width: "10px",
                              height: "10px",
                              borderRadius: "50%",
                              background:
                                agent.status === "Available"
                                  ? "#10b981"
                                  : "#f59e0b",
                            }}
                          ></span>
                          {agent.username}{" "}
                          <span
                            style={{
                              color: "var(--text-muted)",
                              fontWeight: "normal",
                            }}
                          >
                            ({agent.status})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {orders.length === 0 ? (
                  <div
                    className="status-msg"
                    style={{
                      background: "#f8fafc",
                      padding: "2rem",
                      borderRadius: "8px",
                      color: "var(--text-muted)",
                      textAlign: "center",
                      fontStyle: "italic",
                    }}
                  >
                    No active orders in fulfillment. System Idle.
                  </div>
                ) : (
                  orders.map((order) => {
                    const isPending = order.status.toLowerCase() === "pending";
                    const isDelivered =
                      order.status.toLowerCase() === "delivered";

                    const orderDate = new Date(
                      order.created_at || Date.now(),
                    ).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    });
                    const orderTime = new Date(
                      order.created_at || Date.now(),
                    ).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <div
                        key={order.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "2rem",
                          padding: "2rem",
                          background: "#f8fafc",
                          borderRadius: "8px",
                          border: "1px solid var(--border)",
                          marginBottom: "1.5rem",
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            gridColumn: "1 / -1",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            borderBottom: "1px dashed var(--border)",
                            paddingBottom: "1.5rem",
                            marginBottom: "0.5rem",
                          }}
                        >
                          <div>
                            <p
                              style={{
                                margin: "0 0 6px 0",
                                fontSize: "0.8rem",
                                color: "var(--text-muted)",
                                textTransform: "uppercase",
                                letterSpacing: "1px",
                                fontWeight: "700",
                              }}
                            >
                              Fulfillment Routine
                            </p>
                            <h4
                              style={{
                                margin: "0",
                                fontSize: "1.6rem",
                                color: "var(--text-main)",
                              }}
                            >
                              ORDER ID #{order.id}
                            </h4>
                            <p
                              style={{
                                margin: "6px 0 0 0",
                                fontSize: "0.9rem",
                                color: "var(--text-muted)",
                              }}
                            >
                              Placed: {orderDate} at {orderTime}
                            </p>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-end",
                              gap: "8px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.8rem",
                                fontWeight: "700",
                                textTransform: "uppercase",
                                padding: "6px 12px",
                                borderRadius: "20px",
                                backgroundColor: isPending
                                  ? "#fef08a"
                                  : "#dbeafe",
                                color: isPending ? "#854d0e" : "#1e40af",
                              }}
                            >
                              {order.status}
                            </span>
                            {!isPending && !isDelivered && (
                              <span
                                style={{
                                  color: "var(--text-muted)",
                                  fontSize: "0.85rem",
                                  fontStyle: "italic",
                                }}
                              >
                                Awaiting final confirmation
                              </span>
                            )}
                          </div>
                        </div>

                        <div
                          style={{
                            background: "white",
                            padding: "1.5rem",
                            borderRadius: "8px",
                            border: "1px solid var(--border)",
                          }}
                        >
                          <h5
                            style={{
                              margin: "0 0 1.25rem 0",
                              color: "var(--text-muted)",
                              fontSize: "0.85rem",
                              textTransform: "uppercase",
                              letterSpacing: "1.2px",
                              fontWeight: "700",
                            }}
                          >
                            Items to Pack:
                          </h5>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "10px",
                            }}
                          >
                            {order.items.map((item, i) => (
                              <div
                                key={i}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "10px",
                                  background: i % 2 === 0 ? "#f8fafc" : "white",
                                  borderRadius: "6px",
                                }}
                              >
                                <span
                                  style={{
                                    fontWeight: "600",
                                    color: "var(--text-main)",
                                    fontSize: "0.95rem",
                                  }}
                                >
                                  {item.name}
                                </span>
                                <span
                                  style={{
                                    background:
                                      i % 2 === 0 ? "white" : "#f8fafc",
                                    color: "var(--primary)",
                                    border:
                                      i % 2 === 0
                                        ? "1px solid var(--border)"
                                        : "1px solid transparent",
                                    fontWeight: "700",
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "50%",
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    fontSize: "0.9rem",
                                  }}
                                >
                                  x{item.quantity}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div
                          style={{
                            background: "white",
                            padding: "1.5rem",
                            borderRadius: "8px",
                            border: "1px solid var(--border)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "1.5rem",
                          }}
                        >
                          <div
                            style={{
                              padding: "1rem",
                              background: "#f8fafc",
                              borderRadius: "8px",
                              border: "1px solid var(--border)",
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "10px",
                            }}
                          >
                            <MapPin
                              size={18}
                              color="var(--primary)"
                              style={{ marginTop: "4px" }}
                            />
                            <div style={{ width: "100%" }}>
                              <p
                                style={{
                                  margin: "0 0 6px 0",
                                  fontSize: "0.8rem",
                                  color: "var(--text-muted)",
                                  textTransform: "uppercase",
                                  fontWeight: "700",
                                  letterSpacing: "0.5px",
                                }}
                              >
                                Deliver to Address:
                              </p>
                              <p
                                style={{
                                  margin: "0 0 8px 0",
                                  color: "var(--text-main)",
                                  fontSize: "0.95rem",
                                  lineHeight: "1.5",
                                }}
                              >
                                {order.delivery_address ||
                                  "Address details routine"}
                              </p>
                              <div
                                style={{
                                  borderTop: "1px dashed var(--border)",
                                  paddingTop: "8px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  fontSize: "0.85rem",
                                  color: "var(--text-muted)",
                                }}
                              >
                                <Phone size={14} /> Customer Contact:{" "}
                                <strong style={{ color: "var(--text-main)" }}>
                                  {order.customer_phone}
                                </strong>
                              </div>
                            </div>
                          </div>

                          {isPending && (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "12px",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <h5
                                  style={{
                                    margin: "0",
                                    color: "var(--text-muted)",
                                    fontSize: "0.85rem",
                                    textTransform: "uppercase",
                                    letterSpacing: "1px",
                                    fontWeight: "700",
                                  }}
                                >
                                  Packing snapshot:
                                </h5>
                                {order.hasUploadedPhoto ? (
                                  <span
                                    style={{
                                      fontSize: "0.8rem",
                                      color: "#10b981",
                                      fontWeight: "600",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "4px",
                                    }}
                                  >
                                    <CheckCircle2 size={16} /> Recorded
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      fontSize: "0.8rem",
                                      color: "#ef4444",
                                      fontWeight: "600",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "4px",
                                    }}
                                  >
                                    <AlertTriangle size={16} /> Required
                                  </span>
                                )}
                              </div>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) =>
                                  handleUploadPhoto(order.id, e.target.files[0])
                                }
                                style={{
                                  width: "100%",
                                  fontSize: "0.9rem",
                                  color: "var(--text-main)",
                                  padding: "8px",
                                  border: "1px dashed var(--border)",
                                  borderRadius: "6px",
                                  background: "#f8fafc",
                                }}
                              />
                            </div>
                          )}

                          {isPending && (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "12px",
                                borderTop: "1px dashed var(--border)",
                                paddingTop: "1.5rem",
                              }}
                            >
                              <h5
                                style={{
                                  margin: "0",
                                  color: "var(--text-muted)",
                                  fontSize: "0.85rem",
                                  textTransform: "uppercase",
                                  letterSpacing: "1px",
                                  fontWeight: "700",
                                }}
                              >
                                Delivery Assignment:
                              </h5>

                              {order.delivery_agent ? (
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    background: "#f0fdfa",
                                    padding: "10px 14px",
                                    borderRadius: "6px",
                                    border: "1px solid #ccfbf1",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "8px",
                                      color: "var(--primary)",
                                      fontWeight: "700",
                                    }}
                                  >
                                    <User size={18} /> Assigned:{" "}
                                    {order.delivery_agent.toUpperCase()}
                                  </div>
                                  {order.agent_phone &&
                                    order.agent_phone !== "Not Provided" && (
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "4px",
                                          fontSize: "0.8rem",
                                          color: "#0f766e",
                                          fontWeight: "600",
                                        }}
                                      >
                                        <Phone size={14} /> {order.agent_phone}
                                      </div>
                                    )}
                                </div>
                              ) : (
                                <div style={{ display: "flex", gap: "10px" }}>
                                  <select
                                    id={`agent-select-${order.id}`}
                                    style={{
                                      flex: 1,
                                      padding: "10px",
                                      borderRadius: "6px",
                                      border: "1px solid var(--border)",
                                      outline: "none",
                                      fontSize: "0.9rem",
                                    }}
                                  >
                                    <option value="">
                                      Select Available Agent...
                                    </option>
                                    {agents
                                      .filter((a) => a.status === "Available")
                                      .map((agent) => (
                                        <option key={agent.id} value={agent.id}>
                                          {agent.username}
                                        </option>
                                      ))}
                                  </select>
                                  <button
                                    onClick={() => assignAgent(order.id)}
                                    style={{
                                      padding: "0 16px",
                                      background: "#334155",
                                      color: "white",
                                      border: "none",
                                      borderRadius: "6px",
                                      fontWeight: "600",
                                      cursor: "pointer",
                                    }}
                                  >
                                    Assign
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {order.delivery_photo && (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "12px",
                                borderTop: "1px dashed var(--border)",
                                paddingTop: "1.5rem",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <h5
                                  style={{
                                    margin: "0",
                                    color: "var(--text-muted)",
                                    fontSize: "0.85rem",
                                    textTransform: "uppercase",
                                    letterSpacing: "1px",
                                    fontWeight: "700",
                                  }}
                                >
                                  Proof of Delivery:
                                </h5>
                                <span
                                  style={{
                                    fontSize: "0.8rem",
                                    color: "#10b981",
                                    fontWeight: "600",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                >
                                  <CheckCircle2 size={16} /> Verified
                                </span>
                              </div>
                              <img
                                src={order.delivery_photo}
                                alt="Proof of Delivery"
                                style={{
                                  width: "100%",
                                  height: "200px",
                                  objectFit: "cover",
                                  borderRadius: "6px",
                                  border: "1px solid var(--border)",
                                }}
                              />
                            </div>
                          )}

                          <div
                            style={{
                              borderTop: "1px dashed var(--border)",
                              paddingTop: "1.5rem",
                              marginTop: "auto",
                            }}
                          >
                            {isPending && (
                              <button
                                onClick={() =>
                                  updateOrderStatus(order.id, "Shipped")
                                }
                                disabled={
                                  !order.hasUploadedPhoto ||
                                  !order.delivery_agent
                                }
                                style={{
                                  width: "100%",
                                  padding: "12px",
                                  borderRadius: "6px",
                                  fontSize: "0.9rem",
                                  fontWeight: "700",
                                  textTransform: "uppercase",
                                  letterSpacing: "1px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  justifyContent: "center",
                                  backgroundColor:
                                    !order.hasUploadedPhoto ||
                                    !order.delivery_agent
                                      ? "#e2e8f0"
                                      : "var(--primary)",
                                  color:
                                    !order.hasUploadedPhoto ||
                                    !order.delivery_agent
                                      ? "#94a3b8"
                                      : "white",
                                  cursor:
                                    !order.hasUploadedPhoto ||
                                    !order.delivery_agent
                                      ? "not-allowed"
                                      : "pointer",
                                  border: "none",
                                  transition: "0.2s",
                                }}
                              >
                                <UploadCloud size={18} /> Mark Shipped
                              </button>
                            )}
                            {!isPending && (
                              <button
                                disabled
                                style={{
                                  width: "100%",
                                  padding: "12px",
                                  borderRadius: "6px",
                                  fontSize: "0.9rem",
                                  fontWeight: "700",
                                  textTransform: "uppercase",
                                  letterSpacing: "1px",
                                  background: isDelivered ? "#10b981" : "white",
                                  color: isDelivered ? "white" : "#10b981",
                                  border: isDelivered
                                    ? "none"
                                    : "2px solid #10b981",
                                  cursor: "not-allowed",
                                  display: "flex",
                                  justifyContent: "center",
                                  gap: "8px",
                                  alignItems: "center",
                                }}
                              >
                                <CheckCircle2 size={18} />{" "}
                                {isDelivered
                                  ? "Delivery Completed"
                                  : "Order Dispatched"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div className="content-right">
            <div className="dashboard-card log-panel">
              <h3 className="card-title">
                <Bell color="#3b82f6" /> Activity Log
              </h3>
              <div className="log-container">
                {notifications.length === 0 ? (
                  <p
                    style={{
                      textAlign: "center",
                      color: "#94a3b8",
                      marginTop: "40px",
                      fontSize: "14px",
                    }}
                  >
                    System Idle...
                  </p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`log-entry ${n.type}`}
                      style={{ marginBottom: "12px" }}
                    >
                      <small
                        style={{
                          display: "block",
                          color: "#94a3b8",
                          fontSize: "11px",
                          fontWeight: "bold",
                        }}
                      >
                        {n.time}
                      </small>
                      <p
                        style={{
                          fontSize: "14px",
                          color: "#334155",
                          marginTop: "4px",
                        }}
                      >
                        {n.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* --- NEW: EVALUATION MODAL --- */}
      {isEvalModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "32px",
              borderRadius: "16px",
              width: "400px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: "8px", color: "#0f172a" }}>
              Evaluate Delivery
            </h2>
            <p
              style={{
                color: "#64748b",
                fontSize: "14px",
                marginBottom: "20px",
              }}
            >
              Rate this delivery to update the supplier's reliability score.
            </p>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: "bold",
                    color: "#64748b",
                    marginBottom: "4px",
                  }}
                >
                  Freshness & Quality (1-10)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={evalData.freshness}
                  onChange={(e) =>
                    setEvalData({ ...evalData, freshness: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: "bold",
                    color: "#64748b",
                    marginBottom: "4px",
                  }}
                >
                  On-Time Delivery (1-10)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={evalData.time_score}
                  onChange={(e) =>
                    setEvalData({ ...evalData, time_score: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: "bold",
                    color: "#64748b",
                    marginBottom: "4px",
                  }}
                >
                  Pricing Accuracy (1-10)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={evalData.price_score}
                  onChange={(e) =>
                    setEvalData({ ...evalData, price_score: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button
                  onClick={() => setIsEvalModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    background: "white",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    color: "#475569",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={submitEvaluation}
                  style={{
                    flex: 1,
                    padding: "10px",
                    background: "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  Submit Score
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD/EDIT PRODUCT MODAL --- */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "32px",
              borderRadius: "16px",
              width: "400px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h2
              style={{ marginTop: 0, marginBottom: "24px", color: "#0f172a" }}
            >
              {editId ? "Edit Product" : "Add New Product"}
            </h2>
            <form
              onSubmit={handleSaveProduct}
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: "bold",
                    color: "#64748b",
                    marginBottom: "4px",
                  }}
                >
                  Product Name
                </label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: "16px" }}>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: "bold",
                      color: "#64748b",
                      marginBottom: "4px",
                    }}
                  >
                    Price (₹)
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: "bold",
                      color: "#64748b",
                      marginBottom: "4px",
                    }}
                  >
                    Initial Stock
                  </label>
                  <input
                    required
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stock_quantity: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: "bold",
                    color: "#64748b",
                    marginBottom: "4px",
                  }}
                >
                  Expiry Date
                </label>
                <input
                  required
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) =>
                    setFormData({ ...formData, expiry_date: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: "bold",
                    color: "#64748b",
                    marginBottom: "4px",
                  }}
                >
                  Supplier
                </label>
                <select
                  required
                  value={formData.supplier_id}
                  onChange={(e) =>
                    setFormData({ ...formData, supplier_id: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    boxSizing: "border-box",
                  }}
                >
                  {suppliers.map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      {sup.name}
                    </option>
                  ))}
                </select>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                  marginTop: "16px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "white",
                    cursor: "pointer",
                    fontWeight: "bold",
                    color: "#475569",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="action-btn btn-blue"
                  style={{ border: "none" }}
                >
                  {editId ? "Save Changes" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {isDeleteModalOpen && productToDelete && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "32px",
              borderRadius: "16px",
              width: "380px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                backgroundColor: "#fee2e2",
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                margin: "0 auto 16px auto",
              }}
            >
              <ShieldAlert color="#ef4444" size={24} />
            </div>
            <h2
              style={{
                marginTop: 0,
                marginBottom: "8px",
                color: "#0f172a",
                fontSize: "20px",
              }}
            >
              Delete Product
            </h2>
            <p
              style={{
                color: "#64748b",
                fontSize: "14px",
                marginBottom: "24px",
                lineHeight: "1.5",
              }}
            >
              Are you sure you want to delete{" "}
              <strong>{productToDelete.name}</strong> from your catalog? This
              action cannot be undone.
            </p>
            <div
              style={{ display: "flex", justifyContent: "center", gap: "12px" }}
            >
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setProductToDelete(null);
                }}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "white",
                  cursor: "pointer",
                  fontWeight: "bold",
                  color: "#475569",
                }}
              >
                Cancel
              </button>
              <button
                onClick={executeDeleteProduct}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#ef4444",
                  cursor: "pointer",
                  fontWeight: "bold",
                  color: "white",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- WASTE REPORT MODAL --- */}
      {isWasteModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "32px",
              borderRadius: "16px",
              width: "800px",
              maxWidth: "90%",
              maxHeight: "80vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "24px",
              }}
            >
              <h2 style={{ margin: 0 }}>Stock Expiry & Waste Report</h2>
              <button
                onClick={() => setIsWasteModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#64748b",
                }}
              >
                &times;
              </button>
            </div>

            {wasteReport.length === 0 ? (
              <p
                style={{
                  textAlign: "center",
                  color: "#94a3b8",
                  padding: "40px",
                }}
              >
                No waste incidents recorded yet. Great job!
              </p>
            ) : (
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Qty Lost</th>
                    <th>Financial Loss</th>
                    <th>Carbon (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {wasteReport.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: "12px" }}>{log.date}</td>
                      <td>
                        <strong>{log.product}</strong>
                      </td>
                      <td>{log.qty} Units</td>
                      <td style={{ color: "#ef4444" }}>₹{log.loss}</td>
                      <td>{log.carbon} kg CO2e</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div style={{ marginTop: "24px", textAlign: "right" }}>
              <button
                onClick={() => window.print()}
                className="action-btn btn-blue"
                style={{ border: "none" }}
              >
                Print PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, type }) => (
  <div className={`stat-card ${type}`}>
    <p className="stat-title">{title}</p>
    <h3 className="stat-value">{value}</h3>
  </div>
);

export default ManagerDashboard;
