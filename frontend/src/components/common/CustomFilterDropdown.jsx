import React, { useState, useRef, useEffect } from 'react';
import { Icon } from './Icons';

export function CustomFilterDropdown({
  options = [],
  value,
  onChange,
  className = '',
  style = {},
  align = 'left',
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const activeOption = options.find((opt) => opt.value === value) || options[0];

  return (
    <div
      ref={containerRef}
      className={`custom-filter-dropdown-container ${className}`}
      style={{ position: 'relative', display: 'inline-block', ...style }}
    >
      {/* Trigger button: Exact same appearance as desktop landscape .chip.glass.on */}
      <button
        type="button"
        className="chip glass on custom-filter-chip-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          border: '1px solid var(--acc, #92400e)',
          background: 'var(--acc, #92400e)',
          color: '#ffffff',
          borderRadius: '999px',
          padding: '7px 16px',
          fontSize: '13px',
          fontWeight: 600,
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
          transition: 'all 0.2s ease',
        }}
      >
        {activeOption?.dotColor && (
          <i className="dot" style={{ background: activeOption.dotColor }} />
        )}
        {activeOption?.icon && <Icon name={activeOption.icon} size={14} />}
        <span>{activeOption?.label || 'All'}</span>
        <span
          style={{
            fontSize: '9px',
            marginLeft: '2px',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            opacity: 0.9,
          }}
        >
          ▼
        </span>
      </button>

      {/* Floating custom dropdown menu with colored, clearly readable options */}
      {isOpen && (
        <div
          className="custom-filter-dropdown-menu custom-scrollbar"
          onScroll={(e) => {
            if (!onLoadMore || !hasMore || isLoadingMore) return;
            const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
            if (scrollHeight - scrollTop - clientHeight < 60) {
              onLoadMore();
            }
          }}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: align === 'right' ? 'auto' : 0,
            right: align === 'right' ? 0 : 'auto',
            zIndex: 99,
            minWidth: '210px',
            maxWidth: '300px',
            maxHeight: '340px',
            overflowY: 'auto',
            background: 'var(--paper, #F3EADD)',
            border: '1.5px solid var(--gold, #E6C280)',
            borderRadius: '14px',
            padding: '7px',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(16px)',
            animation: 'fadeIn 0.18s ease',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
          }}
        >
          {options.map((opt) => {
            const isCurrent = opt.value === value;
            const isDisabled = Boolean(opt.disabled);

            return (
              <button
                key={opt.value}
                type="button"
                disabled={isDisabled}
                className={`custom-filter-dropdown-item ${isCurrent ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
                onClick={() => {
                  if (isDisabled) return;
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: isCurrent ? 600 : 500,
                  color: isDisabled
                    ? 'var(--ink2, #7E6D61)'
                    : isCurrent
                    ? '#ffffff'
                    : 'var(--ink, #2C211D)',
                  background: isDisabled
                    ? 'rgba(0, 0, 0, 0.04)'
                    : isCurrent
                    ? 'var(--acc, #92400e)'
                    : 'rgba(230, 194, 128, 0.14)',
                  border: isDisabled
                    ? '1px dashed rgba(0, 0, 0, 0.15)'
                    : isCurrent
                    ? '1px solid var(--acc, #92400e)'
                    : '1px solid rgba(230, 194, 128, 0.45)',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  opacity: isDisabled ? 0.45 : 1,
                  filter: isDisabled ? 'grayscale(60%)' : 'none',
                  textAlign: 'left',
                  transition: 'all 0.18s ease',
                  userSelect: 'none',
                  boxSizing: 'border-box',
                }}
              >
                {opt.dotColor && (
                  <i
                    className="dot"
                    style={{
                      background: opt.dotColor,
                      boxShadow: '0 0 6px rgba(0,0,0,0.15)',
                    }}
                  />
                )}
                {opt.icon && (
                  <span style={{ color: isCurrent ? '#ffffff' : 'var(--acc, #92400e)', display: 'inline-flex' }}>
                    <Icon name={opt.icon} size={14} />
                  </span>
                )}
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {opt.label}
                </span>
                {isCurrent && <span style={{ fontSize: '13px', fontWeight: 700 }}>✓</span>}
                {isDisabled && <span style={{ fontSize: '11px', opacity: 0.7 }}>🔒</span>}
              </button>
            );
          })}
          {isLoadingMore && (
            <div
              style={{
                textAlign: 'center',
                padding: '8px 10px',
                fontSize: '11.5px',
                color: 'var(--acc, #92400e)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <span className="dot" style={{ background: 'var(--gold, #E6C280)', width: '6px', height: '6px' }} />
              <span>✦ Đang tải thêm...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CustomFilterDropdown;
