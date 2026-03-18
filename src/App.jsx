import { supabase } from "./supabase";
import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const ALL_MODULES = [
  { id:"dashboard", label:"Dashboard",    icon:"📊" },
  { id:"intake",    label:"Stock Intake", icon:"📦" },
  { id:"qc",        label:"QC Module",    icon:"🔬" },
  { id:"sales",     label:"Sales",        icon:"💰" },
  { id:"dispatch",  label:"Dispatch",     icon:"🚚" },
  { id:"customers", label:"Customers",    icon:"👥" },
  { id:"verify",    label:"Stock Verify", icon:"📡" },
  { id:"invoices",   label:"Invoice Book",  icon:"🧾" },
  { id:"reports",   label:"Reports",      icon:"📈", adminOnly:true },
  { id:"master",    label:"Master",       icon:"⚙️",  adminOnly:true },
];

const SC = {
  pending_qc:   { label:"Pending QC",   color:"#FBBF24", bg:"rgba(251,191,36,.12)",  icon:"⏳" },
  available:    { label:"Available",    color:"#34D399", bg:"rgba(52,211,153,.12)",  icon:"✅" },
  under_repair: { label:"Under Repair", color:"#F87171", bg:"rgba(248,113,113,.12)", icon:"🔧" },
  sold:         { label:"Sold",         color:"#94A3B8", bg:"rgba(148,163,184,.12)", icon:"💰" },
};

const DISPATCH_STAGES = [
  { id:"booked",    label:"Booked",          icon:"📋", color:"#FBBF24" },
  { id:"out",       label:"Out for Delivery", icon:"🚚", color:"#38BDF8" },
  { id:"delivered", label:"Delivered",        icon:"📦", color:"#34D399" },
  { id:"paid",      label:"Payment Received", icon:"💰", color:"#818CF8" },
];

const today  = () => new Date().toISOString().split("T")[0];
const fmt    = n => (n!=null&&n!=="")?"₹"+Number(n).toLocaleString("en-IN"):"—";
const genId  = () => Math.random().toString(36).slice(2,9);

// ─── SEED DATA ────────────────────────────────────────────────────────────────
const SEED_WH = [
  { id:"wh1", name:"Warehouse 1", location:"Main Road, Mumbai",  createdDate:"2024-01-01", remark:"Primary storage" },
  { id:"wh2", name:"Warehouse 2", location:"MIDC, Thane",        createdDate:"2024-01-01", remark:"Secondary overflow" },
];
const SEED_LOTS = [
  { id:"l1", number:"LOT-2024-001", createdDate:"2024-03-01", remark:"First CoolTech batch" },
  { id:"l2", number:"LOT-2024-002", createdDate:"2024-03-05", remark:"AirPro bulk order" },
  { id:"l3", number:"LOT-2024-003", createdDate:"2024-03-09", remark:"FreezCool regular" },
];
const SEED_BRANDS = [
  { id:"b1", name:"Daikin",    createdDate:"2024-01-01", remark:"Japanese premium" },
  { id:"b2", name:"Voltas",    createdDate:"2024-01-01", remark:"TATA group" },
  { id:"b3", name:"LG",        createdDate:"2024-01-01", remark:"Korean brand" },
  { id:"b4", name:"Samsung",   createdDate:"2024-01-01", remark:"Korean brand" },
  { id:"b5", name:"Hitachi",   createdDate:"2024-01-01", remark:"" },
  { id:"b6", name:"Blue Star", createdDate:"2024-01-01", remark:"Indian brand" },
];
const SEED_TONNAGES = [
  { id:"t1", value:"0.75 Ton", createdDate:"2024-01-01", remark:"Small rooms" },
  { id:"t2", value:"1 Ton",    createdDate:"2024-01-01", remark:"Up to 120 sq ft" },
  { id:"t3", value:"1.5 Ton",  createdDate:"2024-01-01", remark:"Up to 180 sq ft" },
  { id:"t4", value:"2 Ton",    createdDate:"2024-01-01", remark:"Up to 240 sq ft" },
  { id:"t5", value:"3 Ton",    createdDate:"2024-01-01", remark:"Commercial" },
];
// ─── CHANGE THESE CREDENTIALS BEFORE DEPLOYING ────────────────────────────────
// Step 1: Change name, username, password below to your own values
// Step 2: After deployment, log in and go to Master → Users to add more users
// Step 3: Delete this comment once done
const SEED_USERS = [
  { id:"u1", name:"Admin User", username:"admin", password:"admin123", role:"admin", modules:ALL_MODULES.map(m=>m.id), createdDate:"2025-01-01" },
];
const SEED_UNITS = [
  { id:"AC-001", warehouse:"wh1", lot:"LOT-2024-001", rfidIn:"RFI-001-IN", rfidOut:"RFI-001-OUT", model:"Dual Inverter", brand:"Daikin",    tonnage:"1.5 Ton", supplier:"CoolTech",  receivedDate:"2024-03-01", salePrice:18500, status:"available",    qcAttempts:1, testedBy:"Ravi Kumar", testedDate:"2024-03-02" },
  { id:"AC-002", warehouse:"wh1", lot:"LOT-2024-001", rfidIn:"RFI-002-IN", rfidOut:"RFI-002-OUT", model:"WindFree",      brand:"Voltas",    tonnage:"2 Ton",   supplier:"AirPro",    receivedDate:"2024-03-02", salePrice:21000, status:"available",    qcAttempts:1, testedBy:"Ravi Kumar", testedDate:"2024-03-04" },
  { id:"AC-003", warehouse:"wh1", lot:"LOT-2024-001", rfidIn:"RFI-003-IN", rfidOut:"RFI-003-OUT", model:"Dual Inverter", brand:"LG",        tonnage:"1 Ton",   supplier:"CoolTech",  receivedDate:"2024-03-03", salePrice:13500, status:"pending_qc",   qcAttempts:0 },
  { id:"AC-004", warehouse:"wh2", lot:"LOT-2024-002", rfidIn:"RFI-004-IN", rfidOut:"RFI-004-OUT", model:"PM360",         brand:"Samsung",   tonnage:"1.5 Ton", supplier:"AirPro",    receivedDate:"2024-03-03", salePrice:15800, status:"pending_qc",   qcAttempts:0 },
  { id:"AC-005", warehouse:"wh2", lot:"LOT-2024-002", rfidIn:"RFI-005-IN", rfidOut:"RFI-005-OUT", model:"FTKF",          brand:"Daikin",    tonnage:"2 Ton",   supplier:"CoolTech",  receivedDate:"2024-03-04", salePrice:22000, status:"under_repair", qcAttempts:1, testedBy:"Ravi Kumar", repairNote:"Compressor noise" },
  { id:"AC-006", warehouse:"wh1", lot:"LOT-2024-002", rfidIn:"RFI-006-IN", rfidOut:"RFI-006-OUT", model:"Adjustable",    brand:"Voltas",    tonnage:"1 Ton",   supplier:"FreezCool", receivedDate:"2024-03-05", salePrice:10500, status:"sold",         qcAttempts:1, testedBy:"Ravi Kumar", soldTo:"Rajesh Sharma", soldDate:"2024-03-06", customerPhone:"9876543210", soldBy:"Admin User", invoiceNo:"INV-0001", paymentReceived:true },
  { id:"AC-007", warehouse:"wh2", lot:"LOT-2024-003", rfidIn:"RFI-007-IN", rfidOut:"RFI-007-OUT", model:"Dual Inverter", brand:"LG",        tonnage:"1.5 Ton", supplier:"FreezCool", receivedDate:"2024-03-06", salePrice:13500, status:"available",    qcAttempts:0 },
  { id:"AC-008", warehouse:"wh1", lot:"LOT-2024-003", rfidIn:"RFI-008-IN", rfidOut:"RFI-008-OUT", model:"WindFree",      brand:"Samsung",   tonnage:"2 Ton",   supplier:"CoolTech",  receivedDate:"2024-03-07", salePrice:20000, status:"available",    qcAttempts:1, testedBy:"Amit Singh", testedDate:"2024-03-08" },
  { id:"AC-009", warehouse:"wh2", lot:"LOT-2024-003", rfidIn:"RFI-009-IN", rfidOut:"RFI-009-OUT", model:"iCool",         brand:"Blue Star", tonnage:"1 Ton",   supplier:"AirPro",    receivedDate:"2024-03-08", salePrice:11200, status:"available",    qcAttempts:1, testedBy:"Amit Singh", testedDate:"2024-03-09" },
  { id:"AC-010", warehouse:"wh1", lot:"LOT-2024-003", rfidIn:"RFI-010-IN", rfidOut:"RFI-010-OUT", model:"Stellar",       brand:"Hitachi",   tonnage:"1.5 Ton", supplier:"FreezCool", receivedDate:"2024-03-09", salePrice:16000, status:"available",    qcAttempts:1, testedBy:"Ravi Kumar", testedDate:"2024-03-10" },
];
const SEED_CUSTOMERS = [
  { id:"c1", name:"Rajesh Sharma", phone:"9876543210", altPhone:"", email:"rajesh@gmail.com", address:"12 MG Road", city:"Mumbai", pincode:"400001", gst:"27AABCU9603R1ZX", createdDate:"2024-03-06", unitIds:["AC-006"] },
];
const SEED_DISPATCHES = [
  { id:"d1", unitId:"AC-006", customerId:"c1", invoiceNo:"INV-0001", stage:"paid", bookedDate:"2024-03-07", deliveryPartner:"BlueDart", trackingNo:"BD123456", notes:"Delivered OK", deliveredDate:"2024-03-09", paymentReceivedDate:"2024-03-09" },
];

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap');
:root{
  --bg:#07090F;--s1:#0C1018;--s2:#101520;
  --b1:rgba(255,255,255,.06);--b2:rgba(255,255,255,.1);
  --tx:#E2E8F0;--mu:#4B5563;--mu2:#64748B;
  --ac:#38BDF8;--ac2:#818CF8;--gr:#34D399;--am:#FBBF24;--rd:#F87171;--gy:#94A3B8;
  --sbw:242px;--sbc:52px;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Outfit',sans-serif;background:var(--bg);color:var(--tx);line-height:1.5}
::-webkit-scrollbar{width:3px;height:3px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:3px}
input,select,textarea,button{font-family:'Outfit',sans-serif}

.shell{display:flex;min-height:100vh}

/* SIDEBAR */
.sb{width:var(--sbw);background:var(--s1);border-right:1px solid var(--b1);display:flex;flex-direction:column;position:fixed;height:100vh;z-index:30;transition:width .2s ease;overflow:hidden}
.sb.col{width:var(--sbc)}
.sb-top{padding:13px 9px;border-bottom:1px solid var(--b1);display:flex;align-items:center;gap:8px;min-height:54px;flex-shrink:0}
.sb-ico{width:32px;min-width:32px;height:32px;border-radius:9px;background:linear-gradient(135deg,var(--ac),var(--ac2));display:flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer;flex-shrink:0;transition:transform .15s;user-select:none}
.sb-ico:hover{transform:scale(1.08)}
.sb-txt{overflow:hidden;white-space:nowrap;transition:opacity .15s}
.sb.col .sb-txt{opacity:0;width:0;pointer-events:none}
.sb-name{font-size:14px;font-weight:900;letter-spacing:-.3px}
.sb-name em{font-style:normal;color:var(--ac)}
.sb-tag{font-size:9px;color:var(--mu)}

/* GLOBAL SEARCH */
.gsw{padding:8px 9px;border-bottom:1px solid var(--b1);flex-shrink:0;position:relative}
.gsi{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.04);border:1px solid var(--b1);border-radius:7px;padding:6px 9px;transition:border-color .15s}
.gsi:focus-within{border-color:rgba(56,189,248,.4);background:rgba(56,189,248,.03)}
.gs-icon{font-size:11px;color:var(--mu);flex-shrink:0}
.gs-in{background:none;border:none;outline:none;color:var(--tx);font-size:12px;width:100%;min-width:0}
.gs-in::placeholder{color:var(--mu)}
.sb.col .gs-in{display:none}
.gsdrop{position:fixed;background:var(--s2);border:1px solid var(--b2);border-radius:10px;z-index:200;width:272px;max-height:360px;overflow-y:auto;box-shadow:0 16px 40px rgba(0,0,0,.6)}
.gsd-hd{padding:8px 12px 4px;font-size:9px;font-weight:700;color:var(--mu);text-transform:uppercase;letter-spacing:.8px}
.gsd-row{padding:9px 12px;cursor:pointer;border-bottom:1px solid var(--b1);transition:background .12s}
.gsd-row:hover{background:rgba(56,189,248,.06)}.gsd-row:last-child{border-bottom:none}
.gsd-id{font-family:'JetBrains Mono',monospace;font-size:10.5px;color:var(--ac);font-weight:600}
.gsd-info{font-size:11.5px;color:var(--tx);margin-top:1px}
.gsd-rfid{font-size:9.5px;color:var(--ac2);margin-top:1px;font-family:'JetBrains Mono',monospace}
.gsd-empty{padding:16px;text-align:center;color:var(--mu);font-size:12px}

