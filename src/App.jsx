import React, { useState } from "react";

export default function App() {
  const [items, setItems] = useState([]);
  const [model, setModel] = useState("");
  const [qty, setQty] = useState("");

  function addItem() {
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

  function removeItem(id) {
    setItems(items.filter(i => i.id !== id));
  }

  return (
    <div style={{fontFamily:"Arial", padding:30}}>
      <h1>CoolStock AC Warehouse</h1>

      <div style={{marginTop:20}}>
        <input
          placeholder="AC Model"
          value={model}
          onChange={e => setModel(e.target.value)}
          style={{marginRight:10}}
        />

        <input
          placeholder="Quantity"
          type="number"
          value={qty}
          onChange={e => setQty(e.target.value)}
          style={{marginRight:10}}
        />

        <button onClick={addItem}>Add Stock</button>
      </div>

      <h2 style={{marginTop:30}}>Inventory</h2>

      {items.length === 0 && <p>No stock added yet</p>}

      {items.map(item => (
        <div key={item.id} style={{
          border:"1px solid #ccc",
          padding:10,
          marginTop:10,
          display:"flex",
          justifyContent:"space-between"
        }}>
          <div>
            <b>{item.model}</b> — {item.qty} units
          </div>

          <button onClick={() => removeItem(item.id)}>
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}