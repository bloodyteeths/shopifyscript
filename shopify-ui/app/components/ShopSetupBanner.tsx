import * as React from 'react';
import { 
  getStoredShopName, 
  setStoredShopName, 
  validateShopName,
  getShopNameOrDefault 
} from '../utils/shop-config';

interface ShopSetupBannerProps {
  onSetupComplete?: (shopName: string) => void;
  showOnlyIfNeeded?: boolean;
}

export function ShopSetupBanner({ onSetupComplete, showOnlyIfNeeded = true }: ShopSetupBannerProps) {
  const [shopName, setShopName] = React.useState('');
  const [isVisible, setIsVisible] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [showSuccess, setShowSuccess] = React.useState(false);

  React.useEffect(() => {
    // Check if setup is needed
    const storedShopName = getStoredShopName();
    const currentShopName = getShopNameOrDefault();
    
    // Show banner if no stored shop name or using default
    const needsSetup = !storedShopName || currentShopName === 'proofkit';
    
    if (showOnlyIfNeeded) {
      setIsVisible(needsSetup);
    } else {
      setIsVisible(true);
    }
    
    if (needsSetup) {
      setShopName(''); // Start with empty for first-time setup
    } else {
      setShopName(currentShopName);
    }
  }, [showOnlyIfNeeded]);

  const handleSave = async () => {
    setError('');
    setIsLoading(true);

    try {
      // Validate shop name
      const trimmedShopName = shopName.trim();
      if (!trimmedShopName) {
        setError('Please enter your shop name');
        return;
      }

      if (!validateShopName(trimmedShopName)) {
        setError('Shop name must be 2-64 characters, alphanumeric with hyphens/underscores allowed');
        return;
      }

      // Save shop name
      setStoredShopName(trimmedShopName);
      
      // Show success message
      setShowSuccess(true);
      
      // Call completion callback
      onSetupComplete?.(trimmedShopName);
      
      // Auto-hide after success
      setTimeout(() => {
        setIsVisible(false);
      }, 2000);
      
    } catch (err) {
      setError('Failed to save shop name. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div style={{
      backgroundColor: '#e7f3ff',
      border: '2px solid #007bff',
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '24px',
      boxShadow: '0 4px 12px rgba(0, 123, 255, 0.15)'
    }}>
      {showSuccess ? (
        // Success State
        <div style={{
          textAlign: 'center',
          color: '#155724'
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '12px'
          }}>
            ✅
          </div>
          <h3 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '8px',
            color: '#155724'
          }}>
            Setup Complete!
          </h3>
          <p style={{
            fontSize: '16px',
            color: '#155724',
            margin: '0'
          }}>
            ProofKit is now configured for: <strong>{shopName}.myshopify.com</strong>
          </p>
        </div>
      ) : (
        // Setup Form
        <>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '20px',
            marginBottom: '20px'
          }}>
            <div style={{
              fontSize: '48px',
              lineHeight: '1'
            }}>
              🏪
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#0c5460',
                marginBottom: '8px',
                margin: '0 0 8px 0'
              }}>
                Connect Your Shopify Store
              </h2>
              <p style={{
                fontSize: '16px',
                color: '#0c5460',
                marginBottom: '16px',
                lineHeight: '1.5',
                margin: '0'
              }}>
                Enter your Shopify store name to set up ProofKit automation and tracking.
              </p>
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #b8daff'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                flex: 1,
                maxWidth: '400px'
              }}>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="your-shop-name"
                  disabled={isLoading}
                  style={{
                    padding: '12px 16px',
                    fontSize: '16px',
                    border: error ? '2px solid #dc3545' : '2px solid #007bff',
                    borderRadius: '6px 0 0 6px',
                    flex: 1,
                    outline: 'none',
                    fontFamily: 'monospace',
                    backgroundColor: isLoading ? '#f8f9fa' : 'white'
                  }}
                  autoFocus
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
              
              <button
                onClick={handleSave}
                disabled={isLoading || !shopName.trim()}
                style={{
                  padding: '12px 24px',
                  backgroundColor: isLoading || !shopName.trim() ? '#6c757d' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: isLoading || !shopName.trim() ? 'not-allowed' : 'pointer',
                  opacity: isLoading || !shopName.trim() ? 0.7 : 1,
                  transition: 'all 0.2s ease',
                  boxShadow: isLoading || !shopName.trim() ? 'none' : '0 2px 8px rgba(40, 167, 69, 0.3)'
                }}
              >
                {isLoading ? (
                  <>⏳ Saving...</>
                ) : (
                  <>🚀 Save & Continue</>
                )}
              </button>
            </div>

            {error && (
              <div style={{
                color: '#721c24',
                backgroundColor: '#f8d7da',
                border: '1px solid #f5c6cb',
                borderRadius: '6px',
                padding: '12px 16px',
                fontSize: '14px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>⚠️</span>
                {error}
              </div>
            )}

            <div style={{
              fontSize: '14px',
              color: '#495057',
              lineHeight: '1.4'
            }}>
              <strong>Examples:</strong> "proofkit", "my-store", "awesome-shop"
              <br />
              <strong>Note:</strong> Enter only the part before ".myshopify.com"
            </div>
          </div>

          <div style={{
            marginTop: '16px',
            padding: '16px',
            backgroundColor: '#fff3cd',
            borderRadius: '6px',
            border: '1px solid #ffeaa7'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <span style={{ fontSize: '20px' }}>💡</span>
              <div style={{
                fontSize: '14px',
                color: '#856404',
                lineHeight: '1.4'
              }}>
                <strong>Why do we need this?</strong>
                <br />
                ProofKit uses your shop name to:
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                  <li>Generate personalized Google Ads scripts</li>
                  <li>Track your store's performance data</li>
                  <li>Ensure proper tenant isolation for multi-store setups</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ShopSetupBanner;