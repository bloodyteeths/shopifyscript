import * as React from "react";
import { validateShopName } from "../utils/shop-config";

interface ShopNameInputProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  size?: "small" | "medium" | "large";
  showLabel?: boolean;
  autoFocus?: boolean;
}

export function ShopNameInput({
  value,
  onChange,
  onSave,
  placeholder = "your-shop-name",
  disabled = false,
  error,
  size = "medium",
  showLabel = true,
  autoFocus = false,
}: ShopNameInputProps) {
  const [localError, setLocalError] = React.useState("");
  const [isValid, setIsValid] = React.useState(true);

  // Real-time validation
  React.useEffect(() => {
    if (value.trim()) {
      const valid = validateShopName(value.trim());
      setIsValid(valid);

      if (!valid) {
        setLocalError(
          "Must be 2-64 characters, alphanumeric with hyphens/underscores allowed",
        );
      } else {
        setLocalError("");
      }
    } else {
      setIsValid(true);
      setLocalError("");
    }
  }, [value]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && onSave && isValid && value.trim()) {
      onSave();
    }
  };

  const displayError = error || localError;
  const hasError = Boolean(displayError);

  // Size configurations
  const sizeConfig = {
    small: {
      fontSize: "14px",
      padding: "6px 10px",
      height: "32px",
    },
    medium: {
      fontSize: "16px",
      padding: "12px 16px",
      height: "44px",
    },
    large: {
      fontSize: "18px",
      padding: "16px 20px",
      height: "52px",
    },
  };

  const config = sizeConfig[size];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {showLabel && (
        <label
          style={{
            fontSize:
              size === "large" ? "18px" : size === "small" ? "14px" : "16px",
            fontWeight: "bold",
            color: "#495057",
            marginBottom: "4px",
          }}
        >
          Shopify Store URL
        </label>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          maxWidth:
            size === "large" ? "600px" : size === "small" ? "320px" : "500px",
        }}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          style={{
            ...config,
            border: hasError
              ? "2px solid #dc3545"
              : isValid && value.trim()
                ? "2px solid #28a745"
                : "2px solid #007bff",
            borderRadius: "6px 0 0 6px",
            flex: 1,
            fontFamily: "monospace",
            outline: "none",
            backgroundColor: disabled ? "#f8f9fa" : "white",
            color: disabled ? "#6c757d" : "#495057",
            transition: "border-color 0.2s ease",
          }}
        />

        <div
          style={{
            ...config,
            backgroundColor: disabled ? "#e9ecef" : "#f8f9fa",
            border: hasError
              ? "2px solid #dc3545"
              : isValid && value.trim()
                ? "2px solid #28a745"
                : "2px solid #007bff",
            borderLeft: "none",
            borderRadius: "0 6px 6px 0",
            color: disabled ? "#adb5bd" : "#6c757d",
            fontFamily: "monospace",
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
          }}
        >
          .myshopify.com
        </div>

        {/* Validation indicator */}
        {value.trim() && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              paddingLeft: "8px",
              fontSize: size === "large" ? "20px" : "16px",
            }}
          >
            {isValid ? (
              <span style={{ color: "#28a745" }}>✓</span>
            ) : (
              <span style={{ color: "#dc3545" }}>✗</span>
            )}
          </div>
        )}
      </div>

      {/* Error message */}
      {displayError && (
        <div
          style={{
            color: "#721c24",
            backgroundColor: "#f8d7da",
            border: "1px solid #f5c6cb",
            borderRadius: "4px",
            padding: size === "large" ? "8px 12px" : "6px 10px",
            fontSize: size === "large" ? "14px" : "13px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>⚠️</span>
          {displayError}
        </div>
      )}

      {/* Helper text when valid */}
      {!displayError && value.trim() && isValid && (
        <div
          style={{
            color: "#155724",
            fontSize: size === "large" ? "14px" : "13px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>✓</span>
          Valid shop name: <strong>{value}.myshopify.com</strong>
        </div>
      )}

      {/* Example text when empty */}
      {!value.trim() && (
        <div
          style={{
            fontSize: size === "large" ? "14px" : "13px",
            color: "#6c757d",
            fontStyle: "italic",
          }}
        >
          <strong>Examples:</strong> "proofkit", "my-store", "awesome-shop"
        </div>
      )}
    </div>
  );
}

export default ShopNameInput;
