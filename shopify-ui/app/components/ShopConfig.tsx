import * as React from 'react';
import { 
  getStoredShopName, 
  setStoredShopName, 
  validateShopName, 
  getShopNameOrDefault,
  clearStoredShopName 
} from '../utils/shop-config';

interface ShopConfigProps {
  showInline?: boolean;
  onShopNameChange?: (shopName: string) => void;
}

export function ShopConfig({ showInline = false, onShopNameChange }: ShopConfigProps) {
  const [shopName, setShopName] = React.useState('');
  const [isEditing, setIsEditing] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  React.useEffect(() => {
    const currentShopName = getShopNameOrDefault();
    setShopName(currentShopName);
  }, []);

  const handleSave = () => {
    setError('');
    setSuccess('');

    if (!validateShopName(shopName)) {
      setError('Shop name must be 2-64 characters, alphanumeric with hyphens/underscores allowed');
      return;
    }

    try {
      setStoredShopName(shopName);
      setSuccess('Shop name saved successfully!');
      setIsEditing(false);
      onShopNameChange?.(shopName);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to save shop name. Please try again.');
    }
  };

  const handleCancel = () => {
    const currentShopName = getShopNameOrDefault();
    setShopName(currentShopName);
    setIsEditing(false);
    setError('');
  };

  const handleClear = () => {
    clearStoredShopName();
    const defaultShopName = getShopNameOrDefault();
    setShopName(defaultShopName);
    setSuccess('Shop name cleared, using default');
    onShopNameChange?.(defaultShopName);
    setTimeout(() => setSuccess(''), 3000);
  };

  if (showInline) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        fontSize: '14px',
        padding: '8px 12px',
        backgroundColor: '#f8f9fa',
        borderRadius: '6px',
        border: '1px solid #e1e5e9'
      }}>
        <span style={{ fontWeight: 'bold', color: '#495057' }}>Shop:</span>
        {isEditing ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSave()}
                style={{
                  padding: '4px 8px',
                  border: error ? '1px solid #dc3545' : '1px solid #007bff',
                  borderRadius: '4px 0 0 4px',
                  fontSize: '14px',
                  width: '120px',
                  fontFamily: 'monospace',
                  outline: 'none'
                }}
                placeholder="shop-name"
                autoFocus
              />
              <span style={{
                padding: '4px 8px',
                backgroundColor: '#e9ecef',
                border: error ? '1px solid #dc3545' : '1px solid #007bff',
                borderLeft: 'none',
                borderRadius: '0 4px 4px 0',
                fontSize: '14px',
                color: '#666',
                fontFamily: 'monospace'
              }}>
                .myshopify.com
              </span>
            </div>
            <button onClick={handleSave} style={{
              padding: '4px 8px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              ✓
            </button>
            <button onClick={handleCancel} style={{
              padding: '4px 8px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}>
              ✕
            </button>
          </>
        ) : (
          <>
            <strong style={{ color: '#007bff', fontFamily: 'monospace' }}>
              {shopName}.myshopify.com
            </strong>
            <button onClick={() => setIsEditing(true)} style={{
              padding: '2px 6px',
              background: 'transparent',
              border: '1px solid #007bff',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              color: '#007bff'
            }}>
              Edit
            </button>
          </>
        )}
        {error && (
          <span style={{ 
            color: '#dc3545', 
            fontSize: '12px',
            backgroundColor: '#f8d7da',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid #f5c6cb'
          }}>
            {error}
          </span>
        )}
        {success && (
          <span style={{ 
            color: '#155724', 
            fontSize: '12px',
            backgroundColor: '#d4edda',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid #c3e6cb'
          }}>
            {success}
          </span>
        )}
      </div>
    );
  }

  return (
    <div style={{
      border: '1px solid #e1e5e9',
      borderRadius: '8px',
      padding: '16px',
      backgroundColor: '#f8f9fa',
      marginBottom: '16px'
    }}>
      <h3 style={{
        fontSize: '16px',
        fontWeight: 'bold',
        marginBottom: '8px',
        color: '#333'
      }}>
        Shop Configuration
      </h3>
      <p style={{
        fontSize: '14px',
        color: '#666',
        marginBottom: '12px'
      }}>
        Set your shop name to ensure proper tenant identification for all ProofKit features.
      </p>
      
      <div style={{ marginBottom: '12px' }}>
        <label style={{
          display: 'block',
          fontWeight: 'bold',
          marginBottom: '8px',
          fontSize: '16px',
          color: '#495057'
        }}>
          Shopify Store URL
        </label>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px' 
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            maxWidth: '500px'
          }}>
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSave()}
              style={{
                padding: '12px 16px',
                border: error ? '2px solid #dc3545' : '2px solid #007bff',
                borderRadius: '6px 0 0 6px',
                fontSize: '16px',
                flex: 1,
                fontFamily: 'monospace',
                outline: 'none',
                backgroundColor: 'white'
              }}
              placeholder="your-shop-name"
            />
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#f8f9fa',
              border: error ? '2px solid #dc3545' : '2px solid #007bff',
              borderLeft: 'none',
              borderRadius: '0 6px 6px 0',
              fontSize: '16px',
              color: '#666',
              fontFamily: 'monospace',
              whiteSpace: 'nowrap'
            }}>
              .myshopify.com
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={handleSave} style={{
              padding: '12px 24px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              boxShadow: '0 2px 8px rgba(40, 167, 69, 0.3)',
              transition: 'all 0.2s ease'
            }}>
              💾 Save Shop Name
            </button>
            <button onClick={handleClear} style={{
              padding: '12px 24px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}>
              🔄 Reset to Default
            </button>
          </div>
          
          <div style={{
            fontSize: '14px',
            color: '#6c757d',
            backgroundColor: '#f8f9fa',
            padding: '12px',
            borderRadius: '6px',
            border: '1px solid #e9ecef'
          }}>
            <strong>Examples:</strong> "proofkit", "my-store", "awesome-shop"
            <br />
            <strong>Note:</strong> Enter only the part before ".myshopify.com"
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          color: '#721c24',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          padding: '8px 12px',
          fontSize: '14px',
          marginBottom: '8px'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          color: '#155724',
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '4px',
          padding: '8px 12px',
          fontSize: '14px',
          marginBottom: '8px'
        }}>
          {success}
        </div>
      )}

      <div style={{
        fontSize: '12px',
        color: '#666',
        fontStyle: 'italic'
      }}>
        <strong>Note:</strong> This shop name will be used for all API calls and data isolation. 
        Use your Shopify shop name without ".myshopify.com" (e.g., "proofkit" for "proofkit.myshopify.com").
      </div>
    </div>
  );
}

export default ShopConfig;