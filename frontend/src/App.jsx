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
import Register from "./pages/Register"; // Make sure to create this file next

function App() {
  const [cart, setCart] = useState([]);
  const [deals, setDeals] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Use Case 5: Dynamic Personalization - Fetching data from Django
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

  // Use Case 2: Cart Management Logic
  const addToCart = (product) => {
    setCart([...cart, { ...product, cartId: Date.now() }]);
  };

  const removeFromCart = (cartId) => {
    setCart(cart.filter((item) => item.cartId !== cartId));
  };

  return (
    <Router>
      <div className="container">
        {/* Navbar is placed outside Routes to remain visible on all pages */}
        <Navbar cartCount={cart.length} fetchData={fetchData} />

        <main className="content">
          <Routes>
            {/* Marketplace Home */}
            <Route
              path="/"
              element={
                <Home
                  deals={deals}
                  allProducts={allProducts}
                  loading={loading}
                  addToCart={addToCart}
                />
              }
            />

            {/* Shopping & Checkout Flow */}
            <Route
              path="/cart"
              element={<Cart cart={cart} removeFromCart={removeFromCart} />}
            />
            <Route
              path="/checkout"
              element={<Checkout cart={cart} setCart={setCart} />}
            />
            <Route path="/orders" element={<Orders />} />

            {/* Authentication Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Future: Add Manager and Delivery Agent Dashboard Routes here */}
          </Routes>
        </main>

        <footer>
          <p>© 2026 Fresh-Fetch | Smart Grocery Solutions</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
