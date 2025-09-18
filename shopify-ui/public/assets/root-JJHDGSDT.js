import{a as m}from"/assets/_shared/chunk-LXK74B4C.js";import{a as y,b as t}from"/assets/_shared/chunk-OSEGCAPX.js";import{a as u}from"/assets/_shared/chunk-S3LTH7L6.js";import"/assets/_shared/chunk-NAVXS3X4.js";import{f as s,i as o,l as c,m as x,n as b,s as f}from"/assets/_shared/chunk-6KZRTIW3.js";import{a as g}from"/assets/_shared/chunk-6U5IYNIC.js";import{a as v}from"/assets/_shared/chunk-FN6342HM.js";import{d as l}from"/assets/_shared/chunk-P23QBOGJ.js";var a=l(v());var e=l(g()),k={},S=()=>[{rel:"stylesheet",href:m}];function h(){let i=y(),[r,n]=(0,a.useState)(!1);return a.default.useEffect(()=>{let p=d=>{console.error("Global unhandled promise rejection:",d.reason),d.preventDefault()};if(typeof window<"u")return window.addEventListener("unhandledrejection",p),()=>{window.removeEventListener("unhandledrejection",p)}},[]),(0,e.jsxs)("html",{lang:"en",children:[(0,e.jsxs)("head",{children:[(0,e.jsx)("meta",{charSet:"utf-8"}),(0,e.jsx)("meta",{name:"viewport",content:"width=device-width, initial-scale=1"}),(0,e.jsx)(x,{}),(0,e.jsx)(c,{}),(0,e.jsx)("style",{dangerouslySetInnerHTML:{__html:`
            @media (max-width: 768px) {
              .mobile-nav {
                position: fixed;
                top: 0;
                left: ${r?"0":"-100%"};
                width: 280px;
                height: 100vh;
                z-index: 1000;
                transition: left 0.3s ease;
                box-shadow: 2px 0 10px rgba(0,0,0,0.1);
              }
              .mobile-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 999;
                display: ${r?"block":"none"};
              }
              .desktop-nav {
                display: none;
              }
              .mobile-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px 24px;
                background: #fafbfc;
                border-bottom: 1px solid #e1e3e5;
              }
              .hamburger {
                display: block;
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                padding: 8px;
                border-radius: 4px;
                transition: background-color 0.2s ease;
              }
              .hamburger:hover {
                background-color: #f1f2f3;
              }
              .main-content-mobile {
                padding: 16px !important;
              }
            }
            @media (min-width: 769px) {
              .mobile-nav,
              .mobile-overlay,
              .mobile-header {
                display: none;
              }
              .hamburger {
                display: none;
              }
            }
          `}})]}),(0,e.jsxs)("body",{children:[(0,e.jsx)(u,{i18n:k,children:(0,e.jsxs)("div",{className:"Polaris-Page",style:{display:"flex",minHeight:"100vh",flexDirection:"column"},children:[(0,e.jsxs)("div",{className:"mobile-header",children:[(0,e.jsx)("button",{className:"hamburger",onClick:()=>n(!0),"aria-label":"Open navigation menu",children:"\u2630"}),(0,e.jsx)("h1",{style:{fontSize:"18px",fontWeight:"bold",color:"#202223",margin:0},children:"Ads Autopilot AI"}),(0,e.jsx)("div",{style:{width:36}})]}),(0,e.jsx)("div",{className:"mobile-overlay",onClick:()=>n(!1)}),(0,e.jsxs)("div",{style:{display:"flex",flex:1},children:[(0,e.jsxs)("nav",{className:"desktop-nav",style:{width:240,padding:20,borderRight:"1px solid var(--p-color-border)",background:"#fafbfc"},children:[(0,e.jsx)("h3",{style:{marginBottom:20,fontSize:"18px",fontWeight:"bold",color:"#202223",borderBottom:"1px solid #e1e3e5",paddingBottom:12},children:"Ads Autopilot AI"}),(0,e.jsxs)("ul",{style:{listStyle:"none",padding:0,display:"grid",gap:4},children:[(0,e.jsx)("li",{children:(0,e.jsx)(o,{to:t("/app/",i),style:{display:"block",padding:"8px 12px",borderRadius:"6px",textDecoration:"none",fontSize:"14px",fontWeight:"500",color:"#202223",transition:"all 0.2s ease"},children:"Dashboard"})}),(0,e.jsx)("li",{children:(0,e.jsx)(o,{to:t("/app/autopilot",i),style:{display:"block",padding:"8px 12px",borderRadius:"6px",textDecoration:"none",fontSize:"14px",fontWeight:"500",color:"#202223",transition:"all 0.2s ease"},children:"Autopilot"})}),(0,e.jsx)("li",{children:(0,e.jsx)(o,{to:t("/app/insights",i),style:{display:"block",padding:"8px 12px",borderRadius:"6px",textDecoration:"none",fontSize:"14px",fontWeight:"500",color:"#202223",transition:"all 0.2s ease"},children:"Insights"})}),(0,e.jsx)("li",{children:(0,e.jsx)(o,{to:t("/app/advanced",i),style:{display:"block",padding:"8px 12px",borderRadius:"6px",textDecoration:"none",fontSize:"14px",fontWeight:"500",color:"#202223",transition:"all 0.2s ease"},children:"Advanced"})}),(0,e.jsx)("li",{style:{marginTop:12,paddingTop:12,borderTop:"1px solid #e1e3e5"},children:(0,e.jsxs)(o,{to:"/app/intent-os",style:{display:"block",padding:"8px 12px",borderRadius:"6px",textDecoration:"none",fontSize:"12px",fontWeight:"400",color:"#6d7175",opacity:.7},children:["Smart Website",(0,e.jsx)("br",{}),(0,e.jsx)("span",{style:{fontSize:"10px",color:"#8c9196"},children:"Coming Q1 2026"})]})})]})]}),(0,e.jsxs)("nav",{className:"mobile-nav",style:{width:280,padding:20,background:"#fafbfc",borderRight:"1px solid var(--p-color-border)"},children:[(0,e.jsxs)("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,paddingBottom:12,borderBottom:"1px solid #e1e3e5"},children:[(0,e.jsx)("h3",{style:{fontSize:"18px",fontWeight:"bold",color:"#202223",margin:0},children:"Ads Autopilot AI"}),(0,e.jsx)("button",{onClick:()=>n(!1),style:{background:"none",border:"none",fontSize:"18px",cursor:"pointer",padding:"4px 8px",borderRadius:"4px",color:"#6d7175"},"aria-label":"Close navigation menu",children:"\u2715"})]}),(0,e.jsxs)("ul",{style:{listStyle:"none",padding:0,display:"grid",gap:4},children:[(0,e.jsx)("li",{children:(0,e.jsx)(o,{to:t("/app/",i),onClick:()=>n(!1),style:{display:"block",padding:"12px 16px",borderRadius:"6px",textDecoration:"none",fontSize:"16px",fontWeight:"500",color:"#202223",transition:"all 0.2s ease"},children:"Dashboard"})}),(0,e.jsx)("li",{children:(0,e.jsx)(o,{to:t("/app/autopilot",i),onClick:()=>n(!1),style:{display:"block",padding:"12px 16px",borderRadius:"6px",textDecoration:"none",fontSize:"16px",fontWeight:"500",color:"#202223",transition:"all 0.2s ease"},children:"Autopilot"})}),(0,e.jsx)("li",{children:(0,e.jsx)(o,{to:t("/app/insights",i),onClick:()=>n(!1),style:{display:"block",padding:"12px 16px",borderRadius:"6px",textDecoration:"none",fontSize:"16px",fontWeight:"500",color:"#202223",transition:"all 0.2s ease"},children:"Insights"})}),(0,e.jsx)("li",{children:(0,e.jsx)(o,{to:t("/app/advanced",i),onClick:()=>n(!1),style:{display:"block",padding:"12px 16px",borderRadius:"6px",textDecoration:"none",fontSize:"16px",fontWeight:"500",color:"#202223",transition:"all 0.2s ease"},children:"Advanced"})}),(0,e.jsx)("li",{style:{marginTop:12,paddingTop:12,borderTop:"1px solid #e1e3e5"},children:(0,e.jsxs)(o,{to:"/app/intent-os",onClick:()=>n(!1),style:{display:"block",padding:"12px 16px",borderRadius:"6px",textDecoration:"none",fontSize:"14px",fontWeight:"400",color:"#6d7175",opacity:.7},children:["Smart Website",(0,e.jsx)("br",{}),(0,e.jsx)("span",{style:{fontSize:"12px",color:"#8c9196"},children:"Coming Q1 2026"})]})})]})]}),(0,e.jsxs)("main",{className:"main-content-mobile",style:{flex:1,padding:24,display:"flex",flexDirection:"column"},children:[(0,e.jsx)("div",{style:{flex:1},children:(0,e.jsx)(s,{})}),(0,e.jsxs)("footer",{style:{marginTop:"auto",paddingTop:"24px",borderTop:"1px solid #e1e3e5",textAlign:"center",fontSize:"12px",color:"#6d7175"},children:[(0,e.jsxs)("div",{style:{marginBottom:"12px"},children:[(0,e.jsx)("a",{href:"/privacy",target:"_blank",style:{color:"#006fbb",textDecoration:"none",marginRight:"16px"},children:"Privacy Policy"}),(0,e.jsx)("a",{href:"/terms",target:"_blank",style:{color:"#006fbb",textDecoration:"none",marginRight:"16px"},children:"Terms of Service"}),(0,e.jsx)("a",{href:"/support",target:"_blank",style:{color:"#006fbb",textDecoration:"none"},children:"Support"})]}),(0,e.jsxs)("div",{style:{color:"#8c9196",fontSize:"11px"},children:["Ads Autopilot AI \xA9 ",new Date().getFullYear()," \u2022 Contact: atanrikulu@e-listele.com"]})]})]})]})]})}),(0,e.jsx)(f,{}),(0,e.jsx)(b,{})]})]})}function w(){return(0,e.jsx)("pre",{style:{padding:16,color:"#a00"},children:"Something went wrong. Check the console for details."})}export{w as ErrorBoundary,h as default,S as links};
