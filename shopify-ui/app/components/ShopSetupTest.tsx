import * as React from "react";
import ShopSetupBanner from "./ShopSetupBanner";
import ShopConfig from "./ShopConfig";
import ShopNameInput from "./ShopNameInput";
import {
  getStoredShopName,
  clearStoredShopName,
  isShopSetupNeeded,
  validateShopName,
  getShopNameOrNull,
} from "../utils/shop-config";

export function ShopSetupTest() {
  const [testMode, setTestMode] = React.useState<"banner" | "config" | "input">(
    "banner",
  );
  const [shopName, setShopName] = React.useState("");
  const [status, setStatus] = React.useState<{
    stored: string | null;
    current: string;
    needsSetup: boolean;
  }>({
    stored: null,
    current: "proofkit",
    needsSetup: true,
  });

  // Update status when component mounts or shop name changes
  const refreshStatus = React.useCallback(() => {
    setStatus({
      stored: getStoredShopName(),
      current: getShopNameOrNull(),
      needsSetup: isShopSetupNeeded(),
    });
  }, []);

  React.useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const handleClearStorage = () => {
    clearStoredShopName();
    refreshStatus();
    setShopName("");
  };

  const testCases = [
    {
      name: "Valid Names",
      values: ["proofkit", "my-store", "test123", "awesome_shop"],
    },
    {
      name: "Invalid Names",
      values: [
        "",
        "a",
        "shop name",
        "shop@name",
        "-invalid",
        "toolongshopnamethatexceeds64charactersandshouldbeinvalidaccordingtorules",
      ],
    },
  ];

  return (
    <div style={{ padding: "20px", maxWidth: "800px" }}>
      <h2>🧪 Shop Setup Components Test</h2>

      {/* Current Status */}
      <div
        style={{
          backgroundColor: "#f8f9fa",
          padding: "16px",
          borderRadius: "8px",
          marginBottom: "20px",
          border: "1px solid #e1e5e9",
        }}
      >
        <h3>Current Status</h3>
        <div style={{ fontFamily: "monospace", fontSize: "14px" }}>
          <div>
            Stored Shop Name: <strong>{status.stored || "null"}</strong>
          </div>
          <div>
            Current Shop Name: <strong>{status.current}</strong>
          </div>
          <div>
            Setup Needed:{" "}
            <strong
              style={{ color: status.needsSetup ? "#dc3545" : "#28a745" }}
            >
              {status.needsSetup ? "YES" : "NO"}
            </strong>
          </div>
        </div>
        <button
          onClick={handleClearStorage}
          style={{
            marginTop: "12px",
            padding: "8px 16px",
            backgroundColor: "#dc3545",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          🗑️ Clear Storage (Reset Test)
        </button>
        <button
          onClick={refreshStatus}
          style={{
            marginTop: "12px",
            marginLeft: "8px",
            padding: "8px 16px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          🔄 Refresh Status
        </button>
      </div>

      {/* Component Selector */}
      <div style={{ marginBottom: "20px" }}>
        <label
          style={{ display: "block", fontWeight: "bold", marginBottom: "8px" }}
        >
          Select Component to Test:
        </label>
        <div style={{ display: "flex", gap: "12px" }}>
          {[
            { key: "banner", label: "🏪 Setup Banner" },
            { key: "config", label: "⚙️ Shop Config" },
            { key: "input", label: "📝 Name Input" },
          ].map(({ key, label }) => (
            <label
              key={key}
              style={{ display: "flex", alignItems: "center", gap: "4px" }}
            >
              <input
                type="radio"
                name="testMode"
                value={key}
                checked={testMode === key}
                onChange={(e) => setTestMode(e.target.value as any)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Component Rendering */}
      <div
        style={{
          border: "2px solid #007bff",
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "20px",
        }}
      >
        <h3>Component Preview</h3>
        {testMode === "banner" && (
          <ShopSetupBanner
            onSetupComplete={(name) => {
              console.log("Setup completed:", name);
              refreshStatus();
            }}
            showOnlyIfNeeded={false}
          />
        )}

        {testMode === "config" && (
          <ShopConfig
            showInline={false}
            onShopNameChange={(name) => {
              console.log("Shop name changed:", name);
              refreshStatus();
            }}
          />
        )}

        {testMode === "input" && (
          <div>
            <ShopNameInput
              value={shopName}
              onChange={setShopName}
              onSave={() => {
                console.log("Save requested:", shopName);
              }}
              size="medium"
              autoFocus={false}
            />
            <button
              onClick={() => console.log("Manual save:", shopName)}
              style={{
                marginTop: "12px",
                padding: "8px 16px",
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Test Save
            </button>
          </div>
        )}
      </div>

      {/* Validation Testing */}
      <div
        style={{
          backgroundColor: "#fff3cd",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid #ffeaa7",
        }}
      >
        <h3>Validation Testing</h3>
        {testCases.map(({ name, values }) => (
          <div key={name} style={{ marginBottom: "16px" }}>
            <h4>{name}:</h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "8px",
              }}
            >
              {values.map((value) => {
                const isValid = validateShopName(value);
                return (
                  <div
                    key={value}
                    style={{
                      padding: "8px 12px",
                      backgroundColor: isValid ? "#d4edda" : "#f8d7da",
                      border: `1px solid ${isValid ? "#c3e6cb" : "#f5c6cb"}`,
                      borderRadius: "4px",
                      fontSize: "14px",
                      fontFamily: "monospace",
                    }}
                  >
                    <div>"{value}"</div>
                    <div style={{ fontSize: "12px", marginTop: "4px" }}>
                      {isValid ? "✅ Valid" : "❌ Invalid"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ShopSetupTest;
