import React, { useState } from "react";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [items, setItems] = useState([]);
  const [model, setModel] = useState("");
  const [qty, setQty] = useState("");

  function login() {
    if (username === "admin" && password === "admin123") {
      setLoggedIn(true);
    } else {
      alert("Invalid login");
    }
  }

  function logout() {
    setLoggedIn(false);
  }

  function addStock() {
    if (!model || !qty) return;

    const newItem = {
      id: Date.now(),
      model: model,
      qty: parseInt(qty)
    };

    setItems([...items, newItem]);

    setModel("");
    setQty("");
  }

  function removeStock(id) {
    setItems(items.filter(i => i.id !== id));
  }

  if (!loggedIn) {
    return (
      <div style={{ fontFamily: "Arial", padding: 40 }}>
        <h1>CoolStock AC Inventory</h1>

        <div style={{ marginTop: 30 }}>
          <input
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            style={{ display: "block", marginBottom: 10 }}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ display: "block", marginBottom: 10 }}
          />

          <button onClick={login}>Login</button>

          <p style={{ marginTop: 20 }}>
            Default login: admin / admin123
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "Arial", padding: 30 }}>
      <h1>CoolStock Warehouse Dashboard</h1>

      <button onClick={logout} style={{ marginBottom: 20 }}>
        Logout
      </button>

      <h2>Add Stock</h2>

      <input
        placeholder="AC Model"
        value={model}
        onChange={e => setModel(e.target.value)}
        style={{ marginRight: 10 }}
      />

      <input
        type="number"
        placeholder="Quantity"
        value={qty}
        onChange={e => setQty(e.target.value)}
        style={{ marginRight: 10 }}
      />

      <button onClick={addStock}>Add</button>

      <h2 style={{ marginTop: 30 }}>Inventory</h2>

      {items.length === 0 && <p>No inventory yet</p>}

      {items.map(item => (
        <div
          key={item.id}
          style={{
            border: "1px solid #ccc",
            padding: 10,
            marginTop: 10,
            display: "flex",
            justifyContent: "space-between"
          }}
        >
          <div>
            <b>{item.model}</b> — {item.qty} units
          </div>

          <button onClick={() => removeStock(item.id)}>
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}