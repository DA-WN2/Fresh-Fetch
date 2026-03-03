import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

import "./styles/Navbar.css";

// Page Components
import Home from "./pages/Home";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";

function App() {
  const [cart, setCart] = useState([]);
  const [deals, setDeals] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    setLoading(true);
    axios
      .get("http://127.0.0.1:8000/api/customer/deals/")
      .then((res) => {
        setDeals(res.data.products);
        // Assuming your backend also sends all products for the marketplace
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

  const addToCart = (product) => {
    setCart([...cart, { ...product, cartId: Date.now() }]);
  };

  const removeFromCart = (cartId) => {
    setCart(cart.filter((item) => item.cartId !== cartId));
  };

  return (
    <Router>
      <div className="container">
        <header className="main-header">
          <Link
            to="/"
            className="logo-section"
            style={{ textDecoration: "none" }}
          >
            <h1>Fresh-Fetch</h1>
            <p className="subtitle">Smart Grocery Solutions</p>
          </Link>
          <nav className="nav-menu">
            <Link to="/" className="nav-link">
              Shop
            </Link>
            <Link to="/orders" className="nav-link">
              My Orders
            </Link>
            <Link to="/cart" className="cart-btn">
              🛒 Basket ({cart.length})
            </Link>
            <button className="refresh-btn" onClick={fetchData}>
              🔄
            </button>
          </nav>
        </header>

        <Routes>
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
          <Route
            path="/cart"
            element={<Cart cart={cart} removeFromCart={removeFromCart} />}
          />
          <Route
            path="/checkout"
            element={<Checkout cart={cart} setCart={setCart} />}
          />
          <Route path="/orders" element={<Orders />} />
        </Routes>

        <footer>
          <p>© 2026 Fresh-Fetch</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
