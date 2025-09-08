import React from 'react';

// Professional loading spinner
export function LoadingSpinner({ 
  size = 'medium', 
  color = '#007bff',
  text = 'Loading...'
}: { 
  size?: 'small' | 'medium' | 'large';
  color?: string;
  text?: string;
}) {
  const dimensions = {
    small: 16,
    medium: 24,
    large: 32
  };

  const spinnerSize = dimensions[size];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      padding: '8px'
    }}>
      <div
        style={{
          width: spinnerSize,
          height: spinnerSize,
          border: `2px solid transparent`,
          borderTop: `2px solid ${color}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}
      />
      {text && (
        <span style={{
          fontSize: size === 'small' ? '12px' : size === 'medium' ? '14px' : '16px',
          color: '#6c757d',
          fontWeight: '500'
        }}>
          {text}
        </span>
      )}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `
      }} />
    </div>
  );
}

// Skeleton loading placeholders
export function SkeletonText({ 
  lines = 1, 
  width = '100%',
  height = '16px'
}: { 
  lines?: number; 
  width?: string | number;
  height?: string | number;
}) {
  const skeletonItems = Array.from({ length: lines }, (_, i) => (
    <div
      key={i}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 2s infinite',
        borderRadius: '4px',
        marginBottom: i < lines - 1 ? '8px' : '0'
      }}
    />
  ));

  return (
    <div>
      {skeletonItems}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `
      }} />
    </div>
  );
}

// Card skeleton for dashboard cards
export function SkeletonCard() {
  return (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '1.5rem',
      background: '#f8f9fa',
    }}>
      <SkeletonText width="60%" height="20px" />
      <div style={{ marginTop: '12px', marginBottom: '16px' }}>
        <SkeletonText lines={2} width="90%" height="14px" />
      </div>
      <div style={{
        width: '120px',
        height: '40px',
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 2s infinite',
        borderRadius: '6px'
      }} />
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `
      }} />
    </div>
  );
}

// Full page loading overlay
export function LoadingOverlay({ 
  message = 'Loading...',
  isVisible = true 
}: {
  message?: string;
  isVisible?: boolean;
}) {
  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      flexDirection: 'column',
      gap: '16px'
    }}>
      <LoadingSpinner size="large" text="" />
      <div style={{
        fontSize: '16px',
        color: '#495057',
        fontWeight: '500',
        textAlign: 'center'
      }}>
        {message}
      </div>
    </div>
  );
}

// Button loading state
export function LoadingButton({
  children,
  isLoading = false,
  disabled = false,
  onClick,
  style = {},
  loadingText = 'Loading...',
  type = 'button',
  ...props
}: {
  children: React.ReactNode;
  isLoading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
  loadingText?: string;
  type?: 'button' | 'submit';
  [key: string]: any;
}) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      style={{
        position: 'relative',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.7 : 1,
        ...style
      }}
      {...props}
    >
      <span style={{ 
        visibility: isLoading ? 'hidden' : 'visible' 
      }}>
        {children}
      </span>
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <LoadingSpinner size="small" text="" />
          <span>{loadingText}</span>
        </div>
      )}
    </button>
  );
}

// Professional toast notification
export function Toast({
  message,
  type = 'success',
  isVisible = false,
  onClose,
  duration = 4000
}: {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}) {
  React.useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const colors = {
    success: { bg: '#d1eddd', border: '#28a745', text: '#155724' },
    error: { bg: '#fee', border: '#dc3545', text: '#721c24' },
    warning: { bg: '#fff3cd', border: '#ffc107', text: '#856404' },
    info: { bg: '#e7f3ff', border: '#007bff', text: '#004085' }
  };

  const colorScheme = colors[type];

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: colorScheme.bg,
      border: `1px solid ${colorScheme.border}`,
      borderRadius: '8px',
      padding: '12px 16px',
      color: colorScheme.text,
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      zIndex: 10000,
      maxWidth: '400px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      animation: 'slideIn 0.3s ease-out'
    }}>
      <span>{message}</span>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: colorScheme.text,
          cursor: 'pointer',
          fontSize: '16px',
          padding: '0',
          opacity: 0.7
        }}
        onMouseOver={e => e.target.style.opacity = '1'}
        onMouseOut={e => e.target.style.opacity = '0.7'}
      >
        ✕
      </button>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `
      }} />
    </div>
  );
}