/* NAV */
.sb-nav{flex:1;padding:9px 7px;overflow-y:auto;overflow-x:hidden}
.sb-sec{font-size:9px;font-weight:700;color:#1E293B;text-transform:uppercase;letter-spacing:1.2px;padding:0 8px;margin:9px 0 3px;white-space:nowrap;overflow:hidden;transition:opacity .15s}
.sb.col .sb-sec{opacity:0}
.nb{display:flex;align-items:center;gap:8px;width:100%;padding:7px 8px;border-radius:7px;border:none;background:transparent;color:var(--mu2);font-size:12.5px;font-weight:500;cursor:pointer;transition:all .13s;text-align:left;white-space:nowrap;min-height:36px}
.nb:hover{background:rgba(255,255,255,.04);color:var(--tx)}
.nb.on{background:rgba(56,189,248,.1);color:var(--ac)}
.nb.on .ni{background:rgba(56,189,248,.18)}
.ni{width:26px;min-width:26px;height:26px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;background:rgba(255,255,255,.04);flex-shrink:0}
.nb-lbl{overflow:hidden;white-space:nowrap;flex:1;transition:opacity .15s}
.sb.col .nb-lbl{opacity:0;width:0}
.nbd{background:#EF4444;color:#fff;font-size:9px;font-weight:700;padding:1px 5px;border-radius:20px;line-height:1.5;flex-shrink:0}
.nbd.am{background:var(--am);color:#000}
.sb.col .nbd{display:none}

.sb-ft{padding:9px;border-top:1px solid var(--b1);flex-shrink:0}
.urow{display:flex;align-items:center;gap:7px;overflow:hidden}
.uav{width:28px;min-width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--ac),var(--ac2));display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;flex-shrink:0}
.u-inf{overflow:hidden;white-space:nowrap;flex:1;transition:opacity .15s}
.sb.col .u-inf{opacity:0;width:0}
.uname{font-size:11.5px;font-weight:600}.urole{font-size:9.5px;color:var(--mu)}
.uout{background:rgba(239,68,68,.1);border:none;color:#F87171;width:24px;min-width:24px;height:24px;border-radius:6px;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;transition:background .13s}
.uout:hover{background:rgba(239,68,68,.2)}

/* MAIN */
.main{flex:1;padding:22px 26px;min-height:100vh;transition:margin-left .2s ease}
.main.exp{margin-left:var(--sbw)}.main.col{margin-left:var(--sbc)}

/* PAGE HEADER */
.ph{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:17px;gap:10px;flex-wrap:wrap}
.pt{font-size:19px;font-weight:900;letter-spacing:-.4px}
.ps{font-size:11.5px;color:var(--mu2);margin-top:2px}
.ph-act{display:flex;gap:6px;flex-wrap:wrap;align-items:center}

/* STATS */
.sg{display:grid;gap:10px;margin-bottom:14px}
.sg4{grid-template-columns:repeat(4,1fr)}.sg3{grid-template-columns:repeat(3,1fr)}.sg2{grid-template-columns:repeat(2,1fr)}
.sc{background:var(--s1);border:1px solid var(--b1);border-radius:10px;padding:13px 15px;position:relative;overflow:hidden;transition:border-color .18s}
.sc:hover{border-color:var(--b2)}
.sc::after{content:'';position:absolute;top:0;left:0;right:0;height:2px;border-radius:2px 2px 0 0}
.sc.bl::after{background:linear-gradient(90deg,var(--ac),transparent)}.sc.gr::after{background:linear-gradient(90deg,var(--gr),transparent)}
.sc.am::after{background:linear-gradient(90deg,var(--am),transparent)}.sc.rd::after{background:linear-gradient(90deg,var(--rd),transparent)}
.sc.gy::after{background:linear-gradient(90deg,var(--gy),transparent)}.sc.in::after{background:linear-gradient(90deg,var(--ac2),transparent)}
.sl{font-size:9.5px;font-weight:700;color:var(--mu2);text-transform:uppercase;letter-spacing:.7px;margin-bottom:5px}
.sv{font-size:26px;font-weight:900;letter-spacing:-1px;line-height:1}
.sv.bl{color:var(--ac)}.sv.gr{color:var(--gr)}.sv.am{color:var(--am)}.sv.rd{color:var(--rd)}.sv.gy{color:var(--gy)}.sv.in{color:var(--ac2)}
.sh{font-size:10px;color:#1E293B;margin-top:3px}

/* CARD */
.card{background:var(--s1);border:1px solid var(--b1);border-radius:10px;padding:15px;margin-bottom:13px}
.chd{display:flex;align-items:center;justify-content:space-between;margin-bottom:13px;gap:8px;flex-wrap:wrap}
.ct{font-size:13px;font-weight:700}.cs{font-size:10.5px;color:var(--mu2);margin-top:1px}

/* TABLE */
.tw{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:11.5px}
th{text-align:left;font-size:9.5px;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:.7px;padding:7px 10px;border-bottom:1px solid var(--b1);white-space:nowrap}
td{padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.025);color:#CBD5E1;vertical-align:middle}
tr:last-child td{border-bottom:none}tr:hover td{background:rgba(255,255,255,.015)}

/* BADGE */
.badge{display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:20px;font-size:10px;font-weight:600;white-space:nowrap}

/* BUTTONS */
.btn{display:inline-flex;align-items:center;gap:5px;padding:7px 12px;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;border:none;transition:all .13s;white-space:nowrap}
.bp{background:linear-gradient(135deg,var(--ac),var(--ac2));color:#fff}
.bp:hover{opacity:.9;transform:translateY(-1px);box-shadow:0 4px 14px rgba(56,189,248,.25)}
.bg2{background:rgba(52,211,153,.12);color:var(--gr);border:1px solid rgba(52,211,153,.25)}.bg2:hover{background:rgba(52,211,153,.2)}
.br{background:rgba(248,113,113,.12);color:var(--rd);border:1px solid rgba(248,113,113,.25)}.br:hover{background:rgba(248,113,113,.2)}
.ba{background:rgba(251,191,36,.12);color:var(--am);border:1px solid rgba(251,191,36,.25)}.ba:hover{background:rgba(251,191,36,.2)}
.bgh{background:rgba(255,255,255,.04);color:var(--mu2);border:1px solid var(--b1)}.bgh:hover{background:rgba(255,255,255,.07);color:var(--tx)}
.bb{background:rgba(56,189,248,.12);color:var(--ac);border:1px solid rgba(56,189,248,.25)}.bb:hover{background:rgba(56,189,248,.2)}
.bpu{background:rgba(129,140,248,.12);color:var(--ac2);border:1px solid rgba(129,140,248,.25)}.bpu:hover{background:rgba(129,140,248,.2)}
.bwa{background:rgba(37,211,102,.15);color:#25D366;border:1px solid rgba(37,211,102,.3)}.bwa:hover{background:rgba(37,211,102,.25)}
.bgr{background:rgba(52,211,153,.15);color:var(--gr);border:1px solid rgba(52,211,153,.3)}.bgr:hover{background:rgba(52,211,153,.25)}
.brd{background:rgba(248,113,113,.12);color:var(--rd);border:1px solid rgba(248,113,113,.25)}.brd:hover{background:rgba(248,113,113,.2)}
.bsm{padding:4px 8px;font-size:11px}
.btn:disabled{opacity:.4;cursor:not-allowed;transform:none!important}

/* FILTERS */
.filt{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;align-items:center}
.chip{padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;border:1px solid var(--b1);background:rgba(255,255,255,.02);color:var(--mu2);transition:all .13s}
.chip:hover{border-color:var(--b2);color:var(--tx)}.chip.on{background:rgba(56,189,248,.1);border-color:rgba(56,189,248,.3);color:var(--ac)}
.chip.wh1{}.chip.wh2{}
.srch{flex:1;min-width:130px;background:rgba(255,255,255,.04);border:1px solid var(--b1);border-radius:7px;padding:6px 10px;color:var(--tx);font-size:12px;outline:none;transition:border-color .13s}
.srch:focus{border-color:rgba(56,189,248,.4)}.srch::placeholder{color:var(--mu)}

/* FORM */
.fg2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.fg3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
.fi{display:flex;flex-direction:column;gap:4px}.fi.full{grid-column:1/-1}
.fl{font-size:9.5px;font-weight:700;color:var(--mu2);text-transform:uppercase;letter-spacing:.7px}
.fn,.fs{background:rgba(255,255,255,.04);border:1px solid var(--b1);border-radius:7px;padding:8px 10px;color:var(--tx);font-size:12.5px;outline:none;transition:all .13s;width:100%}
.fn:focus,.fs:focus{border-color:rgba(56,189,248,.5);background:rgba(56,189,248,.04)}
.fs option{background:#111827}textarea.fn{resize:vertical;min-height:64px}

/* MODAL */
.ov{position:fixed;inset:0;background:rgba(0,0,0,.82);backdrop-filter:blur(6px);z-index:100;display:flex;align-items:center;justify-content:center;padding:14px}
.mo{background:var(--s2);border:1px solid var(--b2);border-radius:13px;padding:22px;width:100%;max-width:510px;max-height:93vh;overflow-y:auto}
.mo.lg{max-width:700px}.mo.xl{max-width:920px}.mo.inv{max-width:600px}
.mti{font-size:15px;font-weight:900;margin-bottom:3px;letter-spacing:-.3px}
.msu{font-size:11px;color:var(--mu2);margin-bottom:15px}
.mac{display:flex;gap:6px;justify-content:flex-end;margin-top:15px;flex-wrap:wrap}

/* MISC */
.uid{font-family:'JetBrains Mono',monospace;font-size:10.5px;color:var(--ac);font-weight:600}
.rtag{font-family:'JetBrains Mono',monospace;font-size:9.5px;color:var(--ac2);background:rgba(129,140,248,.08);padding:2px 5px;border-radius:4px;border:1px solid rgba(129,140,248,.15);display:inline-block;margin:1px 0}
.lot{font-family:'JetBrains Mono',monospace;font-size:9.5px;color:var(--am);background:rgba(251,191,36,.08);padding:2px 5px;border-radius:4px;border:1px solid rgba(251,191,36,.15)}
.invno{font-family:'JetBrains Mono',monospace;font-size:10.5px;color:var(--ac2);font-weight:600}
.price{font-weight:700;color:var(--gr)}
.whlabel{font-size:9.5px;font-weight:700;padding:2px 6px;border-radius:4px;border:1px solid rgba(56,189,248,.2);color:var(--ac);background:rgba(56,189,248,.08)}
.al{border-radius:7px;padding:9px 12px;font-size:11.5px;display:flex;align-items:flex-start;gap:7px;margin-bottom:10px}
.al-w{background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.2);color:#FDE68A}
.al-r{background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.2);color:#FECACA}
.al-g{background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.2);color:#A7F3D0}
.al-b{background:rgba(56,189,248,.08);border:1px solid rgba(56,189,248,.2);color:#BAE6FD}
.empty{text-align:center;padding:30px;color:#1E293B}.ei{font-size:26px;margin-bottom:7px}.et{font-size:12.5px}

/* PIPELINE */
.pipe{display:flex;border-radius:9px;overflow:hidden;border:1px solid var(--b1);margin-bottom:14px}
.ps2{flex:1;padding:10px;text-align:center;border-right:1px solid var(--b1)}.ps2:last-child{border-right:none}
.pv{font-size:20px;font-weight:900;letter-spacing:-1px}.plbl{font-size:9.5px;color:var(--mu);margin-top:2px}

/* DISPATCH */
.dtcard{background:var(--s2);border:1px solid var(--b1);border-radius:9px;padding:13px;margin-bottom:9px;transition:border-color .15s}
.dtcard:hover{border-color:var(--b2)}
.stage-pill{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;font-size:10.5px;font-weight:700}

/* RFID DETAIL */
.rdet-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.rdet-cell{background:var(--bg);border-radius:7px;padding:8px 10px}
.rdet-lbl{font-size:9px;font-weight:700;color:var(--mu);text-transform:uppercase;letter-spacing:.7px;margin-bottom:3px}
.rdet-val{font-size:12px}

/* MASTER TABS */
.mtabs{display:flex;gap:3px;margin-bottom:14px;background:var(--s1);padding:4px;border-radius:8px;border:1px solid var(--b1);flex-wrap:wrap}
.mtab{flex:1;padding:6px 4px;border-radius:6px;border:none;background:transparent;color:var(--mu2);font-size:11px;font-weight:600;cursor:pointer;transition:all .13s;text-align:center;white-space:nowrap}
.mtab:hover{color:var(--tx);background:rgba(255,255,255,.04)}.mtab.on{background:linear-gradient(135deg,var(--ac),var(--ac2));color:#fff}

/* MODULE PERMS */
.mod-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.mod-item{display:flex;align-items:center;gap:7px;padding:7px 10px;border-radius:7px;border:1px solid var(--b1);cursor:pointer;transition:all .13s;user-select:none}
.mod-item:hover{border-color:var(--b2);background:rgba(255,255,255,.02)}.mod-item.chk{border-color:rgba(56,189,248,.4);background:rgba(56,189,248,.07)}
.mod-chk{width:14px;height:14px;border-radius:3px;border:2px solid var(--b2);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .13s}
.mod-item.chk .mod-chk{background:var(--ac);border-color:var(--ac)}

/* VERIFY MODULE */
.scan-input-wrap{background:var(--bg);border:2px dashed rgba(56,189,248,.25);border-radius:10px;padding:20px;margin-bottom:14px;text-align:center}
.scan-input{background:rgba(56,189,248,.06);border:1.5px solid rgba(56,189,248,.3);border-radius:8px;padding:10px 14px;color:var(--ac);font-size:16px;font-family:'JetBrains Mono',monospace;font-weight:600;outline:none;text-align:center;width:100%;max-width:320px;letter-spacing:2px;transition:all .15s}
.scan-input:focus{border-color:var(--ac);background:rgba(56,189,248,.1);box-shadow:0 0 0 3px rgba(56,189,248,.12)}
.scan-input::placeholder{color:rgba(56,189,248,.3);font-size:12px;letter-spacing:1px}

/* VERIFY UNIT ROWS */
.vu-row{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;margin-bottom:5px;border:1px solid var(--b1);background:rgba(255,255,255,.015);transition:all .2s}
.vu-row.verified{background:rgba(52,211,153,.07);border-color:rgba(52,211,153,.3)}
.vu-row.missing{background:rgba(248,113,113,.05);border-color:rgba(248,113,113,.15)}
.vu-check{width:18px;height:18px;border-radius:5px;border:2px solid var(--b1);display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;transition:all .15s}
.vu-check.done{background:var(--gr);border-color:var(--gr)}
.vu-check.half{background:var(--am);border-color:var(--am)}
.tag-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.tag-dot.scanned{background:var(--gr)}.tag-dot.missing{background:rgba(255,255,255,.15)}

/* DASHBOARD TABS */
.dash-tabs{display:flex;gap:4px;margin-bottom:16px;flex-wrap:wrap}
.dash-tab{padding:7px 14px;border-radius:8px;border:1px solid var(--b1);background:rgba(255,255,255,.02);color:var(--mu2);font-size:12px;font-weight:600;cursor:pointer;transition:all .13s}
.dash-tab:hover{border-color:var(--b2);color:var(--tx)}.dash-tab.on{background:rgba(56,189,248,.1);border-color:rgba(56,189,248,.3);color:var(--ac)}

/* WH CARD */
.wh-card{background:var(--s2);border:1px solid var(--b1);border-radius:10px;overflow:hidden;margin-bottom:14px}
.wh-card-hd{padding:12px 15px;border-bottom:1px solid var(--b1);display:flex;align-items:center;justify-content:space-between;background:rgba(56,189,248,.04)}
.wh-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:0}
.wh-stat{padding:12px 14px;border-right:1px solid var(--b1);text-align:center}.wh-stat:last-child{border-right:none}
.wh-stat-v{font-size:22px;font-weight:900;letter-spacing:-1px}
.wh-stat-l{font-size:9.5px;color:var(--mu);margin-top:2px}

/* BRAND TABLE */
.brand-section{margin-bottom:18px}
.brand-hd{display:flex;align-items:center;gap:9px;padding:10px 14px;background:rgba(255,255,255,.02);border-radius:8px 8px 0 0;border:1px solid var(--b1);border-bottom:none}
.brand-table-wrap{border:1px solid var(--b1);border-radius:0 0 8px 8px;overflow:hidden}
.ton-badge{background:rgba(56,189,248,.1);color:var(--ac);border:1px solid rgba(56,189,248,.2);border-radius:4px;padding:1px 6px;font-size:10px;font-weight:700}

/* INVOICE */
.inv-sheet{background:#fff;color:#111;padding:28px;border-radius:8px}
.inv-hd{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid #E5E7EB}
.inv-co{font-size:18px;font-weight:900;color:#1E3A5F}.inv-cotag{font-size:10px;color:#6B7280;margin-top:2px}
.inv-no{font-size:15px;font-weight:800;color:#1E3A5F;text-align:right}.inv-dt{font-size:11px;color:#6B7280;margin-top:3px;text-align:right}
.inv-parties{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px}
.inv-plbl{font-size:9px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:.7px;margin-bottom:5px}
.inv-pname{font-size:13px;font-weight:700;color:#111;margin-bottom:2px}.inv-pdet{font-size:11px;color:#4B5563;line-height:1.6}
.inv-tbl{width:100%;border-collapse:collapse;margin-bottom:16px}
.inv-tbl th{background:#F3F4F6;padding:8px 11px;text-align:left;font-size:10px;font-weight:700;color:#374151;text-transform:uppercase}
.inv-tbl td{padding:9px 11px;border-bottom:1px solid #E5E7EB;font-size:11.5px;color:#374151}
.inv-tot{text-align:right;margin-bottom:16px}
.inv-tot-row{display:flex;justify-content:flex-end;gap:36px;font-size:12px;color:#6B7280;margin-bottom:3px}
.inv-tot-final{display:flex;justify-content:flex-end;gap:36px;font-size:15px;font-weight:800;color:#1E3A5F;border-top:2px solid #E5E7EB;padding-top:9px;margin-top:7px}
.inv-footer{text-align:center;font-size:10px;color:#9CA3AF;border-top:1px solid #E5E7EB;padding-top:12px;margin-top:6px}

/* LOGIN */
.lw{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);position:relative;overflow:hidden}
.lw::before{content:'';position:absolute;width:600px;height:600px;border-radius:50%;background:radial-gradient(circle,rgba(56,189,248,.04) 0%,transparent 70%);top:-200px;right:-200px}
.lcard{background:var(--s1);border:1px solid var(--b2);border-radius:15px;padding:34px;width:370px;position:relative;z-index:1;box-shadow:0 40px 80px rgba(0,0,0,.5)}
.lbrand{display:flex;align-items:center;gap:9px;margin-bottom:22px}
.lico{width:38px;height:38px;background:linear-gradient(135deg,var(--ac),var(--ac2));border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:17px}
.laname{font-size:16px;font-weight:900}.laname em{font-style:normal;color:var(--ac)}.latag{font-size:9.5px;color:var(--mu)}
.lh{font-size:20px;font-weight:900;letter-spacing:-.4px;margin-bottom:3px}.lp{font-size:11.5px;color:var(--mu2);margin-bottom:19px}
.ll{font-size:9.5px;font-weight:700;color:var(--mu2);text-transform:uppercase;letter-spacing:.7px;display:block;margin-bottom:4px}
.li{width:100%;background:rgba(255,255,255,.04);border:1px solid var(--b1);border-radius:7px;padding:9px 11px;color:var(--tx);font-size:13px;outline:none;transition:all .18s;margin-bottom:11px}
.li:focus{border-color:var(--ac);background:rgba(56,189,248,.04)}
.lbtn{width:100%;background:linear-gradient(135deg,var(--ac),var(--ac2));border:none;border-radius:7px;padding:10px;color:#fff;font-size:13.5px;font-weight:700;cursor:pointer;transition:all .18s}
.lbtn:hover{opacity:.92;transform:translateY(-1px)}
.lerr{background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.25);border-radius:7px;padding:8px 11px;color:#FECACA;font-size:11.5px;margin-bottom:11px}
.lhint{margin-top:13px;padding:11px;background:rgba(255,255,255,.02);border-radius:7px;border:1px solid var(--b1)}
.lhint p{font-size:10.5px;color:var(--mu);margin-bottom:2px}
.lhint code{color:var(--ac);font-family:'JetBrains Mono',monospace;font-size:10px}

/* TOAST */
.toast{position:fixed;bottom:14px;right:14px;background:var(--s2);border:1px solid var(--b2);border-radius:8px;padding:9px 13px;display:flex;align-items:center;gap:7px;z-index:400;box-shadow:0 8px 28px rgba(0,0,0,.5);font-size:12px;animation:tin .18s ease;max-width:290px}
@keyframes tin{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}
@media(max-width:960px){.sg4,.wh-stats{grid-template-columns:repeat(2,1fr)}}
/* PAYMENT PENDING BOX */
.pend-pay-box{background:rgba(251,191,36,.07);border:1.5px solid rgba(251,191,36,.3);border-radius:10px;padding:14px 16px;cursor:pointer;transition:all .15s;margin-bottom:14px}
.pend-pay-box:hover{background:rgba(251,191,36,.12);border-color:rgba(251,191,36,.5)}
.pend-pay-details{background:var(--s2);border:1px solid var(--b1);border-radius:9px;overflow:hidden;margin-bottom:14px}

/* REPORT STYLES */
.rpt-tabs{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:16px}
.rpt-tab{padding:7px 14px;border-radius:7px;border:1px solid var(--b1);background:rgba(255,255,255,.02);color:var(--mu2);font-size:12px;font-weight:600;cursor:pointer;transition:all .13s}
.rpt-tab:hover{border-color:var(--b2);color:var(--tx)}.rpt-tab.on{background:rgba(56,189,248,.1);border-color:rgba(56,189,248,.3);color:var(--ac)}
.rpt-kpi{background:var(--s2);border:1px solid var(--b1);border-radius:9px;padding:14px 16px;text-align:center}
.rpt-kpi-v{font-size:24px;font-weight:900;letter-spacing:-1px;line-height:1;margin-bottom:3px}
.rpt-kpi-l{font-size:10px;color:var(--mu2);text-transform:uppercase;letter-spacing:.7px}
.rpt-bar-wrap{display:flex;align-items:center;gap:10px;margin-bottom:7px}
.rpt-bar-bg{flex:1;background:rgba(255,255,255,.04);border-radius:20px;height:8px;overflow:hidden}
.rpt-bar-fill{height:100%;border-radius:20px;transition:width .4s}
.date-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:16px}
.date-row label{font-size:10px;font-weight:700;color:var(--mu2);text-transform:uppercase;letter-spacing:.7px}

/* QC DONE IN EXCEL */
.qc-yes{color:var(--gr);font-weight:700;font-size:11px}
.qc-no{color:var(--am);font-size:11px}

@media print{.sb,.ph-act,.btn,.filt,.chd button{display:none!important}.main{margin:0!important;padding:0!important}}
`;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function Toast({ message, type="success", onClose }) {
  useEffect(()=>{ const t=setTimeout(onClose,3200); return()=>clearTimeout(t); },[]);
  return <div className="toast">{ {success:"✅",error:"❌",info:"📡",warn:"⚠️"}[type]||"✅" } {message}</div>;
}
function Bdg({ status }) {
  const s=SC[status]||SC.available;
  return <span className="badge" style={{background:s.bg,color:s.color}}>{s.icon} {s.label}</span>;
}
function StageBadge({ stage }) {
  const s=DISPATCH_STAGES.find(d=>d.id===stage)||DISPATCH_STAGES[0];
  return <span className="stage-pill" style={{background:`${s.color}18`,color:s.color,border:`1px solid ${s.color}44`}}>{s.icon} {s.label}</span>;
}
function WHLabel({ whId, warehouses }) {
  const wh=warehouses.find(w=>w.id===whId);
  return <span className="whlabel">🏭 {wh?.name||whId}</span>;
}

// ─── GLOBAL SEARCH ────────────────────────────────────────────────────────────
function GlobalSearch({ units, warehouses, onSelect, collapsed }) {
  const [q,setQ]=useState(""); const [open,setOpen]=useState(false);
  const ref=useRef(); const dropRef=useRef();
  useEffect(()=>{
    const h=e=>{ if(ref.current&&!ref.current.contains(e.target)&&dropRef.current&&!dropRef.current.contains(e.target))setOpen(false); };
    document.addEventListener("mousedown",h); return()=>document.removeEventListener("mousedown",h);
  },[]);
  const results=q.trim().length<2?[]:units.filter(u=>{
    const ql=q.toLowerCase();
    return (u.rfidIn||"").toLowerCase().includes(ql)||(u.rfidOut||"").toLowerCase().includes(ql)||u.id.toLowerCase().includes(ql)||u.brand.toLowerCase().includes(ql)||(u.lot||"").toLowerCase().includes(ql)||(u.soldTo||"").toLowerCase().includes(ql);
  }).slice(0,8);
  const rect=ref.current?.getBoundingClientRect();
  return (
    <div className="gsw" ref={ref}>
      <div className="gsi">
        <span className="gs-icon">🔍</span>
        {!collapsed&&<input className="gs-in" placeholder="Search RFID, ID, brand, lot..." value={q} onChange={e=>{setQ(e.target.value);setOpen(true);}} onFocus={()=>setOpen(true)}/>}
      </div>
      {open&&q.trim().length>=2&&!collapsed&&(
        <div className="gsdrop" ref={dropRef} style={{top:rect?rect.bottom+3:58,left:rect?rect.left:0}}>
          <div className="gsd-hd">{results.length} result{results.length!==1?"s":""}</div>
          {results.length===0
            ?<div className="gsd-empty">No units found for "{q}"</div>
            :results.map(u=>{
              const wh=warehouses.find(w=>w.id===u.warehouse);
              return <div key={u.id} className="gsd-row" onClick={()=>{onSelect(u);setOpen(false);setQ("");}}>
                <div className="gsd-id">{u.id} <span style={{color:SC[u.status]?.color,fontSize:9.5}}>{SC[u.status]?.icon} {SC[u.status]?.label}</span></div>
                <div className="gsd-info">{u.brand} {u.tonnage} · <span style={{color:"var(--am)",fontSize:9}}>{u.lot}</span> · <span style={{color:"var(--ac)",fontSize:9}}>{wh?.name||"—"}</span></div>
                <div className="gsd-rfid">IN: {u.rfidIn||"—"} · OUT: {u.rfidOut||"—"}</div>
              </div>;
            })
          }
        </div>
      )}
    </div>
  );
}

// ─── RFID DETAIL MODAL ────────────────────────────────────────────────────────
function RFIDDetail({ unit, customers, dispatches, warehouses, onClose }) {
  if(!unit)return null;
  const customer=customers.find(c=>c.unitIds?.includes(unit.id));
  const dispatch=dispatches.find(d=>d.unitId===unit.id);
  const wh=warehouses.find(w=>w.id===unit.warehouse);
  const fields=[
    ["Unit ID",<span className="uid">{unit.id}</span>],["Warehouse",<WHLabel whId={unit.warehouse} warehouses={warehouses}/>],
    ["Lot",<span className="lot">{unit.lot||"—"}</span>],["Brand",unit.brand],["Tonnage",unit.tonnage],["Model",unit.model||"—"],
    ["Supplier",unit.supplier||"—"],["Received",unit.receivedDate],["Sale Price",<span className="price">{fmt(unit.salePrice)}</span>],
    ["RFID Indoor",<span className="rtag">{unit.rfidIn||"Unassigned"}</span>],["RFID Outdoor",<span className="rtag">{unit.rfidOut||"Unassigned"}</span>],
    ["Status",<Bdg status={unit.status}/>],["QC Attempts",unit.qcAttempts],
    unit.repairNote&&["Repair Note",<span style={{color:"#FECACA"}}>{unit.repairNote}</span>],
    unit.soldTo&&["Sold To",unit.soldTo],unit.invoiceNo&&["Invoice",<span className="invno">{unit.invoiceNo}</span>],
    unit.paymentReceived!==undefined&&unit.status==="sold"&&["Payment",unit.paymentReceived?<span style={{color:"var(--gr)"}}>✅ Received</span>:<span style={{color:"var(--am)"}}>⏳ Pending</span>],
    customer&&["Customer",customer.name],dispatch&&["Dispatch",<StageBadge stage={dispatch.stage}/>],
  ].filter(Boolean);
  return (
    <div className="ov" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="mo lg">
        <div style={{display:"flex",alignItems:"center",gap:11,marginBottom:4}}>
          <div style={{width:40,height:40,borderRadius:9,background:"linear-gradient(135deg,rgba(56,189,248,.15),rgba(129,140,248,.15))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>❄️</div>
          <div style={{flex:1}}><div className="mti">{unit.brand} {unit.tonnage} · <span className="uid">{unit.id}</span></div><span className="lot">{unit.lot}</span> &nbsp; <WHLabel whId={unit.warehouse} warehouses={warehouses}/></div>
          <Bdg status={unit.status}/>
        </div>
        <div style={{height:1,background:"var(--b1)",margin:"11px 0"}}/>
        <div className="rdet-grid">{fields.map(([l,v],i)=><div key={i} className="rdet-cell"><div className="rdet-lbl">{l}</div><div className="rdet-val">{v}</div></div>)}</div>
        <div className="mac"><button className="btn bgh" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({ users, onLogin }) {
  const [u,setU]=useState(""); const [p,setP]=useState(""); const [err,setErr]=useState("");
  const go=()=>{ const x=users.find(v=>v.username===u&&v.password===p); if(x)onLogin(x); else setErr("Invalid credentials."); };
  return <div className="lw"><div className="lcard">
    <div className="lbrand"><div className="lico">❄️</div><div><div className="laname">Nilkhant <em>Enterprise</em></div><div className="latag">AC Inventory Management v6</div></div></div>
    <div className="lh">Welcome back</div><div className="lp">Sign in to your workspace</div>
    {err&&<div className="lerr">{err}</div>}
    <label className="ll">Username</label><input className="li" value={u} onChange={e=>{setU(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="username" autoFocus/>
    <label className="ll">Password</label><input className="li" type="password" value={p} onChange={e=>{setP(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="password"/>
    <button className="lbtn" onClick={go}>Sign In →</button>
    <div className="lhint"><p>Admin: <code>admin / admin123</code></p><p>Tech: <code>ravi / ravi123</code> · Sales: <code>amit / amit123</code></p></div>
  </div></div>;
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

// ─── EXCEL EXPORT ────────────────────────────────────────────────────────────
function exportAllToExcel(units, customers, dispatches, warehouses) {
  // Build CSV content for each sheet then trigger download as .xlsx via SheetJS CDN
  function loadAndExport() {
    if (!window.XLSX) {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
      s.onload = doExport;
      s.onerror = () => alert("Could not load Excel library. Check internet connection.");
      document.head.appendChild(s);
    } else { doExport(); }
  }

  function doExport() {
    const wb = window.XLSX.utils.book_new();
    const dt = new Date().toISOString().slice(0,10);
    const whName = id => warehouses.find(w=>w.id===id)?.name||id||"—";

    // Sheet 1 — All Stock
    const allRows = units.map(u=>({
      "Unit ID":u.id, "Status":u.status?.replace("_"," "),
      "Warehouse":whName(u.warehouse), "Lot":u.lot||"",
      "Brand":u.brand, "Tonnage":u.tonnage, "Model":u.model||"",
      "Supplier":u.supplier||"", "Received Date":u.receivedDate||"",
      "Sale Price":u.salePrice||0, "RFID Indoor":u.rfidIn||"", "RFID Outdoor":u.rfidOut||"",
      "QC Attempts":u.qcAttempts||0, "Tested By":u.testedBy||"", "Tested Date":u.testedDate||"",
      "Repair Note":u.repairNote||"", "Invoice No":u.invoiceNo||"",
      "Sold To":u.soldTo||"", "Sold Date":u.soldDate||"",
      "Customer Phone":u.customerPhone||"", "Sold By":u.soldBy||"",
      "Payment Received":u.paymentReceived?"Yes":"No",
      "Booking Amount":u.bookingAmount||0, "Total Amount":u.totalAmount||0,
      "Remaining Amount":u.remainingAmount||0,
    }));
    const ws1 = window.XLSX.utils.json_to_sheet(allRows.length?allRows:[{"Message":"No units yet"}]);
    ws1["!cols"] = [{wch:10},{wch:14},{wch:14},{wch:14},{wch:10},{wch:10},{wch:14},{wch:16},{wch:14},{wch:12},{wch:14},{wch:15},{wch:12},{wch:14},{wch:12},{wch:20},{wch:12},{wch:18},{wch:12},{wch:15},{wch:12},{wch:16},{wch:14},{wch:14},{wch:16}];
    window.XLSX.utils.book_append_sheet(wb, ws1, "All Stock");

    // Sheet 2 — Available
    const avail = units.filter(u=>u.status==="available").map(u=>({
      "Unit ID":u.id, "Warehouse":whName(u.warehouse), "Lot":u.lot||"",
      "Brand":u.brand, "Tonnage":u.tonnage, "Model":u.model||"",
      "Sale Price":u.salePrice||0, "RFID Indoor":u.rfidIn||"", "RFID Outdoor":u.rfidOut||"",
      "Received Date":u.receivedDate||"", "Tested By":u.testedBy||"",
    }));
    window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(avail.length?avail:[{"Message":"No available units"}]), "Available Stock");

    // Sheet 3 — Sold
    const sold = units.filter(u=>u.status==="sold").map(u=>({
      "Unit ID":u.id, "Invoice No":u.invoiceNo||"", "Lot":u.lot||"",
      "Brand":u.brand, "Tonnage":u.tonnage, "Warehouse":whName(u.warehouse),
      "Total Amount":u.totalAmount||u.salePrice||0, "Booking":u.bookingAmount||0,
      "Remaining":u.remainingAmount||0, "Payment":u.paymentReceived?"Received":"Pending",
      "Customer":u.soldTo||"", "Phone":u.customerPhone||"",
      "Sold Date":u.soldDate||"", "Sold By":u.soldBy||"",
    }));
    window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(sold.length?sold:[{"Message":"No sold units"}]), "Sold Units");

    // Sheet 4 — Pending QC
    const qc = units.filter(u=>u.status==="pending_qc").map(u=>({
      "Unit ID":u.id, "Warehouse":whName(u.warehouse), "Lot":u.lot||"",
      "Brand":u.brand, "Tonnage":u.tonnage, "Model":u.model||"",
      "Sale Price":u.salePrice||0, "Received Date":u.receivedDate||"",
      "RFID Indoor":u.rfidIn||"", "RFID Outdoor":u.rfidOut||"",
    }));
    window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(qc.length?qc:[{"Message":"No units pending QC"}]), "Pending QC");

    // Sheet 5 — Under Repair
    const rep = units.filter(u=>u.status==="under_repair").map(u=>({
      "Unit ID":u.id, "Warehouse":whName(u.warehouse), "Lot":u.lot||"",
      "Brand":u.brand, "Tonnage":u.tonnage, "Repair Note":u.repairNote||"",
      "Tested By":u.testedBy||"", "Tested Date":u.testedDate||"",
    }));
    window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(rep.length?rep:[{"Message":"No units under repair"}]), "Under Repair");

    // Sheet 6 — Customers
    const custs = customers.map(c=>({
      "Name":c.name, "Phone":c.phone||"", "Alt Phone":c.altPhone||"",
      "Email":c.email||"", "Address":c.address||"", "City":c.city||"",
      "Pincode":c.pincode||"", "GST":c.gst||"",
      "Units Purchased":(c.unitIds||[]).join(", "), "Joined":c.createdDate||"",
    }));
    window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(custs.length?custs:[{"Message":"No customers yet"}]), "Customers");

    // Sheet 7 — Dispatches
    const disps = dispatches.map(d=>({
      "Unit ID":d.unitId||"", "Invoice":d.invoiceNo||"",
      "Stage":d.stage||"", "Partner":d.deliveryPartner||"",
      "Tracking":d.trackingNo||"", "Booked":d.bookedDate||"",
      "Delivered":d.deliveredDate||"", "Payment Date":d.paymentReceivedDate||"",
      "Notes":d.notes||"",
    }));
    window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(disps.length?disps:[{"Message":"No dispatches yet"}]), "Dispatches");

    window.XLSX.writeFile(wb, `Nilkhant Enterprise_Backup_${dt}.xlsx`);
  }
  loadAndExport();
}

// ─── EXCEL IMPORT (bulk upload) ───────────────────────────────────────────────
function downloadSampleExcel(lots, brands, tonnages, warehouses) {
  function doDownload() {
    const wb = window.XLSX.utils.book_new();
    const sample = [
      {"Lot Number":"LOT-2025-001","Brand":"LG","Tonnage":"1.5 Ton","Model":"Dual Inverter","Supplier":"CoolTech Pvt Ltd","Received Date":"2025-01-15","Sale Price":"13500","RFID Indoor":"RFI-001-IN","RFID Outdoor":"RFI-001-OUT","Warehouse":warehouses[0]?.name||"Warehouse 1","QC Done":"No","Notes":""},
      {"Lot Number":"LOT-2025-001","Brand":"Daikin","Tonnage":"2 Ton","Model":"FTKF","Supplier":"CoolTech Pvt Ltd","Received Date":"2025-01-15","Sale Price":"22000","RFID Indoor":"RFI-002-IN","RFID Outdoor":"RFI-002-OUT","Warehouse":warehouses[0]?.name||"Warehouse 1","QC Done":"Yes","Notes":"Pre-tested"},
    ];
    const ws = window.XLSX.utils.json_to_sheet(sample);
    ws["!cols"] = [{wch:16},{wch:12},{wch:10},{wch:16},{wch:18},{wch:14},{wch:12},{wch:14},{wch:15},{wch:14},{wch:10},{wch:20}];
    // Add dropdown hints as a second sheet
    const hintsData = [
      {"Field":"Lot Number","Required":"YES","Notes":"Must match a lot created in Master → Lots"},
      {"Field":"Brand","Required":"YES","Notes":"Must match a brand in Master → Brands. e.g. "+brands.slice(0,3).map(b=>b.name).join(", ")},
      {"Field":"Tonnage","Required":"YES","Notes":"Must match Master → Tonnage. e.g. "+tonnages.slice(0,3).map(t=>t.value).join(", ")},
      {"Field":"Model","Required":"No","Notes":"Free text e.g. Dual Inverter"},
      {"Field":"Supplier","Required":"No","Notes":"Supplier company name"},
      {"Field":"Received Date","Required":"No","Notes":"Format: YYYY-MM-DD. Defaults to today"},
      {"Field":"Sale Price","Required":"YES","Notes":"Numbers only, no ₹ or commas. e.g. 13500"},
      {"Field":"RFID Indoor","Required":"No","Notes":"RFID tag ID for indoor unit. Can assign later"},
      {"Field":"RFID Outdoor","Required":"No","Notes":"RFID tag ID for outdoor unit. Can assign later"},
      {"Field":"Warehouse","Required":"No","Notes":"Warehouse name from Master. e.g. "+warehouses.map(w=>w.name).join(", ")},
      {"Field":"QC Done","Required":"No","Notes":"Yes = unit skips QC and goes directly to Available. No = goes to Pending QC (default)"},
      {"Field":"Notes","Required":"No","Notes":"Any remarks"},
    ];
    window.XLSX.utils.book_append_sheet(wb, ws, "Stock Import");
    window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(hintsData), "Instructions");
    window.XLSX.writeFile(wb, "Nilkhant_Stock_Import_Template.xlsx");
  }
  if(!window.XLSX){ const s=document.createElement("script"); s.src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"; s.onload=doDownload; document.head.appendChild(s); } else { doDownload(); }
}

function ExcelImportModal({ lots, brands, tonnages, warehouses, units, onBulkAdd, onClose }) {
  const [step, setStep] = useState(0);
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState({});
  const [editIdx, setEditIdx] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef();

  const lotNums   = lots.map(l=>l.number);
  const brandNams = brands.map(b=>b.name);
  const tonVals   = tonnages.map(t=>t.value);

  const FIELD_MAP = {
    "lot number":"lot","lot":"lot","brand":"brand","tonnage":"tonnage",
    "model name":"model","model":"model","supplier":"supplier",
    "received date":"receivedDate","date":"receivedDate",
    "expected sale price":"salePrice","sale price":"salePrice","price":"salePrice",
    "rfid indoor":"rfidIn","rfid in":"rfidIn",
    "rfid outdoor":"rfidOut","rfid out":"rfidOut",
    "warehouse":"warehouseName","notes":"notes","remark":"notes",
    "qc done":"qcDone","qc":"qcDone","quality check":"qcDone",
  };

  function parseFile(file) {
    const load = cb => { if(!window.XLSX){ const s=document.createElement("script"); s.src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"; s.onload=cb; document.head.appendChild(s); } else cb(); };
    load(()=>{
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const wb = window.XLSX.read(e.target.result, {type:"array", cellDates:true});
          const wsName = wb.SheetNames.find(n=>n.toLowerCase().includes("stock")||n.toLowerCase().includes("import"))||wb.SheetNames[0];
          const raw = window.XLSX.utils.sheet_to_json(wb.Sheets[wsName], {defval:"", raw:false});
          if (!raw.length) { alert("Sheet is empty. Download and use the template."); return; }

          const maxNum = units.reduce((mx,x)=>Math.max(mx,parseInt((x.id||"").replace("AC-",""))||0),0);
          const parsed = raw.filter(r=>Object.values(r).some(v=>String(v).trim())).map((r,i)=>{
            const row = {_idx:i};
            Object.keys(r).forEach(k=>{ const m=FIELD_MAP[k.toLowerCase().trim()]; if(m) row[m]=String(r[k]||"").trim(); });
            row.id = "AC-"+String(maxNum+i+1).padStart(3,"0");
            // Resolve warehouse name → id
            const whMatch = warehouses.find(w=>w.name.toLowerCase()===(row.warehouseName||"").toLowerCase());
            row.warehouse = whMatch?.id || warehouses[0]?.id || "";
            delete row.warehouseName;
            // QC Done handling
            const qcDoneVal = (row.qcDone||"").toLowerCase();
            row.qcDone = qcDoneVal==="yes"||qcDoneVal==="y"||qcDoneVal==="true"||qcDoneVal==="1";
            row.status = row.qcDone ? "available" : "pending_qc";
            row.qcAttempts = row.qcDone ? 1 : 0;
            row.testedBy = row.qcDone ? "Bulk Import" : "";
            row.testedDate = row.qcDone ? today() : "";
            if(!row.receivedDate||row.receivedDate==="") row.receivedDate = today();
            if(row.salePrice) row.salePrice = Number(String(row.salePrice).replace(/[^0-9.]/g,""))||0;
            return row;
          });

          const errs = {};
          parsed.forEach((r,i)=>{
            const e=[];
            if(!r.lot) e.push("Lot required");
            else if(lotNums.length>0&&!lotNums.includes(r.lot)) e.push(`Lot "${r.lot}" not in Master`);
            if(!r.brand) e.push("Brand required");
            else if(brandNams.length>0&&!brandNams.includes(r.brand)) e.push(`Brand "${r.brand}" not in Master`);
            if(!r.tonnage) e.push("Tonnage required");
            if(!r.salePrice||r.salePrice<=0) e.push("Sale price required");
            if(e.length) errs[i]=e;
          });
          setRows(parsed); setErrors(errs); setStep(1);
        } catch(ex){ alert("Could not read file. Please use the sample template."); }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  const onDrop = e => { e.preventDefault(); setDrag(false); const f=e.dataTransfer.files[0]; if(f)parseFile(f); };
  const errCount = Object.keys(errors).length;

  const saveEdit = () => {
    const r = {...editRow};
    r.status = r.qcDone ? "available" : "pending_qc";
    r.qcAttempts = r.qcDone ? 1 : 0;
    r.testedBy = r.qcDone ? "Bulk Import" : "";
    r.testedDate = r.qcDone ? today() : "";
    const e=[];
    if(!r.lot) e.push("Lot required");
    if(!r.brand) e.push("Brand required");
    if(!r.salePrice||r.salePrice<=0) e.push("Sale price required");
    setRows(p=>p.map((x,i)=>i===editIdx?r:x));
    if(e.length) setErrors(p=>({...p,[editIdx]:e}));
    else { setErrors(p=>{ const n={...p}; delete n[editIdx]; return n; }); }
    setEditIdx(null); setEditRow(null);
  };

  const doImport = () => { onBulkAdd(rows); setStep(2); };

  return <div className="ov" onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div className="mo" style={{maxWidth:960,maxHeight:"93vh",overflowY:"auto"}}>
      {/* STEPS */}
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:16}}>
        {[["1","Upload"],["2","Preview & Edit"],["3","Done"]].map(([n,lb],i)=><>
          <div key={n} style={{display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:22,height:22,borderRadius:"50%",background:step>=i?"linear-gradient(135deg,var(--ac),var(--ac2))":"rgba(255,255,255,.05)",color:step>=i?"#fff":"var(--mu)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700}}>{n}</div>
            <span style={{fontSize:11.5,fontWeight:600,color:step>=i?"var(--tx)":"var(--mu)"}}>{lb}</span>
          </div>
          {i<2&&<div style={{width:20,height:1,background:"var(--b1)"}}/>}
        </>)}
      </div>

      {/* STEP 0 */}
      {step===0&&<>
        <div className="mti">📊 Bulk Upload Stock via Excel</div>
        <div className="msu">Upload a .xlsx file to register multiple AC units at once · No limit on number of units</div>
        <div style={{border:"2px dashed rgba(56,189,248,.25)",borderRadius:10,padding:32,textAlign:"center",cursor:"pointer",background:drag?"rgba(56,189,248,.05)":"rgba(56,189,248,.02)",transition:"all .2s"}}
          onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)}
          onDrop={onDrop} onClick={()=>fileRef.current?.click()}>
          <div style={{fontSize:32,marginBottom:10}}>📂</div>
          <div style={{fontSize:14,fontWeight:700,marginBottom:5}}>Drop your Excel file here</div>
          <div style={{fontSize:12,color:"var(--mu2)"}}>or click to browse · .xlsx files only</div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={e=>{ const f=e.target.files[0]; if(f)parseFile(f); }}/>
        </div>
        <div className="al al-b" style={{marginTop:12,marginBottom:8}}>
          💡 <div><strong>QC Done column:</strong> If "Yes" → unit goes directly to Available (skip QC queue). If "No" or blank → goes to Pending QC.</div>
        </div>
        <button className="btn bb" onClick={()=>downloadSampleExcel(lots,brands,tonnages,warehouses)}>⬇️ Download Sample Template</button>
      </>}

      {/* STEP 1 — PREVIEW + EDIT */}
      {step===1&&<>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,flexWrap:"wrap",gap:8}}>
          <div><div className="mti" style={{marginBottom:2}}>{rows.length} rows found</div>
            <div style={{fontSize:11.5,color:errCount>0?"var(--rd)":"var(--gr)"}}>{errCount>0?`⚠️ ${errCount} row(s) have errors — fix before importing`:"✅ All rows valid — ready to import"}</div>
          </div>
          <div style={{display:"flex",gap:6}}>
            <span style={{fontSize:11,color:"var(--gr)",background:"rgba(52,211,153,.1)",border:"1px solid rgba(52,211,153,.2)",padding:"3px 8px",borderRadius:5}}>{rows.filter(r=>r.qcDone).length} → Available (QC Done)</span>
            <span style={{fontSize:11,color:"var(--am)",background:"rgba(251,191,36,.1)",border:"1px solid rgba(251,191,36,.2)",padding:"3px 8px",borderRadius:5}}>{rows.filter(r=>!r.qcDone).length} → Pending QC</span>
          </div>
        </div>
        <div style={{overflowX:"auto",maxHeight:360,border:"1px solid var(--b1)",borderRadius:8,marginBottom:14}}>
          <table style={{minWidth:750}}>
            <thead><tr style={{position:"sticky",top:0,background:"var(--s2)"}}>
              <th>#</th><th>ID</th><th>Lot</th><th>Brand</th><th>Tonnage</th><th>Price</th><th>QC Done</th><th>Status</th><th>RFID In</th><th>Validation</th><th>Edit</th>
            </tr></thead>
            <tbody>{rows.map((r,i)=><tr key={i} style={{background:errors[i]?"rgba(248,113,113,.05)":""}}>
              <td style={{color:"var(--mu)",fontSize:10}}>{i+1}</td>
              <td><span className="uid">{r.id}</span></td>
              <td><span className="lot">{r.lot||<span style={{color:"var(--rd)"}}>—</span>}</span></td>
              <td style={{fontWeight:600}}>{r.brand||<span style={{color:"var(--rd)"}}>—</span>}</td>
              <td>{r.tonnage||"—"}</td>
              <td className="price">{r.salePrice?fmt(r.salePrice):<span style={{color:"var(--rd)"}}>—</span>}</td>
              <td>{r.qcDone?<span className="qc-yes">✅ Yes</span>:<span className="qc-no">⏳ No</span>}</td>
              <td><Bdg status={r.status}/></td>
              <td><span className="rtag" style={{fontSize:9}}>{r.rfidIn||"—"}</span></td>
              <td style={{fontSize:10}}>{errors[i]?<span style={{color:"var(--rd)"}}>❌ {errors[i][0]}</span>:<span style={{color:"var(--gr)"}}>✅ OK</span>}</td>
              <td><button className="btn bb bsm" onClick={()=>{setEditIdx(i);setEditRow({...r});}}>Edit</button></td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className="mac">
          <button className="btn bgh" onClick={()=>setStep(0)}>← Back</button>
          <button className="btn bp" onClick={doImport} disabled={errCount>0}>{errCount>0?`Fix ${errCount} error(s) first`:`Import ${rows.length} Units →`}</button>
        </div>
      </>}

      {/* STEP 2 — DONE */}
      {step===2&&<div style={{textAlign:"center",padding:"28px 0"}}>
        <div style={{fontSize:40,marginBottom:10}}>✅</div>
        <div style={{fontSize:16,fontWeight:900,marginBottom:6}}>{rows.length} Units Imported Successfully!</div>
        <div style={{fontSize:12,color:"var(--mu2)",marginBottom:6}}>{rows.filter(r=>r.qcDone).length} went to Available · {rows.filter(r=>!r.qcDone).length} went to Pending QC</div>
        <button className="btn bp" onClick={onClose}>Done →</button>
      </div>}

      {/* EDIT ROW MODAL */}
      {editIdx!==null&&editRow&&<div className="ov" onClick={e=>e.target===e.currentTarget&&setEditIdx(null)}>
        <div className="mo">
          <div className="mti">✏️ Edit Row {editIdx+1}</div>
          <div className="fg2">
            <div className="fi"><label className="fl">Lot *</label><select className="fs" value={editRow.lot||""} onChange={e=>setEditRow(p=>({...p,lot:e.target.value}))}><option value="">Select</option>{lots.map(l=><option key={l.id}>{l.number}</option>)}</select></div>
            <div className="fi"><label className="fl">Brand *</label><select className="fs" value={editRow.brand||""} onChange={e=>setEditRow(p=>({...p,brand:e.target.value}))}><option value="">Select</option>{brands.map(b=><option key={b.id}>{b.name}</option>)}</select></div>
            <div className="fi"><label className="fl">Tonnage *</label><select className="fs" value={editRow.tonnage||""} onChange={e=>setEditRow(p=>({...p,tonnage:e.target.value}))}><option value="">Select</option>{tonnages.map(t=><option key={t.id}>{t.value}</option>)}</select></div>
            <div className="fi"><label className="fl">Warehouse</label><select className="fs" value={editRow.warehouse||""} onChange={e=>setEditRow(p=>({...p,warehouse:e.target.value}))}><option value="">Select</option>{warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
            <div className="fi"><label className="fl">Sale Price ₹ *</label><input type="number" className="fn" value={editRow.salePrice||""} onChange={e=>setEditRow(p=>({...p,salePrice:Number(e.target.value)}))}/></div>
            <div className="fi"><label className="fl">Received Date</label><input type="date" className="fn" value={editRow.receivedDate||""} onChange={e=>setEditRow(p=>({...p,receivedDate:e.target.value}))}/></div>
            <div className="fi"><label className="fl">RFID Indoor</label><input className="fn" value={editRow.rfidIn||""} onChange={e=>setEditRow(p=>({...p,rfidIn:e.target.value}))} placeholder="Optional"/></div>
            <div className="fi"><label className="fl">RFID Outdoor</label><input className="fn" value={editRow.rfidOut||""} onChange={e=>setEditRow(p=>({...p,rfidOut:e.target.value}))} placeholder="Optional"/></div>
            <div className="fi"><label className="fl">Model</label><input className="fn" value={editRow.model||""} onChange={e=>setEditRow(p=>({...p,model:e.target.value}))}/></div>
            <div className="fi"><label className="fl">Supplier</label><input className="fn" value={editRow.supplier||""} onChange={e=>setEditRow(p=>({...p,supplier:e.target.value}))}/></div>
            <div className="fi full" style={{flexDirection:"row",alignItems:"center",gap:10}}>
              <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13}}>
                <input type="checkbox" checked={editRow.qcDone||false} onChange={e=>setEditRow(p=>({...p,qcDone:e.target.checked}))} style={{accentColor:"var(--gr)",width:14,height:14}}/>
                QC Done — skip QC queue, go directly to Available
              </label>
            </div>
          </div>
          <div className="mac"><button className="btn bgh" onClick={()=>setEditIdx(null)}>Cancel</button><button className="btn bp" onClick={saveEdit}>Save →</button></div>
        </div>
      </div>}
    </div>
  </div>;
}


function Dashboard({ units, tonnages, warehouses, customers, dispatches, user }) {
  const [view, setView] = useState("overall");
  const [showPendPay, setShowPendPay] = useState(false);

  const tdStr = () => new Date().toISOString().split("T")[0];

  const getStats = (unitSet) => ({
    total: unitSet.length,
    pend:  unitSet.filter(u=>u.status==="pending_qc").length,
    avail: unitSet.filter(u=>u.status==="available").length,
    rep:   unitSet.filter(u=>u.status==="under_repair").length,
    sold:  unitSet.filter(u=>u.status==="sold").length,
    val:   unitSet.filter(u=>u.status==="available").reduce((s,u)=>s+(u.salePrice||0),0),
    rev:   unitSet.filter(u=>u.status==="sold").reduce((s,u)=>s+(u.salePrice||0),0),
  });

  const overall    = getStats(units);
  const todaySold  = units.filter(u=>u.status==="sold"&&u.soldDate===tdStr());
  const todayRev   = todaySold.reduce((s,u)=>s+(u.totalAmount||u.salePrice||0),0);
  const pendPayUnits = units.filter(u=>u.status==="sold"&&(u.remainingAmount||0)>0);
  const pendPayAmt   = pendPayUnits.reduce((s,u)=>s+(u.remainingAmount||0),0);
  const cols = ["#38BDF8","#34D399","#FBBF24","#F87171","#818CF8","#94A3B8"];

  const TonBreakdown = ({ unitSet }) => {
    const data = tonnages.map(t=>{ const a=unitSet.filter(u=>u.tonnage===t.value); return{label:t.value,total:a.length,avail:a.filter(u=>u.status==="available").length,pend:a.filter(u=>u.status==="pending_qc").length,rep:a.filter(u=>u.status==="under_repair").length,sold:a.filter(u=>u.status==="sold").length}; }).filter(t=>t.total>0);
    if(!data.length) return <div className="empty"><div className="et">No data</div></div>;
    return <>{data.map((t,i)=><div key={t.label} style={{marginBottom:11}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:"50%",background:cols[i%cols.length]}}/><span style={{fontSize:12,fontWeight:700}}>{t.label}</span></div>
        <div style={{display:"flex",gap:11,fontSize:10.5}}><span style={{color:"var(--am)"}}>⏳{t.pend}</span><span style={{color:"var(--gr)"}}>✅{t.avail}</span><span style={{color:"var(--rd)"}}>🔧{t.rep}</span><span style={{color:"var(--gy)"}}>💰{t.sold}</span><span style={{color:"var(--ac)",fontWeight:700}}>Σ{t.total}</span></div>
      </div>
      <div style={{display:"flex",height:7,borderRadius:5,overflow:"hidden",background:"rgba(255,255,255,.04)"}}>
        {[["var(--am)",t.pend],["var(--gr)",t.avail],["var(--rd)",t.rep],["var(--gy)",t.sold]].map(([col,val],j)=>val>0&&<div key={j} style={{width:`${(val/t.total)*100}%`,background:col}}/>)}
      </div>
    </div>)}</>;
  };

  const BrandView = ({ unitSet }) => {
    const bnames = [...new Set(unitSet.map(u=>u.brand))].sort();
    return <>{bnames.map(brand=>{
      const bu=unitSet.filter(u=>u.brand===brand); const bs=getStats(bu);
      return <div key={brand} className="brand-section">
        <div className="brand-hd">
          <span style={{fontSize:13,fontWeight:800}}>{brand}</span>
          <div style={{display:"flex",gap:10,fontSize:11}}><span style={{color:"var(--ac)",fontWeight:700}}>Total: {bs.total}</span><span style={{color:"var(--gr)"}}>✅{bs.avail}</span><span style={{color:"var(--am)"}}>⏳{bs.pend}</span><span style={{color:"var(--rd)"}}>🔧{bs.rep}</span><span style={{color:"var(--gy)"}}>💰{bs.sold}</span></div>
          <span className="price" style={{fontSize:11}}>{fmt(bs.val)}</span>
        </div>
        <div className="brand-table-wrap"><table>
          <thead><tr><th>Unit ID</th><th>Tonnage</th><th>RFID Indoor</th><th>RFID Outdoor</th><th>Status</th><th>Sale Price</th><th>Location</th></tr></thead>
          <tbody>{bu.map(u=>{ const wh=warehouses.find(w=>w.id===u.warehouse); return <tr key={u.id}><td><span className="uid">{u.id}</span></td><td><span className="ton-badge">{u.tonnage}</span></td><td>{u.rfidIn?<span className="rtag">{u.rfidIn}</span>:<span style={{color:"var(--mu)",fontSize:10}}>—</span>}</td><td>{u.rfidOut?<span className="rtag">{u.rfidOut}</span>:<span style={{color:"var(--mu)",fontSize:10}}>—</span>}</td><td><Bdg status={u.status}/></td><td className="price">{fmt(u.salePrice)}</td><td><span className="whlabel">🏭 {wh?.name||"—"}</span></td></tr>; })}</tbody>
        </table></div>
      </div>;
    })}</>;
  };

  return <div>
    <div className="ph">
      <div><div className="pt">📊 Dashboard</div><div className="ps">{new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div></div>
      <div className="ph-act">
        <button className="btn bgr" onClick={()=>exportAllToExcel(units,customers,dispatches,warehouses)}>📥 Backup Excel</button>
      </div>
    </div>

    {overall.avail<20&&<div className="al al-w">⚠️ <div><strong>Low Stock:</strong> Only {overall.avail} units available.</div></div>}

    {/* PAYMENT PENDING BOX — admin sees all-time, others see today only */}
    {pendPayUnits.length>0&&<div className="pend-pay-box" onClick={()=>setShowPendPay(p=>!p)}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:20}}>💰</span>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"var(--am)"}}>Payment Pending</div>
            <div style={{fontSize:11,color:"var(--mu2)",marginTop:1}}>{pendPayUnits.length} unit{pendPayUnits.length>1?"s":""} · Balance due from customers</div>
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:20,fontWeight:900,color:"var(--am)",letterSpacing:-1}}>{fmt(pendPayAmt)}</div>
          <div style={{fontSize:10,color:"var(--mu2)"}}>{showPendPay?"▲ hide":"▼ view details"}</div>
        </div>
      </div>
    </div>}
    {showPendPay&&<div className="pend-pay-details">
      <table><thead><tr><th>Unit ID</th><th>Customer</th><th>Phone</th><th>Invoice</th><th>Total</th><th>Booking Paid</th><th>Balance Due</th><th>Sold Date</th></tr></thead>
      <tbody>{pendPayUnits.map(u=><tr key={u.id}>
        <td><span className="uid">{u.id}</span></td>
        <td style={{fontWeight:600}}>{u.soldTo||"—"}</td>
        <td style={{fontSize:11}}>{u.customerPhone||"—"}</td>
        <td><span className="invno">{u.invoiceNo||"—"}</span></td>
        <td className="price">{fmt(u.totalAmount||u.salePrice)}</td>
        <td style={{color:"var(--gr)",fontWeight:600}}>{fmt(u.bookingAmount||0)}</td>
        <td style={{color:"var(--am)",fontWeight:700}}>{fmt(u.remainingAmount||0)}</td>
        <td style={{fontSize:11}}>{u.soldDate||"—"}</td>
      </tr>)}</tbody>
      </table>
    </div>}

    {/* STATS — admin: all-time sold, others: today sold */}
    <div className="sg sg4">
      <div className="sc bl"><div className="sl">Total Units</div><div className="sv bl">{overall.total}</div></div>
      <div className="sc am"><div className="sl">Pending QC</div><div className="sv am">{overall.pend}</div></div>
      <div className="sc gr"><div className="sl">Available</div><div className="sv gr">{overall.avail}</div><div className="sh">{fmt(overall.val)}</div></div>
      {user?.role==="admin"
        ?<div className="sc gy"><div className="sl">All-time Sold</div><div className="sv gy">{overall.sold}</div><div className="sh">{fmt(overall.rev)} revenue</div></div>
        :<div className="sc gy"><div className="sl">Today Sold</div><div className="sv gy">{todaySold.length}</div><div className="sh">{fmt(todayRev)} today</div></div>
      }
    </div>

    {/* TODAY SUMMARY — visible to all */}
    <div className="sg sg3" style={{marginBottom:14}}>
      <div className="sc am"><div className="sl">Today Sold</div><div className="sv am">{todaySold.length}</div></div>
      <div className="sc gr"><div className="sl">Today Revenue</div><div className="sv gr" style={{fontSize:18}}>{fmt(todayRev)}</div></div>
      <div className="sc rd"><div className="sl">Under Repair</div><div className="sv rd">{overall.rep}</div></div>
    </div>

    {/* PIPELINE */}
    <div className="card"><div className="chd"><div className="ct">Pipeline Flow</div></div>
      <div className="pipe">{[["🚛","Received",overall.total,"var(--ac)"],["⏳","Pending QC",overall.pend,"var(--am)"],["🔧","Repair",overall.rep,"var(--rd)"],["✅","Available",overall.avail,"var(--gr)"],["💰","Sold",overall.sold,"var(--gy)"]].map(([ic,lb,vl,cl],i)=><div className="ps2" key={i}><div style={{fontSize:15,marginBottom:2}}>{ic}</div><div className="pv" style={{color:cl}}>{vl}</div><div className="plbl">{lb}</div></div>)}</div>
    </div>

    {/* VIEW TABS */}
    <div className="dash-tabs">
      <div className={`dash-tab ${view==="overall"?"on":""}`} onClick={()=>setView("overall")}>📊 Overall</div>
      {warehouses.map(wh=><div key={wh.id} className={`dash-tab ${view===wh.id?"on":""}`} onClick={()=>setView(wh.id)}>🏭 {wh.name}</div>)}
      <div className={`dash-tab ${view==="brand"?"on":""}`} onClick={()=>setView("brand")}>🏷️ Brand-wise</div>
    </div>

    {view==="overall"&&<div className="card"><div className="chd"><div><div className="ct">📐 Tonnage-wise Bifurcation</div><div className="cs">All warehouses combined</div></div></div><TonBreakdown unitSet={units}/></div>}

    {warehouses.map(wh=>{ if(view!==wh.id)return null; const wu=units.filter(u=>u.warehouse===wh.id); const ws=getStats(wu);
      return <div key={wh.id}>
        <div className="wh-card"><div className="wh-card-hd"><div><div style={{fontSize:14,fontWeight:800}}>🏭 {wh.name}</div><div style={{fontSize:10.5,color:"var(--mu2)",marginTop:2}}>{wh.location}</div></div><span style={{fontSize:11,color:"var(--mu2)"}}>{wu.length} units</span></div>
          <div className="wh-stats">{[["⏳","Pending QC",ws.pend,"var(--am)"],["✅","Available",ws.avail,"var(--gr)"],["🔧","Repair",ws.rep,"var(--rd)"],["💰","Sold",ws.sold,"var(--gy)"]].map(([ic,lb,vl,cl])=><div key={lb} className="wh-stat"><div className="wh-stat-v" style={{color:cl}}>{vl}</div><div className="wh-stat-l">{ic} {lb}</div></div>)}</div>
        </div>
        <div className="card"><div className="chd"><div><div className="ct">📐 Tonnage-wise — {wh.name}</div></div></div><TonBreakdown unitSet={wu}/></div>
      </div>;
    })}

    {view==="brand"&&<BrandView unitSet={units}/>}
  </div>;
}

// ─── STOCK INTAKE ─────────────────────────────────────────────────────────────
function StockIntake({ units, lots, brands, tonnages, warehouses, onAdd, onBulkAdd, onTransfer, user }) {
  const [showForm, setShowForm]=useState(false);
  const [showUpload, setShowUpload]=useState(false);
  const [showTx, setShowTx]=useState(null); // unit to transfer
  const [txWh, setTxWh]=useState("");
  const [form, setForm]=useState({warehouse:"",lot:"",brand:"",tonnage:"",model:"",supplier:"",receivedDate:today(),salePrice:"",rfidIn:"",rfidOut:"",notes:""});
  const f=v=>setForm(p=>({...p,...v}));
  const submit=()=>{ if(!form.brand||!form.tonnage||!form.lot||!form.salePrice||!form.warehouse)return; onAdd({id:"AC-"+String(units.length+1).padStart(3,"0"),...form,salePrice:Number(form.salePrice),status:"pending_qc",qcAttempts:0}); setShowForm(false); setForm({warehouse:"",lot:"",brand:"",tonnage:"",model:"",supplier:"",receivedDate:today(),salePrice:"",rfidIn:"",rfidOut:"",notes:""}); };
  const lotGroups={};
  units.forEach(u=>{ if(!lotGroups[u.lot])lotGroups[u.lot]={units:[],pend:0,avail:0,rep:0,sold:0,val:0}; lotGroups[u.lot].units.push(u); lotGroups[u.lot][u.status==="pending_qc"?"pend":u.status==="available"?"avail":u.status==="under_repair"?"rep":"sold"]++; if(u.salePrice&&u.status==="available")lotGroups[u.lot].val+=u.salePrice; });

  return <div>
    <div className="ph">
      <div><div className="pt">📦 Stock Intake</div><div className="ps">Register incoming AC units · assign to warehouse</div></div>
      {user.role==="admin"&&<div className="ph-act">
        <button className="btn bb" onClick={()=>setShowUpload(true)}>📊 Upload Excel</button>
        <button className="btn bp" onClick={()=>setShowForm(true)}>+ Add Unit</button>
      </div>}
    </div>
    <div className="sg sg3">
      <div className="sc bl"><div className="sl">Total</div><div className="sv bl">{units.length}</div></div>
      <div className="sc am"><div className="sl">Pending QC</div><div className="sv am">{units.filter(u=>u.status==="pending_qc").length}</div></div>
      <div className="sc in"><div className="sl">Warehouses</div><div className="sv in">{warehouses.length}</div></div>
    </div>
    <div className="card"><div className="chd"><div><div className="ct">📦 Lot Overview</div></div></div>
      {Object.keys(lotGroups).length===0?<div className="empty"><div className="ei">📦</div><div className="et">Create lots in Master first</div></div>:(
        <table><thead><tr><th>Lot</th><th>Units</th><th>Pending QC</th><th>Available</th><th>Repair</th><th>Sold</th><th>Stock Value</th></tr></thead>
        <tbody>{Object.entries(lotGroups).map(([lot,v])=><tr key={lot}><td><span className="lot">{lot}</span></td><td style={{color:"var(--ac)",fontWeight:700}}>{v.units.length}</td><td style={{color:"var(--am)"}}>{v.pend}</td><td style={{color:"var(--gr)"}}>{v.avail}</td><td style={{color:"var(--rd)"}}>{v.rep}</td><td style={{color:"var(--gy)"}}>{v.sold}</td><td className="price">{fmt(v.val)}</td></tr>)}</tbody>
        </table>
      )}
    </div>
    <div className="card"><div className="chd"><div><div className="ct">All Units</div></div></div>
      <div className="tw"><table>
        <thead><tr><th>ID</th><th>Warehouse</th><th>Lot</th><th>Brand/Ton</th><th>RFID</th><th>Price</th><th>Status</th>{user.role==="admin"&&<th>Action</th>}</tr></thead>
        <tbody>{units.map(u=><tr key={u.id}>
          <td><span className="uid">{u.id}</span></td>
          <td><WHLabel whId={u.warehouse} warehouses={warehouses}/></td>
          <td><span className="lot">{u.lot||"—"}</span></td>
          <td><b>{u.brand}</b><br/><span style={{fontSize:9.5,color:"var(--mu)"}}>{u.tonnage}</span></td>
          <td>{u.rfidIn?<><span className="rtag">{u.rfidIn}</span><br/><span className="rtag">{u.rfidOut}</span></>:<span style={{fontSize:9.5,color:"var(--am)"}}>⚠️ None</span>}</td>
          <td className="price">{fmt(u.salePrice)}</td>
          <td><Bdg status={u.status}/></td>
          {user.role==="admin"&&<td>{u.status!=="sold"&&<button className="btn bpu bsm" onClick={()=>{setShowTx(u);setTxWh(u.warehouse);}}>🏭 Transfer</button>}</td>}
        </tr>)}</tbody>
      </table></div>
    </div>

    {/* ADD MODAL */}
    {showForm&&<div className="ov" onClick={e=>e.target===e.currentTarget&&setShowForm(false)}><div className="mo">
      <div className="mti">➕ Register AC Unit</div><div className="msu">All dropdowns from Master only</div>
      <div className="fg2">
        <div className="fi"><label className="fl">Warehouse *</label><select className="fs" value={form.warehouse} onChange={e=>f({warehouse:e.target.value})}><option value="">Select</option>{warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
        <div className="fi"><label className="fl">Lot *</label><select className="fs" value={form.lot} onChange={e=>f({lot:e.target.value})}><option value="">Select</option>{lots.map(l=><option key={l.id}>{l.number}</option>)}</select></div>
        <div className="fi"><label className="fl">Brand *</label><select className="fs" value={form.brand} onChange={e=>f({brand:e.target.value})}><option value="">Select</option>{brands.map(b=><option key={b.id}>{b.name}</option>)}</select></div>
        <div className="fi"><label className="fl">Tonnage *</label><select className="fs" value={form.tonnage} onChange={e=>f({tonnage:e.target.value})}><option value="">Select</option>{tonnages.map(t=><option key={t.id}>{t.value}</option>)}</select></div>
        <div className="fi"><label className="fl">Model</label><input className="fn" value={form.model} onChange={e=>f({model:e.target.value})} placeholder="Optional"/></div>
        <div className="fi"><label className="fl">Supplier</label><input className="fn" value={form.supplier} onChange={e=>f({supplier:e.target.value})}/></div>
        <div className="fi"><label className="fl">Sale Price ₹ *</label><input type="number" className="fn" value={form.salePrice} onChange={e=>f({salePrice:e.target.value})}/></div>
        <div className="fi"><label className="fl">Received Date</label><input type="date" className="fn" value={form.receivedDate} onChange={e=>f({receivedDate:e.target.value})}/></div>
        <div className="fi"><label className="fl">RFID Indoor</label><input className="fn" value={form.rfidIn} onChange={e=>f({rfidIn:e.target.value})} placeholder="Optional"/></div>
        <div className="fi"><label className="fl">RFID Outdoor</label><input className="fn" value={form.rfidOut} onChange={e=>f({rfidOut:e.target.value})} placeholder="Optional"/></div>
        <div className="fi full"><label className="fl">Notes</label><input className="fn" value={form.notes} onChange={e=>f({notes:e.target.value})}/></div>
      </div>
      <div className="mac"><button className="btn bgh" onClick={()=>setShowForm(false)}>Cancel</button><button className="btn bp" onClick={submit}>Register →</button></div>
    </div></div>}

    {/* EXCEL IMPORT MODAL */}
    {showUpload&&<ExcelImportModal lots={lots} brands={brands} tonnages={tonnages} warehouses={warehouses} units={units} onBulkAdd={rows=>{onBulkAdd(rows);setShowUpload(false);}} onClose={()=>setShowUpload(false)}/>}

    {/* TRANSFER MODAL */}
    {showTx&&<div className="ov" onClick={e=>e.target===e.currentTarget&&setShowTx(null)}><div className="mo">
      <div className="mti">🏭 Transfer Warehouse</div>
      <div className="msu"><span className="uid">{showTx.id}</span> — {showTx.brand} {showTx.tonnage}</div>
      <div className="fi"><label className="fl">Move to Warehouse</label>
        <select className="fs" value={txWh} onChange={e=>setTxWh(e.target.value)}>
          {warehouses.map(w=><option key={w.id} value={w.id}>{w.name}{w.id===showTx.warehouse?" (current)":""}</option>)}
        </select>
      </div>
      <div className="mac">
        <button className="btn bgh" onClick={()=>setShowTx(null)}>Cancel</button>
        <button className="btn bp" onClick={()=>{ onTransfer(showTx.id, txWh); setShowTx(null); }}>Transfer →</button>
      </div>
    </div></div>}
  </div>;
}

// ─── STOCK VERIFY (MANUAL RFID) ───────────────────────────────────────────────
function StockVerify({ units, warehouses, user, onVerificationComplete, openCamera }) {
  const [whFilter, setWhFilter] = useState("all");
  const [inputVal, setInputVal] = useState("");
  const [scannedRfids, setScannedRfids] = useState(new Set()); // set of rfid strings scanned
  const [history, setHistory] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [showMissing, setShowMissing] = useState(true);
  const [showVerified, setShowVerified] = useState(true);
  const inputRef = useRef();

  // Active (non-sold) units, filtered by warehouse
  const activeUnits = units.filter(u=>u.status!=="sold"&&(whFilter==="all"||u.warehouse===whFilter));

  // Build rfid→unit map
  const rfidMap = {};
  activeUnits.forEach(u=>{ if(u.rfidIn)rfidMap[u.rfidIn.toUpperCase()]=u; if(u.rfidOut)rfidMap[u.rfidOut.toUpperCase()]=u; });

  // Per-unit verification state
  const unitState = activeUnits.map(u=>{
    const inScanned  = u.rfidIn  && scannedRfids.has(u.rfidIn.toUpperCase());
    const outScanned = u.rfidOut && scannedRfids.has(u.rfidOut.toUpperCase());
    const bothScanned = inScanned && outScanned;
    const eitherScanned = inScanned || outScanned;
    return { unit:u, inScanned, outScanned, bothScanned, eitherScanned };
  });

  const verified = unitState.filter(s=>s.bothScanned);
  const partial  = unitState.filter(s=>s.eitherScanned&&!s.bothScanned);
  const missing  = unitState.filter(s=>!s.eitherScanned);
  const unknownScans = [...scannedRfids].filter(r=>!rfidMap[r]);

  const progress = activeUnits.length>0 ? Math.round((verified.length/activeUnits.length)*100) : 0;

  const handleScan = () => {
    const tag = inputVal.trim().toUpperCase();
    if(!tag)return;
    setInputVal("");
    setScannedRfids(prev=>new Set([...prev, tag]));
    inputRef.current?.focus();
  };

  const clearAll = () => { setScannedRfids(new Set()); setInputVal(""); };

  const submitVerification = () => {
    const rec = { date:new Date().toLocaleDateString("en-IN"), time:new Date().toLocaleTimeString(), by:user.name, warehouse:whFilter==="all"?"All":warehouses.find(w=>w.id===whFilter)?.name||whFilter, scanned:verified.length, total:activeUnits.length, discrepancies:missing.length+unknownScans.length, note:adminNote, status:missing.length+unknownScans.length===0?"clear":"discrepancy" };
    setHistory(p=>[rec,...p]); onVerificationComplete(rec); setSubmitted(true);
  };
  const reset = () => { setScannedRfids(new Set()); setInputVal(""); setSubmitted(false); setAdminNote(""); };

  if(submitted) return <div>
    <div className="ph"><div><div className="pt">📡 Stock Verify</div></div></div>
    <div className="card" style={{textAlign:"center",padding:"36px"}}>
      <div style={{fontSize:40,marginBottom:10}}>{missing.length+unknownScans.length===0?"✅":"⚠️"}</div>
      <div style={{fontSize:16,fontWeight:900,marginBottom:6}}>{missing.length+unknownScans.length===0?"All Clear!":"Submitted with Discrepancies"}</div>
      <div style={{fontSize:12,color:"var(--mu2)",marginBottom:18}}>{verified.length}/{activeUnits.length} verified · {missing.length} missing · by {user.name}</div>
      <button className="btn bp" onClick={reset}>📡 New Verification</button>
    </div>
    {history.length>0&&<HistTable history={history}/>}
  </div>;

  function HistTable({ history }) {
    return <div className="card"><div className="chd"><div className="ct">📅 History</div></div>
      <table><thead><tr><th>Date</th><th>Warehouse</th><th>By</th><th>Verified</th><th>Total</th><th>Issues</th><th>Result</th></tr></thead>
      <tbody>{history.map((v,i)=><tr key={i}><td style={{fontSize:10.5}}>{v.date}</td><td style={{fontSize:10.5}}>{v.warehouse}</td><td style={{fontSize:10.5}}>{v.by}</td><td style={{color:"var(--gr)",fontWeight:700}}>{v.scanned}</td><td>{v.total}</td><td style={{color:v.discrepancies>0?"var(--rd)":"var(--gr)",fontWeight:700}}>{v.discrepancies}</td><td><span className="badge" style={{background:v.status==="clear"?"rgba(52,211,153,.12)":"rgba(248,113,113,.12)",color:v.status==="clear"?"var(--gr)":"var(--rd)"}}>{v.status==="clear"?"✅ Clear":"⚠️ Issues"}</span></td></tr>)}</tbody>
      </table>
    </div>;
  }

  return <div>
    <div className="ph"><div><div className="pt">📡 Stock Verify</div><div className="ps">Scan RFID tags manually — both indoor + outdoor must be scanned to verify a unit</div></div></div>

    {/* WAREHOUSE FILTER */}
    <div className="filt">
      <span style={{fontSize:11,color:"var(--mu2)",fontWeight:600}}>Warehouse:</span>
      <div className={`chip ${whFilter==="all"?"on":""}`} onClick={()=>{setWhFilter("all");clearAll();}}>All ({units.filter(u=>u.status!=="sold").length})</div>
      {warehouses.map(wh=>{
        const cnt=units.filter(u=>u.status!=="sold"&&u.warehouse===wh.id).length;
        return <div key={wh.id} className={`chip ${whFilter===wh.id?"on":""}`} onClick={()=>{setWhFilter(wh.id);clearAll();}}>🏭 {wh.name} ({cnt})</div>;
      })}
    </div>

    {/* STATS */}
    <div className="sg sg4">
      <div className="sc bl"><div className="sl">Total Active</div><div className="sv bl">{activeUnits.length}</div></div>
      <div className="sc gr"><div className="sl">✅ Verified</div><div className="sv gr">{verified.length}</div></div>
      <div className="sc am"><div className="sl">⚠️ Partial</div><div className="sv am">{partial.length}</div></div>
      <div className="sc rd"><div className="sl">❌ Missing</div><div className="sv rd">{missing.length}</div></div>
    </div>

    {/* PROGRESS BAR */}
    <div style={{background:"rgba(255,255,255,.04)",borderRadius:20,height:8,marginBottom:6,overflow:"hidden"}}>
      <div style={{width:`${progress}%`,height:"100%",background:"linear-gradient(90deg,var(--ac),var(--gr))",borderRadius:20,transition:"width .3s"}}/>
    </div>
    <div style={{textAlign:"center",fontSize:11,color:"var(--mu2)",marginBottom:16}}>{progress}% verified · {verified.length} of {activeUnits.length} units fully scanned</div>

    {/* SCAN BOX */}
    <div className="scan-input-wrap">
      <div style={{fontSize:22,marginBottom:7}}>📡</div>
      <div style={{fontSize:13,fontWeight:700,marginBottom:3,color:"var(--tx)"}}>Scan RFID Tags</div>
      <div style={{fontSize:11,color:"var(--mu2)",marginBottom:13}}>Use camera OR type tag ID · Both Indoor + Outdoor must be scanned to verify a unit</div>
      <div style={{display:"flex",gap:8,justifyContent:"center",alignItems:"center",flexWrap:"wrap",marginBottom:10}}>
        <button className="btn bp" style={{fontSize:13,padding:"9px 18px"}} onClick={()=>openCamera&&openCamera("verify", code=>{ setScannedRfids(prev=>new Set([...prev,code])); })}>
          📷 Open Camera Scanner
        </button>
        <span style={{fontSize:11,color:"var(--mu2)"}}>or type below</span>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"center",alignItems:"center",flexWrap:"wrap"}}>
        <input ref={inputRef} className="scan-input" value={inputVal} onChange={e=>setInputVal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleScan()} placeholder="e.g. RFI-001-IN"/>
        <button className="btn bg2" onClick={handleScan}>Add ✓</button>
        {scannedRfids.size>0&&<button className="btn brd bsm" onClick={clearAll}>🗑 Clear All</button>}
      </div>
      {scannedRfids.size>0&&<div style={{marginTop:10,fontSize:11,color:"var(--mu2)"}}>{scannedRfids.size} tags scanned · {verified.length} units fully verified</div>}
    </div>

    {/* UNIT LIST with checkboxes */}
    <div className="card">
      <div className="chd">
        <div><div className="ct">Unit Verification Status</div><div className="cs">Green = both tags scanned · Amber = one tag · Red = none</div></div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <label style={{display:"flex",alignItems:"center",gap:5,fontSize:11.5,cursor:"pointer",color:"var(--mu2)"}}>
            <input type="checkbox" checked={showVerified} onChange={e=>setShowVerified(e.target.checked)} style={{accentColor:"var(--gr)"}}/> Show Verified ({verified.length})
          </label>
          <label style={{display:"flex",alignItems:"center",gap:5,fontSize:11.5,cursor:"pointer",color:"var(--mu2)"}}>
            <input type="checkbox" checked={showMissing} onChange={e=>setShowMissing(e.target.checked)} style={{accentColor:"var(--rd)"}}/> Show Missing ({missing.length})
          </label>
        </div>
      </div>

      {activeUnits.length===0
        ?<div className="empty"><div className="ei">📦</div><div className="et">No active units in this warehouse</div></div>
        :<div style={{maxHeight:420,overflowY:"auto"}}>
          {unitState.filter(s=>(s.bothScanned?showVerified:showMissing||s.eitherScanned)).map(s=>{
            const u=s.unit;
            const wh=warehouses.find(w=>w.id===u.warehouse);
            const rowClass = s.bothScanned?"verified":s.eitherScanned?"":"missing";
            return <div key={u.id} className={`vu-row ${rowClass}`}>
              {/* STATUS ICON */}
              <div style={{width:22,height:22,borderRadius:"50%",border:`2px solid ${s.bothScanned?"var(--gr)":s.eitherScanned?"var(--am)":"rgba(248,113,113,.3)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0,background:s.bothScanned?"rgba(52,211,153,.15)":s.eitherScanned?"rgba(251,191,36,.1)":"rgba(248,113,113,.06)"}}>
                {s.bothScanned?"✅":s.eitherScanned?"⚠️":"❌"}
              </div>

              {/* UNIT INFO */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
                  <span className="uid">{u.id}</span>
                  <span style={{fontSize:11.5,fontWeight:600}}>{u.brand} {u.tonnage}</span>
                  <WHLabel whId={u.warehouse} warehouses={warehouses}/>
                  <Bdg status={u.status}/>
                </div>
                {/* RFID TAG STATUS */}
                <div style={{display:"flex",gap:10,marginTop:5,flexWrap:"wrap"}}>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <div className={`tag-dot ${s.inScanned?"scanned":"missing"}`}/>
                    <span style={{fontSize:10,fontFamily:"'JetBrains Mono',monospace",color:s.inScanned?"var(--gr)":"var(--mu)"}}>
                      {u.rfidIn||"No indoor tag"} {s.inScanned?"✓":""}
                    </span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <div className={`tag-dot ${s.outScanned?"scanned":"missing"}`}/>
                    <span style={{fontSize:10,fontFamily:"'JetBrains Mono',monospace",color:s.outScanned?"var(--gr)":"var(--mu)"}}>
                      {u.rfidOut||"No outdoor tag"} {s.outScanned?"✓":""}
                    </span>
                  </div>
                </div>
              </div>

              {/* STATUS LABEL */}
              <div style={{fontSize:10.5,fontWeight:700,color:s.bothScanned?"var(--gr)":s.eitherScanned?"var(--am)":"var(--rd)",flexShrink:0}}>
                {s.bothScanned?"Verified":s.eitherScanned?"Partial":"Missing"}
              </div>
            </div>;
          })}
        </div>
      }
    </div>

    {/* UNKNOWN SCANS */}
    {unknownScans.length>0&&<div className="card">
      <div className="chd"><div className="ct" style={{color:"var(--am)"}}>⚠️ Unknown Tags ({unknownScans.length})</div></div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {unknownScans.map(r=><span key={r} className="rtag" style={{color:"var(--am)",borderColor:"rgba(251,191,36,.3)"}}>{r}</span>)}
      </div>
    </div>}

    {/* SUBMIT */}
    {scannedRfids.size>0&&<div className="card">
      <div className="chd">
        <div><div className="ct">🔐 Submit Verification</div><div className="cs">{verified.length}/{activeUnits.length} verified · {missing.length} missing · {unknownScans.length} unknown</div></div>
      </div>
      {(missing.length>0||unknownScans.length>0)&&<div className="fi" style={{marginBottom:12}}>
        <label className="fl">Admin Note {user.role!=="admin"?"(Admin required for discrepancies)":""}</label>
        <textarea className="fn" value={adminNote} onChange={e=>setAdminNote(e.target.value)} placeholder="Explain discrepancies..." disabled={user.role!=="admin"}/>
      </div>}
      {user.role!=="admin"&&(missing.length>0||unknownScans.length>0)&&<div className="al al-w">🔐 Discrepancies found — only Admin can submit.</div>}
      <div style={{display:"flex",gap:7}}>
        {(user.role==="admin"||(missing.length===0&&unknownScans.length===0))&&<button className="btn bp" onClick={submitVerification}>✅ Submit Verification</button>}
        <button className="btn bgh" onClick={reset}>🔄 Start Over</button>
      </div>
    </div>}

    {history.length>0&&!submitted&&<HistTable history={history}/>}

    {function HistTable({ history }) {
      return <div className="card"><div className="chd"><div className="ct">📅 History</div></div>
        <table><thead><tr><th>Date</th><th>Warehouse</th><th>By</th><th>Verified</th><th>Total</th><th>Issues</th><th>Result</th></tr></thead>
        <tbody>{history.map((v,i)=><tr key={i}><td style={{fontSize:10.5}}>{v.date}</td><td style={{fontSize:10.5}}>{v.warehouse}</td><td style={{fontSize:10.5}}>{v.by}</td><td style={{color:"var(--gr)",fontWeight:700}}>{v.scanned}</td><td>{v.total}</td><td style={{color:v.discrepancies>0?"var(--rd)":"var(--gr)",fontWeight:700}}>{v.discrepancies}</td><td><span className="badge" style={{background:v.status==="clear"?"rgba(52,211,153,.12)":"rgba(248,113,113,.12)",color:v.status==="clear"?"var(--gr)":"var(--rd)"}}>{v.status==="clear"?"✅ Clear":"⚠️ Issues"}</span></td></tr>)}</tbody>
        </table>
      </div>;
    }}
  </div>;
}

// ─── QC MODULE ────────────────────────────────────────────────────────────────
function QCModule({ units, warehouses, onUpdate, user }) {
  const [tab,setTab]=useState("pending_qc"); const [sel,setSel]=useState(null); const [note,setNote]=useState("");
  const doPass=u=>onUpdate(u.id,{status:"available",qcAttempts:u.qcAttempts+1,testedBy:user.name,testedDate:today()});
  const doFail=()=>{ onUpdate(sel.id,{status:"under_repair",qcAttempts:sel.qcAttempts+1,testedBy:user.name,testedDate:today(),repairNote:note}); setSel(null); setNote(""); };
  const rows=units.filter(u=>u.status===tab);
  return <div>
    <div className="ph"><div><div className="pt">🔬 QC Module</div><div className="ps">Test each unit — pass to stock, fail to repair</div></div></div>
    <div className="sg sg3">
      <div className="sc am"><div className="sl">Pending</div><div className="sv am">{units.filter(u=>u.status==="pending_qc").length}</div></div>
      <div className="sc rd"><div className="sl">Repair</div><div className="sv rd">{units.filter(u=>u.status==="under_repair").length}</div></div>
      <div className="sc gr"><div className="sl">Cleared Today</div><div className="sv gr">{units.filter(u=>u.testedDate===today()&&u.status==="available").length}</div></div>
    </div>
    <div className="filt">{["pending_qc","under_repair","available"].map(s=><div key={s} className={`chip ${tab===s?"on":""}`} onClick={()=>setTab(s)}>{SC[s].icon} {SC[s].label} ({units.filter(u=>u.status===s).length})</div>)}</div>
    <div className="card"><div className="chd"><div className="ct">{SC[tab].icon} {SC[tab].label}</div></div>
      {rows.length===0?<div className="empty"><div className="ei">🎉</div><div className="et">No units here</div></div>:(
        <div className="tw"><table>
          <thead><tr><th>ID</th><th>Warehouse</th><th>Lot</th><th>Brand/Ton</th><th>RFID</th><th>Attempts</th>
            {tab==="under_repair"&&<th>Issue</th>}{tab==="available"&&<th>Tested By</th>}
            {(tab==="pending_qc"||tab==="under_repair")&&<th>Action</th>}
          </tr></thead>
          <tbody>{rows.map(u=><tr key={u.id}>
            <td><span className="uid">{u.id}</span></td>
            <td><WHLabel whId={u.warehouse} warehouses={warehouses}/></td>
            <td><span className="lot">{u.lot||"—"}</span></td>
            <td><b>{u.brand}</b><br/><span style={{fontSize:9.5,color:"var(--mu)"}}>{u.tonnage}</span></td>
            <td>{u.rfidIn?<><span className="rtag">{u.rfidIn}</span><br/><span className="rtag">{u.rfidOut}</span></>:<span style={{fontSize:9.5,color:"var(--am)"}}>⚠️ None</span>}</td>
            <td style={{fontWeight:700,color:u.qcAttempts>1?"var(--rd)":"var(--gr)"}}>{u.qcAttempts}</td>
            {tab==="under_repair"&&<td style={{fontSize:10,color:"#FECACA"}}>{u.repairNote||"—"}</td>}
            {tab==="available"&&<td style={{fontSize:10.5}}>{u.testedBy}</td>}
            {tab==="pending_qc"&&<td><div style={{display:"flex",gap:5}}><button className="btn bg2 bsm" onClick={()=>doPass(u)}>✅ Pass</button><button className="btn br bsm" onClick={()=>setSel(u)}>❌ Fail</button></div></td>}
            {tab==="under_repair"&&<td><button className="btn ba bsm" onClick={()=>onUpdate(u.id,{status:"pending_qc"})}>🔄 Retest</button></td>}
          </tr>)}</tbody>
        </table></div>
      )}
    </div>
    {sel&&<div className="ov" onClick={e=>e.target===e.currentTarget&&setSel(null)}><div className="mo">
      <div className="mti">❌ QC Failed</div><div className="msu"><span className="uid">{sel.id}</span> → Repair</div>
      <div className="fi"><label className="fl">Issue Note</label><input className="fn" value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. Gas leak, noise..."/></div>
      <div className="mac"><button className="btn bgh" onClick={()=>setSel(null)}>Cancel</button><button className="btn br" onClick={doFail}>Confirm →</button></div>
    </div></div>}
  </div>;
}

// ─── DEFAULT WA TEMPLATE ──────────────────────────────────────────────────────
const DEFAULT_TEMPLATE = `🧾 Invoice: {invoice}
❄️ {company}

Dear {customer},

Your AC unit purchase details:
• Product: {product}
• Unit ID: {unitId}
• Lot: {lot}
• Sale Date: {date}

💰 Payment Details:
• Total Amount: {total}
• Booking Paid: {booking}
• Balance on Delivery: {remaining}

📍 Delivery Address: {address}

🚚 Delivery Partner: {partner}
📦 Tracking: {tracking}

Thank you for your purchase! 🙏
For any queries please call us.`;

// ─── SALES (v7: split payment, WA confirm, dynamic invoice) ──────────────────
function Sales({ units, customers, dispatches, warehouses, onUpdate, onAddCustomer, onAddDispatch, user, showToast, invCtr, setInvCtr, invoiceTemplate }) {
  const [tab,setTab]=useState("available"); const [search,setSearch]=useState("");
  const [sellModal,setSellModal]=useState(null); const [invModal,setInvModal]=useState(null);
  const [dispModal,setDispModal]=useState(null); const [payModal,setPayModal]=useState(null);
  const [waConfirm,setWaConfirm]=useState(null); // {unit,customer,dispatch}
  const [sf,setSf]=useState({name:"",phone:"",altPhone:"",email:"",address:"",city:"",pincode:"",gst:"",soldDate:today(),bookingAmt:"",totalAmt:""});
  const [df,setDf]=useState({deliveryPartner:"",trackingNo:"",notes:"",bookedDate:today()});

  const avail=units.filter(u=>u.status==="available");
  const sold=units.filter(u=>u.status==="sold");
  const matchS=u=>{ if(!search)return true; const q=search.toLowerCase(); return u.id.toLowerCase().includes(q)||u.brand.toLowerCase().includes(q)||(u.lot||"").toLowerCase().includes(q)||(u.soldTo||"").toLowerCase().includes(q)||(u.rfidIn||"").toLowerCase().includes(q)||(u.rfidOut||"").toLowerCase().includes(q)||(u.invoiceNo||"").toLowerCase().includes(q); };
  const rows=units.filter(u=>u.status===tab&&matchS(u));

  const doSell=()=>{
    if(!sf.name||!sf.phone)return;
    const n=invCtr+1; const invNo=`INV-${String(n).padStart(4,"0")}`;
    setInvCtr(n);
    const bookAmt=Number(sf.bookingAmt)||0;
    const totalAmt=Number(sf.totalAmt)||sellModal.salePrice||0;
    const remaining=totalAmt-bookAmt;
    onUpdate(sellModal.id,{status:"sold",soldTo:sf.name,soldDate:sf.soldDate,customerPhone:sf.phone,soldBy:user.name,invoiceNo:invNo,paymentReceived:bookAmt>=totalAmt,bookingAmount:bookAmt,totalAmount:totalAmt,remainingAmount:remaining});
    const ex=customers.find(c=>c.phone===sf.phone);
    if(ex) onAddCustomer({...ex,unitIds:[...(ex.unitIds||[]),sellModal.id]},true);
    else onAddCustomer({id:genId(),...sf,createdDate:today(),unitIds:[sellModal.id]},false);
    showToast(`Sale recorded · Invoice ${invNo} · Booking ₹${bookAmt.toLocaleString("en-IN")} collected ✅`);
    setSellModal(null);
  };

  const openInvoice=u=>{ const c=customers.find(c=>c.unitIds?.includes(u.id)); const d=dispatches.find(d=>d.unitId===u.id); setInvModal({unit:u,customer:c,dispatch:d}); };

  const doDispatch=()=>{ const c=customers.find(c=>c.unitIds?.includes(dispModal.id)); onAddDispatch({id:genId(),unitId:dispModal.id,customerId:c?.id||"",invoiceNo:dispModal.invoiceNo,stage:"booked",...df}); showToast("Dispatch created 🚚"); setDispModal(null); };

  const markBookingPay=u=>{ onUpdate(u.id,{paymentReceived:false,bookingCollected:true}); showToast(`Booking payment confirmed for ${u.id} 💰`); setPayModal(null); };
  const markFullPay=u=>{ onUpdate(u.id,{paymentReceived:true,remainingAmount:0}); showToast(`Full payment received for ${u.id} 💰`); setPayModal(null); };

  // WhatsApp message builder using template from master
  const buildWaMsg=(unit,customer,dispatch)=>{
    const tpl=invoiceTemplate||DEFAULT_TEMPLATE;
    const rem=unit.remainingAmount||0;
    const booked=unit.bookingAmount||0;
    const total=unit.totalAmount||unit.salePrice||0;
    return tpl
      .replace(/\{company\}/g, invoiceTemplate?invoiceTemplate.split('\n')[0]?.replace('Company: ',''):"Nilkhant Enterprise")
      .replace(/\{invoice\}/g, unit.invoiceNo||"—")
      .replace(/\{customer\}/g, customer?.name||"Customer")
      .replace(/\{product\}/g, `${unit.brand} ${unit.tonnage} ${unit.model||""}`.trim())
      .replace(/\{unitId\}/g, unit.id)
      .replace(/\{lot\}/g, unit.lot||"—")
      .replace(/\{total\}/g, fmt(total))
      .replace(/\{booking\}/g, fmt(booked))
      .replace(/\{remaining\}/g, fmt(rem))
      .replace(/\{address\}/g, `${customer?.address||""} ${customer?.city||""} ${customer?.pincode||""}`.trim())
      .replace(/\{date\}/g, unit.soldDate||today())
      .replace(/\{partner\}/g, dispatch?.deliveryPartner||"—")
      .replace(/\{tracking\}/g, dispatch?.trackingNo||"—");
  };

  const openWaConfirm=(unit)=>{ const c=customers.find(c=>c.unitIds?.includes(unit.id)); const d=dispatches.find(d=>d.unitId===unit.id); setWaConfirm({unit,customer:c,dispatch:d,msg:buildWaMsg(unit,c,d)}); };

  const sendWa=()=>{ const p=(waConfirm.customer?.phone||"").replace(/\D/g,""); window.open(`https://wa.me/91${p}?text=${encodeURIComponent(waConfirm.msg)}`,"_blank"); setWaConfirm(null); };

  return <div>
    <div className="ph"><div><div className="pt">💰 Sales</div><div className="ps">Manage sales, invoices and dispatch</div></div></div>
    <div className="sg sg4">
      <div className="sc gr"><div className="sl">Available</div><div className="sv gr">{avail.length}</div></div>
      <div className="sc in"><div className="sl">Avail Value</div><div className="sv in" style={{fontSize:14}}>{fmt(avail.reduce((s,u)=>s+(u.salePrice||0),0))}</div></div>
      <div className="sc gy"><div className="sl">Sold</div><div className="sv gy">{sold.length}</div></div>
      <div className="sc am"><div className="sl">Revenue</div><div className="sv am" style={{fontSize:14}}>{fmt(sold.reduce((s,u)=>s+(u.salePrice||0),0))}</div></div>
    </div>
    <div className="filt">
      <div className={`chip ${tab==="available"?"on":""}`} onClick={()=>setTab("available")}>✅ Available ({avail.length})</div>
      <div className={`chip ${tab==="sold"?"on":""}`} onClick={()=>setTab("sold")}>💰 Sold ({sold.length})</div>
      <input className="srch" placeholder="Search ID, RFID, brand, lot, invoice, customer..." value={search} onChange={e=>setSearch(e.target.value)}/>
    </div>
    <div className="card"><div className="chd"><div className="ct">{tab==="available"?"✅ Available":"💰 Sold"} ({rows.length})</div></div>
      {rows.length===0?<div className="empty"><div className="ei">📭</div><div className="et">No units found</div></div>:(
        <div className="tw"><table>
          <thead><tr><th>ID</th><th>RFID</th><th>Location</th><th>Brand/Ton</th><th>Price</th>
            {tab==="sold"?<><th>Invoice</th><th>Customer</th><th>Booking</th><th>Remaining</th><th>Actions</th></>:<th>Action</th>}
          </tr></thead>
          <tbody>{rows.map(u=>{ const d=dispatches.find(x=>x.unitId===u.id); return <tr key={u.id}>
            <td><span className="uid">{u.id}</span></td>
            <td><span className="rtag">{u.rfidIn||"—"}</span><br/><span className="rtag">{u.rfidOut||"—"}</span></td>
            <td><WHLabel whId={u.warehouse} warehouses={warehouses}/></td>
            <td><b>{u.brand}</b><br/><span style={{fontSize:9.5,color:"var(--mu)"}}>{u.tonnage}</span></td>
            <td className="price">{fmt(u.salePrice)}</td>
            {tab==="sold"?<>
              <td><span className="invno">{u.invoiceNo||"—"}</span></td>
              <td><b style={{fontSize:11.5}}>{u.soldTo}</b><br/><span style={{fontSize:9.5,color:"var(--mu)"}}>{u.customerPhone}</span></td>
              <td><span style={{color:"var(--gr)",fontWeight:700}}>{fmt(u.bookingAmount||0)}</span>{!u.bookingCollected&&<div style={{fontSize:9,color:"var(--am)"}}>⏳ Pending</div>}{u.bookingCollected&&<div style={{fontSize:9,color:"var(--gr)"}}>✅ Collected</div>}</td>
              <td>{(u.remainingAmount||0)>0?<span style={{color:"var(--am)",fontWeight:700}}>{fmt(u.remainingAmount)}</span>:<span style={{color:"var(--gr)",fontSize:10.5}}>✅ Paid</span>}</td>
              <td><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                <button className="btn bb bsm" onClick={()=>openInvoice(u)}>🧾</button>
                <button className="btn bwa bsm" onClick={()=>openWaConfirm(u)}>💬</button>
                {!d&&<button className="btn bpu bsm" onClick={()=>setDispModal(u)}>🚚</button>}
                {d&&<StageBadge stage={d.stage}/>}
                {!u.paymentReceived&&<button className="btn bg2 bsm" onClick={()=>setPayModal(u)}>💰</button>}
              </div></td>
            </>:<td>{user.role==="admin"&&<button className="btn bp bsm" onClick={()=>{setSf({name:"",phone:"",altPhone:"",email:"",address:"",city:"",pincode:"",gst:"",soldDate:today(),bookingAmt:"",totalAmt:String(u.salePrice||"")});setSellModal(u);}}>Sell →</button>}</td>}
          </tr>; })}</tbody>
        </table></div>
      )}
    </div>

    {/* SELL MODAL with split payment */}
    {sellModal&&<div className="ov" onClick={e=>e.target===e.currentTarget&&setSellModal(null)}><div className="mo lg">
      <div className="mti">💰 Record Sale</div>
      <div className="msu"><span className="uid">{sellModal.id}</span> · {sellModal.brand} {sellModal.tonnage} · <span className="price">{fmt(sellModal.salePrice)}</span></div>
      <div style={{fontSize:10,color:"var(--ac2)",fontWeight:700,marginBottom:12,textTransform:"uppercase",letterSpacing:".7px"}}>Customer Information</div>
      <div className="fg2">
        <div className="fi"><label className="fl">Customer Name *</label><input className="fn" value={sf.name} onChange={e=>setSf(p=>({...p,name:e.target.value}))} placeholder="Full name"/></div>
        <div className="fi"><label className="fl">Phone *</label><input className="fn" value={sf.phone} onChange={e=>setSf(p=>({...p,phone:e.target.value}))}/></div>
        <div className="fi"><label className="fl">Alt Phone</label><input className="fn" value={sf.altPhone} onChange={e=>setSf(p=>({...p,altPhone:e.target.value}))}/></div>
        <div className="fi"><label className="fl">Email</label><input className="fn" value={sf.email} onChange={e=>setSf(p=>({...p,email:e.target.value}))}/></div>
        <div className="fi"><label className="fl">GST Number</label><input className="fn" value={sf.gst} onChange={e=>setSf(p=>({...p,gst:e.target.value}))}/></div>
        <div className="fi"><label className="fl">Sale Date</label><input type="date" className="fn" value={sf.soldDate} onChange={e=>setSf(p=>({...p,soldDate:e.target.value}))}/></div>
        <div className="fi full"><label className="fl">Address</label><input className="fn" value={sf.address} onChange={e=>setSf(p=>({...p,address:e.target.value}))}/></div>
        <div className="fi"><label className="fl">City</label><input className="fn" value={sf.city} onChange={e=>setSf(p=>({...p,city:e.target.value}))}/></div>
        <div className="fi"><label className="fl">Pincode</label><input className="fn" value={sf.pincode} onChange={e=>setSf(p=>({...p,pincode:e.target.value}))}/></div>
      </div>
      <div style={{height:1,background:"var(--b1)",margin:"14px 0"}}/>
      <div style={{fontSize:10,color:"var(--am)",fontWeight:700,marginBottom:12,textTransform:"uppercase",letterSpacing:".7px"}}>💰 Payment Split</div>
      <div className="fg2">
        <div className="fi">
          <label className="fl">Total Sale Amount ₹ *</label>
          <input type="number" className="fn" value={sf.totalAmt} onChange={e=>setSf(p=>({...p,totalAmt:e.target.value}))} placeholder={String(sellModal.salePrice||"")}/>
        </div>
        <div className="fi">
          <label className="fl">Booking Amount ₹ (collected now)</label>
          <input type="number" className="fn" value={sf.bookingAmt} onChange={e=>setSf(p=>({...p,bookingAmt:e.target.value}))} placeholder="e.g. 5000"/>
        </div>
      </div>
      {(sf.bookingAmt&&sf.totalAmt)&&<div className="al al-b" style={{marginTop:8}}>
        💰 <div>Collecting <strong>{fmt(Number(sf.bookingAmt))}</strong> now · Remaining <strong style={{color:"var(--am)"}}>{fmt(Number(sf.totalAmt)-Number(sf.bookingAmt))}</strong> on delivery</div>
      </div>}
      <div className="mac"><button className="btn bgh" onClick={()=>setSellModal(null)}>Cancel</button><button className="btn bp" onClick={doSell}>Confirm Sale & Invoice →</button></div>
    </div></div>}

    {/* DISPATCH MODAL */}
    {dispModal&&<div className="ov" onClick={e=>e.target===e.currentTarget&&setDispModal(null)}><div className="mo">
      <div className="mti">🚚 Create Dispatch</div><div className="msu"><span className="uid">{dispModal.id}</span></div>
      <div className="fg2">
        <div className="fi"><label className="fl">Delivery Partner</label><input className="fn" value={df.deliveryPartner} onChange={e=>setDf(p=>({...p,deliveryPartner:e.target.value}))} placeholder="BlueDart, DTDC..."/></div>
        <div className="fi"><label className="fl">Tracking Number</label><input className="fn" value={df.trackingNo} onChange={e=>setDf(p=>({...p,trackingNo:e.target.value}))}/></div>
        <div className="fi"><label className="fl">Booked Date</label><input type="date" className="fn" value={df.bookedDate} onChange={e=>setDf(p=>({...p,bookedDate:e.target.value}))}/></div>
        <div className="fi full"><label className="fl">Notes</label><textarea className="fn" value={df.notes} onChange={e=>setDf(p=>({...p,notes:e.target.value}))}/></div>
      </div>
      <div className="mac"><button className="btn bgh" onClick={()=>setDispModal(null)}>Cancel</button><button className="btn bp" onClick={doDispatch}>Create →</button></div>
    </div></div>}

    {/* PAYMENT MODAL */}
    {payModal&&<div className="ov" onClick={e=>e.target===e.currentTarget&&setPayModal(null)}><div className="mo">
      <div className="mti">💰 Confirm Payment</div>
      <div className="msu"><span className="uid">{payModal.id}</span> · <span className="invno">{payModal.invoiceNo}</span></div>
      <div className="al al-b">
        <div>
          <div>Total: <strong>{fmt(payModal.totalAmount||payModal.salePrice)}</strong></div>
          <div>Booking collected: <strong style={{color:"var(--gr)"}}>{fmt(payModal.bookingAmount||0)}</strong></div>
          <div>Remaining: <strong style={{color:"var(--am)"}}>{fmt(payModal.remainingAmount||0)}</strong></div>
        </div>
      </div>
      <div className="mac">
        <button className="btn bgh" onClick={()=>setPayModal(null)}>Cancel</button>
        {!payModal.bookingCollected&&<button className="btn ba" onClick={()=>markBookingPay(payModal)}>✅ Booking Collected</button>}
        <button className="btn bg2" onClick={()=>markFullPay(payModal)}>✅ Full Payment Received</button>
      </div>
    </div></div>}

    {/* WHATSAPP CONFIRMATION MODAL */}
    {waConfirm&&<div className="ov" onClick={e=>e.target===e.currentTarget&&setWaConfirm(null)}><div className="mo">
      <div className="mti">💬 Send WhatsApp Message</div>
      <div className="msu">Preview and edit before sending to {waConfirm.customer?.name} · 📞 {waConfirm.customer?.phone}</div>
      <div className="fi" style={{marginBottom:14}}>
        <label className="fl">Message Preview (editable)</label>
        <textarea className="fn" style={{minHeight:220,fontSize:12,fontFamily:"'JetBrains Mono',monospace"}} value={waConfirm.msg} onChange={e=>setWaConfirm(p=>({...p,msg:e.target.value}))}/>
      </div>
      <div className="al al-g">✅ <div>You can edit the message above before sending. Changes here do not affect saved data.</div></div>
      <div className="mac">
        <button className="btn bgh" onClick={()=>setWaConfirm(null)}>Cancel</button>
        <button className="btn bwa" onClick={sendWa}>💬 Open WhatsApp →</button>
      </div>
    </div></div>}

    {/* INVOICE MODAL */}
    {invModal&&<div className="ov" onClick={e=>e.target===e.currentTarget&&setInvModal(null)}><div className="mo inv">
      <div className="inv-sheet" id="inv-print">
        <div className="inv-hd">
          <div>
            <div className="inv-co">{invoiceTemplate?.companyName||"❄️ Nilkhant Enterprise"}</div>
            <div className="inv-cotag">{invoiceTemplate?.tagline||"Premium AC Sales · Your City"}</div>
            <div style={{fontSize:10,color:"#6B7280",marginTop:3}}>{invoiceTemplate?.gstLine||"GST: YOUR-GST-NO"}</div>
          </div>
          <div><div className="inv-no">{invModal.unit?.invoiceNo}</div><div className="inv-dt">{invModal.unit?.soldDate||today()}</div></div>
        </div>
        <div className="inv-parties">
          <div><div className="inv-plbl">Bill To</div><div className="inv-pname">{invModal.customer?.name||"—"}</div>
            <div className="inv-pdet">
              {invModal.customer?.phone&&<div>📞 {invModal.customer.phone}</div>}
              {invModal.customer?.altPhone&&<div>📞 Alt: {invModal.customer.altPhone}</div>}
              {invModal.customer?.email&&<div>✉️ {invModal.customer.email}</div>}
              {invModal.customer?.gst&&<div>GST: {invModal.customer.gst}</div>}
              {invModal.customer?.address&&<div>{invModal.customer.address}</div>}
              {invModal.customer?.city&&<div>{invModal.customer.city} {invModal.customer.pincode||""}</div>}
            </div>
          </div>
          <div><div className="inv-plbl">Dispatch</div>
            {invModal.dispatch?<div className="inv-pdet"><div>Partner: {invModal.dispatch.deliveryPartner||"—"}</div><div>Tracking: {invModal.dispatch.trackingNo||"—"}</div></div>:<div className="inv-pdet" style={{color:"#9CA3AF"}}>Not dispatched yet</div>}
          </div>
        </div>
        <table className="inv-tbl">
          <thead><tr><th>#</th><th>Description</th><th>Unit ID</th><th>Lot</th><th>Amount</th></tr></thead>
          <tbody><tr><td>1</td>
            <td><strong>{invModal.unit?.brand} {invModal.unit?.tonnage}</strong><br/><span style={{fontSize:10,color:"#6B7280"}}>{invModal.unit?.model} · Indoor + Outdoor Unit</span></td>
            <td style={{fontFamily:"monospace",fontSize:10.5}}>{invModal.unit?.id}</td>
            <td style={{fontFamily:"monospace",fontSize:10.5}}>{invModal.unit?.lot}</td>
            <td><strong>{fmt(invModal.unit?.totalAmount||invModal.unit?.salePrice)}</strong></td>
          </tr></tbody>
        </table>
        {/* PAYMENT BREAKDOWN */}
        <div className="inv-tot">
          <div className="inv-tot-row"><span>Subtotal</span><span>{fmt(invModal.unit?.totalAmount||invModal.unit?.salePrice)}</span></div>
          {invoiceTemplate?.showGst!==false&&<div className="inv-tot-row"><span>GST (18%)</span><span>{fmt(Math.round((invModal.unit?.totalAmount||invModal.unit?.salePrice||0)*.18))}</span></div>}
          <div className="inv-tot-final"><span>Total</span><span>{fmt(Math.round((invModal.unit?.totalAmount||invModal.unit?.salePrice||0)*(invoiceTemplate?.showGst!==false?1.18:1)))}</span></div>
          {(invModal.unit?.bookingAmount||0)>0&&<>
            <div className="inv-tot-row" style={{marginTop:8,color:"#065F46"}}><span>✅ Booking Collected</span><span>−{fmt(invModal.unit.bookingAmount)}</span></div>
            <div className="inv-tot-row" style={{color:(invModal.unit?.remainingAmount||0)>0?"#92400E":"#065F46",fontWeight:700}}><span>{(invModal.unit?.remainingAmount||0)>0?"⏳ Balance Due on Delivery":"✅ Fully Paid"}</span><span>{fmt(invModal.unit?.remainingAmount||0)}</span></div>
          </>}
        </div>
        {invoiceTemplate?.footer&&<div className="inv-footer">{invoiceTemplate.footer}</div>}
        {!invoiceTemplate?.footer&&<div className="inv-footer">Thank you for choosing {invoiceTemplate?.companyName||"Nilkhant Enterprise"}!</div>}
      </div>
      <div className="mac">
        <button className="btn bgh" onClick={()=>setInvModal(null)}>Close</button>
        <button className="btn bb" onClick={()=>window.print()}>🖨️ Print</button>
        <button className="btn bwa" onClick={()=>openWaConfirm(invModal.unit)}>💬 WhatsApp</button>
      </div>
    </div></div>}
  </div>;
}

function Dispatch({ dispatches, units, customers, warehouses, onUpdateDispatch, showToast }) {
  const [sf,setSf]=useState("all"); const [search,setSearch]=useState(""); const [det,setDet]=useState(null); const [sm,setSm]=useState(null);
  const enriched=dispatches.map(d=>({...d,unit:units.find(u=>u.id===d.unitId),customer:customers.find(c=>c.id===d.customerId)}));
  const filtered=enriched.filter(d=>{ const ms=sf==="all"||d.stage===sf; const q=search.toLowerCase(); return ms&&(!search||d.unitId.toLowerCase().includes(q)||(d.invoiceNo||"").toLowerCase().includes(q)||(d.customer?.name||"").toLowerCase().includes(q)||(d.trackingNo||"").toLowerCase().includes(q)); });
  const adv=(d,ns)=>{ const u={stage:ns}; if(ns==="delivered")u.deliveredDate=today(); if(ns==="paid")u.paymentReceivedDate=today(); onUpdateDispatch(d.id,u); showToast(`${d.unitId} → ${DISPATCH_STAGES.find(s=>s.id===ns)?.label} 🚚`); setSm(null); };
  const si=id=>DISPATCH_STAGES.findIndex(s=>s.id===id);
  const counts={}; DISPATCH_STAGES.forEach(s=>counts[s.id]=dispatches.filter(d=>d.stage===s.id).length);
  return <div>
    <div className="ph"><div><div className="pt">🚚 Dispatch</div><div className="ps">Track deliveries end-to-end</div></div></div>
    <div className="sg sg4">{DISPATCH_STAGES.map(s=><div key={s.id} className="sc bl"><div className="sl">{s.icon} {s.label}</div><div className="sv" style={{color:s.color}}>{counts[s.id]||0}</div></div>)}</div>
    <div className="filt">
      <div className={`chip ${sf==="all"?"on":""}`} onClick={()=>setSf("all")}>All ({dispatches.length})</div>
      {DISPATCH_STAGES.map(s=><div key={s.id} className={`chip ${sf===s.id?"on":""}`} onClick={()=>setSf(s.id)}>{s.icon} {s.label}</div>)}
      <input className="srch" placeholder="Search unit, invoice, customer, tracking..." value={search} onChange={e=>setSearch(e.target.value)}/>
    </div>
    {filtered.length===0?<div className="empty"><div className="ei">🚚</div><div className="et">No dispatches found</div></div>:filtered.map(d=>{
      const idx=si(d.stage); const next=DISPATCH_STAGES[idx+1];
      return <div key={d.id} className="dtcard">
        <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:9,flexWrap:"wrap"}}>
          <span className="uid">{d.unitId}</span><span className="invno">{d.invoiceNo||"—"}</span>
          <StageBadge stage={d.stage}/>
          <div style={{marginLeft:"auto",display:"flex",gap:6}}><button className="btn bb bsm" onClick={()=>setDet(d)}>Details</button>{next&&<button className="btn bp bsm" onClick={()=>setSm({d,next})}>{next.icon} {next.label} →</button>}</div>
        </div>
        <div style={{fontSize:11.5,color:"var(--mu2)",marginBottom:10}}>{d.unit?.brand} {d.unit?.tonnage} · {d.customer?.name||"—"} · 📞 {d.customer?.phone||"—"}</div>
        <div style={{display:"flex",alignItems:"center"}}>
          {DISPATCH_STAGES.map((s,i)=><>
            <div key={s.id} style={{display:"flex",flexDirection:"column",alignItems:"center",minWidth:56}}>
              <div style={{width:20,height:20,borderRadius:"50%",background:idx>=i?s.color:"rgba(255,255,255,.06)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,border:`2px solid ${idx>=i?s.color:"var(--b1)"}`,marginBottom:3,transition:"all .3s"}}>{idx>=i?s.icon:"·"}</div>
              <div style={{fontSize:8.5,color:idx===i?"var(--tx)":"var(--mu)",fontWeight:idx===i?700:400,textAlign:"center",lineHeight:1.3}}>{s.label}</div>
            </div>
            {i<DISPATCH_STAGES.length-1&&<div key={`l${i}`} style={{flex:1,height:2,background:idx>i?s.color:"rgba(255,255,255,.06)",marginBottom:14,transition:"background .3s"}}/>}
          </>)}
        </div>
        <div style={{marginTop:9,display:"flex",gap:12,fontSize:10.5,color:"var(--mu2)",flexWrap:"wrap"}}>
          {d.deliveryPartner&&<span>🚚 {d.deliveryPartner}</span>}{d.trackingNo&&<span>📦 {d.trackingNo}</span>}
          {d.bookedDate&&<span>📅 {d.bookedDate}</span>}{d.deliveredDate&&<span>✅ {d.deliveredDate}</span>}{d.paymentReceivedDate&&<span>💰 {d.paymentReceivedDate}</span>}
        </div>
      </div>;
    })}
    {det&&<div className="ov" onClick={e=>e.target===e.currentTarget&&setDet(null)}><div className="mo lg">
      <div className="mti">🚚 Dispatch Details</div><div className="msu"><span className="uid">{det.unitId}</span> · <span className="invno">{det.invoiceNo}</span></div>
      <div className="rdet-grid">{[["Stage",<StageBadge stage={det.stage}/>],["Customer",det.customer?.name||"—"],["Phone",det.customer?.phone||"—"],["Address",`${det.customer?.address||""} ${det.customer?.city||""}`],["Partner",det.deliveryPartner||"—"],["Tracking",det.trackingNo||"—"],["Booked",det.bookedDate||"—"],["Delivered",det.deliveredDate||"—"],["Payment",det.paymentReceivedDate||"—"],["Notes",det.notes||"—"]].map(([l,v],i)=><div key={i} className="rdet-cell"><div className="rdet-lbl">{l}</div><div className="rdet-val" style={{fontSize:11.5}}>{v}</div></div>)}</div>
      <div className="mac"><button className="btn bgh" onClick={()=>setDet(null)}>Close</button></div>
    </div></div>}
    {sm&&<div className="ov" onClick={e=>e.target===e.currentTarget&&setSm(null)}><div className="mo">
      <div className="mti">{sm.next.icon} Advance to "{sm.next.label}"</div><div className="msu"><span className="uid">{sm.d.unitId}</span> · {sm.d.customer?.name}</div>
      <div className="al al-b">Current: <strong>{DISPATCH_STAGES.find(s=>s.id===sm.d.stage)?.label}</strong> → <strong style={{color:sm.next.color}}>{sm.next.label}</strong></div>
      <div className="mac"><button className="btn bgh" onClick={()=>setSm(null)}>Cancel</button><button className="btn bp" onClick={()=>adv(sm.d,sm.next.id)}>Confirm →</button></div>
    </div></div>}
  </div>;
}


// ─── INVOICE BOOK ────────────────────────────────────────────────────────────
function InvoiceBook({ units, customers, dispatches, warehouses, onUpdate, showToast }) {
  const [search, setSearch] = useState("");
  const [filterPay, setFilterPay] = useState("all"); // all | paid | pending
  const [sortBy, setSortBy] = useState("date_desc");
  const [selInv, setSelInv] = useState(null); // full invoice view
  const [payModal, setPayModal] = useState(null);

  const soldUnits = units.filter(u => u.status === "sold" && u.invoiceNo);

  // Enrich with customer + dispatch
  const invoices = soldUnits.map(u => ({
    ...u,
    customer: customers.find(c => c.unitIds?.includes(u.id)),
    dispatch: dispatches.find(d => d.unitId === u.id),
    wh: warehouses.find(w => w.id === u.warehouse),
  }));

  // Filter
  const filtered = invoices.filter(inv => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      (inv.invoiceNo||"").toLowerCase().includes(q) ||
      (inv.soldTo||"").toLowerCase().includes(q) ||
      (inv.customerPhone||"").toLowerCase().includes(q) ||
      inv.id.toLowerCase().includes(q) ||
      (inv.brand||"").toLowerCase().includes(q);
    const matchPay = filterPay === "all" ||
      (filterPay === "paid" && inv.paymentReceived) ||
      (filterPay === "pending" && !inv.paymentReceived);
    return matchSearch && matchPay;
  });

  // Sort
  const sorted = [...filtered].sort((a,b) => {
    if(sortBy==="date_desc") return (b.soldDate||"").localeCompare(a.soldDate||"");
    if(sortBy==="date_asc")  return (a.soldDate||"").localeCompare(b.soldDate||"");
    if(sortBy==="amount_desc") return (b.totalAmount||b.salePrice||0)-(a.totalAmount||a.salePrice||0);
    if(sortBy==="inv_desc") return (b.invoiceNo||"").localeCompare(a.invoiceNo||"");
    return 0;
  });

  const totalRev  = filtered.reduce((s,u)=>s+(u.totalAmount||u.salePrice||0),0);
  const totalPend = filtered.reduce((s,u)=>s+(u.remainingAmount||0),0);
  const totalColl = filtered.reduce((s,u)=>s+(u.bookingAmount||0)+(u.paymentReceived?(u.remainingAmount||0):0),0);

  const markFullPay = u => {
    onUpdate(u.id, {paymentReceived:true, remainingAmount:0});
    showToast(`Full payment confirmed for ${u.invoiceNo} 💰`);
    setPayModal(null);
  };

  const dispStage = inv => {
    if(!inv.dispatch) return {label:"Not Dispatched", color:"var(--mu2)", icon:"📦"};
    const s = {booked:{label:"Booked",color:"#FBBF24",icon:"📋"},out:{label:"Out for Delivery",color:"#38BDF8",icon:"🚚"},delivered:{label:"Delivered",color:"#34D399",icon:"✅"},paid:{label:"Delivered & Paid",color:"#818CF8",icon:"💜"}};
    return s[inv.dispatch.stage] || {label:inv.dispatch.stage, color:"var(--mu2)", icon:"📦"};
  };

  const exportInvoices = () => {
    const load = cb => { if(!window.XLSX){ const s=document.createElement("script"); s.src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"; s.onload=cb; document.head.appendChild(s); } else cb(); };
    load(()=>{
      const rows = sorted.map(inv => ({
        "Invoice No": inv.invoiceNo||"",
        "Sale Date": inv.soldDate||"",
        "Unit ID": inv.id,
        "Brand": inv.brand,
        "Tonnage": inv.tonnage,
        "Model": inv.model||"",
        "Lot": inv.lot||"",
        "Warehouse": inv.wh?.name||"",
        "Customer Name": inv.soldTo||"",
        "Customer Phone": inv.customerPhone||"",
        "Customer City": inv.customer?.city||"",
        "Total Amount": inv.totalAmount||inv.salePrice||0,
        "Booking Paid": inv.bookingAmount||0,
        "Balance Due": inv.remainingAmount||0,
        "Payment Status": inv.paymentReceived?"Fully Paid":"Balance Pending",
        "Delivery Partner": inv.dispatch?.deliveryPartner||"",
        "Tracking No": inv.dispatch?.trackingNo||"",
        "Delivery Status": dispStage(inv).label,
        "Delivered Date": inv.dispatch?.deliveredDate||"",
        "Sold By": inv.soldBy||"",
      }));
      const wb = window.XLSX.utils.book_new();
      const ws = window.XLSX.utils.json_to_sheet(rows.length?rows:[{Message:"No invoices yet"}]);
      ws["!cols"] = [{wch:12},{wch:12},{wch:10},{wch:10},{wch:10},{wch:14},{wch:14},{wch:14},{wch:18},{wch:14},{wch:12},{wch:14},{wch:14},{wch:14},{wch:16},{wch:16},{wch:14},{wch:16},{wch:14},{wch:12}];
      window.XLSX.utils.book_append_sheet(wb, ws, "Invoice Book");
      window.XLSX.writeFile(wb, `Nilkhant_Invoice_Book_${new Date().toISOString().slice(0,10)}.xlsx`);
    });
  };

  return <div>
    <div className="ph">
      <div><div className="pt">🧾 Invoice Book</div><div className="ps">All sale invoices — complete payment & delivery tracking</div></div>
      <div className="ph-act">
        <button className="btn bgr bsm" onClick={exportInvoices}>📥 Export Excel</button>
      </div>
    </div>

    {/* SUMMARY STATS */}
    <div className="sg sg3" style={{marginBottom:14}}>
      <div className="sc gy"><div className="sl">Total Invoices</div><div className="sv gy">{filtered.length}</div><div className="sh">of {invoices.length} total</div></div>
      <div className="sc gr"><div className="sl">Revenue</div><div className="sv gr" style={{fontSize:17}}>{fmt(totalRev)}</div><div className="sh">collected: {fmt(totalColl)}</div></div>
      <div className="sc am"><div className="sl">Balance Pending</div><div className="sv am" style={{fontSize:17}}>{fmt(totalPend)}</div><div className="sh">{filtered.filter(u=>!u.paymentReceived).length} invoices</div></div>
    </div>

    {/* FILTERS */}
    <div className="filt">
      <div className={`chip ${filterPay==="all"?"on":""}`} onClick={()=>setFilterPay("all")}>All ({invoices.length})</div>
      <div className={`chip ${filterPay==="paid"?"on":""}`} onClick={()=>setFilterPay("paid")}>✅ Fully Paid ({invoices.filter(u=>u.paymentReceived).length})</div>
      <div className={`chip ${filterPay==="pending"?"on":""}`} onClick={()=>setFilterPay("pending")}>⏳ Balance Pending ({invoices.filter(u=>!u.paymentReceived).length})</div>
      <select className="fs" style={{maxWidth:180,padding:"6px 10px",fontSize:12}} value={sortBy} onChange={e=>setSortBy(e.target.value)}>
        <option value="date_desc">Newest First</option>
        <option value="date_asc">Oldest First</option>
        <option value="amount_desc">Highest Amount</option>
        <option value="inv_desc">Invoice No ↓</option>
      </select>
      <input className="srch" placeholder="Search invoice, customer, phone, unit..." value={search} onChange={e=>setSearch(e.target.value)}/>
    </div>

    {/* INVOICE CARDS */}
    {sorted.length===0
      ?<div className="empty"><div className="ei">🧾</div><div className="et">No invoices found</div></div>
      :sorted.map(inv => {
        const ds = dispStage(inv);
        const hasBalance = (inv.remainingAmount||0) > 0;
        return <div key={inv.id} style={{background:"var(--s1)",border:`1px solid ${hasBalance?"rgba(251,191,36,.25)":"var(--b1)"}`,borderRadius:10,padding:15,marginBottom:10,transition:"border-color .15s"}}
          onMouseEnter={e=>e.currentTarget.style.borderColor=hasBalance?"rgba(251,191,36,.5)":"rgba(255,255,255,.12)"}
          onMouseLeave={e=>e.currentTarget.style.borderColor=hasBalance?"rgba(251,191,36,.25)":"var(--b1)"}>

          {/* TOP ROW */}
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10,flexWrap:"wrap",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{background:"rgba(129,140,248,.1)",border:"1px solid rgba(129,140,248,.2)",borderRadius:8,padding:"6px 10px",textAlign:"center",minWidth:80}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"var(--ac2)",fontWeight:700}}>{inv.invoiceNo}</div>
                <div style={{fontSize:9.5,color:"var(--mu)",marginTop:2}}>{inv.soldDate||"—"}</div>
              </div>
              <div>
                <div style={{fontWeight:800,fontSize:14}}>{inv.soldTo||"—"}</div>
                <div style={{fontSize:11,color:"var(--mu2)",marginTop:2}}>
                  📞 {inv.customerPhone||"—"}
                  {inv.customer?.city&&<> · 📍 {inv.customer.city}</>}
                </div>
              </div>
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
              {/* Payment status */}
              {inv.paymentReceived
                ?<span className="badge" style={{background:"rgba(52,211,153,.12)",color:"var(--gr)"}}>✅ Fully Paid</span>
                :<span className="badge" style={{background:"rgba(251,191,36,.12)",color:"var(--am)"}}>⏳ Balance Pending</span>
              }
              {/* Delivery status */}
              <span className="badge" style={{background:`${ds.color}18`,color:ds.color}}>{ds.icon} {ds.label}</span>
              {/* Actions */}
              <button className="btn bb bsm" onClick={()=>setSelInv(inv)}>View</button>
              {!inv.paymentReceived&&<button className="btn bg2 bsm" onClick={()=>setPayModal(inv)}>💰 Mark Paid</button>}
            </div>
          </div>

          {/* PRODUCT ROW */}
          <div style={{display:"flex",gap:16,flexWrap:"wrap",padding:"10px 12px",background:"rgba(255,255,255,.02)",borderRadius:7,marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:18}}>❄️</span>
              <div>
                <div style={{fontSize:12,fontWeight:700}}>{inv.brand} {inv.tonnage}</div>
                <div style={{fontSize:10.5,color:"var(--mu2)"}}>{inv.model||"AC Unit"} · <span className="uid">{inv.id}</span></div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:4,fontSize:10.5,color:"var(--mu2)"}}>
              <span className="lot">{inv.lot||"—"}</span>
            </div>
            {inv.wh&&<div style={{display:"flex",alignItems:"center",gap:4,fontSize:10.5,color:"var(--mu2)"}}>
              <span className="whlabel">🏭 {inv.wh.name}</span>
            </div>}
            {inv.soldBy&&<div style={{fontSize:10.5,color:"var(--mu2)"}}>👤 {inv.soldBy}</div>}
          </div>

          {/* PAYMENT ROW */}
          <div style={{display:"flex",gap:0,border:"1px solid var(--b1)",borderRadius:8,overflow:"hidden"}}>
            {[
              ["Total Amount",   fmt(inv.totalAmount||inv.salePrice),  "var(--ac)"],
              ["Booking Paid",   fmt(inv.bookingAmount||0),             "var(--gr)"],
              ["Balance Due",    fmt(inv.remainingAmount||0),           hasBalance?"var(--am)":"var(--gr)"],
            ].map(([label,val,color],i)=><div key={i} style={{flex:1,padding:"8px 12px",borderRight:i<2?"1px solid var(--b1)":"none",textAlign:"center"}}>
              <div style={{fontSize:11,fontWeight:700,color}}>{val}</div>
              <div style={{fontSize:9.5,color:"var(--mu)",marginTop:2}}>{label}</div>
            </div>)}
            {inv.dispatch?.deliveredDate&&<div style={{flex:1,padding:"8px 12px",textAlign:"center",borderLeft:"1px solid var(--b1)"}}>
              <div style={{fontSize:11,fontWeight:700,color:"var(--gr)"}}>✅ {inv.dispatch.deliveredDate}</div>
              <div style={{fontSize:9.5,color:"var(--mu)",marginTop:2}}>Delivered</div>
            </div>}
          </div>
        </div>;
      })
    }

    {/* FULL INVOICE VIEW MODAL */}
    {selInv&&<div className="ov" onClick={e=>e.target===e.currentTarget&&setSelInv(null)}>
      <div className="mo" style={{maxWidth:600,maxHeight:"93vh",overflowY:"auto"}}>
        <div className="inv-sheet">
          <div className="inv-hd">
            <div><div className="inv-co">❄️ Nilkhant Enterprise</div><div className="inv-cotag">AC Sales & Service</div></div>
            <div><div className="inv-no">{selInv.invoiceNo}</div><div className="inv-dt">{selInv.soldDate||today()}</div></div>
          </div>
          <div className="inv-parties">
            <div><div className="inv-plbl">Bill To</div><div className="inv-pname">{selInv.soldTo||"—"}</div>
              <div className="inv-pdet">
                {selInv.customerPhone&&<div>📞 {selInv.customerPhone}</div>}
                {selInv.customer?.altPhone&&<div>📞 Alt: {selInv.customer.altPhone}</div>}
                {selInv.customer?.email&&<div>✉️ {selInv.customer.email}</div>}
                {selInv.customer?.gst&&<div>GST: {selInv.customer.gst}</div>}
                {selInv.customer?.address&&<div>{selInv.customer.address}</div>}
                {selInv.customer?.city&&<div>{selInv.customer.city} {selInv.customer?.pincode||""}</div>}
              </div>
            </div>
            <div><div className="inv-plbl">Delivery</div>
              <div className="inv-pdet">
                <div>Status: <strong>{dispStage(selInv).label}</strong></div>
                {selInv.dispatch?.deliveryPartner&&<div>Partner: {selInv.dispatch.deliveryPartner}</div>}
                {selInv.dispatch?.trackingNo&&<div>Tracking: {selInv.dispatch.trackingNo}</div>}
                {selInv.dispatch?.deliveredDate&&<div>Delivered: {selInv.dispatch.deliveredDate}</div>}
              </div>
            </div>
          </div>
          <table className="inv-tbl">
            <thead><tr><th>Description</th><th>Unit ID</th><th>Lot</th><th>Amount</th></tr></thead>
            <tbody><tr>
              <td><strong>{selInv.brand} {selInv.tonnage}</strong><br/><span style={{fontSize:10,color:"#6B7280"}}>{selInv.model||"AC Unit"} · Indoor + Outdoor</span></td>
              <td style={{fontFamily:"monospace",fontSize:10.5}}>{selInv.id}</td>
              <td style={{fontFamily:"monospace",fontSize:10.5}}>{selInv.lot}</td>
              <td><strong>{fmt(selInv.totalAmount||selInv.salePrice)}</strong></td>
            </tr></tbody>
          </table>
          <div className="inv-tot">
            <div className="inv-tot-row"><span>Subtotal</span><span>{fmt(selInv.totalAmount||selInv.salePrice)}</span></div>
            <div className="inv-tot-final"><span>Total</span><span>{fmt(selInv.totalAmount||selInv.salePrice)}</span></div>
            {(selInv.bookingAmount||0)>0&&<>
              <div className="inv-tot-row" style={{marginTop:8,color:"#065F46"}}><span>✅ Booking Collected</span><span>−{fmt(selInv.bookingAmount)}</span></div>
              <div className="inv-tot-row" style={{color:(selInv.remainingAmount||0)>0?"#92400E":"#065F46",fontWeight:700}}><span>{(selInv.remainingAmount||0)>0?"⏳ Balance Due on Delivery":"✅ Fully Paid"}</span><span>{fmt(selInv.remainingAmount||0)}</span></div>
            </>}
          </div>
          <div className="inv-footer">Thank you for choosing Nilkhant Enterprise!</div>
        </div>
        <div className="mac">
          <button className="btn bgh" onClick={()=>setSelInv(null)}>Close</button>
          <button className="btn bb" onClick={()=>window.print()}>🖨️ Print</button>
          <button className="btn bwa" onClick={()=>{ const p=(selInv.customerPhone||"").replace(/\D/g,""); const msg=encodeURIComponent("🧾 Invoice: "+selInv.invoiceNo+"\n❄️ Nilkhant Enterprise\n\nDear "+selInv.soldTo+",\n\nProduct: "+selInv.brand+" "+selInv.tonnage+"\nUnit ID: "+selInv.id+"\nTotal: "+fmt(selInv.totalAmount||selInv.salePrice)+"\nBalance Due: "+fmt(selInv.remainingAmount||0)+"\n\nThank you! 🙏"); window.open("https://wa.me/91"+p+"?text="+msg,"_blank"); }}>💬 WhatsApp</button>
          {!selInv.paymentReceived&&<button className="btn bg2" onClick={()=>{setPayModal(selInv);setSelInv(null);}}>💰 Mark Paid</button>}
        </div>
      </div>
    </div>}

    {/* PAYMENT CONFIRMATION */}
    {payModal&&<div className="ov" onClick={e=>e.target===e.currentTarget&&setPayModal(null)}><div className="mo" style={{maxWidth:400}}>
      <div className="mti">💰 Confirm Full Payment</div>
      <div className="msu"><span className="invno">{payModal.invoiceNo}</span> · {payModal.soldTo}</div>
      <div className="al al-b">Balance due: <strong>{fmt(payModal.remainingAmount||0)}</strong></div>
      <div className="mac">
        <button className="btn bgh" onClick={()=>setPayModal(null)}>Cancel</button>
        <button className="btn bg2" onClick={()=>markFullPay(payModal)}>✅ Confirm Full Payment Received</button>
      </div>
    </div></div>}
  </div>;
}

// ─── CUSTOMERS ─────────────────────────────────────────────────────────────────
function Customers({ customers, units, dispatches }) {
  const [search,setSearch]=useState(""); const [det,setDet]=useState(null);
  const filtered=customers.filter(c=>{ const q=search.toLowerCase(); return !search||c.name.toLowerCase().includes(q)||c.phone.includes(q)||(c.city||"").toLowerCase().includes(q); });
  return <div>
    <div className="ph"><div><div className="pt">👥 Customers</div><div className="ps">All customer records from sales</div></div></div>
    <div className="sg sg3">
      <div className="sc bl"><div className="sl">Customers</div><div className="sv bl">{customers.length}</div></div>
      <div className="sc gr"><div className="sl">Units Sold</div><div className="sv gr">{customers.reduce((s,c)=>s+(c.unitIds?.length||0),0)}</div></div>
      <div className="sc in"><div className="sl">Revenue</div><div className="sv in" style={{fontSize:14}}>{fmt(customers.reduce((s,c)=>s+(c.unitIds||[]).reduce((ss,id)=>{ const u=units.find(x=>x.id===id); return ss+(u?.salePrice||0); },0),0))}</div></div>
    </div>
    <div className="filt"><input className="srch" style={{maxWidth:340}} placeholder="Search name, phone, city..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
    <div className="card"><div className="chd"><div className="ct">Customer Records ({filtered.length})</div></div>
      {filtered.length===0?<div className="empty"><div className="ei">👥</div><div className="et">No customers yet</div></div>:(
        <div className="tw"><table><thead><tr><th>Customer</th><th>Phone</th><th>City</th><th>Units</th><th>Value</th><th>Joined</th><th>Action</th></tr></thead>
          <tbody>{filtered.map(c=>{ const cu=(c.unitIds||[]).map(id=>units.find(u=>u.id===id)).filter(Boolean); const val=cu.reduce((s,u)=>s+(u.salePrice||0),0); return <tr key={c.id}>
            <td><b style={{fontSize:12}}>{c.name}</b>{c.email&&<div style={{fontSize:9.5,color:"var(--mu)"}}>{c.email}</div>}</td>
            <td style={{fontSize:11}}>{c.phone}{c.altPhone&&<div style={{fontSize:9.5,color:"var(--mu)"}}>{c.altPhone}</div>}</td>
            <td style={{fontSize:11}}>{c.city||"—"}{c.pincode&&<span style={{color:"var(--mu)"}}> {c.pincode}</span>}</td>
            <td style={{color:"var(--ac)",fontWeight:700}}>{cu.length}</td>
            <td className="price">{fmt(val)}</td>
            <td style={{fontSize:10.5}}>{c.createdDate}</td>
            <td><div style={{display:"flex",gap:5}}><button className="btn bb bsm" onClick={()=>setDet(c)}>View</button><button className="btn bwa bsm" onClick={()=>{ const p=(c.phone||"").replace(/\D/g,""); window.open(`https://wa.me/91${p}`,"_blank"); }}>💬</button></div></td>
          </tr>; })}</tbody>
        </table></div>
      )}
    </div>
    {det&&<div className="ov" onClick={e=>e.target===e.currentTarget&&setDet(null)}><div className="mo lg">
      <div className="mti">👤 {det.name}</div><div className="msu">Since {det.createdDate}</div>
      <div className="rdet-grid">{[["Name",det.name],["Phone",det.phone],["Alt Phone",det.altPhone||"—"],["Email",det.email||"—"],["Address",det.address||"—"],["City/Pin",`${det.city||"—"} ${det.pincode||""}`],["GST",det.gst||"—"],["Units",(det.unitIds||[]).length]].map(([l,v],i)=><div key={i} className="rdet-cell"><div className="rdet-lbl">{l}</div><div className="rdet-val" style={{fontSize:11.5}}>{v}</div></div>)}</div>
      {(det.unitIds||[]).length>0&&<div style={{marginTop:12}}><div style={{fontSize:9.5,fontWeight:700,color:"var(--mu2)",textTransform:"uppercase",letterSpacing:".7px",marginBottom:7}}>Purchased</div>{det.unitIds.map(id=>{ const u=units.find(x=>x.id===id); const d=dispatches.find(x=>x.unitId===id); return u?<div key={id} style={{background:"var(--bg)",borderRadius:7,padding:"8px 11px",marginBottom:5,display:"flex",alignItems:"center",gap:9,flexWrap:"wrap"}}><span className="uid">{u.id}</span><span style={{fontSize:11.5}}>{u.brand} {u.tonnage}</span><span className="invno">{u.invoiceNo||"—"}</span><span className="price">{fmt(u.salePrice)}</span>{d&&<StageBadge stage={d.stage}/>}{u.paymentReceived&&<span style={{fontSize:10.5,color:"var(--gr)"}}>💰 Paid</span>}</div>:null; })}</div>}
      <div className="mac"><button className="btn bgh" onClick={()=>setDet(null)}>Close</button><button className="btn bwa" onClick={()=>{ const p=(det.phone||"").replace(/\D/g,""); window.open(`https://wa.me/91${p}`,"_blank"); }}>💬 WhatsApp</button></div>
    </div></div>}
  </div>;
}

// ─── MASTER PAGE ──────────────────────────────────────────────────────────────
// ─── MASTER PAGE (v7: added Invoice Template tab) ────────────────────────────
function MasterPage({ lots,brands,tonnages,warehouses,users,invoiceTemplate,onLotsChange,onBrandsChange,onTonnagesChange,onWHChange,onUsersChange,onInvoiceTemplateChange,showToast }) {
  const [tab,setTab]=useState("wh"); const [modal,setModal]=useState(null); const [form,setForm]=useState({}); const f=v=>setForm(p=>({...p,...v}));
  const [umod,setUmod]=useState(null); const [uform,setUform]=useState({}); const uf=v=>setUform(p=>({...p,...v}));
  const [invForm,setInvForm]=useState(invoiceTemplate||{companyName:"Nilkhant Enterprise",tagline:"Premium AC Sales · Your City",gstLine:"GST: YOUR-GST-NUMBER",footer:"Thank you for your business!",showGst:true,waTemplate:DEFAULT_TEMPLATE});
  const sets={ lots:{data:lots,set:onLotsChange,key:"number",label:"Lot Number"}, brands:{data:brands,set:onBrandsChange,key:"name",label:"Brand Name"}, tonnages:{data:tonnages,set:onTonnagesChange,key:"value",label:"Tonnage"}, wh:{data:warehouses,set:onWHChange,key:"name",label:"Warehouse Name"} };
  const openAdd=t=>{setModal({t,item:null});setForm({createdDate:today()});}; const openEdit=(t,item)=>{setModal({t,item});setForm({...item});};
  const save=()=>{ const{t,item}=modal; const s=sets[t]; if(!form[s.key])return; const id=genId(); item?s.set(s.data.map(x=>x.id===item.id?{...x,...form}:x)):s.set([...s.data,{...form,id}]); setModal(null);showToast("Saved ✅"); };
  const del=(t,id)=>{ const s=sets[t]; s.set(s.data.filter(x=>x.id!==id)); showToast("Deleted","warn"); };
  const saveUser=()=>{ if(!uform.name||!uform.username||!uform.password)return; const item=umod.item; item?onUsersChange(users.map(u=>u.id===item.id?{...u,...uform}:u)):onUsersChange([...users,{...uform,id:genId()}]); setUmod(null);showToast("User saved ✅"); };
  const togMod=mid=>{ const m=uform.modules||[]; setUform(p=>({...p,modules:m.includes(mid)?m.filter(x=>x!==mid):[...m,mid]})); };
  const TABS=[{id:"wh",l:"🏭 Warehouses"},{id:"lots",l:"📦 Lots"},{id:"brands",l:"🏷️ Brands"},{id:"tonnages",l:"📐 Tonnage"},{id:"users",l:"👤 Users"},{id:"perms",l:"🔐 Perms"},{id:"invoice",l:"🧾 Invoice"}];

  const MasterSection = ({ type }) => {
    const s=sets[type]; const extraCols=type==="wh"?["location"]:[];
    return <div className="card"><div className="chd"><div><div className="ct">{type==="wh"?"🏭 Warehouse Master":type==="lots"?"📦 Lot Master":type==="brands"?"🏷️ Brand Master":"📐 Tonnage Master"}</div><div className="cs">Only items here appear in Stock Intake dropdowns</div></div><button className="btn bp" onClick={()=>openAdd(type)}>+ Add</button></div>
      {s.data.length===0?<div className="empty"><div className="et">No records yet</div></div>:(
        <div className="tw"><table><thead><tr><th>{s.label}</th>{extraCols.map(c=><th key={c}>{c}</th>)}<th>Created Date</th><th>Remark</th><th>Actions</th></tr></thead>
          <tbody>{s.data.map(item=><tr key={item.id}>
            <td style={{fontWeight:600}}>{item[s.key]}</td>
            {extraCols.map(c=><td key={c} style={{fontSize:11,color:"var(--mu2)"}}>{item[c]||"—"}</td>)}
            <td style={{fontSize:10.5}}>{item.createdDate}</td>
            <td style={{fontSize:11,color:"var(--mu2)"}}>{item.remark||"—"}</td>
            <td><div style={{display:"flex",gap:5}}><button className="btn bb bsm" onClick={()=>openEdit(type,item)}>Edit</button><button className="btn br bsm" onClick={()=>del(type,item.id)}>Del</button></div></td>
          </tr>)}</tbody>
        </table></div>
      )}
    </div>;
  };

  return <div>
    <div className="ph"><div><div className="pt">⚙️ Master & Admin</div><div className="ps">Admin only</div></div></div>
    <div className="mtabs">{TABS.map(t=><button key={t.id} className={`mtab ${tab===t.id?"on":""}`} onClick={()=>setTab(t.id)}>{t.l}</button>)}</div>
    {(tab==="wh"||tab==="lots"||tab==="brands"||tab==="tonnages")&&<MasterSection type={tab}/>}

    {tab==="users"&&<div className="card"><div className="chd"><div><div className="ct">👤 Users ({users.length})</div></div><button className="btn bp" onClick={()=>{setUmod({item:null});setUform({name:"",username:"",password:"",role:"technician",modules:["dashboard"],createdDate:today()});}}>+ Add</button></div>
      <div className="tw"><table><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Modules</th><th>Actions</th></tr></thead>
        <tbody>{users.map(u=><tr key={u.id}>
          <td><div style={{display:"flex",alignItems:"center",gap:7}}><div style={{width:24,height:24,borderRadius:"50%",background:"linear-gradient(135deg,var(--ac),var(--ac2))",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:10,flexShrink:0}}>{u.name[0]}</div><span style={{fontWeight:600,fontSize:11.5}}>{u.name}</span></div></td>
          <td style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10.5,color:"var(--ac)"}}>{u.username}</td>
          <td><span className="badge" style={{background:u.role==="admin"?"rgba(251,191,36,.12)":"rgba(56,189,248,.12)",color:u.role==="admin"?"var(--am)":"var(--ac)"}}>{u.role}</span></td>
          <td style={{fontSize:10.5,color:"var(--mu2)"}}>{(u.modules||[]).length} modules</td>
          <td><div style={{display:"flex",gap:5}}><button className="btn bb bsm" onClick={()=>{setUmod({item:u});setUform({...u});}}>Edit</button>{u.role!=="admin"&&<button className="btn br bsm" onClick={()=>{ onUsersChange(users.filter(x=>x.id!==u.id)); showToast("Deleted","warn"); }}>Del</button>}</div></td>
        </tr>)}</tbody>
      </table></div>
    </div>}

    {tab==="perms"&&<div className="card"><div className="chd"><div className="ct">🔐 Permission Matrix</div></div>
      <div className="tw"><table><thead><tr><th>User</th>{ALL_MODULES.map(m=><th key={m.id} style={{textAlign:"center"}}>{m.icon}<br/><span style={{fontSize:8}}>{m.label.split(" ")[0]}</span></th>)}</tr></thead>
        <tbody>{users.map(u=><tr key={u.id}><td><b style={{fontSize:11.5}}>{u.name}</b><br/><span style={{fontSize:9.5,color:"var(--mu)"}}>{u.role}</span></td>{ALL_MODULES.map(m=><td key={m.id} style={{textAlign:"center"}}>{(u.modules||[]).includes(m.id)?<span style={{color:"var(--gr)"}}>✅</span>:<span style={{color:"#1E293B"}}>✗</span>}</td>)}</tr>)}</tbody>
      </table></div>
    </div>}

    {/* INVOICE TEMPLATE TAB */}
    {tab==="invoice"&&<div>
      <div className="card">
        <div className="chd"><div><div className="ct">🧾 Invoice & WhatsApp Template</div><div className="cs">Customise your invoice header and WhatsApp message format</div></div></div>
        <div className="al al-b">ℹ️ <div>Changes here affect all new invoices and WhatsApp messages. Use <code style={{fontFamily:"monospace",fontSize:11}}>{"{variable}"}</code> placeholders in the WhatsApp template.</div></div>
        <div className="fg2" style={{marginBottom:14}}>
          <div className="fi"><label className="fl">Company Name</label><input className="fn" value={invForm.companyName||""} onChange={e=>setInvForm(p=>({...p,companyName:e.target.value}))} placeholder="Your company name"/></div>
          <div className="fi"><label className="fl">Tagline</label><input className="fn" value={invForm.tagline||""} onChange={e=>setInvForm(p=>({...p,tagline:e.target.value}))} placeholder="e.g. Premium AC Sales"/></div>
          <div className="fi"><label className="fl">GST Line</label><input className="fn" value={invForm.gstLine||""} onChange={e=>setInvForm(p=>({...p,gstLine:e.target.value}))} placeholder="GST: YOUR-NUMBER"/></div>
          <div className="fi"><label className="fl">Invoice Footer</label><input className="fn" value={invForm.footer||""} onChange={e=>setInvForm(p=>({...p,footer:e.target.value}))} placeholder="Thank you message..."/></div>
          <div className="fi full" style={{flexDirection:"row",alignItems:"center",gap:12}}>
            <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13}}>
              <input type="checkbox" checked={invForm.showGst!==false} onChange={e=>setInvForm(p=>({...p,showGst:e.target.checked}))} style={{accentColor:"var(--ac)",width:14,height:14}}/>
              Show GST 18% on invoice
            </label>
          </div>
        </div>
        <div className="fi" style={{marginBottom:14}}>
          <label className="fl">WhatsApp Message Template</label>
          <div style={{fontSize:10.5,color:"var(--mu2)",marginBottom:6}}>Available placeholders: <code style={{fontFamily:"monospace",color:"var(--ac2)"}}>&#123;company&#125; &#123;invoice&#125; &#123;customer&#125; &#123;product&#125; &#123;unitId&#125; &#123;lot&#125; &#123;total&#125; &#123;booking&#125; &#123;remaining&#125; &#123;address&#125; &#123;date&#125; &#123;partner&#125; &#123;tracking&#125;</code></div>
          <textarea className="fn" style={{minHeight:200,fontSize:12,fontFamily:"'JetBrains Mono',monospace"}} value={invForm.waTemplate||DEFAULT_TEMPLATE} onChange={e=>setInvForm(p=>({...p,waTemplate:e.target.value}))}/>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn bp" onClick={()=>{onInvoiceTemplateChange(invForm);showToast("Invoice template saved ✅");}}>Save Template →</button>
          <button className="btn bgh" onClick={()=>{setInvForm({companyName:"Nilkhant Enterprise",tagline:"Premium AC Sales · Your City",gstLine:"GST: YOUR-GST-NUMBER",footer:"Thank you for your business!",showGst:true,waTemplate:DEFAULT_TEMPLATE});showToast("Reset to default","warn");}}>Reset Default</button>
        </div>
      </div>
    </div>}

    {modal&&<div className="ov" onClick={e=>e.target===e.currentTarget&&setModal(null)}><div className="mo">
      <div className="mti">{modal.item?"Edit":"Add"} {sets[modal.t].label}</div>
      <div className="fg2">
        <div className="fi"><label className="fl">{sets[modal.t].label} *</label><input className="fn" value={form[sets[modal.t].key]||""} onChange={e=>f({[sets[modal.t].key]:e.target.value})} placeholder={modal.t==="wh"?"e.g. Warehouse 3":modal.t==="lots"?"LOT-2024-XXX":modal.t==="brands"?"e.g. Carrier":"e.g. 3.5 Ton"}/></div>
        <div className="fi"><label className="fl">Created Date</label><input type="date" className="fn" value={form.createdDate||""} onChange={e=>f({createdDate:e.target.value})}/></div>
        {modal.t==="wh"&&<div className="fi full"><label className="fl">Location / Address</label><input className="fn" value={form.location||""} onChange={e=>f({location:e.target.value})} placeholder="e.g. MIDC, Thane"/></div>}
        <div className="fi full"><label className="fl">Remark</label><input className="fn" value={form.remark||""} onChange={e=>f({remark:e.target.value})} placeholder="Optional..."/></div>
      </div>
      <div className="mac"><button className="btn bgh" onClick={()=>setModal(null)}>Cancel</button><button className="btn bp" onClick={save}>Save →</button></div>
    </div></div>}

    {umod&&<div className="ov" onClick={e=>e.target===e.currentTarget&&setUmod(null)}><div className="mo">
      <div className="mti">{umod.item?"Edit":"Add"} User</div><div className="msu">Set credentials and assign module access</div>
      <div className="fg2">
        <div className="fi"><label className="fl">Full Name *</label><input className="fn" value={uform.name||""} onChange={e=>uf({name:e.target.value})}/></div>
        <div className="fi"><label className="fl">Username *</label><input className="fn" value={uform.username||""} onChange={e=>uf({username:e.target.value})}/></div>
        <div className="fi"><label className="fl">Password *</label><input type="password" className="fn" value={uform.password||""} onChange={e=>uf({password:e.target.value})}/></div>
        <div className="fi"><label className="fl">Role</label><select className="fs" value={uform.role||"technician"} onChange={e=>uf({role:e.target.value})}><option value="technician">Technician</option><option value="sales">Sales</option><option value="manager">Manager</option><option value="admin">Admin</option></select></div>
      </div>
      <div style={{marginTop:11}}><div className="fl" style={{marginBottom:8}}>MODULE ACCESS</div>
        <div className="mod-grid">{ALL_MODULES.map(m=>{ const chk=(uform.modules||[]).includes(m.id); return <div key={m.id} className={`mod-item ${chk?"chk":""}`} onClick={()=>togMod(m.id)}><div className="mod-chk">{chk&&<span style={{fontSize:8,color:"#fff",fontWeight:900}}>✓</span>}</div><span style={{fontSize:11}}>{m.icon} {m.label}</span></div>; })}</div>
      </div>
      <div className="mac"><button className="btn bgh" onClick={()=>setUmod(null)}>Cancel</button><button className="btn bp" onClick={saveUser}>Save User →</button></div>
    </div></div>}
  </div>;
}



// ─── REPORTS (Admin only) ────────────────────────────────────────────────────
function Reports({ units, customers, dispatches, warehouses, lots }) {
  const [rpt, setRpt] = useState("sales");
  const [from, setFrom] = useState(() => { const d=new Date(); d.setDate(1); return d.toISOString().split("T")[0]; });
  const [to,   setTo]   = useState(() => new Date().toISOString().split("T")[0]);

  const inRange = u => { if(!u.soldDate) return false; return u.soldDate>=from&&u.soldDate<=to; };
  const inRangeRec = u => { if(!u.receivedDate) return false; return u.receivedDate>=from&&u.receivedDate<=to; };

  const soldUnits  = units.filter(u=>u.status==="sold"&&inRange(u));
  const recUnits   = units.filter(u=>inRangeRec(u));
  const totalRev   = soldUnits.reduce((s,u)=>s+(u.totalAmount||u.salePrice||0),0);
  const collected  = soldUnits.reduce((s,u)=>s+(u.bookingAmount||0)+(u.paymentReceived?u.remainingAmount||0:0),0);
  const pending    = soldUnits.reduce((s,u)=>s+(u.remainingAmount||0),0);

  const whName = id => warehouses.find(w=>w.id===id)?.name||id||"—";
  const cols   = ["#38BDF8","#34D399","#FBBF24","#F87171","#818CF8","#94A3B8","#6EE7B7","#FCA5A5"];

  const RPT_TABS = [
    {id:"sales",    l:"💰 Sales"},
    {id:"stock",    l:"📦 Stock Flow"},
    {id:"payment",  l:"💳 Payment"},
    {id:"customer", l:"👥 Customer"},
    {id:"warehouse",l:"🏭 Warehouse"},
    {id:"tech",     l:"🔬 Technician"},
    {id:"lot",      l:"📋 Lot-wise"},
  ];

  // Export current report to Excel
  const exportReport = () => {
    const load = cb => { if(!window.XLSX){ const s=document.createElement("script"); s.src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"; s.onload=cb; document.head.appendChild(s); } else cb(); };
    load(()=>{
      const wb = window.XLSX.utils.book_new();
      let rows = [], sheetName = "Report";
      if(rpt==="sales"){
        sheetName="Sales Report";
        rows=soldUnits.map(u=>({ "Unit ID":u.id,"Invoice":u.invoiceNo||"","Brand":u.brand,"Tonnage":u.tonnage,"Lot":u.lot||"","Warehouse":whName(u.warehouse),"Customer":u.soldTo||"","Phone":u.customerPhone||"","Sale Date":u.soldDate||"","Total":u.totalAmount||u.salePrice||0,"Booking":u.bookingAmount||0,"Remaining":u.remainingAmount||0,"Payment":u.paymentReceived?"Received":"Pending" }));
      } else if(rpt==="stock"){
        sheetName="Stock Flow";
        rows=[...recUnits,...soldUnits].map(u=>({ "Unit ID":u.id,"Event":inRangeRec(u)?"Received":"","Brand":u.brand,"Tonnage":u.tonnage,"Status":u.status,"Date":u.receivedDate||u.soldDate||"","Warehouse":whName(u.warehouse) }));
      } else if(rpt==="payment"){
        sheetName="Payment Report";
        rows=soldUnits.map(u=>({ "Unit ID":u.id,"Invoice":u.invoiceNo||"","Customer":u.soldTo||"","Total":u.totalAmount||u.salePrice||0,"Booking Collected":u.bookingAmount||0,"Balance Due":u.remainingAmount||0,"Status":u.paymentReceived?"Fully Paid":"Pending Balance","Sale Date":u.soldDate||"" }));
      } else if(rpt==="customer"){
        sheetName="Customer Report";
        const custMap={};
        soldUnits.forEach(u=>{ const k=u.customerPhone||u.soldTo||"unknown"; if(!custMap[k])custMap[k]={name:u.soldTo,phone:u.customerPhone,units:[],total:0}; custMap[k].units.push(u.id); custMap[k].total+=u.totalAmount||u.salePrice||0; });
        rows=Object.values(custMap).map(c=>({ "Customer":c.name||"—","Phone":c.phone||"—","Units Purchased":c.units.join(", "),"Count":c.units.length,"Total Value":c.total }));
      } else if(rpt==="warehouse"){
        sheetName="Warehouse Report";
        rows=warehouses.map(w=>{ const wu=units.filter(u=>u.warehouse===w.id); return { "Warehouse":w.name,"Total Units":wu.length,"Available":wu.filter(u=>u.status==="available").length,"Pending QC":wu.filter(u=>u.status==="pending_qc").length,"Under Repair":wu.filter(u=>u.status==="under_repair").length,"Sold":wu.filter(u=>u.status==="sold").length,"Stock Value":wu.filter(u=>u.status==="available").reduce((s,u)=>s+(u.salePrice||0),0) }; });
      } else if(rpt==="tech"){
        sheetName="Technician Report";
        const techMap={};
        units.filter(u=>u.testedBy).forEach(u=>{ const k=u.testedBy; if(!techMap[k])techMap[k]={name:k,passed:0,failed:0,repaired:0}; if(u.status==="available")techMap[k].passed++; if(u.status==="under_repair")techMap[k].failed++; });
        rows=Object.values(techMap).map(t=>({ "Technician":t.name,"Units Tested":t.passed+t.failed,"Passed":t.passed,"Failed/Repair":t.failed,"Pass Rate":t.passed+t.failed>0?Math.round(t.passed/(t.passed+t.failed)*100)+"%":"—" }));
      } else if(rpt==="lot"){
        sheetName="Lot Report";
        rows=lots.map(l=>{ const lu=units.filter(u=>u.lot===l.number); return { "Lot":l.number,"Received Date":l.createdDate||"","Total Units":lu.length,"Pending QC":lu.filter(u=>u.status==="pending_qc").length,"Available":lu.filter(u=>u.status==="available").length,"Under Repair":lu.filter(u=>u.status==="under_repair").length,"Sold":lu.filter(u=>u.status==="sold").length,"Stock Value":lu.filter(u=>u.status==="available").reduce((s,u)=>s+(u.salePrice||0),0),"Revenue":lu.filter(u=>u.status==="sold").reduce((s,u)=>s+(u.totalAmount||u.salePrice||0),0) }; });
      }
      window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(rows.length?rows:[{"Message":"No data for this period"}]), sheetName);
      window.XLSX.writeFile(wb, `Nilkhant_${sheetName.replace(/ /g,"_")}_${from}_to_${to}.xlsx`);
    });
  };

  const KPI = ({label, value, color="var(--ac)"}) => <div className="rpt-kpi"><div className="rpt-kpi-v" style={{color}}>{value}</div><div className="rpt-kpi-l">{label}</div></div>;
  const dateFilter = <div className="date-row">
    <label>From</label><input type="date" className="fn" style={{width:150}} value={from} onChange={e=>setFrom(e.target.value)}/>
    <label>To</label><input type="date" className="fn" style={{width:150}} value={to} onChange={e=>setTo(e.target.value)}/>
    <button className="btn bgr bsm" onClick={exportReport}>📥 Export Excel</button>
  </div>;

  return <div>
    <div className="ph"><div><div className="pt">📈 Reports</div><div className="ps">Business analysis · Admin only</div></div></div>
    <div className="rpt-tabs">{RPT_TABS.map(t=><div key={t.id} className={`rpt-tab ${rpt===t.id?"on":""}`} onClick={()=>setRpt(t.id)}>{t.l}</div>)}</div>

    {/* SALES REPORT */}
    {rpt==="sales"&&<div>
      {dateFilter}
      <div className="sg sg4" style={{marginBottom:14}}>
        <KPI label="Units Sold" value={soldUnits.length} color="var(--gy)"/>
        <KPI label="Total Revenue" value={fmt(totalRev)} color="var(--gr)"/>
        <KPI label="Collected" value={fmt(collected)} color="var(--ac)"/>
        <KPI label="Pending Balance" value={fmt(pending)} color="var(--am)"/>
      </div>
      {/* Brand breakdown */}
      <div className="card"><div className="chd"><div className="ct">Sales by Brand</div></div>
        {[...new Set(soldUnits.map(u=>u.brand))].map((brand,i)=>{ const bu=soldUnits.filter(u=>u.brand===brand); const rev=bu.reduce((s,u)=>s+(u.totalAmount||u.salePrice||0),0); const pct=totalRev>0?Math.round(rev/totalRev*100):0;
          return <div key={brand} className="rpt-bar-wrap"><span style={{minWidth:80,fontSize:12,fontWeight:600}}>{brand}</span><div className="rpt-bar-bg"><div className="rpt-bar-fill" style={{width:`${pct}%`,background:cols[i%cols.length]}}/></div><span style={{fontSize:11,color:"var(--mu2)",minWidth:100,textAlign:"right"}}>{bu.length} units · {fmt(rev)}</span></div>;
        })}
        {soldUnits.length===0&&<div className="empty"><div className="et">No sales in this period</div></div>}
      </div>
      <div className="card"><div className="chd"><div className="ct">Sale Transactions</div></div>
        {soldUnits.length===0?<div className="empty"><div className="et">No transactions</div></div>:<div className="tw"><table>
          <thead><tr><th>Date</th><th>Invoice</th><th>Unit</th><th>Brand/Ton</th><th>Customer</th><th>Total</th><th>Booking</th><th>Balance</th><th>Payment</th></tr></thead>
          <tbody>{soldUnits.sort((a,b)=>(b.soldDate||"").localeCompare(a.soldDate||"")).map(u=><tr key={u.id}>
            <td style={{fontSize:10.5}}>{u.soldDate}</td><td><span className="invno">{u.invoiceNo||"—"}</span></td>
            <td><span className="uid">{u.id}</span></td><td><b>{u.brand}</b><br/><span style={{fontSize:9.5,color:"var(--mu)"}}>{u.tonnage}</span></td>
            <td style={{fontSize:11}}>{u.soldTo||"—"}<br/><span style={{fontSize:9.5,color:"var(--mu)"}}>{u.customerPhone}</span></td>
            <td className="price">{fmt(u.totalAmount||u.salePrice)}</td>
            <td style={{color:"var(--gr)",fontWeight:600}}>{fmt(u.bookingAmount||0)}</td>
            <td style={{color:(u.remainingAmount||0)>0?"var(--am)":"var(--gr)",fontWeight:600}}>{fmt(u.remainingAmount||0)}</td>
            <td>{u.paymentReceived?<span style={{color:"var(--gr)",fontSize:10.5}}>✅ Paid</span>:<span style={{color:"var(--am)",fontSize:10.5}}>⏳ Pending</span>}</td>
          </tr>)}</tbody>
        </table></div>}
      </div>
    </div>}

    {/* STOCK FLOW REPORT */}
    {rpt==="stock"&&<div>
      {dateFilter}
      <div className="sg sg4" style={{marginBottom:14}}>
        <KPI label="Received" value={recUnits.length} color="var(--ac)"/>
        <KPI label="Sold" value={soldUnits.length} color="var(--gy)"/>
        <KPI label="Currently Available" value={units.filter(u=>u.status==="available").length} color="var(--gr)"/>
        <KPI label="Under Repair" value={units.filter(u=>u.status==="under_repair").length} color="var(--rd)"/>
      </div>
      <div className="card"><div className="chd"><div className="ct">Stock Flow by Tonnage</div></div>
        {[...new Set(units.map(u=>u.tonnage))].sort().map((ton,i)=>{
          const tr=recUnits.filter(u=>u.tonnage===ton).length;
          const ts=soldUnits.filter(u=>u.tonnage===ton).length;
          const ta=units.filter(u=>u.tonnage===ton&&u.status==="available").length;
          return <div key={ton} style={{marginBottom:12,background:"rgba(255,255,255,.02)",borderRadius:7,padding:"10px 12px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontWeight:700,fontSize:12}}>{ton}</span><div style={{display:"flex",gap:14,fontSize:11}}><span style={{color:"var(--ac)"}}>📥 Received: {tr}</span><span style={{color:"var(--gy)"}}>💰 Sold: {ts}</span><span style={{color:"var(--gr)"}}>✅ Available: {ta}</span></div></div>
            <div style={{display:"flex",height:6,borderRadius:5,overflow:"hidden",background:"rgba(255,255,255,.04)"}}>
              {tr>0&&<div style={{width:`${Math.round(tr/(tr+1)*100)}%`,background:"var(--ac)"}}/>}
              {ts>0&&<div style={{width:`${Math.round(ts/(tr+1)*100)}%`,background:"var(--gy)"}}/>}
            </div>
          </div>;
        })}
      </div>
    </div>}

    {/* PAYMENT REPORT */}
    {rpt==="payment"&&<div>
      {dateFilter}
      <div className="sg sg3" style={{marginBottom:14}}>
        <KPI label="Total Invoiced" value={fmt(totalRev)} color="var(--ac)"/>
        <KPI label="Collected" value={fmt(collected)} color="var(--gr)"/>
        <KPI label="Pending Balance" value={fmt(pending)} color="var(--am)"/>
      </div>
      <div className="card"><div className="chd"><div className="ct">Pending Payments</div></div>
        {soldUnits.filter(u=>(u.remainingAmount||0)>0).length===0?<div className="empty"><div className="et">No pending payments in this period 🎉</div></div>:<div className="tw"><table>
          <thead><tr><th>Invoice</th><th>Customer</th><th>Phone</th><th>Total</th><th>Collected</th><th>Balance Due</th><th>Sold Date</th></tr></thead>
          <tbody>{soldUnits.filter(u=>(u.remainingAmount||0)>0).map(u=><tr key={u.id}>
            <td><span className="invno">{u.invoiceNo||"—"}</span></td>
            <td style={{fontWeight:600}}>{u.soldTo||"—"}</td><td style={{fontSize:11}}>{u.customerPhone||"—"}</td>
            <td className="price">{fmt(u.totalAmount||u.salePrice)}</td>
            <td style={{color:"var(--gr)",fontWeight:600}}>{fmt(u.bookingAmount||0)}</td>
            <td style={{color:"var(--am)",fontWeight:700}}>{fmt(u.remainingAmount||0)}</td>
            <td style={{fontSize:10.5}}>{u.soldDate||"—"}</td>
          </tr>)}</tbody>
        </table></div>}
      </div>
    </div>}

    {/* CUSTOMER REPORT */}
    {rpt==="customer"&&<div>
      {dateFilter}
      <div className="card"><div className="chd"><div className="ct">Customer Purchase Summary</div></div>
        {soldUnits.length===0?<div className="empty"><div className="et">No sales in this period</div></div>:<div className="tw"><table>
          <thead><tr><th>Customer</th><th>Phone</th><th>Units</th><th>Brands</th><th>Total Value</th><th>Balance Due</th></tr></thead>
          <tbody>{Object.values(soldUnits.reduce((acc,u)=>{ const k=u.customerPhone||u.soldTo||"unknown"; if(!acc[k])acc[k]={name:u.soldTo,phone:u.customerPhone,units:[],total:0,balance:0}; acc[k].units.push(u); acc[k].total+=u.totalAmount||u.salePrice||0; acc[k].balance+=u.remainingAmount||0; return acc; },{})).map((c,i)=><tr key={i}>
            <td style={{fontWeight:600}}>{c.name||"—"}</td><td style={{fontSize:11}}>{c.phone||"—"}</td>
            <td style={{color:"var(--ac)",fontWeight:700}}>{c.units.length}</td>
            <td style={{fontSize:11}}>{[...new Set(c.units.map(u=>u.brand))].join(", ")}</td>
            <td className="price">{fmt(c.total)}</td>
            <td style={{color:(c.balance>0)?"var(--am)":"var(--gr)",fontWeight:600}}>{c.balance>0?fmt(c.balance):"✅ Paid"}</td>
          </tr>)}</tbody>
        </table></div>}
      </div>
    </div>}

    {/* WAREHOUSE REPORT */}
    {rpt==="warehouse"&&<div>
      <div style={{marginBottom:16,fontSize:12,color:"var(--mu2)"}}>Live snapshot — all time data across all warehouses</div>
      {warehouses.map((wh,i)=>{
        const wu=units.filter(u=>u.warehouse===wh.id);
        const avail=wu.filter(u=>u.status==="available"); const sold=wu.filter(u=>u.status==="sold");
        return <div key={wh.id} className="card" style={{marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8}}>
            <div style={{fontSize:14,fontWeight:800}}>🏭 {wh.name}</div>
            <div style={{fontSize:11,color:"var(--mu2)"}}>{wh.location}</div>
          </div>
          <div className="sg sg4" style={{marginBottom:0}}>
            {[["Total",wu.length,"var(--ac)"],["Available",avail.length,"var(--gr)"],["Sold",sold.length,"var(--gy)"],["Stock Value",fmt(avail.reduce((s,u)=>s+(u.salePrice||0),0)),"var(--ac2)"]].map(([l,v,c])=><div key={l} style={{background:"var(--bg)",borderRadius:7,padding:"9px 11px",textAlign:"center"}}><div style={{fontSize:11,color:c,fontWeight:900,fontSize:20}}>{v}</div><div style={{fontSize:9.5,color:"var(--mu2)",marginTop:2}}>{l}</div></div>)}
          </div>
        </div>;
      })}
    </div>}

    {/* TECHNICIAN REPORT */}
    {rpt==="tech"&&<div>
      <div style={{marginBottom:16,fontSize:12,color:"var(--mu2)"}}>All-time technician performance — units tested, pass rate, efficiency</div>
      <div className="card"><div className="chd"><div className="ct">QC Performance by Technician</div></div>
        {(() => {
          const techMap={};
          units.filter(u=>u.testedBy).forEach(u=>{
            const k=u.testedBy;
            if(!techMap[k])techMap[k]={name:k,passed:0,repaired:0};
            if(u.status==="available"||u.status==="sold") techMap[k].passed++;
            if(u.status==="under_repair") techMap[k].repaired++;
          });
          const techs=Object.values(techMap);
          if(!techs.length) return <div className="empty"><div className="et">No QC data yet</div></div>;
          return <table><thead><tr><th>Technician</th><th>Total Tested</th><th>Passed</th><th>Under Repair</th><th>Pass Rate</th><th>Rating</th></tr></thead>
          <tbody>{techs.sort((a,b)=>(b.passed+b.repaired)-(a.passed+a.repaired)).map((t,i)=>{
            const total=t.passed+t.repaired; const rate=total>0?Math.round(t.passed/total*100):0;
            const rating=rate>=90?"⭐⭐⭐":rate>=70?"⭐⭐":"⭐";
            return <tr key={i}><td style={{fontWeight:600}}>{t.name}</td><td style={{color:"var(--ac)",fontWeight:700}}>{total}</td><td style={{color:"var(--gr)",fontWeight:600}}>{t.passed}</td><td style={{color:"var(--rd)"}}>{t.repaired}</td>
              <td><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:60,height:6,background:"rgba(255,255,255,.06)",borderRadius:20,overflow:"hidden"}}><div style={{width:`${rate}%`,height:"100%",background:rate>=80?"var(--gr)":rate>=60?"var(--am)":"var(--rd)"}}/></div><span style={{fontSize:11,fontWeight:700,color:rate>=80?"var(--gr)":rate>=60?"var(--am)":"var(--rd)"}}>{rate}%</span></div></td>
              <td style={{fontSize:14}}>{rating}</td>
            </tr>;
          })}</tbody></table>;
        })()}
      </div>
    </div>}

    {/* LOT REPORT */}
    {rpt==="lot"&&<div>
      <div style={{marginBottom:16,fontSize:12,color:"var(--mu2)"}}>Lot-wise analysis — each supplier delivery batch performance</div>
      {lots.length===0?<div className="empty"><div className="ei">📋</div><div className="et">No lots created yet</div></div>:
      <div className="card"><div className="chd"><div className="ct">Lot Performance</div></div>
        <div className="tw"><table>
          <thead><tr><th>Lot</th><th>Created</th><th>Total Units</th><th>Pending QC</th><th>Available</th><th>Repair</th><th>Sold</th><th>Stock Value</th><th>Revenue</th><th>Sell-through</th></tr></thead>
          <tbody>{lots.map(l=>{
            const lu=units.filter(u=>u.lot===l.number);
            const avail=lu.filter(u=>u.status==="available").length;
            const sold=lu.filter(u=>u.status==="sold").length;
            const pend=lu.filter(u=>u.status==="pending_qc").length;
            const rep=lu.filter(u=>u.status==="under_repair").length;
            const stockVal=lu.filter(u=>u.status==="available").reduce((s,u)=>s+(u.salePrice||0),0);
            const rev=lu.filter(u=>u.status==="sold").reduce((s,u)=>s+(u.totalAmount||u.salePrice||0),0);
            const sellThrough=lu.length>0?Math.round(sold/lu.length*100):0;
            return <tr key={l.id}>
              <td><span className="lot">{l.number}</span></td>
              <td style={{fontSize:10.5}}>{l.createdDate||"—"}</td>
              <td style={{color:"var(--ac)",fontWeight:700}}>{lu.length}</td>
              <td style={{color:"var(--am)"}}>{pend}</td>
              <td style={{color:"var(--gr)",fontWeight:600}}>{avail}</td>
              <td style={{color:"var(--rd)"}}>{rep}</td>
              <td style={{color:"var(--gy)",fontWeight:600}}>{sold}</td>
              <td className="price">{fmt(stockVal)}</td>
              <td style={{color:"var(--gr)",fontWeight:700}}>{fmt(rev)}</td>
              <td><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:50,height:5,background:"rgba(255,255,255,.06)",borderRadius:20,overflow:"hidden"}}><div style={{width:`${sellThrough}%`,height:"100%",background:sellThrough>=70?"var(--gr)":sellThrough>=40?"var(--am)":"var(--rd)"}}/></div><span style={{fontSize:11,fontWeight:700,color:sellThrough>=70?"var(--gr)":sellThrough>=40?"var(--am)":"var(--rd)"}}>{sellThrough}%</span></div></td>
            </tr>;
          })}</tbody>
        </table></div>
      </div>}
    </div>}
  </div>;
}

// ─── BARCODE SCANNER (Camera) ─────────────────────────────────────────────────
// Uses jsQR loaded from CDN for QR/barcode scanning via phone camera
function CameraScanner({ onScan, onClose, title="Scan RFID / Barcode" }) {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState("");
  const rafRef = useRef();
  const streamRef = useRef();

  useEffect(() => {
    let jsQR = null;

    // Load jsQR from CDN
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";
    script.onload = () => {
      jsQR = window.jsQR;
      startCamera();
    };
    script.onerror = () => setError("Could not load scanner library. Check internet.");
    document.head.appendChild(script);

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setScanning(true);
          scanLoop();
        }
      } catch(e) {
        setError("Camera access denied. Please allow camera permission in your browser settings.");
      }
    }

    function scanLoop() {
      if (!videoRef.current || !canvasRef.current || !jsQR) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts:"dontInvert" });
        if (code && code.data && code.data !== lastScan) {
          setLastScan(code.data);
          onScan(code.data.trim().toUpperCase());
          // Flash green border effect
          canvas.style.outline = "3px solid #34D399";
          setTimeout(() => { if(canvas) canvas.style.outline = "none"; }, 400);
        }
      }
      rafRef.current = requestAnimationFrame(scanLoop);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (document.head.contains(script)) document.head.removeChild(script);
    };
  }, []);

  return (
    <div className="ov" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="mo" style={{maxWidth:480,padding:0,overflow:"hidden"}}>
        {/* Header */}
        <div style={{padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid var(--b1)"}}>
          <div>
            <div style={{fontSize:14,fontWeight:700}}>📷 {title}</div>
            <div style={{fontSize:11,color:"var(--mu2)",marginTop:2}}>Point camera at RFID tag or barcode</div>
          </div>
          <button className="btn bgh bsm" onClick={onClose}>✕ Close</button>
        </div>

        {/* Camera view */}
        <div style={{position:"relative",background:"#000",minHeight:280}}>
          {error
            ? <div style={{padding:24,textAlign:"center",color:"var(--rd)",fontSize:13}}><div style={{fontSize:32,marginBottom:12}}>📷</div>{error}</div>
            : <>
                <video ref={videoRef} style={{width:"100%",display:"block"}} playsInline muted/>
                <canvas ref={canvasRef} style={{display:"none"}}/>
                {/* Scan guide overlay */}
                <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
                  <div style={{width:220,height:160,border:"2px solid rgba(56,189,248,.8)",borderRadius:12,boxShadow:"0 0 0 2000px rgba(0,0,0,.35)"}}>
                    {/* Corner marks */}
                    {[["0%","0%","right","bottom"],["100%","0%","left","bottom"],["0%","100%","right","top"],["100%","100%","left","top"]].map(([l,t,br,bb],i)=>
                      <div key={i} style={{position:"absolute",left:l,top:t,width:20,height:20,borderRight:br==="right"?"none":"2px solid var(--ac)",borderLeft:br==="left"?"none":"2px solid var(--ac)",borderBottom:bb==="bottom"?"none":"2px solid var(--ac)",borderTop:bb==="top"?"none":"2px solid var(--ac)",transform:`translate(${l==="0%"?"-1px":"1px"},${t==="0%"?"-1px":"1px"})`}}/>
                    )}
                  </div>
                </div>
                {scanning&&<div style={{position:"absolute",bottom:8,left:0,right:0,textAlign:"center"}}><span style={{background:"rgba(0,0,0,.7)",color:"var(--ac)",fontSize:11,padding:"4px 12px",borderRadius:20}}>🔍 Scanning...</span></div>}
              </>
          }
        </div>

        {/* Last scan */}
        {lastScan&&<div style={{padding:"10px 18px",background:"rgba(52,211,153,.08)",borderTop:"1px solid rgba(52,211,153,.2)",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:16}}>✅</span>
          <div><div style={{fontSize:10,color:"var(--mu2)"}}>Last scanned</div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:"var(--gr)"}}>{lastScan}</div></div>
        </div>}
      </div>
    </div>
  );
}

