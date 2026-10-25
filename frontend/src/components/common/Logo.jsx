import React from 'react';

export function Logo({ onClick }) {
  return (
    <div className="logo" onClick={onClick} role="button" tabIndex={0}>
      <span className="arc" />
      <span className="star">✦</span>
      <div className="l1">THE NAME OF</div>
      <div className="l2">FEELING</div>
      <div className="l3">MUSEUM</div>
    </div>
  );
}

export default Logo;
