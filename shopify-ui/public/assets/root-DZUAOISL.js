import{a as b}from"/assets/_shared/chunk-LXK74B4C.js";import{a as f,b as t}from"/assets/_shared/chunk-OSEGCAPX.js";import{a as g}from"/assets/_shared/chunk-S3LTH7L6.js";import"/assets/_shared/chunk-NAVXS3X4.js";import{f as r,i as e,l as p,m as d,n as s,s as c}from"/assets/_shared/chunk-6KZRTIW3.js";import{a as x}from"/assets/_shared/chunk-6U5IYNIC.js";import{a as u}from"/assets/_shared/chunk-FN6342HM.js";import{d as a}from"/assets/_shared/chunk-P23QBOGJ.js";var m=a(u());var o=a(x()),h={},v=()=>[{rel:"stylesheet",href:b}];function y(){let i=f(),[l,n]=(0,m.useState)(!1);return(0,o.jsxs)("html",{lang:"en",children:[(0,o.jsxs)("head",{children:[(0,o.jsx)("meta",{charSet:"utf-8"}),(0,o.jsx)("meta",{name:"viewport",content:"width=device-width, initial-scale=1"}),(0,o.jsx)(d,{}),(0,o.jsx)(p,{}),(0,o.jsx)("style",{dangerouslySetInnerHTML:{__html:`
            @media (max-width: 768px) {
              .mobile-nav {
                position: fixed;
                top: 0;
                left: ${l?"0":"-100%"};
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
                display: ${l?"block":"none"};
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
          `}})]}),(0,o.jsxs)("body",{children:[(0,o.jsx)(g,{i18n:h,children:(0,o.jsxs)("div",{className:"Polaris-Page",style:{display:"flex",minHeight:"100vh",flexDirection:"column"},children:[(0,o.jsxs)("div",{className:"mobile-header",children:[(0,o.jsx)("button",{className:"hamburger",onClick:()=>n(!0),"aria-label":"Open navigation menu",children:"\u2630"}),(0,o.jsx)("h1",{style:{fontSize:"18px",fontWeight:"bold",color:"#202223",margin:0},children:"Ads Autopilot AI"}),(0,o.jsx)("div",{style:{width:36}})]}),(0,o.jsx)("div",{className:"mobile-overlay",onClick:()=>n(!1)}),(0,o.jsxs)("div",{style:{display:"flex",flex:1},children:[(0,o.jsxs)("nav",{className:"desktop-nav",style:{width:240,padding:20,borderRight:"1px solid var(--p-color-border)",background:"#fafbfc"},children:[(0,o.jsx)("h3",{style:{marginBottom:20,fontSize:"18px",fontWeight:"bold",color:"#202223",borderBottom:"1px solid #e1e3e5",paddingBottom:12},children:"Ads Autopilot AI"}),(0,o.jsxs)("ul",{style:{listStyle:"none",padding:0,display:"grid",gap:4},children:[(0,o.jsx)("li",{children:(0,o.jsx)(e,{to:t("/app/",i),style:{display:"block",padding:"8px 12px",borderRadius:"6px",textDecoration:"none",fontSize:"14px",fontWeight:"500",color:"#202223",transition:"all 0.2s ease"},children:"Dashboard"})}),(0,o.jsx)("li",{children:(0,o.jsx)(e,{to:t("/app/autopilot",i),style:{display:"block",padding:"8px 12px",borderRadius:"6px",textDecoration:"none",fontSize:"14px",fontWeight:"500",color:"#202223",transition:"all 0.2s ease"},children:"Autopilot"})}),(0,o.jsx)("li",{children:(0,o.jsx)(e,{to:t("/app/insights",i),style:{display:"block",padding:"8px 12px",borderRadius:"6px",textDecoration:"none",fontSize:"14px",fontWeight:"500",color:"#202223",transition:"all 0.2s ease"},children:"Insights"})}),(0,o.jsx)("li",{children:(0,o.jsx)(e,{to:t("/app/advanced",i),style:{display:"block",padding:"8px 12px",borderRadius:"6px",textDecoration:"none",fontSize:"14px",fontWeight:"500",color:"#202223",transition:"all 0.2s ease"},children:"Advanced"})}),(0,o.jsx)("li",{style:{marginTop:12,paddingTop:12,borderTop:"1px solid #e1e3e5"},children:(0,o.jsxs)(e,{to:"/app/intent-os",style:{display:"block",padding:"8px 12px",borderRadius:"6px",textDecoration:"none",fontSize:"12px",fontWeight:"400",color:"#6d7175",opacity:.7},children:["Smart Website",(0,o.jsx)("br",{}),(0,o.jsx)("span",{style:{fontSize:"10px",color:"#8c9196"},children:"Coming Q1 2026"})]})})]})]}),(0,o.jsxs)("nav",{className:"mobile-nav",style:{width:280,padding:20,background:"#fafbfc",borderRight:"1px solid var(--p-color-border)"},children:[(0,o.jsxs)("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,paddingBottom:12,borderBottom:"1px solid #e1e3e5"},children:[(0,o.jsx)("h3",{style:{fontSize:"18px",fontWeight:"bold",color:"#202223",margin:0},children:"Ads Autopilot AI"}),(0,o.jsx)("button",{onClick:()=>n(!1),style:{background:"none",border:"none",fontSize:"18px",cursor:"pointer",padding:"4px 8px",borderRadius:"4px",color:"#6d7175"},"aria-label":"Close navigation menu",children:"\u2715"})]}),(0,o.jsxs)("ul",{style:{listStyle:"none",padding:0,display:"grid",gap:4},children:[(0,o.jsx)("li",{children:(0,o.jsx)(e,{to:t("/app/",i),onClick:()=>n(!1),style:{display:"block",padding:"12px 16px",borderRadius:"6px",textDecoration:"none",fontSize:"16px",fontWeight:"500",color:"#202223",transition:"all 0.2s ease"},children:"Dashboard"})}),(0,o.jsx)("li",{children:(0,o.jsx)(e,{to:t("/app/autopilot",i),onClick:()=>n(!1),style:{display:"block",padding:"12px 16px",borderRadius:"6px",textDecoration:"none",fontSize:"16px",fontWeight:"500",color:"#202223",transition:"all 0.2s ease"},children:"Autopilot"})}),(0,o.jsx)("li",{children:(0,o.jsx)(e,{to:t("/app/insights",i),onClick:()=>n(!1),style:{display:"block",padding:"12px 16px",borderRadius:"6px",textDecoration:"none",fontSize:"16px",fontWeight:"500",color:"#202223",transition:"all 0.2s ease"},children:"Insights"})}),(0,o.jsx)("li",{children:(0,o.jsx)(e,{to:t("/app/advanced",i),onClick:()=>n(!1),style:{display:"block",padding:"12px 16px",borderRadius:"6px",textDecoration:"none",fontSize:"16px",fontWeight:"500",color:"#202223",transition:"all 0.2s ease"},children:"Advanced"})}),(0,o.jsx)("li",{style:{marginTop:12,paddingTop:12,borderTop:"1px solid #e1e3e5"},children:(0,o.jsxs)(e,{to:"/app/intent-os",onClick:()=>n(!1),style:{display:"block",padding:"12px 16px",borderRadius:"6px",textDecoration:"none",fontSize:"14px",fontWeight:"400",color:"#6d7175",opacity:.7},children:["Smart Website",(0,o.jsx)("br",{}),(0,o.jsx)("span",{style:{fontSize:"12px",color:"#8c9196"},children:"Coming Q1 2026"})]})})]})]}),(0,o.jsxs)("main",{className:"main-content-mobile",style:{flex:1,padding:24,display:"flex",flexDirection:"column"},children:[(0,o.jsx)("div",{style:{flex:1},children:(0,o.jsx)(r,{})}),(0,o.jsxs)("footer",{style:{marginTop:"auto",paddingTop:"24px",borderTop:"1px solid #e1e3e5",textAlign:"center",fontSize:"12px",color:"#6d7175"},children:[(0,o.jsxs)("div",{style:{marginBottom:"12px"},children:[(0,o.jsx)("a",{href:"/privacy",target:"_blank",style:{color:"#006fbb",textDecoration:"none",marginRight:"16px"},children:"Privacy Policy"}),(0,o.jsx)("a",{href:"/terms",target:"_blank",style:{color:"#006fbb",textDecoration:"none",marginRight:"16px"},children:"Terms of Service"}),(0,o.jsx)("a",{href:"/support",target:"_blank",style:{color:"#006fbb",textDecoration:"none"},children:"Support"})]}),(0,o.jsxs)("div",{style:{color:"#8c9196",fontSize:"11px"},children:["Ads Autopilot AI \xA9 ",new Date().getFullYear()," \u2022 Contact: atanrikulu@e-listele.com"]})]})]})]})]})}),(0,o.jsx)(c,{}),(0,o.jsx)(s,{})]})]})}function k(){return(0,o.jsx)("pre",{style:{padding:16,color:"#a00"},children:"Something went wrong. Check the console for details."})}export{k as ErrorBoundary,y as default,v as links};
