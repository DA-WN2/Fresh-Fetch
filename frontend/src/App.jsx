import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

// Styles
import "./App.css";

// Components
import Navbar from "./components/Navbar";

// Page Components
import Home from "./pages/Home";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import ProductPage from "./pages/ProductPage";

// Enterprise Dashboards
import ManagerDashboard from "./pages/ManagerDashboard";
import DeliveryDashboard from "./pages/DeliveryDashboard";
import SupplierDashboard from "./pages/SupplierDashboard";

function App() {
  // --- GLOBAL STATE ---
  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem("freshfetch_cart");
    if (savedCart) {
      return JSON.parse(savedCart);
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem("freshfetch_cart", JSON.stringify(cart));
  }, [cart]);

  const [deals, setDeals] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- FETCH DATA ---
  const fetchData = () => {
    setLoading(true);
    axios
      .get("http://127.0.0.1:8000/api/customer/deals/")
      .then((res) => {
        setDeals(res.data.products);
        setAllProducts(res.data.all_products || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("API Error:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- CART LOGIC ---
  const addToCart = (product, quantityToAdd = 1) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find(
        (item) => item.product.id === product.id,
      );

      if (existingItem) {
        return prevCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantityToAdd }
            : item,
        );
      }
      return [...prevCart, { product, quantity: quantityToAdd }];
    });
  };

  const clearCart = () => setCart([]);

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const totalCartItems = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <Router>
      <Routes>
        {/* =========================================
            1. ENTERPRISE APPS (FULL SCREEN, NO NAVBAR)
            ========================================= */}
        <Route path="/manager-dashboard" element={<ManagerDashboard />} />
        <Route path="/delivery-portal" element={<DeliveryDashboard />} />
        <Route path="/supplier-inventory" element={<SupplierDashboard />} />

        {/* =========================================
            2. CUSTOMER APP (WITH NAVBAR & CONTAINER)
            ========================================= */}
        <Route
          path="/*"
          element={
            <>
              <Navbar
                cartCount={totalCartItems}
                fetchData={fetchData}
                clearCart={clearCart}
              />

              <div className="container">
                <main className="content">
                  <Routes>
                    <Route
                      path="/"
                      element={
                        <Home
                          cart={cart}
                          addToCart={addToCart}
                          clearCart={clearCart}
                        />
                      }
                    />
                    <Route
                      path="/cart"
                      element={
                        <Cart cart={cart} removeFromCart={removeFromCart} />
                      }
                    />
                    <Route
                      path="/checkout"
                      element={<Checkout cart={cart} setCart={setCart} />}
                    />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route
                      path="/product/:id"
                      element={<ProductPage addToCart={addToCart} />}
                    />
                  </Routes>
                </main>
                <footer>
                  <p>© 2026 Fresh-Fetch | Smart Grocery Solutions</p>
                </footer>
              </div>
            </>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
