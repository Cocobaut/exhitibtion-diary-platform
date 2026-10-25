import React from 'react';
import { RX } from '../../data/mockData';

export function ReactionIcon({ type, size = 22, className = '' }) {
  const r = RX[type];
  if (!r) return null;

  return (
    <span
      className={`rx ${className}`}
      style={{
        backgroundColor: r.c,
        width: `${size}px`,
        height: `${size}px`,
      }}
    >
      <svg
        width={size * 0.62}
        height={size * 0.62}
        viewBox="0 0 24 24"
        fill={r.fill ? "#fff" : "none"}
        stroke="#fff"
        strokeWidth={r.fill ? 0 : 2.4}
        strokeLinecap="round"
      >
        <path d={r.g} />
      </svg>
    </span>
  );
}

export function ReactionStack({ types = [], size = 20 }) {
  return (
    <span className="stack">
      {types.map((type, idx) => (
        <ReactionIcon key={idx} type={type} size={size} />
      ))}
    </span>
  );
}

export function ReactionPicker({ onSelect, activeType = 'HUG' }) {
  const reactionTypes = ['HEART', 'HUG', 'SYMPATHY'];

  return (
    <div className="picker" style={{ left: '18px', bottom: '-34px' }}>
      {reactionTypes.map((type) => {
        const isBig = type === activeType;
        return (
          <span
            key={type}
            className={isBig ? "big" : ""}
            style={{ display: 'inline-grid', cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect && onSelect(type);
            }}
          >
            <ReactionIcon type={type} size={38} />
          </span>
        );
      })}
      <span style={{ fontSize: '13px', color: 'var(--ink)', fontWeight: 600, padding: '0 4px 9px 2px' }}>
        {RX[activeType]?.label || 'Ôm an ủi'}
      </span>
    </div>
  );
}

export function ReactionButton({ type, count, active, onClick }) {
  const r = RX[type];
  if (!r) return null;

  return (
    <button
      type="button"
      className={`rxbtn ${active ? 'on' : ''}`}
      onClick={onClick}
    >
      <ReactionIcon type={type} size={26} />
      {r.label} {count !== undefined && <em>{count}</em>}
    </button>
  );
}