// ─── ROOT APP (v8: Supabase + Realtime + Camera Scanner) ─────────────────────
export default function App() {
  const getSb = () => { try{ return localStorage.getItem("cs_sb")!=="0"; }catch{ return true; } };
  const [sbOpen,setSbOpen] = useState(getSb);
  const toggleSb = () => setSbOpen(p=>{ try{localStorage.setItem("cs_sb",p?"0":"1");}catch{} return !p; });

  // ── STATE ──────────────────────────────────────────────────────────────────
  const [users,      setUsers]      = useState([]);
  const [user,       setUser]       = useState(()=>{ try{ const s=localStorage.getItem("cs_user"); return s?JSON.parse(s):null; }catch{ return null; } });
  const [units,      setUnits]      = useState([]);
  const [lots,       setLots]       = useState([]);
  const [brands,     setBrands]     = useState([]);
  const [tonnages,   setTonnages]   = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [customers,  setCustomers]  = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [invoiceTemplate, setInvoiceTemplate] = useState(()=>{ try{ const s=localStorage.getItem("cs_inv_tpl"); return s?JSON.parse(s):null; }catch{ return null; } });
  const [page,       setPage]       = useState("dashboard");
  const [toast,      setToast]      = useState(null);
  const [verifs,     setVerifs]     = useState([]);
  const [rfidUnit,   setRfidUnit]   = useState(null);
  const [invCtr,     setInvCtr]     = useState(1);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [dbError,    setDbError]    = useState("");
  // Camera scanner state - shared globally
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState("search"); // "search" | "verify"
  const cameraCallbackRef = useRef(null);

  const showToast=(msg,type="success")=>setToast({message:msg,type});

  // ── DB HELPERS ─────────────────────────────────────────────────────────────
  const toUnit = r => ({
    id:r.id, warehouse:r.warehouse||"", lot:r.lot||"", rfidIn:r.rfid_in||"", rfidOut:r.rfid_out||"",
    model:r.model||"", brand:r.brand, tonnage:r.tonnage, supplier:r.supplier||"",
    receivedDate:r.received_date||"", salePrice:r.sale_price||0, status:r.status||"pending_qc",
    qcAttempts:r.qc_attempts||0, testedBy:r.tested_by||"", testedDate:r.tested_date||"",
    repairNote:r.repair_note||"", invoiceNo:r.invoice_no||"", soldTo:r.sold_to||"",
    soldDate:r.sold_date||"", customerPhone:r.customer_phone||"", soldBy:r.sold_by||"",
    paymentReceived:r.payment_received||false,
    bookingAmount:r.booking_amount||0, totalAmount:r.total_amount||0,
    remainingAmount:r.remaining_amount||0, bookingCollected:r.booking_collected||false,
  });
  const fromUnit = u => ({
    id:u.id, warehouse:u.warehouse||"", lot:u.lot||"", rfid_in:u.rfidIn||"",
    rfid_out:u.rfidOut||"", model:u.model||"", brand:u.brand, tonnage:u.tonnage,
    supplier:u.supplier||"", received_date:u.receivedDate||"", sale_price:u.salePrice||0,
    status:u.status, qc_attempts:u.qcAttempts||0, tested_by:u.testedBy||"",
    tested_date:u.testedDate||"", repair_note:u.repairNote||"", invoice_no:u.invoiceNo||"",
    sold_to:u.soldTo||"", sold_date:u.soldDate||"", customer_phone:u.customerPhone||"",
    sold_by:u.soldBy||"", payment_received:u.paymentReceived||false,
    booking_amount:u.bookingAmount||0, total_amount:u.totalAmount||0,
    remaining_amount:u.remainingAmount||0, booking_collected:u.bookingCollected||false,
  });
  const toWH       = r => ({ id:r.id, name:r.name, location:r.location||"", createdDate:r.created_date||"", remark:r.remark||"" });
  const toAppUser  = r => ({ id:r.id, name:r.name, username:r.username, password:r.password, role:r.role, modules:r.modules||[], createdDate:r.created_date||"" });
  const toLot      = r => ({ id:r.id, number:r.number, createdDate:r.created_date||"", remark:r.remark||"" });
  const toBrand    = r => ({ id:r.id, name:r.name, createdDate:r.created_date||"", remark:r.remark||"" });
  const toTonnage  = r => ({ id:r.id, value:r.value, createdDate:r.created_date||"", remark:r.remark||"" });
  const toCustomer = r => ({ id:r.id, name:r.name, phone:r.phone||"", altPhone:r.alt_phone||"", email:r.email||"", address:r.address||"", city:r.city||"", pincode:r.pincode||"", gst:r.gst||"", createdDate:r.created_date||"", unitIds:r.unit_ids||[] });
  const toDispatch = r => ({ id:r.id, unitId:r.unit_id, customerId:r.customer_id, invoiceNo:r.invoice_no||"", stage:r.stage, bookedDate:r.booked_date||"", deliveryPartner:r.delivery_partner||"", trackingNo:r.tracking_no||"", notes:r.notes||"", deliveredDate:r.delivered_date||"", paymentReceivedDate:r.payment_received_date||"" });

  // ── INITIAL LOAD FROM SUPABASE ─────────────────────────────────────────────
  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true); setDbError("");
    try {
      const [wh,lo,br,to,us,un,cu,di] = await Promise.all([
        supabase.from("warehouses").select("*").order("created_date"),
        supabase.from("lots").select("*").order("created_date"),
        supabase.from("brands").select("*").order("created_date"),
        supabase.from("tonnages").select("*").order("created_date"),
        supabase.from("app_users").select("*"),
        supabase.from("units").select("*"),
        supabase.from("customers").select("*"),
        supabase.from("dispatches").select("*"),
      ]);
      if(wh.error||us.error||un.error) throw new Error(wh.error?.message||us.error?.message||un.error?.message||"DB error");
      if(wh.data) setWarehouses(wh.data.map(toWH));
      if(lo.data) setLots(lo.data.map(toLot));
      if(br.data) setBrands(br.data.map(toBrand));
      if(to.data) setTonnages(to.data.map(toTonnage));
      if(us.data) setUsers(us.data.map(toAppUser));
      if(un.data) setUnits(un.data.map(toUnit));
      if(cu.data) setCustomers(cu.data.map(toCustomer));
      if(di.data) setDispatches(di.data.map(toDispatch));
      if(un.data){ const nums=un.data.map(u=>parseInt((u.invoice_no||"").replace("INV-",""))||0); if(nums.length>0)setInvCtr(Math.max(...nums)); }
    } catch(e) {
      setDbError("Could not connect to database: "+e.message);
    }
    setLoading(false);
  }

  // ── REALTIME SUBSCRIPTIONS ─────────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase.channel("nilkhant-v8")
      .on("postgres_changes",{event:"*",schema:"public",table:"units"},        p=>rtChange(p,"units"))
      .on("postgres_changes",{event:"*",schema:"public",table:"customers"},    p=>rtChange(p,"customers"))
      .on("postgres_changes",{event:"*",schema:"public",table:"dispatches"},   p=>rtChange(p,"dispatches"))
      .on("postgres_changes",{event:"*",schema:"public",table:"warehouses"},   p=>rtChange(p,"warehouses"))
      .on("postgres_changes",{event:"*",schema:"public",table:"lots"},         p=>rtChange(p,"lots"))
      .on("postgres_changes",{event:"*",schema:"public",table:"brands"},       p=>rtChange(p,"brands"))
      .on("postgres_changes",{event:"*",schema:"public",table:"tonnages"},     p=>rtChange(p,"tonnages"))
      .on("postgres_changes",{event:"*",schema:"public",table:"app_users"},    p=>rtChange(p,"app_users"))
      .subscribe((status) => {
        if(status==="SUBSCRIBED") console.log("✅ Realtime connected");
        if(status==="CHANNEL_ERROR") console.warn("⚠️ Realtime error - check anon key has realtime enabled");
      });
    return () => supabase.removeChannel(ch);
  }, []);

  function rtChange({ eventType, new:n, old:o }, table) {
    const conv = {units:toUnit,customers:toCustomer,dispatches:toDispatch,warehouses:toWH,lots:toLot,brands:toBrand,tonnages:toTonnage,app_users:toAppUser};
    const set  = {units:setUnits,customers:setCustomers,dispatches:setDispatches,warehouses:setWarehouses,lots:setLots,brands:setBrands,tonnages:setTonnages,app_users:setUsers};
    const c=conv[table]; const s=set[table]; if(!c||!s) return;
    if(eventType==="INSERT") s(p=>[...p.filter(x=>x.id!==c(n).id), c(n)]);
    if(eventType==="UPDATE") s(p=>p.map(x=>x.id===c(n).id?c(n):x));
    if(eventType==="DELETE") s(p=>p.filter(x=>x.id!==o.id));
  }

  // ── DB WRITE ACTIONS ───────────────────────────────────────────────────────
  const bulkAddUnits = async rows => {
    // Insert all rows one by one to Supabase
    let maxNum = units.reduce((mx,x)=>Math.max(mx,parseInt((x.id||"").replace("AC-",""))||0),0);
    let successCount = 0;
    for (const row of rows) {
      maxNum++;
      const newU = {...row, id:"AC-"+String(maxNum).padStart(3,"0"), status:"pending_qc", qcAttempts:0};
      const {error} = await supabase.from("units").insert(fromUnit(newU));
      if(!error) successCount++;
    }
    showToast(`${successCount} units imported from Excel ✅`);
  };

  const addUnit = async u => {
    const maxNum = units.reduce((mx,x)=>Math.max(mx,parseInt((x.id||"").replace("AC-",""))||0),0);
    const newId = "AC-"+String(maxNum+1).padStart(3,"0");
    const newU = {...u, id:newId};
    const {error} = await supabase.from("units").insert(fromUnit(newU));
    if(error){ showToast("Error saving unit: "+error.message,"error"); return; }
    showToast(`${newId} registered 📦`);
  };

  const updateUnit = async (id, ch) => {
    const cur = units.find(u=>u.id===id); if(!cur) return;
    const {error} = await supabase.from("units").update(fromUnit({...cur,...ch})).eq("id",id);
    if(error){ showToast("Error: "+error.message,"error"); return; }
    const m={available:`${id} passed QC ✅`,under_repair:`${id} → Repair 🔧`,sold:`${id} sold 💰`,pending_qc:`${id} → QC 🔄`};
    if(ch.status) showToast(m[ch.status]||`${id} updated`);
  };

  const transferUnit = async (id, wh) => {
    await supabase.from("units").update({warehouse:wh}).eq("id",id);
    showToast(`Transferred to ${warehouses.find(x=>x.id===wh)?.name||wh} 🏭`);
  };

  const addCustomer = async (c, upd) => {
    const row={id:c.id,name:c.name,phone:c.phone||"",alt_phone:c.altPhone||"",email:c.email||"",address:c.address||"",city:c.city||"",pincode:c.pincode||"",gst:c.gst||"",created_date:c.createdDate||"",unit_ids:c.unitIds||[]};
    if(upd) await supabase.from("customers").update(row).eq("id",c.id);
    else await supabase.from("customers").insert(row);
  };

  const addDispatch = async d => {
    await supabase.from("dispatches").insert({id:d.id,unit_id:d.unitId,customer_id:d.customerId,invoice_no:d.invoiceNo||"",stage:d.stage,booked_date:d.bookedDate||"",delivery_partner:d.deliveryPartner||"",tracking_no:d.trackingNo||"",notes:d.notes||"",delivered_date:"",payment_received_date:""});
    showToast("Dispatch created 🚚");
  };

  const updateDispatch = async (id, ch) => {
    const cur=dispatches.find(d=>d.id===id); if(!cur) return;
    await supabase.from("dispatches").update({stage:ch.stage||cur.stage,delivered_date:ch.deliveredDate||cur.deliveredDate||"",payment_received_date:ch.paymentReceivedDate||cur.paymentReceivedDate||""}).eq("id",id);
  };

  const onVerif = async r => {
    setVerifs(p=>[r,...p]);
    await supabase.from("verifications").insert({date:r.date,time:r.time,by_user:r.by,warehouse:r.warehouse||"all",scanned:r.scanned,total:r.total,discrepancies:r.discrepancies,note:r.note||"",status:r.status});
    showToast(r.discrepancies>0?`${r.discrepancies} discrepancy ⚠️`:"Verification clear ✅",r.discrepancies>0?"warn":"success");
  };

  // Master upsert helpers
  const upsertMaster = async (table, rows, mapper) => {
    const {error} = await supabase.from(table).upsert(rows.map(mapper));
    if(error) showToast("Save error: "+error.message,"error");
  };
  const setLotsDB     = rows => { setLots(rows);      upsertMaster("lots",      rows, r=>({id:r.id,number:r.number,created_date:r.createdDate||"",remark:r.remark||""})); };
  const setBrandsDB   = rows => { setBrands(rows);    upsertMaster("brands",    rows, r=>({id:r.id,name:r.name,created_date:r.createdDate||"",remark:r.remark||""})); };
  const setTonnagesDB = rows => { setTonnages(rows);  upsertMaster("tonnages",  rows, r=>({id:r.id,value:r.value,created_date:r.createdDate||"",remark:r.remark||""})); };
  const setWHDB       = rows => { setWarehouses(rows);upsertMaster("warehouses",rows, r=>({id:r.id,name:r.name,location:r.location||"",created_date:r.createdDate||"",remark:r.remark||""})); };
  const setUsersDB    = rows => { setUsers(rows);     upsertMaster("app_users", rows, r=>({id:r.id,name:r.name,username:r.username,password:r.password,role:r.role,modules:r.modules||[],created_date:r.createdDate||""})); };

  const handleInvoiceTemplateChange = tpl => { setInvoiceTemplate(tpl); try{localStorage.setItem("cs_inv_tpl",JSON.stringify(tpl));}catch{} };

  // ── CAMERA HANDLER ─────────────────────────────────────────────────────────
  const openCamera = (mode, callback) => {
    cameraCallbackRef.current = callback;
    setCameraMode(mode);
    setCameraOpen(true);
  };
  const handleCameraScan = (code) => {
    if(cameraCallbackRef.current) cameraCallbackRef.current(code);
    if(cameraMode==="search") setCameraOpen(false); // close after one scan in search mode
    // in verify mode, stay open for continuous scanning
  };

  // Keep logged-in user fresh
  useEffect(()=>{ if(user){ const f=users.find(u=>u.id===user.id); if(f){ setUser(prev=>{ const updated={...prev,...f}; try{localStorage.setItem("cs_user",JSON.stringify(updated));}catch{} return updated; }); } } },[users]);
  const userMods=user?.modules||[];
  useEffect(()=>{ if(user&&!userMods.includes(page))setPage(userMods[0]||"dashboard"); },[userMods]);

  const handleLogin = u => { try{localStorage.setItem("cs_user",JSON.stringify(u));}catch{} setUser(u); setPage((u.modules||["dashboard"])[0]); };
  const handleLogout = () => { try{localStorage.removeItem("cs_user");}catch{} setUser(null); setLogoutConfirm(false); };

  const pendQC   = units.filter(u=>u.status==="pending_qc").length;
  const pendDisp = dispatches.filter(d=>d.stage!=="paid").length;

  // ── LOADING SCREEN ─────────────────────────────────────────────────────────
  if(loading) return <>
    <style>{CSS}</style>
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"var(--bg)",gap:16}}>
      <div style={{fontSize:40}}>❄️</div>
      <div style={{fontSize:16,fontWeight:700,color:"var(--ac)"}}>Nilkhant Enterprise</div>
      {dbError
        ? <><div style={{fontSize:12,color:"var(--rd)",maxWidth:300,textAlign:"center"}}>{dbError}</div>
            <button className="btn bp" onClick={loadAll} style={{marginTop:8}}>🔄 Retry</button></>
        : <><div style={{fontSize:12,color:"var(--mu2)"}}>Connecting to database...</div>
            <div style={{width:140,height:3,background:"rgba(255,255,255,.06)",borderRadius:20,overflow:"hidden",marginTop:4}}>
              <div style={{width:"60%",height:"100%",background:"linear-gradient(90deg,var(--ac),var(--ac2))",borderRadius:20,animation:"slide 1.2s ease infinite"}}/>
            </div>
            <style>{`@keyframes slide{0%{margin-left:-60%}100%{margin-left:100%}}`}</style></>
      }
    </div>
  </>;

  if(!user) return <><style>{CSS}</style><Login users={users} onLogin={handleLogin}/></>;

  return <>
    <style>{CSS}</style>
    <div className="shell">
      <aside className={`sb ${sbOpen?"":"col"}`}>
        <div className="sb-top">
          <div className="sb-ico" onClick={toggleSb} title={sbOpen?"Collapse":"Expand"}>❄️</div>
          <div className="sb-txt"><div className="sb-name">Nilkhant <em>Enterprise</em></div><div className="sb-tag">AC Inventory System</div></div>
        </div>

        {/* GLOBAL SEARCH with camera button */}
        <div className="gsw" style={{display:"flex",gap:6,alignItems:"center"}}>
          <GlobalSearch units={units} warehouses={warehouses} onSelect={u=>setRfidUnit(u)} collapsed={!sbOpen}/>
          {!sbOpen
            ? <button className="btn bsm" style={{background:"rgba(56,189,248,.12)",border:"1px solid rgba(56,189,248,.25)",color:"var(--ac)",padding:"6px 8px",minWidth:32,flexShrink:0}} onClick={()=>openCamera("search",code=>{ const u=units.find(x=>(x.rfidIn||"").toUpperCase()===code||(x.rfidOut||"").toUpperCase()===code||x.id.toUpperCase()===code); if(u)setRfidUnit(u); else showToast(`No unit found for: ${code}`,"warn"); })} title="Scan">📷</button>
            : null
          }
        </div>
        {sbOpen&&<div style={{padding:"0 9px 8px",display:"flex",gap:6}}>
          <button className="btn" style={{flex:1,background:"rgba(56,189,248,.08)",border:"1px solid rgba(56,189,248,.2)",color:"var(--ac)",fontSize:11.5,padding:"6px 8px",justifyContent:"center"}}
            onClick={()=>openCamera("search", code=>{ const u=units.find(x=>(x.rfidIn||"").toUpperCase()===code||(x.rfidOut||"").toUpperCase()===code||x.id.toUpperCase()===code); if(u)setRfidUnit(u); else showToast(`No unit found for: ${code}`,"warn"); })}>
            📷 Scan to Search
          </button>
        </div>}

        <nav className="sb-nav">
          <div className="sb-sec">Navigation</div>
          {ALL_MODULES.filter(m=>userMods.includes(m.id)||(m.adminOnly&&user?.role==="admin")).map(m=>(
            <button key={m.id} className={`nb ${page===m.id?"on":""}`} onClick={()=>setPage(m.id)} title={m.label}>
              <div className="ni">{m.icon}</div>
              <span className="nb-lbl">{m.label}</span>
              {m.id==="qc"&&pendQC>0&&<span className="nbd">{pendQC}</span>}
              {m.id==="dispatch"&&pendDisp>0&&<span className="nbd am">{pendDisp}</span>}
            </button>
          ))}
        </nav>
        <div className="sb-ft">
          <div className="urow">
            <div className="uav">{user.name[0]}</div>
            <div className="u-inf"><div className="uname">{user.name}</div><div className="urole">{user.role}</div></div>
            <button className="uout" onClick={()=>setLogoutConfirm(true)} title="Logout">↩</button>
          </div>
        </div>
      </aside>

      <main className={`main ${sbOpen?"exp":"col"}`}>
        {page==="dashboard" && <Dashboard units={units} tonnages={tonnages} warehouses={warehouses} customers={customers} dispatches={dispatches} user={user}/>}
        {page==="intake"    && <StockIntake units={units} lots={lots} brands={brands} tonnages={tonnages} warehouses={warehouses} onAdd={addUnit} onBulkAdd={bulkAddUnits} onTransfer={transferUnit} user={user}/>}
        {page==="qc"        && <QCModule units={units} warehouses={warehouses} onUpdate={updateUnit} user={user}/>}
        {page==="sales"     && <Sales units={units} customers={customers} dispatches={dispatches} warehouses={warehouses} onUpdate={updateUnit} onAddCustomer={addCustomer} onAddDispatch={addDispatch} user={user} showToast={showToast} invCtr={invCtr} setInvCtr={setInvCtr} invoiceTemplate={invoiceTemplate}/>}
        {page==="dispatch"  && <Dispatch dispatches={dispatches} units={units} customers={customers} warehouses={warehouses} onUpdateDispatch={updateDispatch} showToast={showToast} invoiceTemplate={invoiceTemplate}/>}
        {page==="invoices"   && <InvoiceBook units={units} customers={customers} dispatches={dispatches} warehouses={warehouses} onUpdate={updateUnit} showToast={showToast}/>}
        {page==="customers" && <Customers customers={customers} units={units} dispatches={dispatches}/>}
        {page==="verify"    && <StockVerify units={units} warehouses={warehouses} user={user} onVerificationComplete={onVerif} openCamera={openCamera}/>}
        {page==="reports"   && <Reports units={units} customers={customers} dispatches={dispatches} warehouses={warehouses} lots={lots}/>}
        {page==="master"    && <MasterPage lots={lots} brands={brands} tonnages={tonnages} warehouses={warehouses} users={users} invoiceTemplate={invoiceTemplate} onLotsChange={setLotsDB} onBrandsChange={setBrandsDB} onTonnagesChange={setTonnagesDB} onWHChange={setWHDB} onUsersChange={setUsersDB} onInvoiceTemplateChange={handleInvoiceTemplateChange} showToast={showToast}/>}
      </main>

      {rfidUnit&&<RFIDDetail unit={rfidUnit} customers={customers} dispatches={dispatches} warehouses={warehouses} onClose={()=>setRfidUnit(null)}/>}
      {toast&&<Toast {...toast} onClose={()=>setToast(null)}/>}

      {/* CAMERA SCANNER OVERLAY */}
      {cameraOpen&&<CameraScanner
        title={cameraMode==="verify"?"📡 Scan RFID Tags — Continuous":"📷 Scan to Search"}
        onScan={handleCameraScan}
        onClose={()=>setCameraOpen(false)}
      />}

      {/* LOGOUT CONFIRMATION */}
      {logoutConfirm&&<div className="ov" onClick={()=>setLogoutConfirm(false)}><div className="mo" style={{maxWidth:380,textAlign:"center"}}>
        <div style={{fontSize:32,marginBottom:12}}>👋</div>
        <div className="mti">Log out?</div>
        <div className="msu">You are logged in as <strong>{user.name}</strong></div>
        <div className="mac" style={{justifyContent:"center"}}>
          <button className="btn bgh" onClick={()=>setLogoutConfirm(false)}>Cancel</button>
          <button className="btn br" onClick={handleLogout}>Yes, Log Out</button>
        </div>
      </div></div>}
    </div>
  </>;
}
