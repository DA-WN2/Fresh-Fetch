import React from "react";
import { Link } from "react-router-dom"; // Only one import needed
import "../styles/Cart.css";

const Cart = ({ cart, removeFromCart }) => {
  // Logic correctly handles current_price (which includes the 30% Smart Discount)
  const total = cart.reduce(
    (acc, item) => acc + parseFloat(item.current_price),
    0,
  );

  return (
    <div className="cart-page">
      <h2>Your Shopping Basket</h2>
      {cart.length === 0 ? (
        <div className="empty-cart">
          <p>Your basket is currently empty.</p>
          <Link to="/" className="back-link">
            Return to Shop
          </Link>
        </div>
      ) : (
        <>
          <div className="cart-items-container">
            {cart.map((item) => (
              <div key={item.cartId} className="cart-item">
                <div className="item-info">
                  <span className="item-name">{item.name}</span>
                  <span className="item-price">₹{item.current_price}</span>
                </div>
                <button
                  className="remove-btn"
                  onClick={() => removeFromCart(item.cartId)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="cart-footer">
            <h3>Total: ₹{total.toFixed(2)}</h3>
            {/* Navigates to the third-party payment gateway simulation */}
            <Link to="/checkout" className="checkout-btn">
              Proceed to Payment
            </Link>
          </div>
        </>
      )}
    </div>
  );
};

export default Cart;
