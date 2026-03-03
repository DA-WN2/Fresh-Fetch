import React from "react";
import "../styles/Marketplace.css";

const Home = ({ deals, allProducts, loading, addToCart }) => {
  return (
    <main className="home-container">
      {/* USE CASE 5: Highlighting the Smart Pricing Logic */}
      <section className="section-deals">
        <h2>🔥 Today's Smart Deals</h2>
        <p className="logic-hint">
          Automated 30% discounts based on shelf-life tracking.
        </p>

        <div className="product-grid">
          {loading ? (
            <div className="status-msg">Connecting to MySQL Database...</div>
          ) : deals.length > 0 ? (
            deals.map((item) => (
              <div key={item.id} className="card deal-card">
                <div className="badge-expiry">NEAR EXPIRY - 30% OFF</div>
                <h3>{item.name}</h3>
                <div className="price-container">
                  <span className="current-price">₹{item.current_price}</span>
                  <span className="old-price">₹{item.original_price}</span>
                </div>
                <button className="add-btn" onClick={() => addToCart(item)}>
                  Add to Basket
                </button>
              </div>
            ))
          ) : (
            <div className="status-msg">No items currently near expiry.</div>
          )}
        </div>
      </section>

      {/* USE CASE 2: General Inventory & Stock Monitoring */}
      <section className="section-all">
        <h2>Standard Inventory</h2>
        <div className="product-grid">
          {!loading && allProducts.length > 0
            ? allProducts.map((item) => (
                <div key={item.id} className="card">
                  <h3>{item.name}</h3>
                  <div className="price-container">
                    <span className="current-price">₹{item.current_price}</span>
                  </div>
                  {/* Visual feedback for stock levels */}
                  {item.stock_quantity <= 5 && (
                    <span className="low-stock-warning">Limited Stock!</span>
                  )}
                  <button className="add-btn" onClick={() => addToCart(item)}>
                    Add to Basket
                  </button>
                </div>
              ))
            : !loading && <p>No products available in the marketplace.</p>}
        </div>
      </section>
    </main>
  );
};

export default Home;
